import { Injectable } from '@nestjs/common';
import type { Campaign, Prisma } from '@prisma/client';
import { campaignConfigSchema, type CampaignConfig } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { ApiException } from '../common/errors';

export type LevelState = 'DONE' | 'OPEN' | 'LOCKED';
export interface LevelStep {
  campaign: Campaign;
  config: CampaignConfig;
  number: number;
  state: LevelState;
}
export interface LevelPath {
  subjectId: string;
  start: number;
  steps: LevelStep[];
}
interface Played {
  campaignId: string | null;
  status: string;
  outcome: string | null;
  accuracy: number;
}

/** A level counts as passed when the student reached the door and knew most of it. */
const PASS_ACCURACY = 60;
const passed = (s: Played) => s.status === 'COMPLETED' && (s.outcome === 'ESCAPED' || s.outcome === 'DISMISSED') && s.accuracy >= PASS_ACCURACY;

/** Levels are campaigns with a subject and a number. A center's own levels replace the official ones of that subject. */
@Injectable()
export class LevelsService {
  constructor(private readonly prisma: PrismaService) {}

  config = (c: { config: Prisma.JsonValue }) => campaignConfigSchema.parse(c.config ?? {});

  paths(campaigns: Campaign[], played: Played[], startLevels: Prisma.JsonValue): LevelPath[] {
    const starts = (startLevels ?? {}) as Record<string, number>;
    const bySubject = new Map<string, Array<Omit<LevelStep, 'state'>>>();
    for (const campaign of campaigns) {
      const config = this.config(campaign);
      if (config.level) bySubject.set(config.level.subjectId, [...(bySubject.get(config.level.subjectId) ?? []), { campaign, config, number: config.level.number }]);
    }
    return [...bySubject].map(([subjectId, all]) => {
      const own = all.filter((s) => s.campaign.organizationId);
      const steps = (own.length ? own : all).sort((a, b) => a.number - b.number);
      const start = Math.max(1, starts[subjectId] ?? 1);
      let open = true;
      return {
        subjectId,
        start,
        steps: steps.map((s) => {
          const done = played.some((p) => p.campaignId === s.campaign.id && passed(p));
          const state: LevelState = done ? 'DONE' : s.number <= start || open ? 'OPEN' : 'LOCKED';
          open = done || s.number < start;
          return { ...s, state };
        }),
      };
    });
  }

  /** The map on the page is only a picture; this is the rule. */
  async assertOpen(campaign: Campaign, available: Campaign[], userId: string, organizationId: string, startLevels: Prisma.JsonValue) {
    if (!this.config(campaign).level) return;
    const played = await this.prisma.gameSession.findMany({ where: { userId, organizationId, status: 'COMPLETED' }, select: { campaignId: true, status: true, outcome: true, accuracy: true } });
    const step = this.paths(available, played, startLevels).flatMap((p) => p.steps).find((s) => s.campaign.id === campaign.id);
    if (!step) throw new ApiException('CAMPAIGN_UNAVAILABLE', 'This campaign is not available to you right now', 403);
    if (step.state === 'LOCKED') throw new ApiException('LEVEL_LOCKED', 'Pass the previous level first', 403);
  }

  /** Topics of the lower levels, mixed in so that earlier material is not forgotten. */
  async reviewTopics(campaign: Campaign): Promise<string[]> {
    const { level, source } = this.config(campaign);
    if (!level || level.number < 2 || !source.topicIds.length) return [];
    const siblings = await this.prisma.campaign.findMany({ where: { organizationId: campaign.organizationId, status: 'PUBLISHED', config: { path: ['level', 'subjectId'], equals: level.subjectId } } });
    const lower = siblings.map(this.config).filter((c) => c.level && c.level.number < level.number);
    return [...new Set(lower.flatMap((c) => c.source.topicIds))].filter((id) => !source.topicIds.includes(id));
  }
}
