import { Injectable } from '@nestjs/common';
import type { Campaign, Prisma } from '@prisma/client';
import { GATES, gatesFor } from '@last-lesson/scenario';
import { campaignConfigSchema, type CampaignConfig, type CampaignInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { ApiException, forbidden, invalid, notFound } from '../common/errors';
import { resolveOrg, type Actor } from '../common/actor';
import { QuestionPicker } from './question-picker';

const include = { groups: { include: { group: { select: { id: true, name: true } } } }, _count: { select: { sessions: true } } } as const;
const date = (v?: string | null) => (v ? new Date(v) : null);

@Injectable()
export class CampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly picker: QuestionPicker,
  ) {}

  async findAll(actor: Actor, requested?: string) {
    let where: Prisma.CampaignWhereInput;
    if (actor.role === 'SUPER_ADMIN' && !requested) where = { organizationId: null };
    else where = { OR: [{ organizationId: resolveOrg(actor, requested) }, { organizationId: null, status: 'PUBLISHED' }] };
    const items = await this.prisma.campaign.findMany({ where: { AND: [where, { status: { not: 'ARCHIVED' } }] }, include, orderBy: { updatedAt: 'desc' } });
    return items.map((c) => this.present(c));
  }

  async findOne(id: string, actor: Actor) {
    return this.present(await this.visible(id, actor));
  }

  async check(config: CampaignConfig, actor: Actor, requested?: string) {
    const organizationId = actor.role === 'SUPER_ADMIN' ? (requested ?? null) : resolveOrg(actor, requested);
    return this.poolReport(config, organizationId);
  }

  private async poolReport(config: CampaignConfig, organizationId: string | null) {
    const pool = await this.picker.pool(config, organizationId);
    const count = (key: 'difficulty' | 'type') => pool.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q[key]]: (acc[q[key]] ?? 0) + 1 }), {});
    const gates = gatesFor(config.sections);
    return { available: pool.length, required: gates.filter((g) => g.required).length, total: gates.length, byDifficulty: count('difficulty'), byType: count('type') };
  }

  async preview(id: string, actor: Actor) {
    const campaign = await this.visible(id, actor);
    const config = this.config(campaign);
    const organizationId = campaign.organizationId ?? (actor.role === 'CENTER_ADMIN' ? actor.organizationIds[0] : null);
    const slots = await this.picker.pick(config, organizationId);
    const questions = await this.prisma.question.findMany({ where: { id: { in: slots.map((s) => s.questionId) } }, include: { subject: { select: { name: true } }, topic: { select: { name: true } } } });
    const org = organizationId ? await this.access.org(organizationId) : null;
    return {
      gates: gatesFor(config.sections).map((gate) => ({ gate, question: questions.find((q) => q.id === slots.find((s) => s.gateId === gate.id)?.questionId) ?? null })),
      gameplay: org ? await this.access.gameplay(org, config.gameplay) : config.gameplay,
      content: org ? await this.access.content(org, config.content) : config.content,
    };
  }

  async create(data: CampaignInput, actor: Actor, requested?: string) {
    const organizationId = actor.role === 'SUPER_ADMIN' ? (requested ?? null) : resolveOrg(actor, requested);
    if (organizationId) {
      const org = await this.access.operational(organizationId);
      await this.access.assertFeature(org, 'campaigns');
      await this.access.assertCapacity(org, 'campaigns');
    }
    await this.assertReferences(data, organizationId);
    const campaign = await this.prisma.campaign.create({
      data: {
        title: data.title,
        description: data.description ?? null,
        config: data.config as Prisma.InputJsonValue,
        organizationId,
        createdById: actor.id,
        availableFrom: date(data.availableFrom),
        availableTo: date(data.availableTo),
        groups: { create: data.groupIds.map((groupId) => ({ groupId })) },
      },
      include,
    });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'CAMPAIGN_CREATED', targetType: 'Campaign', targetId: campaign.id, metadata: { title: data.title } });
    return this.present(campaign);
  }

  async update(id: string, data: CampaignInput, actor: Actor) {
    const existing = await this.editable(id, actor);
    await this.assertReferences(data, existing.organizationId);
    if (existing.status === 'PUBLISHED') await this.assertPlayable(data.config, existing.organizationId);
    await this.prisma.$transaction([
      this.prisma.campaignGroup.deleteMany({ where: { campaignId: id } }),
      this.prisma.campaign.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description ?? null,
          config: data.config as Prisma.InputJsonValue,
          availableFrom: date(data.availableFrom),
          availableTo: date(data.availableTo),
          groups: { create: data.groupIds.map((groupId) => ({ groupId })) },
        },
      }),
    ]);
    await this.audit.log({ actorId: actor.id, organizationId: existing.organizationId, action: 'CAMPAIGN_UPDATED', targetType: 'Campaign', targetId: id });
    return this.findOne(id, actor);
  }

  async publish(id: string, actor: Actor) {
    const campaign = await this.editable(id, actor);
    await this.assertPlayable(this.config(campaign), campaign.organizationId);
    return this.setStatus(id, 'PUBLISHED', actor);
  }

  async setStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', actor: Actor) {
    const campaign = await this.editable(id, actor);
    const updated = await this.prisma.campaign.update({ where: { id }, data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : campaign.publishedAt }, include });
    await this.audit.log({ actorId: actor.id, organizationId: campaign.organizationId, action: `CAMPAIGN_${status}`, targetType: 'Campaign', targetId: id, metadata: { title: campaign.title } });
    return this.present(updated);
  }

  /** Centers copy official campaigns to adapt them. */
  async duplicate(id: string, actor: Actor, requested?: string) {
    const source = await this.visible(id, actor);
    const config = this.config(source);
    return this.create({ title: `${source.title} (copy)`.slice(0, 100), description: source.description, config, groupIds: [], availableFrom: null, availableTo: null }, actor, requested);
  }

  async remove(id: string, actor: Actor) {
    const campaign = await this.editable(id, actor);
    const played = await this.prisma.gameSession.count({ where: { campaignId: id } });
    if (played) return this.setStatus(id, 'ARCHIVED', actor);
    await this.prisma.campaign.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, organizationId: campaign.organizationId, action: 'CAMPAIGN_DELETED', targetType: 'Campaign', targetId: id, metadata: { title: campaign.title } });
    return { ok: true };
  }

  config(campaign: { config: Prisma.JsonValue }): CampaignConfig {
    return campaignConfigSchema.parse(campaign.config ?? {});
  }

  /** Published, inside its date window, and assigned to the student's group (or to everyone). */
  availableWhere(organizationId: string, groupId: string | null, allowOfficial: boolean): Prisma.CampaignWhereInput {
    const now = new Date();
    return {
      status: 'PUBLISHED',
      AND: [
        { OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] },
        { OR: [{ availableTo: null }, { availableTo: { gte: now } }] },
        { OR: [{ organizationId }, ...(allowOfficial ? [{ organizationId: null }] : [])] },
        { OR: [{ groups: { none: {} } }, ...(groupId ? [{ groups: { some: { groupId } } }] : [])] },
      ],
    };
  }

  private async assertPlayable(config: CampaignConfig, organizationId: string | null) {
    const report = await this.poolReport(config, organizationId);
    if (report.available < report.required) {
      throw new ApiException('NOT_ENOUGH_QUESTIONS', `This campaign needs at least ${report.required} questions, but only ${report.available} match. Add questions or widen the selection.`, 400, report);
    }
  }

  private async assertReferences(data: CampaignInput, organizationId: string | null) {
    const { source, overrides } = data.config;
    if (data.groupIds.length) {
      if (!organizationId) throw invalid('Official campaigns are available to every group');
      if ((await this.prisma.group.count({ where: { id: { in: data.groupIds }, organizationId } })) !== new Set(data.groupIds).size) throw invalid('Choose groups from your own center');
    }
    const own = [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])];
    if (source.collectionIds.length && (await this.prisma.questionCollection.count({ where: { id: { in: source.collectionIds }, OR: own } })) !== source.collectionIds.length) throw invalid('A selected collection is not available');
    const ids = Object.values(overrides).flatMap((o) => (o.questionId ? [o.questionId] : []));
    if (ids.length && (await this.prisma.question.count({ where: { id: { in: ids }, OR: own } })) !== new Set(ids).size) throw invalid('A selected question is not available');
    if (Object.keys(overrides).some((gateId) => !GATES.some((g) => g.id === gateId))) throw invalid('Unknown game section');
  }

  private async visible(id: string, actor: Actor) {
    const campaign = await this.prisma.campaign.findUnique({ where: { id }, include });
    if (!campaign) throw notFound('Campaign');
    if (actor.role === 'SUPER_ADMIN' || (campaign.organizationId === null && campaign.status === 'PUBLISHED')) return campaign;
    if (!campaign.organizationId || !actor.organizationIds.includes(campaign.organizationId)) throw notFound('Campaign');
    return campaign;
  }

  private async editable(id: string, actor: Actor): Promise<Campaign> {
    const campaign = await this.visible(id, actor);
    if (actor.role !== 'SUPER_ADMIN' && campaign.organizationId === null) throw forbidden('Official campaigns are read-only. Make a copy to change it.');
    return campaign;
  }

  private present(c: Prisma.CampaignGetPayload<{ include: typeof include }>) {
    const { _count, groups, config, ...rest } = c;
    return { ...rest, config: campaignConfigSchema.parse(config ?? {}), official: c.organizationId === null, groups: groups.map((g) => g.group), sessionCount: _count.sessions };
  }
}
