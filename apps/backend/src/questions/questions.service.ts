import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createQuestionSchema } from '@last-lesson/validation';
import { Difficulty, Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: Actor, filters: { subjectId?: string; difficulty?: Difficulty; organizationId?: string }) {
    const organizationId =
      actor.role === 'CENTER_ADMIN' ? { in: [...actor.organizationIds, ''] } : filters.organizationId;
    const where: any = {
      isActive: true,
      ...(filters.subjectId ? { subjectId: filters.subjectId } : {}),
      ...(filters.difficulty ? { difficulty: filters.difficulty } : {}),
      ...(actor.role === 'CENTER_ADMIN'
        ? { OR: [{ organizationId: null }, { organizationId: { in: actor.organizationIds } }] }
        : organizationId
          ? { OR: [{ organizationId: null }, { organizationId }] }
          : {}),
    };
    const items = await this.prisma.question.findMany({
      where,
      include: { subject: { select: { name: true } }, topic: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    // Admin listing deliberately exposes correct answers for authoring purposes.
    return items;
  }

  async create(input: unknown, actor: Actor) {
    const data = createQuestionSchema.parse(input);
    if (actor.role === 'CENTER_ADMIN') {
      if (!data.organizationId || !actor.organizationIds.includes(data.organizationId)) {
        throw new ForbiddenException('Center admins may only create questions for their own organization');
      }
    }
    const organizationId = data.organizationId ?? null;
    if (organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: organizationId } });
      if (!org) throw new NotFoundException('Organization not found');
    }
    const question = await this.prisma.question.create({
      data: {
        subjectId: data.subjectId,
        topicId: data.topicId ?? null,
        organizationId,
        createdById: actor.id,
        type: data.type,
        difficulty: data.difficulty,
        prompt: data.prompt,
        options: data.options as object,
        correctAnswer: data.correctAnswer as object,
        explanation: data.explanation ?? null,
        points: data.points,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: organizationId ?? undefined,
      action: 'QUESTION_CREATED',
      targetType: 'Question',
      targetId: question.id,
    });
    return question;
  }

  async setActive(id: string, isActive: boolean, actor: Actor) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (actor.role === 'CENTER_ADMIN' && question.organizationId !== null && !actor.organizationIds.includes(question.organizationId)) {
      throw new ForbiddenException();
    }
    return this.prisma.question.update({ where: { id }, data: { isActive } });
  }

  async remove(id: string, actor: Actor) {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    if (actor.role === 'CENTER_ADMIN') {
      if (!question.organizationId || !actor.organizationIds.includes(question.organizationId)) {
        throw new ForbiddenException('Global questions can only be removed by super admins');
      }
    }
    await this.prisma.question.delete({ where: { id } });
    return { message: 'Question deleted' };
  }

  /** Sanitized question payload for the browser: no correctAnswer, no explanation. */
  async getPlayQuestions(input: {
    subjectId: string;
    topics: string[];
    difficulty: Difficulty;
    organizationId?: string | null;
    limit?: number;
  }) {
    const topicFilters =
      input.topics.length > 0
        ? [
            {
              OR: [
                { topic: { name: { in: input.topics, mode: 'insensitive' as const } } },
                { topic: { slug: { in: input.topics } } },
              ],
            },
          ]
        : [];
    const questions = await this.prisma.question.findMany({
      where: {
        isActive: true,
        subjectId: input.subjectId,
        difficulty: input.difficulty,
        AND: [
          ...topicFilters,
          {
            OR: [
              { organizationId: null },
              ...(input.organizationId ? [{ organizationId: input.organizationId }] : []),
            ],
          },
        ],
      },
      include: { topic: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
      take: input.limit ?? 20,
    });
    return questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      difficulty: q.difficulty,
      topicId: q.topicId,
      topicName: q.topic?.name ?? null,
      points: q.points,
    }));
  }

  async getById(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id }, include: { topic: true, subject: true } });
    if (!q) throw new NotFoundException();
    return q;
  }
}
