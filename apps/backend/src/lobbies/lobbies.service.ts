import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type Lobby } from '@prisma/client';
import { randomInt } from 'node:crypto';
import { ALL_GATES, compareStandings, LOBBY_COLORS, type LobbyStanding, type LobbyState, type Locale } from '@last-lesson/scenario';
import { Role } from '@last-lesson/shared-types';
import type { CreateLobbyInput, JoinLobbyInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { ApiException, conflict, notFound } from '../common/errors';
import { hostOrg, type Actor } from '../common/actor';
import { CampaignsService } from '../campaigns/campaigns.service';
import { QuestionPicker, type Slot } from '../campaigns/question-picker';
import { GameSessionsService } from '../game-sessions/game-sessions.service';
import { PlayService } from '../game-sessions/play.service';
import { closeLobbyWhenDone } from './lobby-close';

export interface LobbyClaims {
  sub: string;
  lid: string;
}

/** A room nobody started is closed after this time, which frees its code. */
const WAITING_HOURS = 3;
/** Extra minutes on top of the session length before a room is closed. */
const GRACE_MINUTES = 10;
const ONLINE_MS = 12_000;
const OPEN_ROOMS_PER_HOST = 5;

const include = {
  campaign: { select: { id: true, title: true, translations: true } },
  organization: { select: { name: true, status: true } },
  host: { select: { firstName: true, lastName: true } },
  players: { where: { kicked: false }, orderBy: { joinedAt: 'asc' } },
  sessions: { select: { slots: true }, take: 1 },
} satisfies Prisma.LobbyInclude;
type Room = Prisma.LobbyGetPayload<{ include: typeof include }>;

const required = new Set(ALL_GATES.filter((g) => g.required).map((g) => g.id));
export const requiredSteps = (slots: Prisma.JsonValue | undefined) => ((slots ?? []) as unknown as Slot[]).filter((s) => required.has(s.gateId)).length;
const roomNotFound = () => new ApiException('LOBBY_NOT_FOUND', 'No open room has this code. Check the digits.', 404);

/** Rooms: a teacher opens one, the class joins with six digits, everybody plays the same questions. */
@Injectable()
export class LobbiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly campaigns: CampaignsService,
    private readonly picker: QuestionPicker,
    private readonly sessions: GameSessionsService,
    private readonly play: PlayService,
  ) {}

  /* ---------- host ---------- */

  async campaignChoices(actor: Actor, locale: Locale, requested?: string) {
    const organizationId = hostOrg(actor, requested);
    const org = await this.access.org(organizationId);
    const items = await this.prisma.campaign.findMany({ where: this.playable(organizationId, this.access.settings(org).allowOfficialCampaigns), orderBy: [{ organizationId: 'desc' }, { title: 'asc' }] });
    return Promise.all(
      items.map(async (c) => {
        const config = this.campaigns.config(c);
        const gameplay = await this.access.gameplay(org, config.gameplay);
        const tr = (c.translations as Record<string, { title?: string; description?: string }>)?.[locale];
        return { id: c.id, title: tr?.title || c.title, description: tr?.description || c.description, official: c.organizationId === null, difficulty: config.difficulty, sessionMinutes: gameplay.sessionMinutes, tension: gameplay.tension };
      }),
    );
  }

  async create(input: CreateLobbyInput, actor: Actor, locale: Locale, requested?: string): Promise<LobbyState> {
    const organizationId = hostOrg(actor, requested);
    const org = await this.access.operational(organizationId);
    await this.assertGameOpen();
    await this.sweep();
    const campaign = await this.prisma.campaign.findFirst({ where: { id: input.campaignId, AND: [this.playable(organizationId, this.access.settings(org).allowOfficialCampaigns)] } });
    if (!campaign) throw new ApiException('CAMPAIGN_UNAVAILABLE', 'This campaign is not available to you right now', 403);
    if ((await this.prisma.lobby.count({ where: { hostId: actor.id, status: { not: 'FINISHED' } } })) >= OPEN_ROOMS_PER_HOST) throw conflict('Finish one of your open rooms first');

    const data = { organizationId, hostId: actor.id, campaignId: campaign.id, title: input.title || campaign.title, maxPlayers: input.maxPlayers };
    const lobby = await this.withFreeCode((code) => this.prisma.lobby.create({ data: { ...data, code }, include }));
    await this.audit.log({ actorId: actor.id, organizationId, action: 'LOBBY_CREATED', targetType: 'Lobby', targetId: lobby.id, category: 'ACTIVITY', metadata: { title: lobby.title } });
    return this.state(lobby, locale);
  }

  async list(actor: Actor, locale: Locale, requested?: string): Promise<LobbyState[]> {
    const organizationId = hostOrg(actor, requested);
    await this.sweep(organizationId);
    const rooms = await this.prisma.lobby.findMany({ where: { organizationId, ...(actor.role === Role.TEACHER ? { hostId: actor.id } : {}) }, include, orderBy: { createdAt: 'desc' }, take: 60 });
    return rooms.map((r) => this.state(r, locale));
  }

  async one(id: string, actor: Actor, locale: Locale): Promise<LobbyState> {
    const lobby = await this.hosted(id, actor);
    if (lobby.status !== 'FINISHED' && (await this.closeIfOver(lobby))) return this.state(await this.hosted(id, actor), locale);
    return this.state(lobby, locale);
  }

  /** Everyone gets a session with the same questions behind the same doors. */
  async start(id: string, actor: Actor, locale: Locale): Promise<LobbyState> {
    const lobby = await this.hosted(id, actor);
    if (lobby.status !== 'WAITING') throw conflict('This room has already started');
    if (!lobby.players.length) throw new ApiException('LOBBY_EMPTY', 'Nobody has joined yet', 409);
    const org = await this.access.operational(lobby.organizationId);
    await this.assertGameOpen();
    const campaign = lobby.campaignId ? await this.prisma.campaign.findUnique({ where: { id: lobby.campaignId } }) : null;
    if (!campaign) throw new ApiException('CAMPAIGN_UNAVAILABLE', 'This campaign is not available to you right now', 403);
    const prepared = await this.sessions.prepare(campaign, org);
    const memberships = await this.prisma.membership.findMany({ where: { organizationId: org.id, userId: { in: lobby.players.map((p) => p.userId) } }, select: { userId: true, groupId: true } });

    await this.prisma.$transaction(async (tx) => {
      const startedAt = new Date();
      // Conditional update: two clicks, or two devices of one teacher, start the room once.
      const claimed = await tx.lobby.updateMany({ where: { id, status: 'WAITING' }, data: { status: 'RUNNING', startedAt } });
      if (claimed.count !== 1) throw conflict('This room has already started');
      for (const player of await tx.lobbyPlayer.findMany({ where: { lobbyId: id, kicked: false } })) {
        const session = await tx.gameSession.create({
          data: {
            ...prepared.data,
            userId: player.userId,
            organizationId: org.id,
            groupId: memberships.find((m) => m.userId === player.userId)?.groupId ?? null,
            campaignId: campaign.id,
            lobbyId: id,
            startedAt,
            expiresAt: new Date(startedAt.getTime() + (prepared.gameplay.sessionMinutes + GRACE_MINUTES) * 60_000),
          },
        });
        await tx.lobbyPlayer.update({ where: { id: player.id }, data: { sessionId: session.id, lastSeenAt: startedAt } });
      }
    }, { timeout: 20_000 });
    await this.audit.log({ actorId: actor.id, organizationId: org.id, action: 'LOBBY_STARTED', targetType: 'Lobby', targetId: id, category: 'ACTIVITY', metadata: { players: lobby.players.length } });
    return this.one(id, actor, locale);
  }

  async end(id: string, actor: Actor, locale: Locale): Promise<LobbyState> {
    const lobby = await this.hosted(id, actor);
    if (lobby.status !== 'FINISHED') {
      await this.finish(lobby);
      await this.audit.log({ actorId: actor.id, organizationId: lobby.organizationId, action: 'LOBBY_ENDED', targetType: 'Lobby', targetId: id, category: 'ACTIVITY' });
    }
    return this.one(id, actor, locale);
  }

  async kick(id: string, playerId: string, actor: Actor, locale: Locale): Promise<LobbyState> {
    const lobby = await this.hosted(id, actor);
    const player = lobby.players.find((p) => p.id === playerId);
    if (!player) throw notFound('Player');
    // The name is freed, so a kicked nickname can be used again in the same room.
    await this.prisma.lobbyPlayer.update({ where: { id: player.id }, data: { kicked: true, nickname: `${player.nickname}#${player.id}` } });
    if (player.sessionId) await this.leaveSession(player.sessionId);
    await closeLobbyWhenDone(this.prisma, id);
    return this.one(id, actor, locale);
  }

  async remove(id: string, actor: Actor) {
    const lobby = await this.hosted(id, actor);
    if (lobby.status === 'RUNNING') throw conflict('End the game before deleting the room');
    await this.prisma.$transaction([
      this.prisma.user.deleteMany({ where: { isGuest: true, lobbyPlayers: { some: { lobbyId: id }, every: { lobbyId: id } } } }),
      this.prisma.lobby.delete({ where: { id } }),
    ]);
    await this.audit.log({ actorId: actor.id, organizationId: lobby.organizationId, action: 'LOBBY_DELETED', targetType: 'Lobby', targetId: id, metadata: { title: lobby.title } });
    return { ok: true };
  }

  /* ---------- player ---------- */

  /** A student of the center keeps the result in their profile; anyone else plays as a guest. */
  async join(input: JoinLobbyInput, ip: string, actor?: Actor) {
    await this.sweep();
    const lobby = await this.prisma.lobby.findFirst({ where: { code: input.code, status: { not: 'FINISHED' } } });
    if (!lobby) throw roomNotFound();
    await this.access.operational(lobby.organizationId);
    await this.assertGameOpen();
    const student = actor?.role === Role.GAMER && actor.organizationIds.includes(lobby.organizationId) ? actor : undefined;

    const player = await this.prisma.$transaction(async (tx) => {
      // The row lock serialises joins, so the limit and the nicknames cannot be raced past.
      const [room] = await tx.$queryRaw<Array<Pick<Lobby, 'status' | 'maxPlayers'>>>`SELECT "status", "maxPlayers" FROM "Lobby" WHERE id = ${lobby.id}::uuid FOR UPDATE`;
      const players = await tx.lobbyPlayer.findMany({ where: { lobbyId: lobby.id } });
      const mine = student && players.find((p) => p.userId === student.id);
      if (mine?.kicked) throw new ApiException('LOBBY_REMOVED', 'The teacher removed you from this room', 403);
      if (mine) return mine;
      if (room?.status !== 'WAITING') throw new ApiException('LOBBY_STARTED', 'This game has already started. Ask for a new room.', 409);
      const active = players.filter((p) => !p.kicked);
      if (active.length >= room.maxPlayers) throw new ApiException('LOBBY_FULL', 'This room is full', 409);
      const userId = student?.id ?? (await tx.user.create({ data: { firstName: input.nickname, lastName: '', role: Role.GAMER, isGuest: true } })).id;
      const used = LOBBY_COLORS.map((_, i) => active.filter((p) => p.color === i).length);
      return tx.lobbyPlayer.create({ data: { lobbyId: lobby.id, userId, nickname: this.freeName(input.nickname, players.map((p) => p.nickname)), color: used.indexOf(Math.min(...used)) } });
    });
    await this.audit.log({ actorId: player.userId, organizationId: lobby.organizationId, action: 'LOBBY_JOINED', targetType: 'Lobby', targetId: lobby.id, category: 'ACTIVITY', ip });
    const claims: LobbyClaims = { sub: player.userId, lid: lobby.id };
    return { token: await this.jwt.signAsync(claims, { secret: process.env.GAME_TOKEN_SECRET, audience: 'lobby', expiresIn: '6h', algorithm: 'HS256' }), playerId: player.id, nickname: player.nickname };
  }

  async room(claims: LobbyClaims, locale: Locale) {
    const me = await this.member(claims);
    await this.prisma.lobbyPlayer.update({ where: { id: me.id }, data: { lastSeenAt: new Date() } });
    const lobby = await this.prisma.lobby.findUniqueOrThrow({ where: { id: claims.lid }, include });
    const fresh = lobby.status !== 'FINISHED' && (await this.closeIfOver(lobby)) ? await this.prisma.lobby.findUniqueOrThrow({ where: { id: claims.lid }, include }) : lobby;
    return { ...this.state(fresh, locale), me: { id: me.id, nickname: me.nickname, color: me.color, finished: Boolean(me.finishedAt) } };
  }

  async launch(claims: LobbyClaims) {
    const me = await this.member(claims);
    if (!me.sessionId || me.finishedAt) throw new ApiException('LOBBY_NOT_RUNNING', 'The game is not running', 409);
    return this.sessions.ticket(me.sessionId, me.userId, true);
  }

  async leave(claims: LobbyClaims) {
    const me = await this.member(claims);
    if (!me.sessionId) await this.prisma.lobbyPlayer.delete({ where: { id: me.id } });
    else if (!me.finishedAt) await this.leaveSession(me.sessionId);
    await closeLobbyWhenDone(this.prisma, claims.lid);
    return { ok: true };
  }

  /* ---------- shared ---------- */

  standings(players: Room['players']): LobbyStanding[] {
    const now = Date.now();
    const ranked = [...players].sort(compareStandings);
    return ranked.map((p) => ({
      id: p.id,
      nickname: p.nickname,
      color: p.color,
      place: p.finishedAt ? ranked.filter((o) => o.finishedAt).indexOf(p) + 1 : null,
      online: now - p.lastSeenAt.getTime() < ONLINE_MS,
      progress: p.progress,
      score: p.score,
      outcome: p.outcome,
      durationMs: p.durationMs,
    }));
  }

  elapsed(lobby: Pick<Lobby, 'startedAt' | 'endedAt'>): number {
    return lobby.startedAt ? Math.max(0, (lobby.endedAt ?? new Date()).getTime() - lobby.startedAt.getTime()) : 0;
  }

  private state(lobby: Room, locale: Locale): LobbyState {
    const tr = (lobby.campaign?.translations as Record<string, { title?: string }> | undefined)?.[locale];
    const campaign = tr?.title || lobby.campaign?.title || '';
    return {
      id: lobby.id,
      title: lobby.title === lobby.campaign?.title ? campaign : lobby.title,
      code: lobby.code,
      campaignId: lobby.campaignId,
      campaign,
      center: lobby.organization.name,
      host: `${lobby.host.firstName} ${lobby.host.lastName}`.trim(),
      status: lobby.status,
      maxPlayers: lobby.maxPlayers,
      steps: requiredSteps(lobby.sessions[0]?.slots),
      createdAt: lobby.createdAt.toISOString(),
      startedAt: lobby.startedAt?.toISOString() ?? null,
      endedAt: lobby.endedAt?.toISOString() ?? null,
      elapsedMs: this.elapsed(lobby),
      standings: this.standings(lobby.players),
    };
  }

  private playable(organizationId: string, allowOfficial: boolean): Prisma.CampaignWhereInput {
    const now = new Date();
    return {
      status: 'PUBLISHED',
      AND: [{ OR: [{ availableFrom: null }, { availableFrom: { lte: now } }] }, { OR: [{ availableTo: null }, { availableTo: { gte: now } }] }, { OR: [{ organizationId }, ...(allowOfficial ? [{ organizationId: null }] : [])] }],
    };
  }

  private async hosted(id: string, actor: Actor): Promise<Room> {
    const lobby = await this.prisma.lobby.findUnique({ where: { id }, include });
    if (!lobby || !actor.organizationIds.includes(lobby.organizationId) || (actor.role === Role.TEACHER && lobby.hostId !== actor.id)) throw notFound('Room');
    return lobby;
  }

  private async member(claims: LobbyClaims) {
    const player = await this.prisma.lobbyPlayer.findUnique({ where: { lobbyId_userId: { lobbyId: claims.lid, userId: claims.sub } } });
    if (!player) throw roomNotFound();
    if (player.kicked) throw new ApiException('LOBBY_REMOVED', 'The teacher removed you from this room', 403);
    return player;
  }

  private async assertGameOpen() {
    const platform = await this.access.platform();
    if (!platform.gameEnabled) throw new ApiException('GAME_DISABLED', platform.maintenanceMessage || 'The game is closed for maintenance', 503);
  }

  private async withFreeCode<T>(work: (code: string) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await work(String(randomInt(100_000, 1_000_000)));
      } catch (error) {
        const taken = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
        if (!taken || attempt >= 8) throw error;
      }
    }
  }

  private freeName(wanted: string, taken: string[]): string {
    const lower = new Set(taken.map((n) => n.toLowerCase()));
    if (!lower.has(wanted.toLowerCase())) return wanted;
    for (let i = 2; ; i += 1) if (!lower.has(`${wanted} ${i}`.toLowerCase())) return `${wanted} ${i}`;
  }

  private leaveSession(sessionId: string) {
    return this.play.complete(sessionId, { requestId: `room-left-${sessionId}`.slice(0, 64), outcome: 'LEFT', stats: { pages: 0, caught: 0 } });
  }

  private async finish(lobby: Pick<Room, 'id' | 'players'>) {
    for (const p of lobby.players.filter((x) => x.sessionId && !x.finishedAt)) {
      await this.play.complete(p.sessionId!, { requestId: `room-end-${p.sessionId}`.slice(0, 64), outcome: 'TIMEOUT', stats: { pages: 0, caught: 0 } }).catch((error: unknown) => {
        // The player may have reached the door a moment earlier; anything else is a real failure.
        if (!(error instanceof ApiException && error.code === 'SESSION_FINISHED')) throw error;
      });
    }
    await this.prisma.lobby.updateMany({ where: { id: lobby.id, status: { not: 'FINISHED' } }, data: { status: 'FINISHED', endedAt: new Date() } });
  }

  /** Serverless has no timers, so a room past its time is closed by whoever looks at it. */
  private async closeIfOver(lobby: Room): Promise<boolean> {
    if (lobby.status === 'WAITING') {
      if (Date.now() - lobby.createdAt.getTime() < WAITING_HOURS * 3_600_000) return false;
    } else if (lobby.players.some((p) => !p.finishedAt)) {
      const session = await this.prisma.gameSession.findFirst({ where: { lobbyId: lobby.id }, select: { expiresAt: true } });
      if (!session?.expiresAt || session.expiresAt > new Date()) return false;
    }
    await this.finish(lobby);
    return true;
  }

  private async sweep(organizationId?: string) {
    await this.prisma.lobby.updateMany({ where: { status: 'WAITING', createdAt: { lt: new Date(Date.now() - WAITING_HOURS * 3_600_000) } }, data: { status: 'FINISHED', endedAt: new Date() } });
    if (!organizationId) return;
    const stale = await this.prisma.lobby.findMany({ where: { organizationId, status: 'RUNNING', sessions: { every: { expiresAt: { lt: new Date() } } } }, include: { players: { where: { kicked: false } } }, take: 10 });
    for (const lobby of stale) await this.finish(lobby);
  }
}
