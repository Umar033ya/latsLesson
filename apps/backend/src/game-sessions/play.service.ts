import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, type GameAnswer, type GameSession } from '@prisma/client';
import { ALL_GATES, INTEGRITY, type LessonCard, type Locale, SCORING, type AnswerResponse, type PlayQuestion, type PlaySession, type QuestionKind, type SessionSummary } from '@last-lesson/scenario';
import { gradeAnswer, localizeQuestion, presentOptions, type CompleteInput, type PlayAnswerInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { ApiException, invalid, notFound } from '../common/errors';
import { sha256 } from '../common/crypto.util';
import type { Slot } from '../campaigns/question-picker';
import type { GameClaims } from './game-token.guard';
import { closeLobbyWhenDone } from '../lobbies/lobby-close';
import type { SessionConfig } from './game-sessions.service';

interface HistoryEntry {
  requestId: string;
  answer: unknown;
  correct: boolean;
  ms: number;
  at: string;
}
const finished = () => new ApiException('SESSION_FINISHED', 'This session is already finished', 409);
const slotsOf = (s: { slots: Prisma.JsonValue }) => (s.slots ?? []) as unknown as Slot[];
const configOf = (s: { config: Prisma.JsonValue }) => s.config as unknown as SessionConfig;
const historyOf = (a: GameAnswer) => (a.history ?? []) as unknown as HistoryEntry[];
const GATE = new Map(ALL_GATES.map((g) => [g.id, g]));
/** Seconds of play credited per request; pauses longer than this do not inflate the duration. */
const MAX_TICK = 45;

@Injectable()
export class PlayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  async exchange(ticket: string, locale: Locale) {
    const bad = () => new ApiException('TICKET_INVALID', 'This game link was already used or has expired. Open the game again from your student page.', 401);
    const tokenHash = sha256(ticket);
    // Conditional update: a ticket can be exchanged exactly once, even by two parallel requests.
    const claimed = await this.prisma.launchTicket.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (claimed.count !== 1) throw bad();
    const row = await this.prisma.launchTicket.findUniqueOrThrow({ where: { tokenHash }, include: { user: true, session: true } });
    if (row.user.status !== 'ACTIVE' || row.session.userId !== row.userId) throw bad();
    if (row.session.organizationId) await this.access.operational(row.session.organizationId);
    const token = await this.jwt.signAsync({ sub: row.userId, sid: row.sessionId }, { secret: process.env.GAME_TOKEN_SECRET, audience: 'game', expiresIn: '12h', algorithm: 'HS256' });
    return { token, session: await this.session({ sub: row.userId, sid: row.sessionId }, locale) };
  }

  async session(game: GameClaims, locale: Locale = 'en'): Promise<PlaySession> {
    const session = await this.prisma.gameSession.findFirst({ where: { id: game.sid, userId: game.sub }, include: { user: true, answers: true, lobby: true, lobbyPlayer: true } });
    if (!session) throw notFound('Session');
    const config = configOf(session);
    const slots = slotsOf(session);
    const questions = await this.prisma.question.findMany({ where: { id: { in: session.questionIds } }, include: { subject: { select: { name: true } }, topic: { select: { name: true } } } });
    const byId = new Map(questions.map((q) => [q.id, localizeQuestion(q, locale)]));
    const lessons = config.gameplay.lessonCards === false ? new Map<string, LessonCard>() : await this.lessons(questions, session.organizationId, locale);
    const play: PlayQuestion[] = [];
    for (const { gateId, questionId } of slots) {
      const q = byId.get(questionId);
      if (!q) continue;
      const type = q.type as QuestionKind;
      play.push({
        id: q.id,
        gateId,
        type,
        prompt: q.prompt,
        options: presentOptions(type, q.options, `${session.id}:${q.id}`, q.correctAnswer),
        difficulty: q.difficulty,
        subject: q.subject.name,
        topic: q.topic?.name ?? null,
        points: q.points,
        hasHint: Boolean(q.hint),
        lesson: GATE.get(gateId)?.section === 'hiding' ? null : (lessons.get(q.topicId ?? '') ?? null),
      });
    }
    return {
      sessionId: session.id,
      locale,
      campaign: { id: session.campaignId ?? '', title: config.campaignTitle, objectives: config.objectives },
      student: { firstName: session.user.firstName, lastName: session.user.lastName },
      branding: config.branding,
      gameplay: config.gameplay,
      content: config.content,
      sections: config.sections,
      questions: play,
      progress: session.answers.map((a) => ({ gateId: a.gateId, attempts: a.attempts, correct: a.isCorrect, resolved: a.resolved })),
      hintsUsed: session.hintsUsed.length,
      startedAt: session.startedAt.toISOString(),
      expiresAt: (session.expiresAt ?? session.startedAt).toISOString(),
      checkpoint: session.checkpoint ? { seq: session.checkpointSeq, state: session.checkpoint } : null,
      status: session.status,
      lobby:
        session.lobby && session.lobbyPlayer
          ? {
              id: session.lobby.id,
              title: session.lobby.title,
              playerId: session.lobbyPlayer.id,
              nickname: session.lobbyPlayer.nickname,
              color: session.lobbyPlayer.color,
              elapsedMs: Math.max(0, Date.now() - session.startedAt.getTime()),
            }
          : null,
    };
  }

  /** One prepared note per topic: the center's own first, then the official one. */
  private async lessons(questions: Array<{ topicId: string | null }>, organizationId: string | null, locale: Locale) {
    const topicIds = [...new Set(questions.map((q) => q.topicId).filter((id): id is string => Boolean(id)))];
    const rows = await this.prisma.learningMaterial.findMany({ where: { topicId: { in: topicIds }, status: 'PUBLISHED', OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] }, orderBy: { createdAt: 'desc' } });
    const map = new Map<string, LessonCard>();
    for (const m of [...rows].sort((a, b) => Number(b.organizationId !== null) - Number(a.organizationId !== null))) {
      if (!m.topicId || map.has(m.topicId)) continue;
      const tr = (m.translations as Record<string, { title?: string; body?: string; examples?: string[] }>)?.[locale];
      map.set(m.topicId, { title: tr?.title || m.title, body: tr?.body || m.body, example: (tr?.examples?.[0] ?? m.examples[0]) || null });
    }
    return map;
  }

  async answer(game: GameClaims, input: PlayAnswerInput, locale: Locale = 'en'): Promise<AnswerResponse> {
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lock(tx, game);
      const config = configOf(session);
      const slots = slotsOf(session);
      if (!slots.some((s) => s.gateId === input.gateId && s.questionId === input.questionId)) throw invalid('This question is not part of the session');
      const question = localizeQuestion(await tx.question.findUniqueOrThrow({ where: { id: input.questionId } }), locale);
      const answers = await tx.gameAnswer.findMany({ where: { sessionId: session.id } });
      const existing = answers.find((a) => a.questionId === input.questionId);
      const limit = GATE.get(input.gateId)?.section === 'hiding' ? 1 : config.gameplay.attemptsPerQuestion;

      const replay = existing && historyOf(existing).findIndex((h) => h.requestId === input.requestId);
      if (existing && replay !== undefined && replay >= 0) {
        const entry = historyOf(existing)[replay];
        const resolved = entry.correct || replay + 1 >= limit;
        return { correct: entry.correct, resolved, attemptsLeft: Math.max(0, limit - replay - 1), explanation: resolved ? question.explanation : null, points: entry.correct ? existing.points : 0 };
      }
      if (existing?.resolved) throw new ApiException('ALREADY_RESOLVED', 'This question was already answered', 409);

      // The final paper opens only after the rest of the required path.
      if (GATE.get(input.gateId)?.section === 'lobby') {
        const missing = slots.filter((s) => GATE.get(s.gateId)?.required && GATE.get(s.gateId)?.section !== 'lobby' && !answers.some((a) => a.questionId === s.questionId && a.resolved));
        if (missing.length) throw new ApiException('GATE_LOCKED', 'Other questions must be answered first', 409);
      }

      const attempts = (existing?.attempts ?? 0) + 1;
      const correct = gradeAnswer(question.type as QuestionKind, question.correctAnswer, input.answer);
      const resolved = correct || attempts >= limit;
      const factor = SCORING.attemptFactor[Math.min(attempts, SCORING.attemptFactor.length) - 1] * (session.hintsUsed.includes(question.id) ? SCORING.hintFactor : 1);
      const points = correct ? Math.round(question.points * factor) : 0;
      const entry: HistoryEntry = { requestId: input.requestId, answer: input.answer ?? null, correct, ms: input.elapsedMs, at: new Date().toISOString() };
      const history = [...(existing ? historyOf(existing) : []), entry].slice(-10) as unknown as Prisma.InputJsonValue;
      const data = { answer: (input.answer ?? Prisma.JsonNull) as Prisma.InputJsonValue, isCorrect: correct, points, attempts, resolved, history, answeredAt: new Date() };
      await tx.gameAnswer.upsert({
        where: { sessionId_questionId: { sessionId: session.id, questionId: question.id } },
        create: { sessionId: session.id, questionId: question.id, gateId: input.gateId, ...data },
        update: data,
      });
      const all = [...answers.filter((a) => a.questionId !== question.id), { ...data, isCorrect: correct }];
      await tx.gameSession.update({
        where: { id: session.id },
        data: { ...this.tick(session), correctAnswers: all.filter((a) => a.isCorrect).length, incorrectAnswers: all.filter((a) => !a.isCorrect).length, score: all.reduce((sum, a) => sum + a.points, 0) },
      });
      if (session.lobbyId) {
        const solved = new Set(all.filter((a) => a.resolved).map((a) => ('questionId' in a ? a.questionId : question.id)));
        const progress = slots.filter((s) => GATE.get(s.gateId)?.required && solved.has(s.questionId)).length;
        await tx.lobbyPlayer.updateMany({ where: { sessionId: session.id }, data: { progress, score: all.reduce((sum, a) => sum + a.points, 0) } });
      }
      return { correct, resolved, attemptsLeft: Math.max(0, limit - attempts), explanation: resolved ? question.explanation : null, points };
    });
  }

  async hint(game: GameClaims, questionId: string, locale: Locale = 'en') {
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lock(tx, game);
      if (!session.questionIds.includes(questionId)) throw invalid('This question is not part of the session');
      const question = localizeQuestion(await tx.question.findUniqueOrThrow({ where: { id: questionId } }), locale);
      if (!question.hint) throw notFound('Hint');
      const allowed = configOf(session).gameplay.hintsPerSession;
      if (!session.hintsUsed.includes(questionId)) {
        if (session.hintsUsed.length >= allowed) throw new ApiException('NO_HINTS_LEFT', 'No hints left', 409);
        await tx.gameSession.update({ where: { id: session.id }, data: { hintsUsed: { push: questionId } } });
      }
      const used = new Set([...session.hintsUsed, questionId]).size;
      return { hint: question.hint, hintsLeft: Math.max(0, allowed - used) };
    });
  }

  /** Out-of-order saves (a slow request arriving late) are ignored instead of overwriting newer progress. */
  async checkpoint(game: GameClaims, input: { seq: number; state: Record<string, unknown> }) {
    return this.prisma.$transaction(async (tx) => {
      const session = await this.lock(tx, game);
      const newer = input.seq > session.checkpointSeq;
      await tx.gameSession.update({ where: { id: session.id }, data: { ...this.tick(session), ...(newer ? { checkpoint: input.state as Prisma.InputJsonValue, checkpointSeq: input.seq } : {}) } });
      return { saved: newer, seq: Math.max(input.seq, session.checkpointSeq) };
    });
  }

  async completeOwned(game: GameClaims, input: CompleteInput, locale: Locale = 'en') {
    const session = await this.prisma.gameSession.findFirst({ where: { id: game.sid, userId: game.sub } });
    if (!session) throw notFound('Session');
    return this.complete(session.id, input, locale);
  }

  /** Scores and outcome come from stored answers only. Safe to call again after a lost response. */
  async complete(sessionId: string, input: CompleteInput, locale: Locale = 'en'): Promise<SessionSummary> {
    const { summary, lobbyId } = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "GameSession" WHERE id = ${sessionId}::uuid FOR UPDATE`;
      const session = await tx.gameSession.findUniqueOrThrow({ where: { id: sessionId }, include: { answers: { include: { question: { include: { topic: true } } } } } });
      const mistakes = session.answers.filter((a) => !a.isCorrect).map((a) => localizeQuestion(a.question, locale)).map((q) => ({ prompt: q.prompt, explanation: q.explanation }));
      if (session.status !== 'IN_PROGRESS') {
        if ((session.completionRequestId && session.completionRequestId === input.requestId) || input.outcome === 'LEFT') return { summary: this.summary(session, mistakes), lobbyId: null };
        throw finished();
      }
      const slots = slotsOf(session);
      const questions = await tx.question.findMany({ where: { id: { in: session.questionIds } }, select: { id: true, points: true } });
      const answers = session.answers;
      const onPath = new Set(slots.filter((s) => GATE.get(s.gateId)?.section !== 'hiding' || answers.some((a) => a.questionId === s.questionId)).map((s) => s.questionId));
      const maxScore = questions.filter((q) => onPath.has(q.id)).reduce((sum, q) => sum + q.points, 0);
      const flags = new Set(session.flags);

      const required = slots.filter((s) => GATE.get(s.gateId)?.required);
      const unresolved = required.filter((s) => !answers.some((a) => a.questionId === s.questionId && a.resolved));
      let outcome = input.outcome;
      if ((outcome === 'ESCAPED' || outcome === 'DISMISSED') && unresolved.length) {
        // The client claims an escape the server never saw. Keep the answers, drop the claim.
        flags.add('OUTCOME_REJECTED');
        outcome = 'LEFT';
      }
      const seconds = (Date.now() - session.startedAt.getTime()) / 1000;
      if (answers.length >= 3 && seconds < answers.length * INTEGRITY.minSecondsPerGate) flags.add('TOO_FAST');
      const rapid = answers.flatMap(historyOf).filter((h) => h.ms < INTEGRITY.rapidAnswerMs).length;
      if (rapid >= 3) flags.add('RAPID_ANSWERS');

      const correct = answers.filter((a) => a.isCorrect).length;
      const incorrect = answers.length - correct;
      const accuracy = answers.length ? Math.round((correct / answers.length) * 1000) / 10 : 0;
      const score = answers.reduce((sum, a) => sum + a.points, 0);
      const topics = [...new Set(answers.filter((a) => !a.isCorrect || a.attempts > 1).map((a) => a.question.topic?.name).filter((n): n is string => Boolean(n)))];
      const status = outcome === 'LEFT' ? ('ABANDONED' as const) : ('COMPLETED' as const);
      const durationSeconds = Math.max(1, Math.min(Math.round(seconds), this.tick(session).durationSeconds));
      const shared = { durationSeconds, correctAnswers: correct, incorrectAnswers: incorrect, accuracy, score, maxScore, topicsNeedImprovement: topics, outcome, flags: [...flags] };
      const updated = await tx.gameSession.update({ where: { id: sessionId }, data: { ...shared, status, endedAt: new Date(), lastSeenAt: new Date(), completionRequestId: input.requestId } });
      await tx.gameResult.upsert({
        where: { sessionId },
        create: { sessionId, userId: session.userId, organizationId: session.organizationId, campaignId: session.campaignId, groupId: session.groupId, completionStatus: status, ...shared },
        update: { completionStatus: status, ...shared },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.userId,
          organizationId: session.organizationId,
          action: flags.size ? 'GAME_RESULT_FLAGGED' : status === 'COMPLETED' ? 'GAME_COMPLETED' : 'GAME_LEFT',
          targetType: 'GameSession',
          targetId: sessionId,
          category: flags.size ? 'SECURITY' : 'ACTIVITY',
          metadata: { outcome, accuracy, score, flags: [...flags], stats: input.stats },
        },
      });
      if (session.lobbyId) {
        // The race is measured by the server clock from the common start, pauses included.
        await tx.lobbyPlayer.updateMany({ where: { sessionId, finishedAt: null }, data: { outcome, score, finishedAt: new Date(), durationMs: Math.round(seconds * 1000) } });
      }
      return { summary: this.summary(updated, mistakes), lobbyId: session.lobbyId };
    });
    if (lobbyId) await closeLobbyWhenDone(this.prisma, lobbyId);
    return summary;
  }

  /** Lazily closes sessions whose window has passed. Runs on demand: serverless has no background timer. */
  async finalizeExpired(where: { userId?: string; organizationId?: string }) {
    const stale = await this.prisma.gameSession.findMany({ where: { ...where, status: 'IN_PROGRESS', expiresAt: { lt: new Date() } }, select: { id: true }, take: 25 });
    for (const { id } of stale) await this.complete(id, { requestId: `expired-${id}`, outcome: 'LEFT', stats: { pages: 0, caught: 0 } }).catch(() => undefined);
  }

  private async lock(tx: Prisma.TransactionClient, game: GameClaims): Promise<GameSession> {
    await tx.$queryRaw`SELECT id FROM "GameSession" WHERE id = ${game.sid}::uuid FOR UPDATE`;
    const session = await tx.gameSession.findFirst({ where: { id: game.sid, userId: game.sub } });
    if (!session) throw notFound('Session');
    if (session.status !== 'IN_PROGRESS') throw finished();
    if (session.expiresAt && session.expiresAt < new Date()) throw new ApiException('SESSION_EXPIRED', 'This session has expired. Start a new one from your student page.', 409);
    return session;
  }

  /** Active play time measured by the server between requests. */
  private tick(session: { lastSeenAt: Date | null; startedAt: Date; durationSeconds: number }) {
    const last = session.lastSeenAt ?? session.startedAt;
    const delta = Math.min(MAX_TICK, Math.max(0, (Date.now() - last.getTime()) / 1000));
    return { durationSeconds: Math.round(session.durationSeconds + delta), lastSeenAt: new Date() };
  }

  private summary(s: GameSession, mistakes: SessionSummary['mistakes'] = []): SessionSummary {
    return {
      sessionId: s.id,
      outcome: s.outcome ?? 'LEFT',
      score: s.score,
      maxScore: s.maxScore,
      accuracy: s.accuracy,
      correctAnswers: s.correctAnswers,
      incorrectAnswers: s.incorrectAnswers,
      durationSeconds: s.durationSeconds,
      topicsNeedImprovement: s.topicsNeedImprovement,
      mistakes,
    };
  }
}
