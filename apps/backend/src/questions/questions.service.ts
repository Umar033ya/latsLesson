import { Injectable } from '@nestjs/common';
import { Prisma, type Question } from '@prisma/client';
import type { QuestionKind } from '@last-lesson/scenario';
import { createQuestionSchema, importQuestionSchema, validateQuestionContent, type CreateQuestionInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { forbidden, invalid, notFound } from '../common/errors';
import { resolveOrg, type Actor } from '../common/actor';
import type { QuestionQuery } from './questions.controller';

const include = { subject: { select: { id: true, name: true, slug: true, color: true } }, topic: { select: { id: true, name: true } } } as const;
const json = (v: unknown) => (v === null || v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  /** Official questions plus the caller's own center. Never another center. */
  private scope(actor: Actor, organizationId?: string, which: QuestionQuery['scope'] = 'all'): Prisma.QuestionWhereInput {
    if (actor.role === 'SUPER_ADMIN' && !organizationId) return which === 'official' ? { organizationId: null } : which === 'own' ? { NOT: { organizationId: null } } : {};
    const own = resolveOrg(actor, organizationId);
    if (which === 'official') return { organizationId: null };
    if (which === 'own') return { organizationId: own };
    return { OR: [{ organizationId: null }, { organizationId: own }] };
  }

  async findAll(actor: Actor, q: QuestionQuery) {
    const where: Prisma.QuestionWhereInput = {
      AND: [
        this.scope(actor, q.organizationId, q.scope),
        q.status ? { status: q.status } : { status: { not: 'ARCHIVED' } },
        q.subjectId ? { subjectId: q.subjectId } : {},
        q.topicId ? { topicId: q.topicId } : {},
        q.collectionId ? { collections: { some: { collectionId: q.collectionId } } } : {},
        q.difficulty ? { difficulty: q.difficulty } : {},
        q.type ? { type: q.type } : {},
        q.search ? { prompt: { contains: q.search, mode: 'insensitive' } } : {},
      ],
    };
    const [total, items] = await Promise.all([
      this.prisma.question.count({ where }),
      this.prisma.question.findMany({ where, include, orderBy: { createdAt: 'desc' }, skip: (q.page - 1) * q.pageSize, take: q.pageSize }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  }

  async visible(id: string, actor: Actor) {
    const question = await this.prisma.question.findFirst({ where: { id, AND: [this.scope(actor)] }, include });
    if (!question) throw notFound('Question');
    return question;
  }

  /** A question the caller may change. Official questions belong to the platform. */
  private async editable(id: string, actor: Actor): Promise<Question> {
    const question = await this.prisma.question.findUnique({ where: { id } });
    if (!question) throw notFound('Question');
    if (actor.role === 'SUPER_ADMIN') return question;
    if (question.organizationId === null) throw forbidden('Official questions are read-only. Make a copy to change it.');
    if (!actor.organizationIds.includes(question.organizationId)) throw notFound('Question');
    return question;
  }

  private async assertTopic(subjectId: string, topicId?: string | null) {
    const subject = await this.prisma.subject.findUnique({ where: { id: subjectId }, include: { topics: { select: { id: true } } } });
    if (!subject) throw invalid('Choose a subject');
    if (topicId && !subject.topics.some((t) => t.id === topicId)) throw invalid('The topic does not belong to this subject');
  }

  private owner(actor: Actor, requested?: string | null) {
    return actor.role === 'SUPER_ADMIN' ? (requested ?? null) : resolveOrg(actor, requested);
  }

  async create(data: CreateQuestionInput, actor: Actor) {
    const organizationId = this.owner(actor, data.organizationId);
    if (organizationId) await this.access.assertCapacity(await this.access.org(organizationId), 'questions');
    await this.assertTopic(data.subjectId, data.topicId);
    const question = await this.prisma.question.create({ data: { ...this.columns(data), organizationId, createdById: actor.id }, include });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'QUESTION_CREATED', targetType: 'Question', targetId: question.id });
    return question;
  }

  async update(id: string, data: CreateQuestionInput, actor: Actor) {
    const existing = await this.editable(id, actor);
    await this.assertTopic(data.subjectId, data.topicId);
    const question = await this.prisma.question.update({ where: { id }, data: this.columns(data), include });
    await this.audit.log({ actorId: actor.id, organizationId: existing.organizationId, action: 'QUESTION_UPDATED', targetType: 'Question', targetId: id });
    return question;
  }

  async setStatus(id: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED', actor: Actor) {
    const q = await this.editable(id, actor);
    if (status === 'PUBLISHED') {
      const issues = validateQuestionContent(q.type as QuestionKind, q.options, q.correctAnswer);
      if (issues.length) throw invalid(issues[0].message, { issues });
    }
    const updated = await this.prisma.question.update({ where: { id }, data: { status, isActive: status === 'PUBLISHED' }, include });
    await this.audit.log({ actorId: actor.id, organizationId: q.organizationId, action: `QUESTION_${status}`, targetType: 'Question', targetId: id });
    return updated;
  }

  /** Questions with recorded answers are archived so past results stay intact. */
  async remove(id: string, actor: Actor) {
    const q = await this.editable(id, actor);
    const used = await this.prisma.gameAnswer.count({ where: { questionId: id } });
    if (used) await this.prisma.question.update({ where: { id }, data: { status: 'ARCHIVED', isActive: false } });
    else await this.prisma.question.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, organizationId: q.organizationId, action: used ? 'QUESTION_ARCHIVED' : 'QUESTION_DELETED', targetType: 'Question', targetId: id });
    return { archived: used > 0 };
  }

  async export(actor: Actor, requested?: string) {
    const organizationId = this.owner(actor, requested);
    const items = await this.prisma.question.findMany({ where: { organizationId, status: { not: 'ARCHIVED' } }, include, orderBy: { createdAt: 'asc' }, take: 5000 });
    return {
      format: 'last-lesson-questions/1',
      questions: items.map((q) => ({ subject: q.subject.name, topic: q.topic?.name ?? null, type: q.type, difficulty: q.difficulty, prompt: q.prompt, options: q.options, correctAnswer: q.correctAnswer, hint: q.hint, explanation: q.explanation, points: q.points, status: q.status, translations: q.translations })),
    };
  }

  async import(input: { questions: unknown[]; dryRun: boolean }, actor: Actor, requested?: string) {
    const organizationId = this.owner(actor, requested);
    const org = organizationId ? await this.access.org(organizationId) : null;
    if (org) await this.access.assertFeature(org, 'questionImport');
    const subjects = await this.prisma.subject.findMany({ where: { isActive: true }, include: { topics: true } });
    const find = <T extends { name: string; slug: string }>(list: T[], value: string) => list.find((s) => s.slug === value.toLowerCase() || s.name.toLowerCase() === value.toLowerCase());
    const errors: Array<{ row: number; message: string }> = [];
    const rows: CreateQuestionInput[] = [];
    input.questions.forEach((raw, i) => {
      const base = importQuestionSchema.safeParse(raw);
      if (!base.success) return errors.push({ row: i + 1, message: `${base.error.issues[0].path.join('.')}: ${base.error.issues[0].message}` });
      const subject = find(subjects, base.data.subject);
      if (!subject) return errors.push({ row: i + 1, message: `Unknown subject "${base.data.subject}"` });
      const topic = base.data.topic ? find(subject.topics, base.data.topic) : null;
      if (base.data.topic && !topic) return errors.push({ row: i + 1, message: `Unknown topic "${base.data.topic}" in ${subject.name}` });
      const full = createQuestionSchema.safeParse({ ...base.data, subjectId: subject.id, topicId: topic?.id ?? null });
      if (!full.success) return errors.push({ row: i + 1, message: full.error.issues[0].message });
      return rows.push(full.data);
    });
    if (input.dryRun || errors.length) return { imported: 0, valid: rows.length, errors };
    if (org) await this.access.assertCapacity(org, 'questions', rows.length);
    await this.prisma.question.createMany({ data: rows.map((r) => ({ ...this.columns(r), organizationId, createdById: actor.id })) });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'QUESTIONS_IMPORTED', targetType: 'Question', metadata: { count: rows.length } });
    return { imported: rows.length, valid: rows.length, errors };
  }

  private columns(d: CreateQuestionInput) {
    return {
      subjectId: d.subjectId,
      topicId: d.topicId ?? null,
      type: d.type,
      difficulty: d.difficulty,
      prompt: d.prompt,
      options: json(d.options ?? {}),
      correctAnswer: json(d.correctAnswer),
      explanation: d.explanation || null,
      hint: d.hint || null,
      points: d.points,
      status: d.status,
      ...(d.translations ? { translations: json(d.translations) } : {}),
      isActive: d.status === 'PUBLISHED',
    };
  }
}
