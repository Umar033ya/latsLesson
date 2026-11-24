import { Injectable } from '@nestjs/common';
import type { z } from 'zod';
import type { createInvitationSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { invalid, notFound } from '../common/errors';
import { codeHint, generateInvitationCode, hashCode } from '../common/crypto.util';
import { resolveOrg, type Actor } from '../common/actor';

const include = {
  organization: { select: { id: true, name: true } },
  group: { select: { id: true, name: true } },
  student: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
  ) {}

  async create(input: z.infer<typeof createInvitationSchema>, actor: Actor) {
    const organizationId = resolveOrg(actor, input.organizationId);
    await this.access.operational(organizationId);
    if (input.groupId && input.studentId) throw invalid('Choose a group or a student, not both');
    if (input.groupId && !(await this.prisma.group.findFirst({ where: { id: input.groupId, organizationId } }))) throw notFound('Group');
    if (input.studentId && !(await this.prisma.membership.findFirst({ where: { userId: input.studentId, organizationId } }))) throw notFound('Student');
    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + (await this.access.platform()).codeExpiryDays * 86_400_000);
    if (expiresAt < new Date()) throw invalid('The expiry date is in the past');
    return this.issue({ organizationId, groupId: input.groupId ?? null, studentId: input.studentId ?? null, label: input.label ?? null, expiresAt, maxUses: input.studentId ? 10_000 : input.maxUses }, actor);
  }

  /** Issues a code. A student has one live personal code: older ones are revoked. */
  async issue(data: { organizationId: string; groupId: string | null; studentId: string | null; label: string | null; expiresAt: Date; maxUses: number }, actor: Actor) {
    const code = generateInvitationCode();
    if (data.studentId) {
      await this.prisma.invitationCode.updateMany({ where: { studentId: data.studentId, organizationId: data.organizationId, revokedAt: null }, data: { isActive: false, revokedAt: new Date() } });
    }
    const created = await this.prisma.invitationCode.create({
      data: { ...data, codeHash: hashCode(code), hint: codeHint(code), kind: data.studentId ? 'PERSONAL' : 'GROUP', createdById: actor.id },
      include,
    });
    await this.audit.log({ actorId: actor.id, organizationId: data.organizationId, action: 'CODE_CREATED', targetType: 'InvitationCode', targetId: created.id, metadata: { kind: created.kind } });
    // The plaintext exists only in this response.
    return { ...this.present(created), code };
  }

  async findAll(actor: Actor, requested?: string, kind?: 'PERSONAL' | 'GROUP') {
    const where = actor.role === 'SUPER_ADMIN' && !requested ? {} : { organizationId: resolveOrg(actor, requested) };
    const items = await this.prisma.invitationCode.findMany({ where: { ...where, ...(kind ? { kind } : {}) }, include, orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }], take: 500 });
    return items.map((i) => this.present(i));
  }

  async regenerate(id: string, actor: Actor) {
    const old = await this.owned(id, actor);
    await this.revoke(id, actor);
    const expiresAt = old.expiresAt > new Date() ? old.expiresAt : new Date(Date.now() + (await this.access.platform()).codeExpiryDays * 86_400_000);
    return this.issue({ organizationId: old.organizationId, groupId: old.groupId, studentId: old.studentId, label: old.label, expiresAt, maxUses: old.maxUses }, actor);
  }

  async revoke(id: string, actor: Actor) {
    const code = await this.owned(id, actor);
    const updated = await this.prisma.invitationCode.update({ where: { id }, data: { isActive: false, revokedAt: code.revokedAt ?? new Date() }, include });
    await this.audit.log({ actorId: actor.id, organizationId: code.organizationId, action: 'CODE_REVOKED', targetType: 'InvitationCode', targetId: id });
    return this.present(updated);
  }

  async update(id: string, data: { isActive?: boolean; expiresAt?: string; label?: string | null; maxUses?: number }, actor: Actor) {
    const code = await this.owned(id, actor);
    if (data.isActive && code.revokedAt) throw invalid('A revoked code cannot be turned on again. Regenerate it instead.');
    const updated = await this.prisma.invitationCode.update({ where: { id }, data: { ...data, expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined }, include });
    await this.audit.log({ actorId: actor.id, organizationId: code.organizationId, action: 'CODE_UPDATED', targetType: 'InvitationCode', targetId: id });
    return this.present(updated);
  }

  private async owned(id: string, actor: Actor) {
    const code = await this.prisma.invitationCode.findUnique({ where: { id } });
    // Another center's code is reported as missing, not as forbidden, so ids cannot be probed.
    if (!code || (actor.role !== 'SUPER_ADMIN' && !actor.organizationIds.includes(code.organizationId))) throw notFound('Access code');
    return code;
  }

  private present(code: any) {
    const { id, hint, label, kind, organizationId, organization, group, student, expiresAt, maxUses, usesCount, isActive, revokedAt, lastUsedAt, createdAt } = code;
    const state = revokedAt ? 'REVOKED' : !isActive ? 'PAUSED' : expiresAt < new Date() ? 'EXPIRED' : kind === 'GROUP' && usesCount >= maxUses ? 'USED_UP' : 'ACTIVE';
    return { id, hint, label, kind, organizationId, organization, group, student, expiresAt, maxUses, usesCount, isActive, revokedAt, lastUsedAt, createdAt, state };
  }
}
