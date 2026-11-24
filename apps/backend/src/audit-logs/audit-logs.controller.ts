import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { PrismaService } from '../common/prisma.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';

@ApiTags('audit-logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  async list(@CurrentUser() user: any, @Query('organizationId') organizationId?: string) {
    const where =
      user.role === Role.SUPER_ADMIN
        ? organizationId
          ? { organizationId }
          : {}
        : { organizationId: { in: user.organizationIds } };
    return this.prisma.auditLog.findMany({
      where,
      include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }
}
