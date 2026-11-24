import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import type { TeacherInput, updateTeacherSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { conflict, notFound } from '../common/errors';
import { randomOpaqueToken } from '../common/crypto.util';
import type { Actor } from '../common/actor';

const select = { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true, _count: { select: { hostedLobbies: true } } } as const;

/** A center's teachers. They open rooms and see the results of their own rooms. */
@Injectable()
export class TeachersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  async list(organizationId: string) {
    const rows = await this.prisma.user.findMany({ where: { role: Role.TEACHER, homeOrganizationId: organizationId }, select, orderBy: { createdAt: 'desc' } });
    return rows.map(({ _count, ...t }) => ({ ...t, rooms: _count.hostedLobbies }));
  }

  async create(organizationId: string, input: TeacherInput, actor: Actor) {
    await this.access.operational(organizationId);
    if (await this.prisma.user.findUnique({ where: { email: input.email } })) throw conflict('This e-mail is already in use');
    const initialPassword = randomOpaqueToken(9);
    const teacher = await this.prisma.user.create({ data: { ...input, passwordHash: await argon2.hash(initialPassword, { type: argon2.argon2id }), role: Role.TEACHER, homeOrganizationId: organizationId }, select });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'TEACHER_CREATED', targetType: 'User', targetId: teacher.id, metadata: { email: input.email } });
    // Shown once so the administrator can hand it over.
    return { teacher: { id: teacher.id, email: teacher.email, firstName: teacher.firstName, lastName: teacher.lastName }, initialPassword };
  }

  async update(organizationId: string, id: string, data: z.infer<typeof updateTeacherSchema>, actor: Actor) {
    await this.own(organizationId, id);
    await this.prisma.user.update({ where: { id }, data });
    if (data.status === 'SUSPENDED') await this.signOut(id);
    await this.audit.log({ actorId: actor.id, organizationId, action: data.status ? `TEACHER_${data.status}` : 'TEACHER_UPDATED', targetType: 'User', targetId: id });
    return this.list(organizationId);
  }

  async newPassword(organizationId: string, id: string, actor: Actor) {
    await this.own(organizationId, id);
    const temporaryPassword = randomOpaqueToken(9);
    await this.prisma.user.update({ where: { id }, data: { passwordHash: await argon2.hash(temporaryPassword, { type: argon2.argon2id }), failedLogins: 0, lockedUntil: null } });
    await this.signOut(id);
    await this.audit.log({ actorId: actor.id, organizationId, action: 'PASSWORD_RESET_BY_ADMIN', targetType: 'User', targetId: id, category: 'SECURITY' });
    return { temporaryPassword };
  }

  private signOut(userId: string) {
    return this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  private async own(organizationId: string, id: string) {
    const teacher = await this.prisma.user.findFirst({ where: { id, role: Role.TEACHER, homeOrganizationId: organizationId }, select: { id: true } });
    if (!teacher) throw notFound('Teacher');
    return teacher;
  }
}
