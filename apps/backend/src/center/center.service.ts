import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { CenterSettings, centerProfileSchema, groupSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { conflict, invalid, notFound } from '../common/errors';
import type { Actor } from '../common/actor';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlayService } from '../game-sessions/play.service';

@Injectable()
export class CenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly analytics: AnalyticsService,
    private readonly play: PlayService,
  ) {}

  async dashboard(organizationId: string) {
    await this.play.finalizeExpired({ organizationId });
    const org = await this.access.org(organizationId);
    const [usage, activeCodes, analytics, recent, activity] = await Promise.all([
      this.access.usage(organizationId),
      this.prisma.invitationCode.count({ where: { organizationId, isActive: true, revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.analytics.organization(organizationId, { days: 30 }),
      this.prisma.gameSession.findMany({ where: { organizationId, user: { isGuest: false } }, orderBy: { startedAt: 'desc' }, take: 8, select: { id: true, status: true, outcome: true, accuracy: true, startedAt: true, user: { select: { id: true, firstName: true, lastName: true } }, campaign: { select: { title: true } } } }),
      this.prisma.auditLog.findMany({ where: { organizationId, category: { in: ['ADMIN', 'ACTIVITY'] } }, orderBy: { createdAt: 'desc' }, take: 10, select: { id: true, action: true, createdAt: true, actor: { select: { firstName: true, lastName: true } }, metadata: true } }),
    ]);
    const setup = {
      hasStudents: usage.students > 0,
      hasGroups: usage.groups > 0,
      hasQuestions: usage.questions > 0,
      hasCampaign: (await this.prisma.campaign.count({ where: { organizationId, status: 'PUBLISHED' } })) > 0,
      hasResults: analytics.sessions.completed > 0,
    };
    return { center: { id: org.id, name: org.name, status: org.status, subscriptionEndsAt: org.subscriptionEndsAt, plan: org.plan?.name ?? 'Trial' }, usage, limits: this.access.limits(org), activeCodes, analytics, recent, activity, setup };
  }

  async profile(organizationId: string) {
    const org = await this.access.org(organizationId);
    const { id, name, slug, logoUrl, contactName, contactEmail, contactPhone, city, status, subscriptionEndsAt } = org;
    return {
      id, name, slug, logoUrl, contactName, contactEmail, contactPhone, city, status, subscriptionEndsAt,
      plan: org.plan ? { name: org.plan.name, description: org.plan.description } : { name: 'Trial', description: null },
      limits: this.access.limits(org),
      usage: await this.access.usage(organizationId),
      features: await this.access.features(org),
      settings: this.access.settings(org),
    };
  }

  async updateProfile(organizationId: string, data: z.infer<typeof centerProfileSchema>, actor: Actor) {
    const org = await this.access.org(organizationId);
    if (data.logoUrl !== undefined && data.logoUrl !== org.logoUrl) await this.access.assertFeature(org, 'branding');
    await this.prisma.organization.update({ where: { id: organizationId }, data });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'CENTER_PROFILE_UPDATED', targetType: 'Organization', targetId: organizationId, metadata: { fields: Object.keys(data) } });
    return this.profile(organizationId);
  }

  async updateSettings(organizationId: string, settings: CenterSettings, actor: Actor) {
    const org = await this.access.org(organizationId);
    const platform = await this.access.platform();
    if (!platform.allowedTensions.includes(settings.gameplay.tension)) throw invalid('This intensity is not available on the platform');
    if (!platform.allowedThemes.includes(settings.branding.theme)) throw invalid('This theme is not available on the platform');
    if (settings.gameplay.sessionMinutes > platform.maxSessionMinutes) throw invalid(`Sessions can last up to ${platform.maxSessionMinutes} minutes`);
    const current = this.access.settings(org);
    if (JSON.stringify(current.branding) !== JSON.stringify(settings.branding)) await this.access.assertFeature(org, 'branding');
    if (settings.content.notes.length && JSON.stringify(current.content.notes) !== JSON.stringify(settings.content.notes)) await this.access.assertFeature(org, 'customNotes');
    await this.prisma.organization.update({ where: { id: organizationId }, data: { settings: settings as unknown as Prisma.InputJsonValue } });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'CENTER_SETTINGS_UPDATED', targetType: 'Organization', targetId: organizationId });
    return this.profile(organizationId);
  }

  async groups(organizationId: string) {
    const [groups, codes, stats] = await Promise.all([
      this.prisma.group.findMany({ where: { organizationId }, include: { campaigns: { include: { campaign: { select: { id: true, title: true, status: true } } } }, _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } }, orderBy: { name: 'asc' } }),
      this.prisma.invitationCode.groupBy({ by: ['groupId'], where: { organizationId, kind: 'GROUP', isActive: true, revokedAt: null, expiresAt: { gt: new Date() } }, _count: { id: true } }),
      this.prisma.gameSession.groupBy({ by: ['groupId'], where: { organizationId, user: { isGuest: false }, status: 'COMPLETED' }, _avg: { accuracy: true }, _count: { id: true } }),
    ]);
    return groups.map(({ _count, campaigns, ...g }) => {
      const s = stats.find((x) => x.groupId === g.id);
      return { ...g, students: _count.memberships, activeCodes: codes.find((c) => c.groupId === g.id)?._count.id ?? 0, campaigns: campaigns.map((c) => c.campaign), completed: s?._count.id ?? 0, accuracy: s ? Math.round(s._avg.accuracy ?? 0) : null };
    });
  }

  async group(organizationId: string, id: string) {
    await this.ownGroup(organizationId, id);
    const [list, analytics] = await Promise.all([this.groups(organizationId), this.analytics.organization(organizationId, { groupId: id, days: 90 })]);
    return { ...list.find((g) => g.id === id)!, analytics };
  }

  async createGroup(organizationId: string, data: z.infer<typeof groupSchema>, actor: Actor) {
    const org = await this.access.operational(organizationId);
    await this.access.assertCapacity(org, 'groups');
    if (await this.prisma.group.findUnique({ where: { organizationId_name: { organizationId, name: data.name } } })) throw conflict('A group with this name already exists');
    const group = await this.prisma.group.create({ data: { ...data, organizationId } });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'GROUP_CREATED', targetType: 'Group', targetId: group.id, metadata: { name: group.name } });
    return group;
  }

  async updateGroup(organizationId: string, id: string, data: Partial<z.infer<typeof groupSchema>>, actor: Actor) {
    await this.ownGroup(organizationId, id);
    const group = await this.prisma.group.update({ where: { id }, data });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'GROUP_UPDATED', targetType: 'Group', targetId: id });
    return group;
  }

  async removeGroup(organizationId: string, id: string, actor: Actor) {
    const group = await this.ownGroup(organizationId, id);
    await this.prisma.group.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'GROUP_DELETED', targetType: 'Group', targetId: id, metadata: { name: group.name } });
    return { ok: true };
  }

  async assignCampaigns(organizationId: string, id: string, campaignIds: string[], actor: Actor) {
    await this.ownGroup(organizationId, id);
    const unique = [...new Set(campaignIds)];
    if ((await this.prisma.campaign.count({ where: { id: { in: unique }, organizationId } })) !== unique.length) throw invalid('Only your own campaigns can be assigned to a group');
    await this.prisma.$transaction([this.prisma.campaignGroup.deleteMany({ where: { groupId: id } }), this.prisma.campaignGroup.createMany({ data: unique.map((campaignId) => ({ campaignId, groupId: id })) })]);
    await this.audit.log({ actorId: actor.id, organizationId, action: 'GROUP_CAMPAIGNS_ASSIGNED', targetType: 'Group', targetId: id, metadata: { count: unique.length } });
    return this.groups(organizationId);
  }

  private async ownGroup(organizationId: string, id: string) {
    const group = await this.prisma.group.findFirst({ where: { id, organizationId } });
    if (!group) throw notFound('Group');
    return group;
  }
}
