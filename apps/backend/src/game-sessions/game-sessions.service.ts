import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { answerSchema, completeSessionSchema, createSessionSchema } from '@last-lesson/validation';
import { GAME } from '@last-lesson/constants';
import { Difficulty, Role, SessionStatus } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { QuestionsService } from '../questions/questions.service';
import { gradeAnswer } from '../questions/question-grading.util';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly questions: QuestionsService,
    private readonly audit: AuditService,
  ) {}

  async create(input: unknown, actor: Actor) {
    const data = createSessionSchema.parse(input);
    const organizationId = actor.role === Role.GAMER ? actor.organizationIds[0] : undefined;
    if (actor.role === Role.GAMER && !organizationId) {
      throw new BadRequestException('Join an educational center before starting a game');
    }
    const subject = await this.prisma.subject.findUnique({ where: { id: data.subjectId } });
    if (!subject || !subject.isActive) throw new BadRequestException('Subject not available');

    if (data.preparationId) {
      const prep = await this.prisma.preparation.findUnique({ where: { id: data.preparationId } });
      if (!prep || prep.userId !== actor.id) throw new ForbiddenException('Preparation not found for this player');
    }

    const topics = data.topics.length ? data.topics : (await this.preparationTopics(data.preparationId, actor.id));
    const questionSet = await this.questions.getPlayQuestions({
      subjectId: data.subjectId,
      topics,
      difficulty: data.difficulty as Difficulty,
      organizationId: organizationId ?? null,
      limit: GAME.QUESTION_COUNT,
    });
    if (questionSet.length === 0) {
      throw new BadRequestException('No questions are available for this subject and difficulty');
    }
    const session = await this.prisma.gameSession.create({
      data: {
        userId: actor.id,
        organizationId: organizationId ?? null,
        subjectId: data.subjectId,
        preparationId: data.preparationId ?? null,
        questionIds: questionSet.map((q) => q.id),
      },
    });
    return {
      sessionId: session.id,
      subject: { id: subject.id, name: subject.name, slug: subject.slug },
      questions: questionSet,
      timeLimitSeconds: 420,
      startedAt: session.startedAt,
    };
  }

  async submitAnswer(sessionId: string, input: unknown, actor: Actor) {
    const data = answerSchema.parse(input);
    const session = await this.getOwnedSession(sessionId, actor);
    if (session.status !== SessionStatus.IN_PROGRESS) throw new BadRequestException('Session already finished');
    if (!session.questionIds.includes(data.questionId)) {
      throw new BadRequestException('This question does not belong to the session');
    }
    const question = await this.questions.getById(data.questionId);
    const isCorrect = gradeAnswer(question.type, question.correctAnswer, data.answer);
    await this.prisma.gameAnswer.upsert({
      where: { sessionId_questionId: { sessionId, questionId: data.questionId } },
      create: {
        sessionId,
        questionId: data.questionId,
        answer: (data.answer ?? null) as object,
        isCorrect,
        points: isCorrect ? question.points : 0,
      },
      update: { answer: (data.answer ?? null) as object, isCorrect, points: isCorrect ? question.points : 0 },
    });
    const counts = await this.prisma.gameAnswer.aggregate({
      where: { sessionId },
      _count: { id: true },
      _sum: { points: true },
    });
    const correct = await this.prisma.gameAnswer.count({ where: { sessionId, isCorrect: true } });
    const answered = counts._count.id;
    const incorrect = answered - correct;
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        accuracy: answered ? Math.round((correct / answered) * 1000) / 10 : 0,
        score: counts._sum.points ?? 0,
      },
    });
    return { correct: isCorrect, explanation: question.explanation ?? null, correctAnswers: correct, incorrectAnswers: incorrect };
  }

  async complete(sessionId: string, input: unknown, actor: Actor) {
    const data = completeSessionSchema.parse(input);
    const session = await this.getOwnedSession(sessionId, actor);
    if (session.status !== SessionStatus.IN_PROGRESS) throw new BadRequestException('Session already finished');
    const answers = await this.prisma.gameAnswer.findMany({
      where: { sessionId },
      include: { question: { include: { topic: true } } },
    });
    const correct = answers.filter((a) => a.isCorrect).length;
    const incorrect = answers.length - correct;
    const topics = [
      ...new Set(
        answers
          .filter((a) => !a.isCorrect)
          .map((a) => a.question.topic?.name)
          .filter((name): name is string => Boolean(name)),
      ),
    ];
    const score = answers.reduce((sum, a) => sum + a.points, 0);
    const accuracy = answers.length ? Math.round((correct / answers.length) * 1000) / 10 : 0;
    const updated = await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: SessionStatus.COMPLETED,
        endedAt: new Date(),
        durationSeconds: data.durationSeconds,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        accuracy,
        score,
        topicsNeedImprovement: topics,
      },
    });
    const result = await this.prisma.gameResult.upsert({
      where: { sessionId },
      create: {
        sessionId,
        userId: session.userId,
        organizationId: session.organizationId,
        subjectId: session.subjectId,
        durationSeconds: data.durationSeconds,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        accuracy,
        topicsNeedImprovement: topics,
        completionStatus: SessionStatus.COMPLETED,
        score,
      },
      update: {
        durationSeconds: data.durationSeconds,
        correctAnswers: correct,
        incorrectAnswers: incorrect,
        accuracy,
        topicsNeedImprovement: topics,
        completionStatus: SessionStatus.COMPLETED,
        score,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: session.organizationId ?? undefined,
      action: 'GAME_COMPLETED',
      targetType: 'GameSession',
      targetId: sessionId,
      metadata: { accuracy, score },
    });
    return {
      sessionId,
      resultId: result.id,
      correctAnswers: correct,
      incorrectAnswers: incorrect,
      accuracy,
      durationSeconds: data.durationSeconds,
      score,
      topicsNeedImprovement: topics,
      completionStatus: SessionStatus.COMPLETED,
      updatedAt: updated.endedAt,
    };
  }

  async abandon(sessionId: string, actor: Actor) {
    const session = await this.getOwnedSession(sessionId, actor);
    if (session.status !== SessionStatus.IN_PROGRESS) return { message: 'Session already finished' };
    await this.prisma.gameSession.update({
      where: { id: sessionId },
      data: { status: SessionStatus.ABANDONED, endedAt: new Date() },
    });
    return { message: 'Session abandoned' };
  }

  async history(userId: string) {
    return this.prisma.gameSession.findMany({
      where: { userId },
      include: { subject: { select: { name: true, slug: true } }, result: true },
      orderBy: { startedAt: 'desc' },
      take: 100,
    });
  }

  async findOne(sessionId: string, actor: Actor) {
    const session = await this.getOwnedSession(sessionId, actor);
    return {
      ...session,
      subject: await this.prisma.subject.findUnique({ where: { id: session.subjectId }, select: { name: true } }),
    };
  }

  private async preparationTopics(preparationId: string | null | undefined, userId: string): Promise<string[]> {
    if (!preparationId) return [];
    const prep = await this.prisma.preparation.findUnique({ where: { id: preparationId } });
    if (!prep || prep.userId !== userId) throw new ForbiddenException('Preparation not found');
    return prep.topics;
  }

  private async getOwnedSession(sessionId: string, actor: Actor) {
    const session = await this.prisma.gameSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Game session not found');
    if (actor.role === Role.GAMER && session.userId !== actor.id) throw new ForbiddenException();
    if (actor.role === Role.CENTER_ADMIN && !actor.organizationIds.includes(session.organizationId ?? '')) {
      throw new ForbiddenException();
    }
    return session;
  }
}
