import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { normalizeCode, sha256 } from '../common/crypto.util';

@Injectable()
export class InvitationRedemptionService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCode(rawCode: string) {
    const code = await this.prisma.invitationCode.findUnique({
      where: { codeHash: sha256(normalizeCode(rawCode)) },
      include: { organization: { select: { id: true, status: true, name: true } } },
    });
    if (!code) throw new BadRequestException('Invalid invitation code');
    if (!code.isActive || code.revokedAt) throw new BadRequestException('This invitation code has been revoked');
    if (code.expiresAt < new Date()) throw new BadRequestException('This invitation code has expired');
    if (code.usesCount >= code.maxUses) throw new BadRequestException('This invitation code has reached its usage limit');
    if (code.organization.status !== 'ACTIVE') throw new BadRequestException('This organization is suspended');
    return code;
  }

  /**
   * Atomically increments the usage counter and creates the membership inside one transaction.
   * The conditional UPDATE acts as a row lock and prevents over-redeeming under concurrency.
   */
  async redeem(input: { code: string; userId: string; organizationId: string }): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string; organizationId: string }>>`
        UPDATE "InvitationCode"
        SET "usesCount" = "usesCount" + 1
        WHERE "codeHash" = ${sha256(normalizeCode(input.code))}
          AND "isActive" = true
          AND "revokedAt" IS NULL
          AND "expiresAt" > NOW()
          AND "usesCount" < "maxUses"
          AND "organizationId" = ${input.organizationId}::uuid
        RETURNING id, "organizationId"
      `;
      if (rows.length === 0) {
        throw new BadRequestException('Invitation code is no longer valid');
      }
      await tx.membership.upsert({
        where: {
          userId_organizationId: { userId: input.userId, organizationId: rows[0].organizationId },
        },
        create: { userId: input.userId, organizationId: rows[0].organizationId },
        update: {},
      });
      return rows[0].organizationId;
    });
  }
}
