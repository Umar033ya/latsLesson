import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { StudentInput, updateStudentSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { forbidden, invalid, notFound } from '../common/errors';
import type { Actor } from '../common/actor';
import { InvitationsService } from '../invitations/invitations.service';
import { AnalyticsService } from '../analytics/analytics.service';
import type { StudentQuery } from './center.controller';

const DAY = 86_400_000;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly invitations: InvitationsService,
    private readonly analytics: AnalyticsService,
  ) {}

  async list(organizationId: string, q: StudentQuery) {
    const contains = q.search ? { contains: q.search, mode: 'insensitive' as const } : undefined;
    const where: Prisma.MembershipWhereInput = {
      organizationId,
      ...(q.groupId ? { groupId: q.groupId } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(contains ? { user: { OR: [{ firstName: contains }, { lastName: contains }, { email: contains }] } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.membership.count({ where }),
      this.prisma.membership.findMany({
        where,
        include: { group: { select: { id: true, name: true } }, user: { select: { id: true, firstName: true, lastName: true, email: true, homeOrganizationId: true, personalCodes: { where: { organizationId, isActive: true, revokedAt: null }, select: { id: true, hint: true, expiresAt: true, lastUsedAt: true }, take: 1 } } } },
        orderBy: { joinedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const stats = await this.prisma.gameSession.groupBy({ by: ['userId'], where: { organizationId, userId: { in: rows.map((r) => r.userId) }, status: 'COMPLETED' }, _avg: { accuracy: true }, _count: { id: true } });
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      items: rows.map(({ user, ...m }) => {
        const s = stats.find((x) => x.userId === user.id);
        return {
          id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, group: m.group, status: m.status, accessExpiresAt: m.accessExpiresAt, note: m.note, joinedAt: m.joinedAt, lastActiveAt: m.lastActiveAt,
          editable: user.homeOrganizationId === organizationId,
          code: user.personalCodes[0] ?? null,
          completed: s?._count.id ?? 0,
          accuracy: s ? Math.round(s._avg.accuracy ?? 0) : null,
        };
      }),
    };
  }

  async create(organizationId: string, students: StudentInput[], generateCodes: boolean, actor: Actor) {
    const org = await this.access.operational(organizationId);
    await this.access.assertCapacity(org, 'students', students.length);
    const groupIds = [...new Set(students.map((s) => s.groupId).filter((g): g is string => Boolean(g)))];
    if (groupIds.length && (await this.prisma.group.count({ where: { id: { in: groupIds }, organizationId } })) !== groupIds.length) throw invalid('Choose a group from your own center');
    const expiry = (await this.access.platform()).codeExpiryDays;
    const created: Array<{ id: string; firstName: string; lastName: string; code: string | null }> = [];
    for (const s of students) {
      const accessExpiresAt = s.accessExpiresAt ? new Date(s.accessExpiresAt) : null;
      const user = await this.prisma.user.create({
        data: { firstName: s.firstName, lastName: s.lastName, role: 'GAMER', homeOrganizationId: organizationId, memberships: { create: { organizationId, groupId: s.groupId ?? null, accessExpiresAt, note: s.note ?? null } } },
      });
      const code = generateCodes ? await this.invitations.issue({ organizationId, groupId: null, studentId: user.id, label: null, expiresAt: accessExpiresAt ?? new Date(Date.now() + expiry * DAY), maxUses: 10_000 }, actor) : null;
      created.push({ id: user.id, firstName: user.firstName, lastName: user.lastName, code: code?.code ?? null });
    }
    await this.audit.log({ actorId: actor.id, organizationId, action: 'STUDENTS_ADDED', targetType: 'User', metadata: { count: created.length } });
    return { students: created };
  }

  async findOne(organizationId: string, studentId: string) {
    const m = await this.membership(organizationId, studentId);
    const [progress, codes, sessions] = await Promise.all([
      this.analytics.student(studentId, organizationId),
      this.prisma.invitationCode.findMany({ where: { organizationId, studentId }, select: { id: true, hint: true, expiresAt: true, isActive: true, revokedAt: true, lastUsedAt: true, usesCount: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.prisma.gameSession.findMany({ where: { organizationId, userId: studentId }, select: { id: true, status: true, outcome: true, startedAt: true, accuracy: true, score: true, maxScore: true, durationSeconds: true, flags: true, campaign: { select: { title: true } } }, orderBy: { startedAt: 'desc' }, take: 30 }),
    ]);
    return {
      id: m.user.id, firstName: m.user.firstName, lastName: m.user.lastName, email: m.user.email, editable: m.user.homeOrganizationId === organizationId, group: m.group, status: m.status, accessExpiresAt: m.accessExpiresAt, note: m.note, joinedAt: m.joinedAt, lastActiveAt: m.lastActiveAt,
      startLevels: m.startLevels, progress, codes, sessions,
    };
  }

  async update(organizationId: string, studentId: string, data: z.infer<typeof updateStudentSchema>, actor: Actor) {
    const m = await this.membership(organizationId, studentId);
    if (data.groupId && !(await this.prisma.group.findFirst({ where: { id: data.groupId, organizationId } }))) throw invalid('Choose a group from your own center');
    const renames = (data.firstName !== undefined && data.firstName !== m.user.firstName) || (data.lastName !== undefined && data.lastName !== m.user.lastName);
    if (renames && m.user.homeOrganizationId !== organizationId) throw forbidden('This student manages their own name');
    if (data.status === 'ACTIVE' && m.status === 'INACTIVE') await this.access.assertCapacity(await this.access.org(organizationId), 'students');
    await this.prisma.$transaction([
      ...(renames ? [this.prisma.user.update({ where: { id: studentId }, data: { firstName: data.firstName, lastName: data.lastName } })] : []),
      this.prisma.membership.update({
        where: { id: m.id },
        data: {
          ...(data.groupId !== undefined ? { groupId: data.groupId } : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.accessExpiresAt !== undefined ? { accessExpiresAt: data.accessExpiresAt ? new Date(data.accessExpiresAt) : null } : {}),
          ...(data.note !== undefined ? { note: data.note } : {}),
          ...(data.startLevels ? { startLevels: data.startLevels } : {}),
        },
      }),
      ...(data.status === 'INACTIVE' ? [this.prisma.refreshToken.updateMany({ where: { userId: studentId, organizationId, revokedAt: null }, data: { revokedAt: new Date() } })] : []),
    ]);
    await this.audit.log({ actorId: actor.id, organizationId, action: data.status === 'INACTIVE' ? 'STUDENT_DEACTIVATED' : 'STUDENT_UPDATED', targetType: 'User', targetId: studentId });
    return this.findOne(organizationId, studentId);
  }

  async newCode(organizationId: string, studentId: string, actor: Actor) {
    const m = await this.membership(organizationId, studentId);
    await this.access.operational(organizationId);
    const expiry = (await this.access.platform()).codeExpiryDays;
    return this.invitations.issue({ organizationId, groupId: null, studentId, label: null, expiresAt: m.accessExpiresAt && m.accessExpiresAt > new Date() ? m.accessExpiresAt : new Date(Date.now() + expiry * DAY), maxUses: 10_000 }, actor);
  }

  /** Removes the student from the center. Their results stay in the center's statistics. */
  async remove(organizationId: string, studentId: string, actor: Actor) {
    const m = await this.membership(organizationId, studentId);
    await this.prisma.$transaction([
      this.prisma.invitationCode.updateMany({ where: { organizationId, studentId, revokedAt: null }, data: { isActive: false, revokedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: studentId, organizationId, revokedAt: null }, data: { revokedAt: new Date() } }),
      this.prisma.membership.delete({ where: { id: m.id } }),
    ]);
    await this.audit.log({ actorId: actor.id, organizationId, action: 'STUDENT_REMOVED', targetType: 'User', targetId: studentId });
    return { ok: true };
  }

  private async membership(organizationId: string, userId: string) {
    const m = await this.prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId } }, include: { user: true, group: { select: { id: true, name: true } } } });
    if (!m) throw notFound('Student');
    return m;
  }
}
