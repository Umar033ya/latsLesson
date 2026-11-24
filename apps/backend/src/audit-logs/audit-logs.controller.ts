import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { paginationSchema } from '@last-lesson/validation';
import { PrismaService } from '../common/prisma.service';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { resolveOrg, type Actor } from '../common/actor';

const query = paginationSchema.extend({
  organizationId: z.union([z.string().uuid(), z.literal('').transform(() => undefined)]).optional(),
  category: z.enum(['ADMIN', 'AUTH', 'SECURITY', 'ACTIVITY']).optional(),
});

@ApiTags('audit-logs')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: Actor, @Query(zodPipe(query)) q: z.infer<typeof query>) {
    const where: Prisma.AuditLogWhereInput = {
      ...(user.role === Role.SUPER_ADMIN ? (q.organizationId ? { organizationId: q.organizationId } : {}) : { organizationId: resolveOrg(user, q.organizationId) }),
      ...(q.category ? { category: q.category } : {}),
      ...(q.search ? { action: { contains: q.search.toUpperCase().replace(/\s+/g, '_') } } : {}),
    };
    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        select: { id: true, action: true, category: true, targetType: true, targetId: true, metadata: true, createdAt: true, ip: user.role === Role.SUPER_ADMIN, actor: { select: { firstName: true, lastName: true, email: true } }, organization: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    return { total, page: q.page, pageSize: q.pageSize, items };
  }
}
