import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { GameResultsService } from './game-results.service';

@ApiTags('game-results')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('game-results')
export class GameResultsController {
  constructor(private readonly service: GameResultsService) {}

  @Get('mine')
  @Roles(Role.GAMER)
  mine(@CurrentUser() user: any) {
    return this.service.myResults(user.id);
  }

  @Get('organization')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  organization(@CurrentUser() user: any, @Query('organizationId') organizationId?: string) {
    return this.service.organizationResults(user, organizationId);
  }

  @Get('leaderboard')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  leaderboard(@CurrentUser() user: any, @Query('organizationId') organizationId?: string) {
    return this.service.leaderboard(user, organizationId);
  }
}
