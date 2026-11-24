import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('platform')
  @Roles(Role.SUPER_ADMIN)
  platform() {
    return this.service.platform();
  }

  @Get('organization')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  organization(@CurrentUser() user: any, @Query('organizationId') organizationId?: string) {
    return this.service.organization(user, organizationId);
  }

  @Get('personal')
  @Roles(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  personal(@CurrentUser() user: any) {
    return this.service.personal(user.id);
  }
}
