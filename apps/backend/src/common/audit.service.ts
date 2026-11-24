import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(data: {
    actorId?: string | null;
    organizationId?: string | null;
    action: string;
    targetType: string;
    targetId?: string | null;
    metadata?: object;
  }): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId: data.actorId ?? null,
        organizationId: data.organizationId ?? null,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId ?? null,
        metadata: (data.metadata ?? {}) as object,
      },
    });
  }
}
