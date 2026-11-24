import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createAdminSchema } from '@last-lesson/validation';
import { Role, UserStatus } from '@last-lesson/shared-types';
import * as argon2 from 'argon2';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { randomOpaqueToken } from '../common/crypto.util';

type Actor = { id: string; role: Role; organizationIds: string[] };

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, filters: { role?: Role; search?: string; organizationId?: string }) {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'CENTER_ADMIN') {
      throw new ForbiddenException();
    }
    const where: any = {};
    if (filters.role) where.role = filters.role;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (actor.role === 'CENTER_ADMIN') {
      where.memberships = { some: { organizationId: { in: actor.organizationIds } } };
    } else if (filters.organizationId) {
      where.memberships = { some: { organizationId: filters.organizationId } };
    }
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        createdAt: true,
        memberships: { include: { organization: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });
    return users.map((u) => ({ ...u, organizations: u.memberships.map((m) => m.organization) }));
  }

  /** SUPER_ADMIN only: creates a CENTER_ADMIN and assigns it to an organization. */
  async createAdmin(input: unknown, actor: Actor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Only super admins can create admins');
    const data = createAdminSchema.parse(input);
    const org = await this.prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org) throw new NotFoundException('Organization not found');
    const generatedPassword = data.password ?? randomOpaqueToken(9);
    if (await this.prisma.user.findUnique({ where: { email: data.email } })) {
      throw new ConflictException('Email already in use');
    }
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash: await argon2.hash(generatedPassword, { type: argon2.argon2id }),
        firstName: data.firstName,
        lastName: data.lastName,
        role: Role.CENTER_ADMIN,
        adminOf: { create: { organizationId: data.organizationId } },
      },
      include: { adminOf: { include: { organization: true } } },
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId: data.organizationId,
      action: 'ADMIN_CREATED',
      targetType: 'User',
      targetId: user.id,
    });
    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      // Shown once so the super admin can hand the credentials to the center.
      initialPassword: data.password ? undefined : generatedPassword,
      organization: org.name,
    };
  }

  async assignAdmin(userId: string, organizationId: string, actor: Actor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.CENTER_ADMIN) throw new NotFoundException('Center admin not found');
    const link = await this.prisma.organizationAdmin.upsert({
      where: { userId_organizationId: { userId, organizationId } },
      create: { userId, organizationId },
      update: {},
    });
    await this.audit.log({
      actorId: actor.id,
      organizationId,
      action: 'ADMIN_ASSIGNED',
      targetType: 'User',
      targetId: userId,
    });
    return link;
  }

  async setStatus(userId: string, status: UserStatus, actor: Actor) {
    if (actor.role !== Role.SUPER_ADMIN) throw new ForbiddenException();
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status } });
    await this.audit.log({
      actorId: actor.id,
      action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_SUSPENDED',
      targetType: 'User',
      targetId: userId,
    });
    return { id: user.id, status: user.status };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
        memberships: { include: { organization: true } },
      },
    });
    if (!user) throw new NotFoundException();
    return user;
  }
}
