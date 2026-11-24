import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { PlanInput, PlatformSettings } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { conflict } from '../common/errors';
import type { Actor } from '../common/actor';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  settings() {
    return this.access.platform();
  }

  async updateSettings(value: PlatformSettings, actor: Actor) {
    const before = await this.access.platform();
    const json = value as unknown as Prisma.InputJsonValue;
    await this.prisma.platformSetting.upsert({ where: { key: 'platform' }, create: { key: 'platform', value: json, updatedById: actor.id }, update: { value: json, updatedById: actor.id } });
    this.access.clearCache();
    const changed = (Object.keys(value) as Array<keyof PlatformSettings>).filter((k) => JSON.stringify(before[k]) !== JSON.stringify(value[k]));
    await this.audit.log({ actorId: actor.id, action: 'PLATFORM_SETTINGS_UPDATED', targetType: 'PlatformSetting', targetId: 'platform', metadata: { changed } });
    return value;
  }

  async plans() {
    const plans = await this.prisma.plan.findMany({ include: { _count: { select: { organizations: true } } }, orderBy: [{ sortOrder: 'asc' }, { maxStudents: 'asc' }] });
    return plans.map(({ _count, ...p }) => ({ ...p, centers: _count.organizations }));
  }

  async createPlan(data: PlanInput, actor: Actor) {
    const plan = await this.prisma.plan.create({ data });
    await this.audit.log({ actorId: actor.id, action: 'PLAN_CREATED', targetType: 'Plan', targetId: plan.id, metadata: { name: plan.name } });
    return plan;
  }

  async updatePlan(id: string, data: PlanInput, actor: Actor) {
    const plan = await this.prisma.plan.update({ where: { id }, data });
    await this.audit.log({ actorId: actor.id, action: 'PLAN_UPDATED', targetType: 'Plan', targetId: id, metadata: { name: plan.name } });
    return plan;
  }

  async removePlan(id: string, actor: Actor) {
    const used = await this.prisma.organization.count({ where: { planId: id } });
    if (used) throw conflict(`${used} centers use this plan. Move them first.`);
    const plan = await this.prisma.plan.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, action: 'PLAN_DELETED', targetType: 'Plan', targetId: id, metadata: { name: plan.name } });
    return { ok: true };
  }

  async security() {
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [counts, locked, flagged, feed] = await Promise.all([
      this.prisma.auditLog.groupBy({ by: ['action'], where: { category: 'SECURITY', createdAt: { gte: since } }, _count: { id: true } }),
      this.prisma.user.findMany({ where: { lockedUntil: { gt: new Date() } }, select: { id: true, email: true, lockedUntil: true } }),
      this.prisma.gameSession.findMany({ where: { NOT: { flags: { isEmpty: true } } }, orderBy: { startedAt: 'desc' }, take: 10, select: { id: true, flags: true, startedAt: true, accuracy: true, organization: { select: { id: true, name: true } } } }),
      this.prisma.auditLog.findMany({ where: { category: 'SECURITY' }, orderBy: { createdAt: 'desc' }, take: 40, select: { id: true, action: true, createdAt: true, ip: true, metadata: true, actor: { select: { email: true, firstName: true, lastName: true } }, organization: { select: { name: true } } } }),
    ]);
    return { last7Days: Object.fromEntries(counts.map((c) => [c.action, c._count.id])), lockedAccounts: locked, flaggedSessions: flagged, feed };
  }
}
