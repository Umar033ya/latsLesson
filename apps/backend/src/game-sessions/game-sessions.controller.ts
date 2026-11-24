import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { launchSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { RateLimit, RateLimitGuard } from '../common/rate-limit';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { GameSessionsService } from './game-sessions.service';

/** Platform side of a session: start, resume, history. The running game uses /play. */
@ApiTags('game-sessions')
@Auth(Role.GAMER)
@UseGuards(RateLimitGuard)
@Controller('game-sessions')
export class GameSessionsController {
  constructor(private readonly service: GameSessionsService) {}

  @Post('launch')
  @RateLimit('launch', 60, 600)
  @ApiOperation({ summary: 'Start a campaign. Returns a one-time link to the game.' })
  launch(@Body(zodPipe(launchSchema)) body: { campaignId: string; preparationId?: string | null }, @CurrentUser() user: Actor) {
    return this.service.launch(body, user);
  }

  @Post(':id/resume')
  @HttpCode(200)
  @RateLimit('resume', 60, 600)
  resume(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.resume(id, user);
  }

  @Post(':id/abandon')
  @HttpCode(200)
  abandon(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.abandon(id, user);
  }

  @Get('history')
  history(@CurrentUser() user: Actor) {
    return this.service.history(user.id);
  }
}
