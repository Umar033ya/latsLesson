import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import type { createAdminSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { conflict, forbidden, notFound } from '../common/errors';
import { randomOpaqueToken } from '../common/crypto.util';
import type { Actor } from '../common/actor';

const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listAdmins(filters: { search?: string; organizationId?: string }) {
    const contains = filters.search ? { contains: filters.search, mode: 'insensitive' as const } : undefined;
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.CENTER_ADMIN,
        ...(contains ? { OR: [{ email: contains }, { firstName: contains }, { lastName: contains }] } : {}),
        ...(filters.organizationId ? { adminOf: { some: { organizationId: filters.organizationId } } } : {}),
      },
      select: { id: true, email: true, firstName: true, lastName: true, status: true, createdAt: true, lockedUntil: true, adminOf: { select: { organization: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return users.map(({ adminOf, ...u }) => ({ ...u, organizations: adminOf.map((a) => a.organization) }));
  }

  async createAdmin(data: z.infer<typeof createAdminSchema>, actor: Actor) {
    const org = await this.prisma.organization.findUnique({ where: { id: data.organizationId } });
    if (!org) throw notFound('Education center');
    if (await this.prisma.user.findUnique({ where: { email: data.email } })) throw conflict('This e-mail is already in use');
    const initialPassword = data.password ?? randomOpaqueToken(9);
    const user = await this.prisma.user.create({
      data: { email: data.email, passwordHash: await hashPassword(initialPassword), firstName: data.firstName, lastName: data.lastName, role: Role.CENTER_ADMIN, adminOf: { create: { organizationId: org.id } } },
    });
    await this.audit.log({ actorId: actor.id, organizationId: org.id, action: 'ADMIN_CREATED', targetType: 'User', targetId: user.id, metadata: { email: data.email } });
    return {
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role },
      // Shown once so the super admin can hand the credentials over.
      initialPassword: data.password ? undefined : initialPassword,
      organization: { id: org.id, name: org.name },
    };
  }

  async assignAdmin(userId: string, organizationId: string, actor: Actor) {
    await this.centerAdmin(userId);
    if (!(await this.prisma.organization.findUnique({ where: { id: organizationId } }))) throw notFound('Education center');
    await this.prisma.organizationAdmin.upsert({ where: { userId_organizationId: { userId, organizationId } }, create: { userId, organizationId }, update: {} });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'ADMIN_ASSIGNED', targetType: 'User', targetId: userId });
    return { ok: true };
  }

  async unassignAdmin(userId: string, organizationId: string, actor: Actor) {
    await this.centerAdmin(userId);
    await this.prisma.organizationAdmin.deleteMany({ where: { userId, organizationId } });
    await this.audit.log({ actorId: actor.id, organizationId, action: 'ADMIN_UNASSIGNED', targetType: 'User', targetId: userId });
    return { ok: true };
  }

  async setStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED', actor: Actor) {
    if (userId === actor.id) throw forbidden('You cannot change the status of your own account');
    const user = await this.prisma.user.update({ where: { id: userId }, data: { status, lockedUntil: null, failedLogins: 0 } });
    if (status === 'SUSPENDED') await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log({ actorId: actor.id, action: status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_SUSPENDED', targetType: 'User', targetId: userId });
    return { id: user.id, status: user.status };
  }

  async resetPassword(userId: string, actor: Actor) {
    await this.centerAdmin(userId);
    const temporaryPassword = randomOpaqueToken(9);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(temporaryPassword), failedLogins: 0, lockedUntil: null } });
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log({ actorId: actor.id, action: 'PASSWORD_RESET_BY_ADMIN', targetType: 'User', targetId: userId, category: 'SECURITY' });
    return { temporaryPassword };
  }

  private async centerAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== Role.CENTER_ADMIN) throw notFound('Center administrator');
    return user;
  }
}
