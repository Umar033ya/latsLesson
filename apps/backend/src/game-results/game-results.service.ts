import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ALL_GATES, type Locale } from '@last-lesson/scenario';
import { Role } from '@last-lesson/shared-types';
import { localizeQuestion } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { ApiException, notFound } from '../common/errors';
import { resolveOrg, type Actor } from '../common/actor';
import { PlayService } from '../game-sessions/play.service';
import type { ResultQuery } from './game-results.controller';

@Injectable()
export class GameResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly play: PlayService,
  ) {}

  async mine(userId: string) {
    const items = await this.prisma.gameSession.findMany({
      where: { userId, status: { not: 'IN_PROGRESS' } },
      select: { id: true, outcome: true, status: true, score: true, maxScore: true, accuracy: true, correctAnswers: true, incorrectAnswers: true, durationSeconds: true, topicsNeedImprovement: true, endedAt: true, campaign: { select: { id: true, title: true } } },
      orderBy: { endedAt: 'desc' },
      take: 100,
    });
    return items;
  }

  async organization(actor: Actor, q: ResultQuery) {
    const organizationId = resolveOrg(actor, q.organizationId);
    await this.play.finalizeExpired({ organizationId });
    const where: Prisma.GameSessionWhereInput = {
      organizationId,
      ...(q.groupId ? { groupId: q.groupId } : {}),
      ...(q.campaignId ? { campaignId: q.campaignId } : {}),
      ...(q.studentId ? { userId: q.studentId } : {}),
      ...(q.flagged === 'true' ? { NOT: { flags: { isEmpty: true } } } : {}),
      user: { isGuest: false, ...(q.search ? { OR: [{ firstName: { contains: q.search, mode: 'insensitive' } }, { lastName: { contains: q.search, mode: 'insensitive' } }] } : {}) },
    };
    const [total, items] = await Promise.all([
      this.prisma.gameSession.count({ where }),
      this.prisma.gameSession.findMany({
        where,
        select: {
          id: true, status: true, outcome: true, score: true, maxScore: true, accuracy: true, correctAnswers: true, incorrectAnswers: true, durationSeconds: true, flags: true, startedAt: true, endedAt: true, topicsNeedImprovement: true,
          user: { select: { id: true, firstName: true, lastName: true } },
          campaign: { select: { id: true, title: true } },
        },
        orderBy: { startedAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  }

  async review(sessionId: string, actor: Actor, locale: Locale) {
    const session = await this.prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: { user: { select: { id: true, firstName: true, lastName: true } }, campaign: { select: { id: true, title: true } }, lobby: { select: { status: true } }, answers: { include: { question: { include: { subject: { select: { name: true } }, topic: { select: { name: true } } } } }, orderBy: { answeredAt: 'asc' } } },
    });
    const allowed =
      session &&
      (actor.role === Role.SUPER_ADMIN ||
        (actor.role === Role.GAMER && session.userId === actor.id) ||
        (actor.role === Role.CENTER_ADMIN && session.organizationId !== null && actor.organizationIds.includes(session.organizationId)));
    if (!session || !allowed) throw notFound('Session');
    // Answers stay hidden while the same questions can still be answered.
    if (session.status === 'IN_PROGRESS' || (session.lobby?.status === 'RUNNING' && actor.role === Role.GAMER)) throw new ApiException('SESSION_IN_PROGRESS', 'The review opens when the session has ended', 409);
    return {
      id: session.id,
      student: session.user,
      campaign: session.campaign,
      outcome: session.outcome,
      status: session.status,
      score: session.score,
      maxScore: session.maxScore,
      accuracy: session.accuracy,
      durationSeconds: session.durationSeconds,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      flags: actor.role === Role.GAMER ? [] : session.flags,
      answers: session.answers.map((a) => ({ ...a, question: localizeQuestion(a.question, locale) })).map((a) => ({
        gate: ALL_GATES.find((g) => g.id === a.gateId)?.title ?? a.gateId,
        prompt: a.question.prompt,
        type: a.question.type,
        options: a.question.options,
        correctAnswer: a.question.correctAnswer,
        answer: a.answer,
        isCorrect: a.isCorrect,
        attempts: a.attempts,
        points: a.points,
        maxPoints: a.question.points,
        hintUsed: session.hintsUsed.includes(a.questionId),
        explanation: a.question.explanation,
        subject: a.question.subject.name,
        topic: a.question.topic?.name ?? null,
        difficulty: a.question.difficulty,
      })),
    };
  }
}
