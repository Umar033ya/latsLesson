import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { subjectSchema, topicSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { conflict, notFound } from '../common/errors';
import type { Actor } from '../common/actor';

type SubjectInput = z.infer<typeof subjectSchema>;
type TopicInput = z.infer<typeof topicSchema>;

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(includeInactive = false) {
    const subjects = await this.prisma.subject.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        topics: { where: includeInactive ? {} : { isActive: true }, select: { id: true, name: true, slug: true, isActive: true, _count: { select: { questions: true } } }, orderBy: { name: 'asc' } },
        _count: { select: { questions: { where: { organizationId: null, status: 'PUBLISHED' } } } },
      },
      orderBy: { name: 'asc' },
    });
    return subjects.map(({ _count, ...s }) => ({ ...s, questionCount: _count.questions, topics: s.topics.map(({ _count: c, ...t }) => ({ ...t, questionCount: c.questions })) }));
  }

  async create(data: SubjectInput, actor: Actor) {
    if (await this.prisma.subject.findUnique({ where: { slug: data.slug } })) throw conflict('A subject with this short name already exists');
    const subject = await this.prisma.subject.create({ data });
    await this.audit.log({ actorId: actor.id, action: 'SUBJECT_CREATED', targetType: 'Subject', targetId: subject.id, metadata: { name: subject.name } });
    return subject;
  }

  async update(id: string, data: Partial<SubjectInput> & { isActive?: boolean }, actor: Actor) {
    const subject = await this.prisma.subject.update({ where: { id }, data });
    await this.audit.log({ actorId: actor.id, action: 'SUBJECT_UPDATED', targetType: 'Subject', targetId: id, metadata: { fields: Object.keys(data) } });
    return subject;
  }

  async createTopic(subjectId: string, data: TopicInput, actor: Actor) {
    if (!(await this.prisma.subject.findUnique({ where: { id: subjectId } }))) throw notFound('Subject');
    const topic = await this.prisma.topic.create({ data: { ...data, subjectId } });
    await this.audit.log({ actorId: actor.id, action: 'TOPIC_CREATED', targetType: 'Topic', targetId: topic.id, metadata: { name: topic.name } });
    return topic;
  }

  async updateTopic(id: string, data: Partial<TopicInput> & { isActive?: boolean }, actor: Actor) {
    const topic = await this.prisma.topic.update({ where: { id }, data });
    await this.audit.log({ actorId: actor.id, action: 'TOPIC_UPDATED', targetType: 'Topic', targetId: id });
    return topic;
  }

  async removeTopic(id: string, actor: Actor) {
    const used = await this.prisma.question.count({ where: { topicId: id } });
    if (used) throw conflict(`${used} questions use this topic. Hide it instead.`);
    await this.prisma.topic.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, action: 'TOPIC_DELETED', targetType: 'Topic', targetId: id });
    return { ok: true };
  }
}
