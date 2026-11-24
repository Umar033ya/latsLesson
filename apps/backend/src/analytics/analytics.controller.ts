import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { OptionalIdPipe } from '../common/zod-validation.pipe';
import { resolveOrg, type Actor } from '../common/actor';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('platform')
  @Auth(Role.SUPER_ADMIN)
  platform() {
    return this.service.platform();
  }

  @Get('organization')
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  organization(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string, @Query('groupId', OptionalIdPipe) groupId?: string, @Query('days') days?: string) {
    return this.service.organization(resolveOrg(user, organizationId), { groupId, days: Math.min(365, Math.max(7, Number(days) || 30)) });
  }

  @Get('personal')
  @Auth(Role.GAMER)
  personal(@CurrentUser() user: Actor) {
    return this.service.student(user.id);
  }
}
