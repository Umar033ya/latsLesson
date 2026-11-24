import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { Role } from '@last-lesson/shared-types';
import type { MaterialInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { forbidden, invalid, notFound } from '../common/errors';
import { resolveOrg, studentOrg, type Actor } from '../common/actor';

const include = { subject: { select: { id: true, name: true } }, topic: { select: { id: true, name: true } } } as const;

@Injectable()
export class MaterialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(actor: Actor, subjectId?: string, requested?: string) {
    let scope: Prisma.LearningMaterialWhereInput;
    if (actor.role === Role.GAMER) scope = { status: 'PUBLISHED', OR: [{ organizationId: null }, { organizationId: studentOrg(actor) }] };
    else if (actor.role === Role.SUPER_ADMIN && !requested) scope = { organizationId: null };
    else scope = { OR: [{ organizationId: null }, { organizationId: resolveOrg(actor, requested) }] };
    const items = await this.prisma.learningMaterial.findMany({ where: { AND: [scope, subjectId ? { subjectId } : {}] }, include, orderBy: [{ subjectId: 'asc' }, { title: 'asc' }], take: 300 });
    return items.map((m) => ({ ...m, official: m.organizationId === null }));
  }

  async create(data: MaterialInput, actor: Actor, requested?: string) {
    const organizationId = actor.role === Role.SUPER_ADMIN ? (requested ?? null) : resolveOrg(actor, requested);
    await this.assertTopic(data);
    const item = await this.prisma.learningMaterial.create({ data: { ...data, organizationId }, include });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'MATERIAL_CREATED', targetType: 'LearningMaterial', targetId: item.id });
    return item;
  }

  async update(id: string, data: MaterialInput, actor: Actor) {
    const item = await this.editable(id, actor);
    await this.assertTopic(data);
    await this.audit.log({ actorId: actor.id, organizationId: item.organizationId, action: 'MATERIAL_UPDATED', targetType: 'LearningMaterial', targetId: id });
    return this.prisma.learningMaterial.update({ where: { id }, data, include });
  }

  async remove(id: string, actor: Actor) {
    const item = await this.editable(id, actor);
    await this.prisma.learningMaterial.delete({ where: { id } });
    await this.audit.log({ actorId: actor.id, organizationId: item.organizationId, action: 'MATERIAL_DELETED', targetType: 'LearningMaterial', targetId: id });
    return { ok: true };
  }

  private async assertTopic(data: MaterialInput) {
    const subject = await this.prisma.subject.findUnique({ where: { id: data.subjectId }, include: { topics: { select: { id: true } } } });
    if (!subject) throw invalid('Choose a subject');
    if (data.topicId && !subject.topics.some((t) => t.id === data.topicId)) throw invalid('The topic does not belong to this subject');
  }

  private async editable(id: string, actor: Actor) {
    const item = await this.prisma.learningMaterial.findUnique({ where: { id } });
    if (!item) throw notFound('Material');
    if (actor.role === Role.SUPER_ADMIN) return item;
    if (!item.organizationId) throw forbidden('Official materials are read-only');
    if (!actor.organizationIds.includes(item.organizationId)) throw notFound('Material');
    return item;
  }
}
