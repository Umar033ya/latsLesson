import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { gatesFor, HIDING_GATES, type GateDef, type QuestionKind } from '@last-lesson/scenario';
import type { CampaignConfig } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';

export interface Slot {
  gateId: string;
  questionId: string;
}
/** About this share of earlier topics is as welcome as the new ones. */
const REVIEW_SHARE = 0.35;
const LEVEL = { EASY: 0, MEDIUM: 1, HARD: 2 } as const;

/** Chooses which stored question sits behind each gate. No AI and no client input is involved. */
@Injectable()
export class QuestionPicker {
  constructor(private readonly prisma: PrismaService) {}

  /** Everything a campaign may draw from: never another center's questions. */
  poolWhere(config: CampaignConfig, organizationId: string | null): Prisma.QuestionWhereInput {
    const { subjectIds, topicIds, collectionIds, includeOfficial } = config.source;
    const owners: Prisma.QuestionWhereInput[] = [];
    if (includeOfficial || !organizationId) owners.push({ organizationId: null });
    if (organizationId) owners.push({ organizationId });
    const sources: Prisma.QuestionWhereInput[] = [];
    if (topicIds.length) sources.push({ topicId: { in: topicIds } });
    if (collectionIds.length) sources.push({ collections: { some: { collectionId: { in: collectionIds }, collection: { OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] } } } });
    return {
      status: 'PUBLISHED',
      isActive: true,
      subject: { isActive: true },
      AND: [{ OR: owners }, subjectIds.length ? { subjectId: { in: subjectIds } } : {}, sources.length ? { OR: sources } : {}],
    };
  }

  async pool(config: CampaignConfig, organizationId: string | null) {
    return this.prisma.question.findMany({ where: this.poolWhere(config, organizationId), select: { id: true, type: true, difficulty: true, subjectId: true, topicId: true, prompt: true }, take: 2000 });
  }

  targetLevel(config: CampaignConfig, index: number, total: number): number {
    const base = LEVEL[config.difficulty];
    if (config.progression === 'FLAT') return base;
    const third = index / Math.max(1, total);
    return Math.max(0, Math.min(2, base + (third < 0.34 ? -1 : third < 0.67 ? 0 : 1)));
  }

  async pick(config: CampaignConfig, organizationId: string | null, avoid: { practiced?: string[]; recent?: string[]; review?: string[] } = {}, hiding = false): Promise<Slot[]> {
    const path = gatesFor(config.sections);
    const gates = hiding ? [...path, ...HIDING_GATES] : path;
    const review = avoid.review ?? [];
    const pool = await this.pool(review.length ? { ...config, source: { ...config.source, topicIds: [...config.source.topicIds, ...review] } } : config, organizationId);
    const fixedIds = Object.values(config.overrides).map((o) => o.questionId).filter((id): id is string => Boolean(id));
    const fixed = fixedIds.length
      ? await this.prisma.question.findMany({ where: { id: { in: fixedIds }, status: 'PUBLISHED', OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] }, select: { id: true } })
      : [];
    const used = new Set<string>();
    const slots = new Map<string, string>();
    for (const gate of gates) {
      const id = config.overrides[gate.id]?.questionId;
      if (id && !used.has(id) && fixed.some((f) => f.id === id)) {
        slots.set(gate.id, id);
        used.add(id);
      }
    }
    const rank = (g: GateDef) => (g.required ? 0 : g.section === 'hiding' ? 2 : 1);
    // Required gates choose first so a small pool never leaves the main path without questions.
    const ordered = [...gates].sort((a, b) => rank(a) - rank(b));
    for (const gate of ordered) {
      if (slots.has(gate.id)) continue;
      const override = config.overrides[gate.id] ?? {};
      const level = override.difficulty ? LEVEL[override.difficulty] : gate.section === 'hiding' ? Math.max(0, LEVEL[config.difficulty] - 1) : this.targetLevel(config, path.indexOf(gate), path.length);
      const ranked = pool
        // Only short, two-tap questions fit into a hiding place.
        .filter((q) => gate.section !== 'hiding' || gate.preferred.includes(q.type as QuestionKind))
        .filter((q) => !used.has(q.id) && (!override.subjectId || q.subjectId === override.subjectId))
        .map((q) => ({ id: q.id, cost: this.cost(gate, q.type as QuestionKind, LEVEL[q.difficulty], level) + (avoid.practiced?.includes(q.id) ? 6 : 0) + (avoid.recent?.includes(q.id) ? 3 : 0) + (q.topicId && review.includes(q.topicId) && Math.random() > REVIEW_SHARE ? 5 : 0) + Math.random() * 1.5 }))
        .sort((a, b) => a.cost - b.cost);
      if (!ranked.length) continue;
      slots.set(gate.id, ranked[0].id);
      used.add(ranked[0].id);
    }
    return gates.filter((g) => slots.has(g.id)).map((g) => ({ gateId: g.id, questionId: slots.get(g.id)! }));
  }

  private cost(gate: GateDef, type: QuestionKind, level: number, target: number) {
    const rank = gate.preferred.indexOf(type);
    return (rank === -1 ? 5 : rank) + Math.abs(level - target) * 2.5;
  }
}
