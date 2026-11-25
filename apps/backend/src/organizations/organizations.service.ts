import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { createOrganizationSchema, updateOrganizationSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { conflict, notFound } from '../common/errors';
import type { Actor } from '../common/actor';

type Create = z.infer<typeof createOrganizationSchema>;
type Update = z.infer<typeof updateOrganizationSchema>;
const dates = (d: { subscriptionEndsAt?: string | null }) => ('subscriptionEndsAt' in d ? { subscriptionEndsAt: d.subscriptionEndsAt ? new Date(d.subscriptionEndsAt) : null } : {});

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  async create(data: Create, actor: Actor) {
    if (await this.prisma.organization.findUnique({ where: { slug: data.slug } })) throw conflict('A center with this address name already exists');
    const org = await this.prisma.organization.create({ data: { ...data, ...dates(data) } });
    await this.audit.log({ actorId: actor.id, organizationId: org.id, action: 'CENTER_CREATED', targetType: 'Organization', targetId: org.id, metadata: { name: org.name } });
    return org;
  }

  async findAll(q: { page: number; pageSize: number; search?: string; status?: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE'; planId?: string; includeDemo?: boolean }) {
    const where = {
      ...(q.includeDemo ? {} : { isDemo: false }),
      ...(q.search ? { OR: [{ name: { contains: q.search, mode: 'insensitive' as const } }, { slug: { contains: q.search, mode: 'insensitive' as const } }, { city: { contains: q.search, mode: 'insensitive' as const } }] } : {}),
      ...(q.status ? { status: q.status } : {}),
      ...(q.planId ? { planId: q.planId } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.organization.count({ where }),
      this.prisma.organization.findMany({
        where,
        select: {
          id: true, name: true, slug: true, city: true, status: true, subscriptionEndsAt: true, createdAt: true, logoUrl: true,
          plan: { select: { id: true, name: true, maxStudents: true } },
          _count: { select: { memberships: { where: { status: 'ACTIVE' } }, admins: true, sessions: true, campaigns: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items: items.map(({ _count, ...o }) => ({ ...o, students: _count.memberships, admins: _count.admins, sessions: _count.sessions, campaigns: _count.campaigns })) };
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { plan: true, admins: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true, status: true } } } } },
    });
    if (!org) throw notFound('Education center');
    const [usage, sessions, aggregate, activity, features] = await Promise.all([
      this.access.usage(id),
      this.prisma.gameSession.groupBy({ by: ['status'], where: { organizationId: id }, _count: { id: true } }),
      this.prisma.gameResult.aggregate({ where: { organizationId: id }, _avg: { accuracy: true, durationSeconds: true } }),
      this.prisma.auditLog.findMany({ where: { organizationId: id }, orderBy: { createdAt: 'desc' }, take: 15, include: { actor: { select: { firstName: true, lastName: true } } } }),
      this.access.features(org),
    ]);
    const { settings: _settings, admins, ...rest } = org;
    return {
      ...rest,
      admins: admins.map((a) => a.user),
      usage,
      limits: this.access.limits(org),
      features,
      stats: {
        sessions: Object.fromEntries(sessions.map((s) => [s.status, s._count.id])),
        averageAccuracy: Math.round((aggregate._avg.accuracy ?? 0) * 10) / 10,
        averageDurationSeconds: Math.round(aggregate._avg.durationSeconds ?? 0),
      },
      activity,
    };
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED' | 'INACTIVE', reason: string | undefined, actor: Actor) {
    const org = await this.prisma.organization.update({ where: { id }, data: { status } });
    const action = { ACTIVE: 'CENTER_ACTIVATED', SUSPENDED: 'CENTER_SUSPENDED', INACTIVE: 'CENTER_DEACTIVATED' }[status];
    await this.audit.log({ actorId: actor.id, organizationId: id, action, targetType: 'Organization', targetId: id, metadata: reason ? { reason } : {} });
    return { id: org.id, status: org.status };
  }

  async update(id: string, data: Update, actor: Actor) {
    const org = await this.prisma.organization.update({ where: { id }, data: { ...data, ...dates(data) } });
    await this.audit.log({ actorId: actor.id, organizationId: id, action: 'CENTER_UPDATED', targetType: 'Organization', targetId: id, metadata: { fields: Object.keys(data) } });
    return org;
  }
}
