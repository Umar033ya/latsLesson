import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { ApiException } from '../common/errors';
import { InvitationRedemptionService } from '../invitations/invitation-redemption.service';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly redemption: InvitationRedemptionService,
  ) {}

  async join(rawCode: string, userId: string) {
    const code = await this.redemption.validateCode(rawCode);
    if (code.kind !== 'GROUP') throw new ApiException('CODE_INVALID', 'This code belongs to one student', 400);
    const org = await this.access.operational(code.organizationId);
    const existing = await this.prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: org.id } } });
    if (!existing) {
      await this.access.assertCapacity(org, 'students');
      await this.prisma.$transaction(async (tx) => {
        await this.redemption.consume(tx, code.id);
        await tx.membership.create({ data: { userId, organizationId: org.id, groupId: code.groupId } });
      });
      await this.audit.log({ actorId: userId, organizationId: org.id, action: 'CENTER_JOINED', targetType: 'Organization', targetId: org.id, category: 'ACTIVITY' });
    }
    return { id: org.id, name: org.name, slug: org.slug, logoUrl: org.logoUrl };
  }

  async myOrganizations(userId: string) {
    const items = await this.prisma.membership.findMany({ where: { userId, status: 'ACTIVE' }, include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true } } }, orderBy: { joinedAt: 'desc' } });
    return items.map((m) => m.organization);
  }
}
