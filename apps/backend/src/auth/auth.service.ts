import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { Role } from '@last-lesson/shared-types';
import type { AccessCodeInput, GoogleInput, RegisterCenterInput, RegisterInput } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { AuditService } from '../common/audit.service';
import { AccessService } from '../common/access.service';
import { ApiException, conflict, invalid } from '../common/errors';
import { codeHint, generateInvitationCode, hashCode, randomOpaqueToken, sha256 } from '../common/crypto.util';
import { InvitationRedemptionService } from '../invitations/invitation-redemption.service';
import type { Actor } from '../common/actor';
import { GoogleIdentity, type GoogleProfile } from './google-identity';

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshTtl: number;
}

export interface AccessClaims {
  sub: string;
  role: Role;
  /** Center chosen by an access code; students act only inside it. */
  org?: string;
}

interface NewAccount {
  email: string;
  passwordHash?: string | null;
  googleSub?: string | null;
  firstName: string;
  lastName: string;
  locale?: string;
}

const MAX_FAILED = 8;
const LOCK_MINUTES = 10;
/** Two tabs may refresh at the same moment; a token rotated this recently is not treated as theft. */
const ROTATION_GRACE_MS = 20_000;
const badLogin = () => new ApiException('INVALID_CREDENTIALS', 'E-mail or password is incorrect', 401);
const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id });
// Verified when the account does not exist, so response time does not reveal which e-mails are registered.
let decoy: Promise<string> | null = null;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly audit: AuditService,
    private readonly access: AccessService,
    private readonly redemption: InvitationRedemptionService,
    private readonly google: GoogleIdentity,
  ) {}

  async login(email: string, password: string, ip: string): Promise<Session> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      decoy ??= hashPassword(randomOpaqueToken(16));
      await argon2.verify(await decoy, password);
      await this.audit.log({ action: 'LOGIN_FAILED', targetType: 'User', category: 'SECURITY', ip, metadata: { reason: 'unknown account' } });
      throw badLogin();
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ApiException('ACCOUNT_LOCKED', 'Too many failed attempts. Try again in a few minutes.', 429);
    if (!(await argon2.verify(user.passwordHash, password))) {
      const failed = user.failedLogins + 1;
      const lock = failed >= MAX_FAILED;
      await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: lock ? 0 : failed, lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null } });
      await this.audit.log({ actorId: user.id, action: lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED', targetType: 'User', targetId: user.id, category: 'SECURITY', ip });
      throw badLogin();
    }
    if (user.status !== 'ACTIVE') throw new ApiException('ACCOUNT_SUSPENDED', 'This account is suspended', 403);
    await this.assertStaffAllowed(user);
    await this.prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
    await this.audit.log({ actorId: user.id, action: 'LOGIN', targetType: 'User', targetId: user.id, category: 'AUTH', ip });
    return this.issue(user.id, user.role);
  }

  /** PERSONAL codes sign a known student in. GROUP codes create a student profile and hand back a personal code. */
  async enterCode(input: AccessCodeInput, ip: string) {
    const code = await this.redemption.validateCode(input.code).catch(async (error) => {
      await this.audit.log({ action: 'CODE_REJECTED', targetType: 'InvitationCode', category: 'SECURITY', ip, metadata: { reason: error?.code ?? 'unknown' } });
      throw error;
    });
    const org = await this.access.operational(code.organizationId);
    const branding = await this.access.branding(org);
    const center = { name: branding.displayName, logoUrl: branding.logoUrl, accent: branding.accent };

    if (code.kind === 'PERSONAL') {
      const student = code.student;
      const membership = student && (await this.prisma.membership.findUnique({ where: { userId_organizationId: { userId: student.id, organizationId: org.id } } }));
      if (!student || !membership || student.status !== 'ACTIVE' || membership.status !== 'ACTIVE') throw new ApiException('ACCESS_DISABLED', 'Your access has been turned off. Ask your teacher.', 403);
      if (membership.accessExpiresAt && membership.accessExpiresAt < new Date()) throw new ApiException('ACCESS_EXPIRED', 'Your access has expired. Ask your teacher.', 403);
      await this.prisma.$transaction([
        this.prisma.invitationCode.update({ where: { id: code.id }, data: { usesCount: { increment: 1 }, lastUsedAt: new Date() } }),
        this.prisma.membership.update({ where: { id: membership.id }, data: { lastActiveAt: new Date() } }),
      ]);
      await this.audit.log({ actorId: student.id, organizationId: org.id, action: 'STUDENT_SIGNED_IN', targetType: 'User', targetId: student.id, category: 'AUTH', ip });
      return { session: await this.issue(student.id, Role.GAMER, org.id), personalCode: null };
    }

    if (!input.firstName) return { needsProfile: true as const, center, group: code.group?.name ?? null };
    await this.access.assertCapacity(org, 'students');
    const personalCode = generateInvitationCode();
    const student = await this.prisma.$transaction(async (tx) => {
      await this.redemption.consume(tx, code.id);
      const user = await tx.user.create({
        data: {
          firstName: input.firstName!,
          lastName: input.lastName ?? '',
          role: Role.GAMER,
          homeOrganizationId: org.id,
          memberships: { create: { organizationId: org.id, groupId: code.groupId, lastActiveAt: new Date() } },
        },
      });
      await tx.invitationCode.create({
        data: {
          codeHash: hashCode(personalCode),
          hint: codeHint(personalCode),
          kind: 'PERSONAL',
          organizationId: org.id,
          studentId: user.id,
          createdById: code.createdById,
          expiresAt: code.expiresAt,
          maxUses: 10_000,
          usesCount: 1,
          lastUsedAt: new Date(),
        },
      });
      return user;
    });
    await this.audit.log({ actorId: student.id, organizationId: org.id, action: 'STUDENT_JOINED', targetType: 'User', targetId: student.id, category: 'ACTIVITY', ip, metadata: { via: 'group code' } });
    return { session: await this.issue(student.id, Role.GAMER, org.id), personalCode };
  }

  async options() {
    const p = await this.access.platform();
    return { centerSignup: p.centerSignup, studentSignup: p.studentSignup, trialDays: p.trialDays, googleClientId: this.google.clientId, platformName: p.platformName, supportEmail: p.supportEmail };
  }

  /**
   * A group code creates a new student with an e-mail; a personal code adds an e-mail to the
   * student it belongs to. The role is never taken from the request.
   */
  async register(input: RegisterInput, ip: string): Promise<Session> {
    if (!(await this.access.platform()).studentSignup) throw new ApiException('REGISTRATION_CLOSED', 'Registration is closed. Enter with your access code instead.', 403);
    return this.joinWithCode(input.invitationCode, { email: input.email, passwordHash: await hashPassword(input.password), firstName: input.firstName, lastName: input.lastName, locale: input.locale }, ip);
  }

  private async assertEmailFree(email: string) {
    if (await this.prisma.user.findUnique({ where: { email } })) throw conflict('An account with this e-mail already exists');
  }

  private async joinWithCode(invitationCode: string, account: NewAccount, ip: string): Promise<Session> {
    const code = await this.redemption.validateCode(invitationCode);
    const org = await this.access.operational(code.organizationId);
    // After the code, so that a made-up code does not reveal which e-mails are registered.
    await this.assertEmailFree(account.email);
    const { email, passwordHash = null, googleSub = null, firstName, lastName, locale } = account;
    if (code.kind === 'PERSONAL') {
      const student = code.student;
      const membership = student && (await this.prisma.membership.findUnique({ where: { userId_organizationId: { userId: student.id, organizationId: org.id } } }));
      // Only the center that owns the profile may hand out an account for it.
      if (!student || student.homeOrganizationId !== org.id || student.role !== Role.GAMER || membership?.status !== 'ACTIVE' || student.status !== 'ACTIVE') throw new ApiException('ACCESS_DISABLED', 'Your access has been turned off. Ask your teacher.', 403);
      if (student.email) throw conflict('This student already has an account. Sign in with the e-mail.');
      await this.prisma.user.update({ where: { id: student.id }, data: { email, passwordHash, googleSub, ...(locale ? { locale } : {}) } });
      await this.audit.log({ actorId: student.id, organizationId: org.id, action: 'STUDENT_ACCOUNT_CREATED', targetType: 'User', targetId: student.id, category: 'AUTH', ip });
      return this.issue(student.id, Role.GAMER, org.id);
    }
    await this.access.assertCapacity(org, 'students');
    const user = await this.prisma.$transaction(async (tx) => {
      await this.redemption.consume(tx, code.id);
      return tx.user.create({
        data: { email, passwordHash, googleSub, firstName, lastName, locale: locale ?? 'en', role: Role.GAMER, homeOrganizationId: org.id, memberships: { create: { organizationId: org.id, groupId: code.groupId } } },
      });
    });
    await this.audit.log({ actorId: user.id, organizationId: org.id, action: 'STUDENT_REGISTERED', targetType: 'User', targetId: user.id, category: 'AUTH', ip });
    return this.issue(user.id, Role.GAMER, org.id);
  }

  async registerCenter(input: RegisterCenterInput, ip: string): Promise<Session> {
    if (!(await this.access.platform()).centerSignup) throw new ApiException('REGISTRATION_CLOSED', 'Registration of new centers is closed. Contact the platform.', 403);
    await this.assertEmailFree(input.email);
    const { centerName, city, email, firstName, lastName, locale } = input;
    return this.openCenter({ centerName, city }, { email, passwordHash: await hashPassword(input.password), firstName, lastName, locale }, ip);
  }

  private async openCenter(center: { centerName: string; city?: string }, account: NewAccount, ip: string): Promise<Session> {
    const platform = await this.access.platform();
    if (!platform.centerSignup) throw new ApiException('REGISTRATION_CLOSED', 'Registration of new centers is closed. Contact the platform.', 403);
    const { email, passwordHash = null, googleSub = null, firstName, lastName, locale } = account;
    const base = center.centerName.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'center';
    const trial = await this.prisma.plan.findUnique({ where: { key: 'trial' } });
    const { user, org } = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: center.centerName, slug: `${base}-${randomUUID().slice(0, 6)}`, city: center.city || null, contactName: `${firstName} ${lastName}`.trim(), contactEmail: email, planId: trial?.id ?? null, subscriptionEndsAt: new Date(Date.now() + platform.trialDays * 86_400_000) },
      });
      const created = await tx.user.create({ data: { email, passwordHash, googleSub, firstName, lastName, locale: locale ?? 'en', role: Role.CENTER_ADMIN, adminOf: { create: { organizationId: organization.id } } } });
      return { user: created, org: organization };
    });
    await this.audit.log({ actorId: user.id, organizationId: org.id, action: 'CENTER_REGISTERED', targetType: 'Organization', targetId: org.id, category: 'ADMIN', ip, metadata: { name: org.name } });
    return this.issue(user.id, Role.CENTER_ADMIN);
  }

  /**
   * Sign in with Google. An existing password account is never linked by e-mail alone: whoever
   * registered that address first may not own it, so the owner links it from the settings.
   */
  async signInWithGoogle(input: GoogleInput, ip: string): Promise<Session | { needsProfile: true; email: string; firstName: string }> {
    const profile = await this.google.verify(input.credential);
    const known = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (known) {
      if (known.status !== 'ACTIVE') throw new ApiException('ACCOUNT_SUSPENDED', 'This account is suspended', 403);
      await this.assertStaffAllowed(known);
      await this.audit.log({ actorId: known.id, action: 'LOGIN', targetType: 'User', targetId: known.id, category: 'AUTH', ip, metadata: { via: 'google' } });
      return this.issue(known.id, known.role);
    }
    if (await this.prisma.user.findUnique({ where: { email: profile.email } })) throw new ApiException('GOOGLE_LINK_REQUIRED', 'An account with this e-mail already exists. Sign in with the password and link Google in the settings.', 409);
    const account: NewAccount = { email: profile.email, googleSub: profile.sub, firstName: profile.firstName, lastName: profile.lastName, locale: input.locale };
    if (input.invitationCode) {
      if (!(await this.access.platform()).studentSignup) throw new ApiException('REGISTRATION_CLOSED', 'Registration is closed. Enter with your access code instead.', 403);
      return this.joinWithCode(input.invitationCode, account, ip);
    }
    if (input.centerName) return this.openCenter({ centerName: input.centerName }, account, ip);
    return { needsProfile: true, email: profile.email, firstName: profile.firstName };
  }

  /** Needs the password: a session opened with an access code must not be able to take the profile over. */
  async linkGoogle(userId: string, credential: string, password: string, ip: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, password))) throw invalid('The current password is incorrect', { fields: { password: ['The current password is incorrect'] } });
    const profile: GoogleProfile = await this.google.verify(credential);
    const owner = await this.prisma.user.findUnique({ where: { googleSub: profile.sub } });
    if (owner && owner.id !== userId) throw conflict('This Google account is linked to another profile');
    await this.prisma.user.update({ where: { id: userId }, data: { googleSub: profile.sub } });
    await this.audit.log({ actorId: userId, action: 'GOOGLE_LINKED', targetType: 'User', targetId: userId, category: 'SECURITY', ip });
    return { google: true };
  }

  async unlinkGoogle(userId: string, ip: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) throw conflict('Set a password first, otherwise you could not sign in again');
    await this.prisma.user.update({ where: { id: userId }, data: { googleSub: null } });
    await this.audit.log({ actorId: userId, action: 'GOOGLE_UNLINKED', targetType: 'User', targetId: userId, category: 'SECURITY', ip });
    return { google: false };
  }

  async setPreferences(userId: string, data: { locale: string }) {
    await this.prisma.user.update({ where: { id: userId }, data: { locale: data.locale } });
    return data;
  }

  async refresh(token?: string): Promise<Session> {
    const expired = () => new ApiException('SESSION_EXPIRED', 'Your session has ended. Sign in again.', 401);
    if (!token) throw expired();
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
    if (!stored || stored.expiresAt < new Date()) throw expired();
    if (stored.revokedAt && Date.now() - stored.revokedAt.getTime() > ROTATION_GRACE_MS) {
      // A token that was rotated earlier is being replayed: close every session in its family.
      await this.prisma.refreshToken.updateMany({ where: { family: stored.family, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.audit.log({ actorId: stored.userId, action: 'REFRESH_TOKEN_REUSED', targetType: 'User', targetId: stored.userId, category: 'SECURITY' });
      throw expired();
    }
    if (stored.user.status !== 'ACTIVE') throw expired();
    const familyAlive = await this.prisma.refreshToken.count({ where: { family: stored.family, revokedAt: null } });
    if (stored.revokedAt && familyAlive === 0) throw expired(); // signed out
    await this.prisma.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.prisma.refreshToken.deleteMany({ where: { userId: stored.userId, expiresAt: { lt: new Date() } } });
    return this.issue(stored.userId, stored.user.role, stored.organizationId ?? undefined, stored.family);
  }

  async logout(token?: string): Promise<void> {
    if (!token) return;
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash: sha256(token) } });
    if (stored) await this.prisma.refreshToken.updateMany({ where: { family: stored.family, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async me(actor: Actor) {
    const orgs = await this.prisma.organization.findMany({ where: { id: { in: actor.organizationIds } }, include: { plan: true } });
    const organizations = await Promise.all(
      orgs.map(async (o) => ({ id: o.id, name: o.name, slug: o.slug, logoUrl: o.logoUrl, status: o.status, subscriptionEndsAt: o.subscriptionEndsAt, branding: await this.access.branding(o), features: await this.access.features(o) })),
    );
    const { id, email, firstName, lastName, role, locale } = actor;
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { passwordHash: true, googleSub: true } });
    return { id, email, firstName, lastName, role, locale, organizations, signIn: { password: Boolean(user.passwordHash), google: Boolean(user.googleSub) } };
  }

  async changePassword({ id: userId, boundOrg }: Actor, current: string, next: string, ip: string): Promise<Session> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash || !(await argon2.verify(user.passwordHash, current))) throw invalid('The current password is incorrect', { fields: { currentPassword: ['The current password is incorrect'] } });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await hashPassword(next) } });
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    await this.audit.log({ actorId: userId, action: 'PASSWORD_CHANGED', targetType: 'User', targetId: userId, category: 'SECURITY', ip });
    return this.issue(userId, user.role, boundOrg);
  }

  async forgotPassword(email: string): Promise<{ message: string; devToken?: string }> {
    const generic = { message: 'If the account exists, a reset link has been created. Ask the platform administrator if no e-mail arrives.' };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash) return generic;
    const token = randomOpaqueToken(32);
    await this.prisma.passwordReset.create({ data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 30 * 60_000) } });
    // No mail provider is bundled. The token leaves the server only in an explicit development run.
    return process.env.NODE_ENV === 'development' ? { ...generic, devToken: token } : generic;
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const reset = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) throw new ApiException('RESET_INVALID', 'This reset link is invalid or has expired', 400);
    const passwordHash = await hashPassword(password);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: reset.userId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } }),
      this.prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      this.prisma.refreshToken.updateMany({ where: { userId: reset.userId }, data: { revokedAt: new Date() } }),
    ]);
  }

  /** Role and memberships are re-read on every request, so a changed permission applies immediately. */
  async validateClaims(claims: AccessClaims): Promise<Actor | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: claims.sub },
      include: { memberships: { where: { status: 'ACTIVE' }, orderBy: { joinedAt: 'desc' } }, adminOf: { orderBy: { createdAt: 'asc' } } },
    });
    if (!user || user.status !== 'ACTIVE' || user.role !== claims.role) return null;
    let organizationIds: string[] = [];
    if (user.role === Role.CENTER_ADMIN) {
      organizationIds = user.adminOf.map((a) => a.organizationId);
    }
    if (user.role === Role.TEACHER && user.homeOrganizationId) organizationIds = [user.homeOrganizationId];
    await this.assertStaffAllowed(user);
    if (user.role === Role.GAMER) {
      const valid = user.memberships.filter((m) => !m.accessExpiresAt || m.accessExpiresAt > new Date()).map((m) => m.organizationId);
      organizationIds = claims.org ? valid.filter((id) => id === claims.org) : valid;
      if (!organizationIds.length) throw new ApiException('ACCESS_DISABLED', 'Your access has been turned off. Ask your teacher.', 403);
    }
    return { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role, locale: user.locale, organizationIds, boundOrg: claims.org };
  }

  private async assertStaffAllowed({ id: userId, role, homeOrganizationId }: { id: string; role: Role; homeOrganizationId: string | null }) {
    if (role === Role.TEACHER) {
      const org = homeOrganizationId && (await this.prisma.organization.findUnique({ where: { id: homeOrganizationId }, select: { status: true } }));
      if (!org) throw new ApiException('ACCESS_DISABLED', 'Your account is not assigned to a center', 403);
      if (org.status !== 'ACTIVE') throw new ApiException('CENTER_SUSPENDED', 'Your education center is suspended. Contact the platform administrator.', 403);
      return;
    }
    if (role !== Role.CENTER_ADMIN) return;
    const links = await this.prisma.organizationAdmin.findMany({ where: { userId }, include: { organization: { select: { status: true } } } });
    if (links.length && links.every((l) => l.organization.status !== 'ACTIVE')) throw new ApiException('CENTER_SUSPENDED', 'Your education center is suspended. Contact the platform administrator.', 403);
  }

  private async issue(userId: string, role: Role, org?: string, family: string = randomUUID()): Promise<Session> {
    const expiresIn = Number(process.env.JWT_ACCESS_TTL ?? 900);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL ?? 604_800);
    const claims: AccessClaims = { sub: userId, role, ...(org ? { org } : {}) };
    const accessToken = await this.jwt.signAsync(claims, { secret: process.env.JWT_ACCESS_SECRET, expiresIn, audience: 'platform', algorithm: 'HS256' });
    const refreshToken = randomOpaqueToken();
    await this.prisma.refreshToken.create({ data: { userId, tokenHash: sha256(refreshToken), family, organizationId: org ?? null, expiresAt: new Date(Date.now() + refreshTtl * 1000) } });
    return { accessToken, refreshToken, expiresIn, refreshTtl };
  }
}
