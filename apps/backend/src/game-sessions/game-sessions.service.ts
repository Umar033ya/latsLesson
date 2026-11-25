import { Injectable } from '@nestjs/common';
import type { Campaign, Prisma } from '@prisma/client';
import { DEFAULT_CONTENT, type Branding, type ContentConfig, type GameplayConfig, type SectionId } from '@last-lesson/scenario';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService, type OrgWithPlan } from '../common/access.service';
import { ApiException, notFound } from '../common/errors';
import { randomOpaqueToken, sha256 } from '../common/crypto.util';
import { studentOrg, type Actor } from '../common/actor';
import { CampaignsService } from '../campaigns/campaigns.service';
import { LevelsService } from '../campaigns/levels.service';
import { QuestionPicker } from '../campaigns/question-picker';
import { PlayService } from './play.service';

/** Frozen when the session starts, so editing a campaign never changes a game in progress. */
export interface SessionConfig {
  gameplay: GameplayConfig;
  content: ContentConfig;
  branding: Branding;
  sections: SectionId[];
  objectives: string[];
  campaignTitle: string;
}

const TICKET_SECONDS = 120;
/** Guests without a room are removed after this time, together with their sessions. */
const GUEST_HOURS = 48;

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly campaigns: CampaignsService,
    private readonly picker: QuestionPicker,
    private readonly levels: LevelsService,
    private readonly play: PlayService,
  ) {}

  async launch(input: { campaignId: string; preparationId?: string | null }, actor: Actor) {
    const organizationId = studentOrg(actor);
    const org = await this.access.operational(organizationId);
    const platform = await this.access.platform();
    if (!platform.gameEnabled) throw new ApiException('GAME_DISABLED', platform.maintenanceMessage || 'The game is closed for maintenance', 503);
    const membership = await this.prisma.membership.findUniqueOrThrow({ where: { userId_organizationId: { userId: actor.id, organizationId } } });
    const available = await this.prisma.campaign.findMany({ where: this.campaigns.availableWhere(organizationId, membership.groupId, this.access.settings(org).allowOfficialCampaigns) });
    const campaign = available.find((c) => c.id === input.campaignId);
    if (!campaign) throw new ApiException('CAMPAIGN_UNAVAILABLE', 'This campaign is not available to you right now', 403);

    await this.play.finalizeExpired({ userId: actor.id });
    await this.levels.assertOpen(campaign, available, actor.id, organizationId, membership.startLevels);
    const open = await this.prisma.gameSession.findFirst({ where: { userId: actor.id, campaignId: campaign.id, organizationId, lobbyId: null, status: 'IN_PROGRESS' } });
    if (open) return this.ticket(open.id, actor.id, true);

    const preparation = input.preparationId ? await this.prisma.preparation.findFirst({ where: { id: input.preparationId, userId: actor.id } }) : null;
    const practiced = ((preparation?.content as { practiceQuestionIds?: string[] } | null)?.practiceQuestionIds ?? []) as string[];
    const recent = await this.prisma.gameSession.findMany({ where: { userId: actor.id }, orderBy: { startedAt: 'desc' }, take: 2, select: { questionIds: true } });
    const { data, gameplay } = await this.prepare(campaign, org, { practiced, recent: recent.flatMap((r) => r.questionIds) });
    const session = await this.prisma.gameSession.create({
      data: {
        ...data,
        userId: actor.id,
        organizationId,
        groupId: membership.groupId,
        campaignId: campaign.id,
        preparationId: preparation?.id ?? null,
        // Generous wall-clock window so an interrupted session can be resumed the same day.
        expiresAt: new Date(Date.now() + Math.max(120, gameplay.sessionMinutes * 4) * 60_000),
      },
    });
    await this.prisma.membership.update({ where: { id: membership.id }, data: { lastActiveAt: new Date() } });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'GAME_STARTED', targetType: 'GameSession', targetId: session.id, category: 'ACTIVITY', metadata: { campaign: campaign.title } });
    return this.ticket(session.id, actor.id, false);
  }

  /** Chooses the questions and freezes the configuration. One-player games and rooms both start here. */
  async prepare(campaign: Campaign, org: OrgWithPlan | null, avoid: { practiced?: string[]; recent?: string[] } = {}) {
    const config = this.campaigns.config(campaign);
    const gameplay = await this.access.gameplay(org ?? { settings: {} }, config.gameplay);
    const review = await this.levels.reviewTopics(campaign);
    const slots = await this.picker.pick(config, org?.id ?? null, { ...avoid, review }, gameplay.hidingQuestions && gameplay.mode === 'STORY');
    if (!slots.length) throw new ApiException('NO_QUESTIONS', 'This campaign has no questions yet. Tell your teacher.', 409);
    const platform = await this.access.platform();
    const branding: Branding = org ? await this.access.branding(org) : { displayName: platform.platformName, logoUrl: null, accent: '#e0a848', theme: platform.allowedThemes[0] };
    const snapshot: SessionConfig = {
      gameplay,
      content: org ? await this.access.content(org, config.content) : { ...DEFAULT_CONTENT, ...config.content },
      branding: { ...branding, theme: config.theme ?? branding.theme },
      sections: config.sections,
      objectives: config.objectives,
      campaignTitle: campaign.title,
    };
    const data = { questionIds: slots.map((s) => s.questionId), slots: slots as unknown as Prisma.InputJsonValue, config: snapshot as unknown as Prisma.InputJsonValue };
    return { data, gameplay };
  }

  /** Anyone may try the official campaign. The session is graded here like any other and belongs to a throwaway guest. */
  async guest(name: string) {
    const platform = await this.access.platform();
    if (!platform.gameEnabled) throw new ApiException('GAME_DISABLED', platform.maintenanceMessage || 'The game is closed for maintenance', 503);
    await this.prisma.user.deleteMany({ where: { isGuest: true, lobbyPlayers: { none: {} }, createdAt: { lt: new Date(Date.now() - GUEST_HOURS * 3_600_000) } } });
    const official = await this.prisma.campaign.findMany({ where: { organizationId: null, status: 'PUBLISHED' }, orderBy: { createdAt: 'asc' } });
    const campaign = official.find((c) => !this.campaigns.config(c).level);
    if (!campaign) throw new ApiException('NO_QUESTIONS', 'There is no open campaign yet', 409);
    const { data, gameplay } = await this.prepare(campaign, null);
    const user = await this.prisma.user.create({ data: { firstName: name, lastName: '', role: 'GAMER', isGuest: true } });
    const session = await this.prisma.gameSession.create({ data: { ...data, userId: user.id, campaignId: campaign.id, expiresAt: new Date(Date.now() + Math.max(120, gameplay.sessionMinutes * 4) * 60_000) } });
    return this.ticket(session.id, user.id, false);
  }

  async resume(sessionId: string, actor: Actor) {
    await this.play.finalizeExpired({ userId: actor.id });
    const session = await this.owned(sessionId, actor);
    if (session.status !== 'IN_PROGRESS') throw new ApiException('SESSION_FINISHED', 'This session is already finished', 409);
    return this.ticket(session.id, actor.id, true);
  }

  async abandon(sessionId: string, actor: Actor) {
    await this.owned(sessionId, actor);
    await this.play.complete(sessionId, { requestId: `abandon-${sessionId}`.slice(0, 64), outcome: 'LEFT', stats: { pages: 0, caught: 0 } });
    return { ok: true };
  }

  async history(userId: string) {
    const items = await this.prisma.gameSession.findMany({
      where: { userId },
      select: { id: true, status: true, outcome: true, startedAt: true, endedAt: true, durationSeconds: true, score: true, maxScore: true, accuracy: true, correctAnswers: true, incorrectAnswers: true, topicsNeedImprovement: true, campaign: { select: { id: true, title: true } } },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
    return items;
  }

  /** The ticket travels in the URL fragment, which browsers never send to a server or a log. */
  async ticket(sessionId: string, userId: string, resumed: boolean) {
    const ticket = randomOpaqueToken(32);
    await this.prisma.launchTicket.deleteMany({ where: { sessionId, usedAt: null } });
    await this.prisma.launchTicket.create({ data: { sessionId, userId, tokenHash: sha256(ticket), expiresAt: new Date(Date.now() + TICKET_SECONDS * 1000) } });
    const base = process.env.GAME_URL ?? 'http://localhost:5174/';
    return { sessionId, resumed, launchUrl: `${base}#ticket=${ticket}`, expiresInSeconds: TICKET_SECONDS };
  }

  private async owned(sessionId: string, actor: Actor) {
    const session = await this.prisma.gameSession.findFirst({ where: { id: sessionId, userId: actor.id } });
    if (!session) throw notFound('Session');
    return session;
  }
}
