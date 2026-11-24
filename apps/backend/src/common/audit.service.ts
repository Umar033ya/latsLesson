import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

export type AuditCategory = 'ADMIN' | 'AUTH' | 'SECURITY' | 'ACTIVITY';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /** Records who did what. Never pass secrets, codes or answers in metadata. */
  async log(data: {
    actorId?: string | null;
    organizationId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: object;
    category?: AuditCategory;
    ip?: string | null;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        organizationId: data.organizationId ?? null,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        category: data.category ?? 'ADMIN',
        ip: data.ip ?? null,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }
}
