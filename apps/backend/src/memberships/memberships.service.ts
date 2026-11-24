import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { InvitationRedemptionService } from '../invitations/invitation-redemption.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly redemption: InvitationRedemptionService,
  ) {}

  async join(code: string, userId: string) {
    const invitation = await this.redemption.validateCode(code);
    const organizationId = await this.redemption.redeem({
      code,
      userId,
      organizationId: invitation.organizationId,
    });
    await this.audit.log({
      actorId: userId,
      organizationId,
      action: 'CENTER_JOINED',
      targetType: 'Organization',
      targetId: organizationId,
    });
    return this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true, slug: true, logoUrl: true },
    });
  }

  async myOrganizations(userId: string) {
    const items = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true },
      orderBy: { joinedAt: 'desc' },
    });
    return items.map((m) => m.organization);
  }

  async listStudents(organizationId: string, actor: Actor) {
    this.assertCanManage(organizationId, actor);
    const items = await this.prisma.membership.findMany({
      where: { organizationId, user: { role: Role.GAMER } },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true } },
      },
      orderBy: { joinedAt: 'desc' },
    });
    return items.map((m) => ({ ...m.user, joinedAt: m.joinedAt }));
  }

  async addStudent(organizationId: string, email: string, actor: Actor) {
    this.assertCanManage(organizationId, actor);
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || user.role !== Role.GAMER) throw new NotFoundException('Gamer account not found');
    await this.prisma.membership.upsert({
      where: { userId_organizationId: { userId: user.id, organizationId } },
      create: { userId: user.id, organizationId },
      update: {},
    });
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName };
  }

  async removeStudent(organizationId: string, userId: string, actor: Actor) {
    this.assertCanManage(organizationId, actor);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) throw new NotFoundException('Membership not found');
    await this.prisma.membership.delete({ where: { id: membership.id } });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'STUDENT_REMOVED',
      targetType: 'User',
      targetId: userId,
    });
    return { message: 'Student removed from organization' };
  }

  private assertCanManage(organizationId: string, actor: Actor) {
    if (actor.role === 'SUPER_ADMIN') return;
    if (actor.role !== 'CENTER_ADMIN' || !actor.organizationIds.includes(organizationId)) {
      throw new ForbiddenException('You cannot manage this organization');
    }
  }
}
