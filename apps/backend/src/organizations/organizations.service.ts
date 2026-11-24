import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createOrganizationSchema } from '@last-lesson/validation';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(input: unknown, actor: Actor) {
    const data = createOrganizationSchema.parse(input);
    if (await this.prisma.organization.findUnique({ where: { slug: data.slug } })) {
      throw new ConflictException('An organization with this slug already exists');
    }
    const org = await this.prisma.organization.create({
      data: { name: data.name, slug: data.slug, logoUrl: data.logoUrl ?? null },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: org.id,
      action: 'ORGANIZATION_CREATED',
      targetType: 'Organization',
      targetId: org.id,
    });
    return org;
  }

  async findAll(actor: Actor) {
    const where =
      actor.role === 'SUPER_ADMIN' ? {} : { id: { in: actor.organizationIds } };
    const items = await this.prisma.organization.findMany({
      where,
      include: {
        _count: { select: { memberships: true, admins: true, invitations: true, results: true } },
        admins: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return items.map((o) => ({
      ...o,
      studentCount: o._count.memberships,
      adminCount: o._count.admins,
      invitationCount: o._count.invitations,
      resultCount: o._count.results,
    }));
  }

  async findOne(id: string, actor: Actor) {
    if (actor.role !== 'SUPER_ADMIN' && !actor.organizationIds.includes(id)) {
      throw new ForbiddenException('You do not belong to this organization');
    }
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        admins: { include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
        _count: { select: { memberships: true, invitations: true, results: true } },
      },
    });
    if (!org) throw new NotFoundException('Organization not found');
    const [activeCodes, aggregate] = await Promise.all([
      this.prisma.invitationCode.count({ where: { organizationId: id, isActive: true, revokedAt: null } }),
      this.prisma.gameResult.aggregate({
        where: { organizationId: id },
        _avg: { accuracy: true, durationSeconds: true },
        _count: { id: true },
      }),
    ]);
    return {
      ...org,
      stats: {
        students: org._count.memberships,
        invitations: org._count.invitations,
        activeCodes,
        completedSessions: aggregate._count.id,
        averageAccuracy: Math.round((aggregate._avg.accuracy ?? 0) * 10) / 10,
        averageDurationSeconds: Math.round(aggregate._avg.durationSeconds ?? 0),
      },
    };
  }

  async updateStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', actor: Actor) {
    const org = await this.prisma.organization.update({ where: { id }, data: { status } });
    await this.audit.log({
      actorId: actor.id,
      organizationId: id,
      action: status === 'ACTIVE' ? 'ORGANIZATION_ACTIVATED' : 'ORGANIZATION_SUSPENDED',
      targetType: 'Organization',
      targetId: id,
    });
    return org;
  }

  async update(id: string, data: { name?: string; logoUrl?: string | null }, actor: Actor) {
    const org = await this.prisma.organization.update({ where: { id }, data });
    await this.audit.log({
      actorId: actor.id,
      organizationId: id,
      action: 'ORGANIZATION_UPDATED',
      targetType: 'Organization',
      targetId: id,
    });
    return org;
  }
}
