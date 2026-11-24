import { Injectable } from '@nestjs/common';
import type { Facing, LobbySync, PhraseId } from '@last-lesson/scenario';
import type { LobbySyncInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { notFound } from '../common/errors';
import type { GameClaims } from '../game-sessions/game-token.guard';
import { LobbiesService, requiredSteps } from './lobbies.service';

/** One phrase a second is enough to talk and too little to flood the screen. */
const PHRASE_GAP_MS = 1000;

/**
 * Live positions over plain requests: each game posts its own state and receives everybody else's.
 * It works on serverless hosting, where no process lives long enough to hold sockets.
 */
@Injectable()
export class LobbySyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lobbies: LobbiesService,
  ) {}

  async sync(game: GameClaims, input: LobbySyncInput | null): Promise<LobbySync> {
    const me = await this.prisma.lobbyPlayer.findFirst({ where: { sessionId: game.sid, userId: game.sub } });
    if (!me) throw notFound('Room');
    const now = new Date();
    if (!me.kicked) {
      const speaks = input?.phrase && now.getTime() - (me.phraseAt?.getTime() ?? 0) >= PHRASE_GAP_MS;
      const { x, y, dir, moving, hidden } = input ?? me;
      await this.prisma.lobbyPlayer.update({ where: { id: me.id }, data: { lastSeenAt: now, x, y, dir, moving, hidden, ...(speaks ? { phrase: input.phrase, phraseAt: now } : {}) } });
    }
    const lobby = await this.prisma.lobby.findUniqueOrThrow({ where: { id: me.lobbyId }, include: { players: { where: { kicked: false }, orderBy: { joinedAt: 'asc' } }, sessions: { select: { slots: true }, take: 1 } } });
    return {
      status: me.kicked ? 'REMOVED' : lobby.status,
      elapsedMs: this.lobbies.elapsed(lobby),
      steps: requiredSteps(lobby.sessions[0]?.slots),
      standings: this.lobbies.standings(lobby.players),
      peers: lobby.players
        .filter((p) => p.id !== me.id)
        .map((p) => ({
          id: p.id,
          nickname: p.nickname,
          color: p.color,
          x: p.x,
          y: p.y,
          dir: p.dir as Facing,
          moving: p.moving,
          hidden: p.hidden,
          finished: Boolean(p.finishedAt),
          phrase: p.phrase as PhraseId | null,
          phraseAt: p.phraseAt?.getTime() ?? 0,
        })),
    };
  }
}
