import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { collectionSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { forbidden, invalid, notFound } from '../common/errors';
import { resolveOrg, type Actor } from '../common/actor';

type Input = z.infer<typeof collectionSchema>;

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private scope(actor: Actor, requested?: string) {
    if (actor.role === 'SUPER_ADMIN' && !requested) return { organizationId: null };
    return { OR: [{ organizationId: null }, { organizationId: resolveOrg(actor, requested) }] };
  }

  async findAll(actor: Actor, requested?: string) {
    const items = await this.prisma.questionCollection.findMany({ where: this.scope(actor, requested), include: { _count: { select: { questions: true } } }, orderBy: { updatedAt: 'desc' } });
    return items.map(({ _count, ...c }) => ({ ...c, questionCount: _count.questions, official: c.organizationId === null }));
  }

  async findOne(id: string, actor: Actor) {
    const item = await this.prisma.questionCollection.findUnique({
      where: { id },
      include: { questions: { orderBy: { position: 'asc' }, include: { question: { include: { subject: { select: { name: true } }, topic: { select: { name: true } } } } } } },
    });
    if (!item || (item.organizationId && actor.role !== 'SUPER_ADMIN' && !actor.organizationIds.includes(item.organizationId))) throw notFound('Collection');
    return { ...item, questions: item.questions.map((q) => q.question) };
  }

  async create(data: Input, actor: Actor, requested?: string) {
    const organizationId = actor.role === 'SUPER_ADMIN' ? (requested ?? null) : resolveOrg(actor, requested);
    await this.assertQuestions(data.questionIds, organizationId);
    const item = await this.prisma.questionCollection.create({
      data: { name: data.name, description: data.description ?? null, organizationId, questions: { create: data.questionIds.map((questionId, position) => ({ questionId, position })) } },
    });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'COLLECTION_CREATED', targetType: 'QuestionCollection', targetId: item.id });
    return item;
  }

  async update(id: string, data: Input, actor: Actor) {
    const item = await this.editable(id, actor);
    await this.assertQuestions(data.questionIds, item.organizationId);
    await this.prisma.$transaction([
      this.prisma.collectionQuestion.deleteMany({ where: { collectionId: id } }),
      this.prisma.questionCollection.update({ where: { id }, data: { name: data.name, description: data.description ?? null, questions: { create: data.questionIds.map((questionId, position) => ({ questionId, position })) } } }),
    ]);
    await this.audit.log({ actorId: actor.id, organizationId: item.organizationId, action: 'COLLECTION_UPDATED', targetType: 'QuestionCollection', targetId: id });
    return this.findOne(id, actor);
  }

  async remove(id: string, actor: Actor) {
    const item = await this.editable(id, actor);
    await this.prisma.questionCollection.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, organizationId: item.organizationId, action: 'COLLECTION_DELETED', targetType: 'QuestionCollection', targetId: id });
    return { ok: true };
  }

  /** A collection may reference official questions and its own center's questions only. */
  private async assertQuestions(ids: string[], organizationId: string | null) {
    const unique = [...new Set(ids)];
    const count = await this.prisma.question.count({ where: { id: { in: unique }, OR: [{ organizationId: null }, ...(organizationId ? [{ organizationId }] : [])] } });
    if (count !== unique.length || unique.length !== ids.length) throw invalid('The collection contains a question that is not available to this center');
  }

  private async editable(id: string, actor: Actor) {
    const item = await this.prisma.questionCollection.findUnique({ where: { id } });
    if (!item) throw notFound('Collection');
    if (actor.role === 'SUPER_ADMIN') return item;
    if (!item.organizationId) throw forbidden('Official collections are read-only');
    if (!actor.organizationIds.includes(item.organizationId)) throw notFound('Collection');
    return item;
  }
}
