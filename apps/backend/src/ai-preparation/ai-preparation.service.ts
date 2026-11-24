import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { preparationSchema } from '@last-lesson/validation';
import { Difficulty, Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

interface StudyContent {
  summary: string;
  explanations: Array<{ topic: string; text: string }>;
  examples: Array<{ topic: string; text: string }>;
  practiceQuestionIds: string[];
}

@Injectable()
export class AiPreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {}

  async create(input: unknown, actor: Actor) {
    const data = preparationSchema.parse(input);
    const subject = await this.prisma.subject.findUnique({
      where: { id: data.subjectId },
      include: { topics: true },
    });
    if (!subject || !subject.isActive) throw new BadRequestException('Subject not available');

    const questions = await this.prisma.question.findMany({
      where: {
        subjectId: data.subjectId,
        difficulty: data.difficulty,
        isActive: true,
        OR: [
          { organizationId: null },
          ...(actor.organizationIds.length ? [{ organizationId: { in: actor.organizationIds } }] : []),
        ],
      },
      include: { topic: true },
      take: 30,
    });

    const provider = (this.config.get<string>('AI_PROVIDER') ?? 'local').toLowerCase();
    const content =
      provider === 'openai'
        ? await this.remoteStudyGuide(subject.name, data.topics, data.difficulty, questions)
        : this.localStudyGuide(subject.name, data.topics, data.difficulty, questions);

    const preparation = await this.prisma.preparation.create({
      data: {
        userId: actor.id,
        subjectId: data.subjectId,
        topics: data.topics,
        difficulty: data.difficulty,
        content: content as object,
        provider: provider === 'openai' ? 'openai' : 'local',
      },
    });
    await this.audit.log({
      actorId: actor.id,
      action: 'PREPARATION_CREATED',
      targetType: 'Preparation',
      targetId: preparation.id,
      metadata: { subject: subject.name, topics: data.topics, provider },
    });
    return preparation;
  }

  async mine(userId: string) {
    return this.prisma.preparation.findMany({
      where: { userId },
      include: { subject: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findOne(id: string, actor: Actor) {
    const prep = await this.prisma.preparation.findUnique({
      where: { id },
      include: { subject: true },
    });
    if (!prep) throw new NotFoundException('Preparation not found');
    if (actor.role === Role.GAMER && prep.userId !== actor.id) throw new ForbiddenException();
    return prep;
  }

  private localStudyGuide(
    subjectName: string,
    topics: string[],
    difficulty: Difficulty,
    questions: Array<{ id: string; prompt: string; explanation: string | null; topic: { name: string } | null }>,
  ): StudyContent {
    const selected = questions.filter((q) => !q.topic || topics.some((t) => q.topic?.name.toLowerCase() === t.toLowerCase()));
    const pool = selected.length > 0 ? selected : questions;
    const byTopic = new Map<string, typeof pool>();
    for (const q of pool) {
      const key = q.topic?.name ?? 'Core concepts';
      byTopic.set(key, [...(byTopic.get(key) ?? []), q]);
    }
    const explanations = [...byTopic.entries()].map(([topic, items]) => ({
      topic,
      text:
        items
          .map((q) => q.explanation || `Review this ${difficulty.toLowerCase()} problem: ${q.prompt}`)
          .slice(0, 3)
          .join(' '),
    }));
    const examples = pool.slice(0, 4).map((q) => ({ topic: q.topic?.name ?? 'Core concepts', text: q.prompt }));
    return {
      summary: `${subjectName} preparation for ${topics.join(', ')} (${difficulty.toLowerCase()}). Work through the explanations, then apply them in the practice questions below before entering the school.`,
      explanations: explanations.length
        ? explanations
        : [{ topic: topics.join(', '), text: `Review the fundamentals of ${subjectName}: ${topics.join(', ')}.` }],
      examples,
      practiceQuestionIds: pool.slice(0, 10).map((q) => q.id as unknown as string),
      // The id list is kept for auditing; the actual bank questions are fetched separately at game start.
    } as StudyContent;
  }

  private async remoteStudyGuide(
    subjectName: string,
    topics: string[],
    difficulty: Difficulty,
    questions: Array<{ id: string; prompt: string }>,
  ): Promise<StudyContent> {
    const apiKey = this.config.get<string>('AI_API_KEY');
    if (!apiKey) throw new BadRequestException('AI preparation provider is not configured');
    const baseUrl = this.config.get<string>('AI_BASE_URL') ?? 'https://api.openai.com/v1';
    const model = this.config.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are a study tutor. Return strict JSON with keys summary, explanations (array of {topic,text}), examples (array of {topic,text}). Never invent answers to gameplay questions.',
          },
          {
            role: 'user',
            content: `Subject: ${subjectName}. Topics: ${topics.join(', ')}. Difficulty: ${difficulty}. Bank prompts for context: ${questions.map((q) => q.prompt).join(' | ')}`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });
    if (!response.ok) throw new BadRequestException('AI preparation provider is unavailable');
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    let parsed: any = {};
    try {
      parsed = JSON.parse(payload.choices?.[0]?.message?.content ?? '{}');
    } catch {
      parsed = {};
    }
    return {
      summary: String(parsed.summary ?? `Study guide for ${subjectName}: ${topics.join(', ')}.`),
      explanations: Array.isArray(parsed.explanations) ? parsed.explanations : [],
      examples: Array.isArray(parsed.examples) ? parsed.examples : [],
      practiceQuestionIds: questions.slice(0, 10).map((q) => q.id),
    };
  }
}
