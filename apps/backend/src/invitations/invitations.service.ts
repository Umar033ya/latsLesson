import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createInvitationSchema } from '@last-lesson/validation';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { generateInvitationCode, sha256 } from '../common/crypto.util';
import { InvitationRedemptionService } from './invitation-redemption.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redemption: InvitationRedemptionService,
  ) {}

  async create(input: unknown, actor: Actor) {
    const data = createInvitationSchema.parse(input);
    this.assertCanManage(data.organizationId, actor);
    const plainCode = generateInvitationCode();
    const invitation = await this.prisma.invitationCode.create({
      data: {
        codeHash: sha256(plainCode),
        organizationId: data.organizationId,
        createdById: actor.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 30 * 86400000),
        maxUses: data.maxUses,
      },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: data.organizationId,
      action: 'INVITATION_CREATED',
      targetType: 'InvitationCode',
      targetId: invitation.id,
    });
    // The plaintext is returned exactly once and is never stored.
    return { ...this.present(invitation), code: plainCode };
  }

  async findAll(actor: Actor, organizationId?: string) {
    const where =
      actor.role === 'SUPER_ADMIN'
        ? organizationId
          ? { organizationId }
          : {}
        : { organizationId: { in: actor.organizationIds } };
    const items = await this.prisma.invitationCode.findMany({
      where,
      include: { organization: { select: { id: true, name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return items.map(this.present);
  }

  async validate(rawCode: string) {
    const code = await this.redemption.validateCode(rawCode);
    return {
      valid: true,
      organization: { id: code.organization.id, name: code.organization.name },
      expiresAt: code.expiresAt,
      remainingUses: Math.max(0, code.maxUses - code.usesCount),
    };
  }

  async revoke(id: string, actor: Actor) {
    const code = await this.prisma.invitationCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Invitation not found');
    this.assertCanManage(code.organizationId, actor);
    const updated = await this.prisma.invitationCode.update({
      where: { id },
      data: { isActive: false, revokedAt: new Date() },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: code.organizationId,
      action: 'INVITATION_REVOKED',
      targetType: 'InvitationCode',
      targetId: id,
    });
    return this.present(updated);
  }

  async setActive(id: string, isActive: boolean, actor: Actor) {
    const code = await this.prisma.invitationCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Invitation not found');
    this.assertCanManage(code.organizationId, actor);
    const updated = await this.prisma.invitationCode.update({ where: { id }, data: { isActive } });
    return this.present(updated);
  }

  private assertCanManage(organizationId: string, actor: Actor) {
    if (actor.role === 'SUPER_ADMIN') return;
    if (actor.role !== 'CENTER_ADMIN' || !actor.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('You cannot manage invitations for this organization');
    }
  }

  private present(code: any) {
    return {
      id: code.id,
      organizationId: code.organizationId,
      organization: code.organization,
      expiresAt: code.expiresAt,
      maxUses: code.maxUses,
      usesCount: code.usesCount,
      remainingUses: Math.max(0, code.maxUses - code.usesCount),
      isActive: code.isActive,
      revokedAt: code.revokedAt,
      createdAt: code.createdAt,
    };
  }
}
