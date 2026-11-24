import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { practiceAnswerSchema, preparationSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import type { Locale } from '@last-lesson/scenario';
import { CurrentUser, Lang } from '../common/decorators';
import { RateLimit, RateLimitGuard } from '../common/rate-limit';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { AiPreparationService } from './ai-preparation.service';

/** Study before playing. Nothing here is used while a game session is running. */
@ApiTags('ai-preparation')
@Auth(Role.GAMER)
@UseGuards(RateLimitGuard)
@Controller('ai-preparation')
export class AiPreparationController {
  constructor(private readonly service: AiPreparationService) {}

  @Post()
  @RateLimit('preparation', 30, 3600)
  @ApiOperation({ summary: 'Build a study guide from prepared materials, optionally extended by an AI provider' })
  create(@Body(zodPipe(preparationSchema)) body: z.infer<typeof preparationSchema>, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.create(body, user, lang);
  }

  @Get('mine')
  mine(@CurrentUser() user: Actor) {
    return this.service.mine(user.id);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.findOne(id, user, lang);
  }

  @Post(':id/practice')
  @HttpCode(200)
  practice(@Param('id', IdPipe) id: string, @Body(zodPipe(practiceAnswerSchema)) body: { questionId: string; answer: unknown }, @CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.practice(id, body, user, lang);
  }
}
