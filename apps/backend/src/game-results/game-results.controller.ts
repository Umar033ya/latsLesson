import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { paginationSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import type { Locale } from '@last-lesson/scenario';
import { CurrentUser, Lang } from '../common/decorators';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { GameResultsService } from './game-results.service';

const id = z.union([z.string().uuid(), z.literal('').transform(() => undefined)]).optional();
const query = paginationSchema.extend({ organizationId: id, groupId: id, campaignId: id, studentId: id, flagged: z.enum(['true', 'false']).optional() });
export type ResultQuery = z.infer<typeof query>;

@ApiTags('game-results')
@Controller('game-results')
export class GameResultsController {
  constructor(private readonly service: GameResultsService) {}

  @Get('mine')
  @Auth(Role.GAMER)
  mine(@CurrentUser() user: Actor) {
    return this.service.mine(user.id);
  }

  @Get('organization')
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  organization(@Query(zodPipe(query)) q: ResultQuery, @CurrentUser() user: Actor) {
    return this.service.organization(user, q);
  }

  @Get(':sessionId/review')
  @Auth(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Question-by-question review. Available only after the session has ended.' })
  review(@Param('sessionId', IdPipe) sessionId: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.review(sessionId, user, lang);
  }
}
