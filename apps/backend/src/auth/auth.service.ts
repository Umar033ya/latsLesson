import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { normalizeCode, randomOpaqueToken, sha256 } from '../common/crypto.util';
import { InvitationRedemptionService } from '../invitations/invitation-redemption.service';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly redemption: InvitationRedemptionService,
  ) {}

  async register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    invitationCode?: string;
  }): Promise<TokenPair> {
    const email = input.email.toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('An account with this email already exists');
    }
    // Public registration ALWAYS creates a GAMER. Privileged roles can only be created by admins.
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const invitation = input.invitationCode ? await this.redemption.validateCode(input.invitationCode) : null;

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        role: Role.GAMER,
      },
    });

    if (invitation) {
      await this.redemption.redeem({
        code: normalizeCode(input.invitationCode!),
        userId: user.id,
        organizationId: invitation.organizationId,
      });
    }
    await this.audit.log({
      actorId: user.id,
      organizationId: invitation?.organizationId,
      action: invitation ? 'REGISTER_WITH_INVITATION' : 'REGISTER',
      targetType: 'User',
      targetId: user.id,
    });
    return this.issueTokens(user.id, user.email, Role.GAMER);
  }

  async login(email: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === 'SUSPENDED') throw new ForbiddenException('This account is suspended');
    await this.audit.log({ actorId: user.id, action: 'LOGIN', targetType: 'User', targetId: user.id });
    return this.issueTokens(user.id, user.email, user.role);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || user.status === 'SUSPENDED') throw new UnauthorizedException('Account unavailable');

    await this.prisma.$transaction([
      this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: user.id, expiresAt: { lt: new Date() } },
      }),
    ]);
    return this.issueTokens(user.id, user.email, user.role);
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true, status: true } } },
        },
        adminOf: {
          include: { organization: { select: { id: true, name: true, slug: true, logoUrl: true, status: true } } },
        },
      },
    });
    if (!user) throw new UnauthorizedException();
    return {
      ...user,
      organizations: [
        ...user.memberships.map((m) => ({ ...m.organization, relation: 'MEMBER' as const })),
        ...user.adminOf.map((m) => ({ ...m.organization, relation: 'ADMIN' as const })),
      ],
    };
  }

  async forgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return the same message to avoid account enumeration.
    const generic = { message: 'If the account exists, a password reset link has been created.' };
    if (!user) return generic;
    const token = randomOpaqueToken(32);
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
    // No SMTP provider is bundled. In development the token is returned so the flow is testable;
    // production deployments should send this token from their mail service using the same hash.
    if (this.config.get('NODE_ENV') !== 'production') return { ...generic, devToken: token };
    return generic;
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) },
      }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({
        where: { userId: reset.userId },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async validateJwtPayload(payload: { sub: string; role: Role }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status === 'SUSPENDED') return null;
    const [memberships, adminOf] = await Promise.all([
      this.prisma.membership.findMany({ where: { userId: user.id }, select: { organizationId: true } }),
      this.prisma.organizationAdmin.findMany({ where: { userId: user.id }, select: { organizationId: true } }),
    ]);
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      organizationIds: [
        ...new Set([...memberships.map((m) => m.organizationId), ...adminOf.map((a) => a.organizationId)]),
      ],
    };
  }

  private async issueTokens(userId: string, email: string, role: Role): Promise<TokenPair> {
    const accessTtl = Number(this.config.get('JWT_ACCESS_TTL') ?? 3600);
    const refreshTtl = Number(this.config.get('JWT_REFRESH_TTL') ?? 604800);
    const [accessToken] = await Promise.all([
      this.jwt.signAsync(
        { sub: userId, email, role },
        { secret: this.config.get('JWT_ACCESS_SECRET'), expiresIn: accessTtl },
      ),
    ]);
    const refreshToken = randomOpaqueToken();
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });
    return { accessToken, refreshToken, expiresIn: accessTtl };
  }
}
