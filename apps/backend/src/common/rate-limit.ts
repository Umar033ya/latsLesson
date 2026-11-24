import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { AuditService } from './audit.service';
import { ApiException } from './errors';

interface Limit {
  name: string;
  limit: number;
  windowSeconds: number;
}
const KEY = 'rate_limit';
/** Errors that mean a secret was guessed wrong. A full room or a closed center is not a guess. */
const GUESSES = new Set(['INVALID_CREDENTIALS', 'ACCOUNT_LOCKED', 'CODE_INVALID', 'CODE_REVOKED', 'CODE_EXPIRED', 'CODE_USED_UP', 'GOOGLE_INVALID', 'LOBBY_NOT_FOUND']);
/** Strict per-IP limit for sensitive endpoints, shared by all serverless instances through the database. */
export const RateLimit = (name: string, limit: number, windowSeconds: number) => SetMetadata(KEY, { name, limit, windowSeconds } satisfies Limit);

@Injectable()
export class RateLimitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Counts wrong guesses only: a whole class behind one router can sign in, a guesser cannot go on.
   * The ceiling on all attempts is atomic, so guesses sent at the same moment cannot slip past.
   */
  async guardFailures<T>(name: string, ip: string, limit: number, windowSeconds: number, work: () => Promise<T>): Promise<T> {
    const key = `${name}:fail:${ip}`;
    const blocked = () => new ApiException('RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.', 429);
    if ((await this.hit(`${name}:all:${ip}`, windowSeconds)) > limit * 8) throw blocked();
    const row = await this.prisma.rateLimit.findUnique({ where: { key } });
    if (row && row.expiresAt > new Date() && row.hits >= limit) {
      if (row.hits === limit) await this.audit.log({ action: 'RATE_LIMIT_REACHED', targetType: 'Endpoint', targetId: name, category: 'SECURITY', ip, metadata: { limit } });
      await this.hit(key, windowSeconds);
      throw blocked();
    }
    try {
      return await work();
    } catch (error) {
      if (error instanceof ApiException && GUESSES.has(error.code)) await this.hit(key, windowSeconds);
      throw error;
    }
  }

  /** Atomic fixed-window counter. Returns the number of hits in the current window. */
  async hit(key: string, windowSeconds: number): Promise<number> {
    const expiresAt = new Date(Date.now() + windowSeconds * 1000);
    const now = new Date();
    const rows = await this.prisma.$queryRaw<Array<{ hits: number }>>`
      INSERT INTO "RateLimit" ("key", "hits", "expiresAt") VALUES (${key}, 1, ${expiresAt})
      ON CONFLICT ("key") DO UPDATE SET
        "hits" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN 1 ELSE "RateLimit"."hits" + 1 END,
        "expiresAt" = CASE WHEN "RateLimit"."expiresAt" < ${now} THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END
      RETURNING "hits"`;
    if (Math.random() < 0.02) await this.prisma.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 3_600_000) } } });
    return rows[0].hits;
  }
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly limits: RateLimitService,
    private readonly audit: AuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.reflector.getAllAndOverride<Limit | undefined>(KEY, [context.getHandler(), context.getClass()]);
    if (!limit) return true;
    const req = context.switchToHttp().getRequest();
    // Signed-in requests are counted per account, so classmates do not share a quota.
    const hits = await this.limits.hit(`${limit.name}:${req.user?.id ?? req.ip}`, limit.windowSeconds);
    if (hits <= limit.limit) return true;
    if (hits === limit.limit + 1) {
      await this.audit.log({ action: 'RATE_LIMIT_REACHED', targetType: 'Endpoint', targetId: limit.name, category: 'SECURITY', ip: req.ip, metadata: { limit: limit.limit } });
    }
    throw new ApiException('RATE_LIMITED', 'Too many attempts. Wait a few minutes and try again.', 429);
  }
}
