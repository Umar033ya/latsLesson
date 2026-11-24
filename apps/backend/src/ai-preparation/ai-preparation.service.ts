import { Injectable } from '@nestjs/common';
import type { Prisma, Question } from '@prisma/client';
import type { z } from 'zod';
import type { Locale, QuestionKind } from '@last-lesson/scenario';
import { gradeAnswer, localizeQuestion, presentOptions, type preparationSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { invalid, notFound } from '../common/errors';
import { studentOrg, type Actor } from '../common/actor';
import { StudyGuideProvider } from './study-guide.provider';

interface Block {
  topic: string;
  text: string;
}
interface GeneratedQuestion {
  id: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
  correct: string;
  explanation: string;
}
/** Stored on the server only; `generated[].correct` is stripped before anything is sent to a student. */
interface StudyContent {
  summary: string;
  explanations: Block[];
  examples: Block[];
  practiceQuestionIds: string[];
  generated: GeneratedQuestion[];
}
const PRACTICE_COUNT = 5;

@Injectable()
export class AiPreparationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly provider: StudyGuideProvider,
  ) {}

  async create(data: z.infer<typeof preparationSchema>, actor: Actor, locale: Locale) {
    const organizationId = studentOrg(actor);
    const org = await this.access.operational(organizationId);
    const subject = await this.prisma.subject.findFirst({ where: { id: data.subjectId, isActive: true }, include: { topics: { where: { isActive: true } } } });
    if (!subject) throw invalid('Choose a subject');
    const topics = subject.topics.filter((t) => data.topics.some((name) => name.toLowerCase() === t.name.toLowerCase()));
    if (!topics.length) throw invalid('Choose at least one topic');
    const owned = { OR: [{ organizationId: null }, { organizationId }] };
    const topicIds = topics.map((t) => t.id);
    const [rawMaterials, pool] = await Promise.all([
      this.prisma.learningMaterial.findMany({ where: { AND: [owned], status: 'PUBLISHED', subjectId: subject.id, OR: [{ topicId: { in: topicIds } }, { topicId: null }] }, include: { topic: true } }),
      this.prisma.question.findMany({ where: { AND: [owned], status: 'PUBLISHED', isActive: true, subjectId: subject.id, topicId: { in: topicIds } }, include: { topic: true }, take: 120 }),
    ]);
    const materials = rawMaterials.map((m) => {
      const tr = (m.translations as Record<string, { title?: string; body?: string; examples?: string[] }>)?.[locale];
      return { ...m, title: tr?.title || m.title, body: tr?.body || m.body, examples: tr?.examples?.length ? tr.examples : m.examples };
    });
    const remote = (await this.access.features(org)).aiPreparation ? await this.provider.generate(subject.name, topics.map((t) => t.name), data.difficulty, locale) : null;
    const local = this.localGuide(subject.name, topics.map((t) => t.name), data.difficulty, materials, pool);
    const content: StudyContent = remote
      ? {
          summary: remote.summary,
          // A center's own materials always come first.
          explanations: [...local.explanations.filter((e) => materials.some((m) => m.organizationId && m.title === e.topic)), ...remote.explanations],
          examples: [...remote.examples, ...local.examples].slice(0, 8),
          practiceQuestionIds: local.practiceQuestionIds,
          generated: remote.practice.map((p, i) => ({ id: `g${i}`, prompt: p.prompt, options: p.options.map((text, n) => ({ id: String(n), text })), correct: String(p.correctIndex), explanation: p.explanation })),
        }
      : local;
    const preparation = await this.prisma.preparation.create({
      data: { userId: actor.id, subjectId: subject.id, topics: topics.map((t) => t.name), difficulty: data.difficulty, content: content as unknown as Prisma.InputJsonValue, provider: remote ? 'openai' : 'local' },
    });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'PREPARATION_CREATED', targetType: 'Preparation', targetId: preparation.id, category: 'ACTIVITY', metadata: { subject: subject.name, provider: preparation.provider } });
    return this.findOne(preparation.id, actor, locale);
  }

  async mine(userId: string) {
    return this.prisma.preparation.findMany({ where: { userId }, select: { id: true, topics: true, difficulty: true, provider: true, createdAt: true, subject: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' }, take: 30 });
  }

  async findOne(id: string, actor: Actor, locale: Locale) {
    const prep = await this.owned(id, actor);
    const content = prep.content as unknown as StudyContent;
    const questions = await this.prisma.question.findMany({ where: { id: { in: content.practiceQuestionIds } } });
    const ordered = content.practiceQuestionIds.map((qid) => questions.find((q) => q.id === qid)).filter((q): q is Question => Boolean(q)).map((q) => localizeQuestion(q, locale));
    return {
      id: prep.id,
      subject: prep.subject,
      topics: prep.topics,
      difficulty: prep.difficulty,
      provider: prep.provider,
      createdAt: prep.createdAt,
      summary: content.summary,
      explanations: content.explanations,
      examples: content.examples,
      practice: [
        ...ordered.map((q) => ({ id: q.id, type: q.type, prompt: q.prompt, options: presentOptions(q.type as QuestionKind, q.options, `${prep.id}:${q.id}`, q.correctAnswer), hint: q.hint })),
        ...(content.generated ?? []).map((g) => ({ id: g.id, type: 'MULTIPLE_CHOICE', prompt: g.prompt, options: presentOptions('MULTIPLE_CHOICE', g.options, `${prep.id}:${g.id}`), hint: null })),
      ],
    };
  }

  /** Practice is graded but never recorded as a result. */
  async practice(id: string, input: { questionId: string; answer: unknown }, actor: Actor, locale: Locale) {
    const prep = await this.owned(id, actor);
    const content = prep.content as unknown as StudyContent;
    const generated = content.generated?.find((g) => g.id === input.questionId);
    if (generated) return { correct: gradeAnswer('MULTIPLE_CHOICE', generated.correct, input.answer), explanation: generated.explanation || null, correctAnswer: generated.correct };
    if (!content.practiceQuestionIds.includes(input.questionId)) throw invalid('This question is not part of the study guide');
    const q = localizeQuestion(await this.prisma.question.findUniqueOrThrow({ where: { id: input.questionId } }), locale);
    return { correct: gradeAnswer(q.type as QuestionKind, q.correctAnswer, input.answer), explanation: q.explanation, correctAnswer: q.correctAnswer };
  }

  private async owned(id: string, actor: Actor) {
    const prep = await this.prisma.preparation.findFirst({ where: { id, userId: actor.id }, include: { subject: { select: { id: true, name: true } } } });
    if (!prep) throw notFound('Study guide');
    return prep;
  }

  private localGuide(
    subject: string,
    topics: string[],
    difficulty: string,
    materials: Array<{ title: string; body: string; examples: string[]; topic: { name: string } | null }>,
    pool: Array<Question & { topic: { name: string } | null }>,
  ): StudyContent {
    const covered = new Set(materials.map((m) => m.topic?.name).filter(Boolean));
    const explanations: Block[] = materials.map((m) => ({ topic: m.title, text: m.body }));
    for (const topic of topics.filter((t) => !covered.has(t))) {
      const facts = [...new Set(pool.filter((q) => q.topic?.name === topic && q.explanation).map((q) => q.explanation!))].slice(0, 4);
      if (facts.length) explanations.push({ topic, text: facts.join(' ') });
    }
    const order = { EASY: 0, MEDIUM: 1, HARD: 2 } as Record<string, number>;
    const ranked = [...pool].sort((a, b) => Math.abs(order[a.difficulty] - order[difficulty]) - Math.abs(order[b.difficulty] - order[difficulty]) || Math.random() - 0.5);
    return {
      summary: 'Read the notes, try the practice questions, then go in. The questions inside will be different.',
      explanations: explanations.length ? explanations : [{ topic: topics.join(', '), text: 'Your center has not added notes for this topic yet. Use the practice questions below.' }],
      examples: materials.flatMap((m) => m.examples.map((text) => ({ topic: m.title, text }))).slice(0, 8),
      practiceQuestionIds: ranked.slice(0, PRACTICE_COUNT).map((q) => q.id),
      generated: [],
    };
  }
}
