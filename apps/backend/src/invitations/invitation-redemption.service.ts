import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { ApiException } from '../common/errors';
import { hashCode } from '../common/crypto.util';

@Injectable()
export class InvitationRedemptionService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCode(rawCode: string) {
    const code = await this.prisma.invitationCode.findUnique({
      where: { codeHash: hashCode(rawCode) },
      include: { student: true, group: { select: { id: true, name: true } } },
    });
    if (!code) throw new ApiException('CODE_INVALID', 'We do not recognise this code. Check it and try again.', 400);
    if (!code.isActive || code.revokedAt) throw new ApiException('CODE_REVOKED', 'This code was turned off. Ask your teacher for a new one.', 400);
    if (code.expiresAt < new Date()) throw new ApiException('CODE_EXPIRED', 'This code has expired. Ask your teacher for a new one.', 400);
    if (code.kind === 'GROUP' && code.usesCount >= code.maxUses) throw new ApiException('CODE_USED_UP', 'This code has been used the maximum number of times.', 400);
    return code;
  }

  /** The conditional UPDATE acts as a row lock and prevents over-redeeming under concurrency. */
  async consume(tx: Prisma.TransactionClient, codeId: string): Promise<void> {
    const rows = await tx.$executeRaw`
      UPDATE "InvitationCode" SET "usesCount" = "usesCount" + 1, "lastUsedAt" = NOW()
      WHERE id = ${codeId}::uuid AND "isActive" = true AND "revokedAt" IS NULL AND "usesCount" < "maxUses"`;
    if (rows === 0) throw new ApiException('CODE_USED_UP', 'This code has been used the maximum number of times.', 400);
  }
}
