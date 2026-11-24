import { Body, Controller, createParamDecorator, ExecutionContext, Get, HttpCode, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { z } from 'zod';
import { checkpointSchema, completeSchema, exchangeSchema, hintSchema, playAnswerSchema, type CompleteInput, type PlayAnswerInput } from '@last-lesson/validation';
import type { Locale } from '@last-lesson/scenario';
import { Lang } from '../common/decorators';
import { RateLimit, RateLimitGuard } from '../common/rate-limit';
import { zodPipe } from '../common/zod-validation.pipe';
import { GameTokenGuard, type GameClaims } from './game-token.guard';
import { PlayService } from './play.service';

const Game = createParamDecorator((_: unknown, ctx: ExecutionContext): GameClaims => ctx.switchToHttp().getRequest().game);

/** Everything the game client needs. Content is prepared in advance; AI is never called here. */
@ApiTags('play')
@Controller('play')
export class PlayController {
  constructor(private readonly service: PlayService) {}

  @Post('exchange')
  @HttpCode(200)
  @UseGuards(RateLimitGuard)
  @RateLimit('exchange', 600, 600)
  @ApiOperation({ summary: 'Swap a one-time launch ticket for a session-scoped game token' })
  exchange(@Body(zodPipe(exchangeSchema)) body: { ticket: string }, @Lang() lang: Locale) {
    return this.service.exchange(body.ticket, lang);
  }

  @Get('session')
  @ApiBearerAuth()
  @UseGuards(GameTokenGuard)
  session(@Game() game: GameClaims, @Lang() lang: Locale) {
    return this.service.session(game, lang);
  }

  @Post('answers')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(GameTokenGuard)
  @ApiOperation({ summary: 'Grade one answer on the server. Repeating a requestId returns the first result.' })
  answer(@Body(zodPipe(playAnswerSchema)) body: PlayAnswerInput, @Game() game: GameClaims, @Lang() lang: Locale) {
    return this.service.answer(game, body, lang);
  }

  @Post('hint')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(GameTokenGuard)
  hint(@Body(zodPipe(hintSchema)) body: { questionId: string }, @Game() game: GameClaims, @Lang() lang: Locale) {
    return this.service.hint(game, body.questionId, lang);
  }

  @Put('checkpoint')
  @ApiBearerAuth()
  @UseGuards(GameTokenGuard)
  checkpoint(@Body(zodPipe(checkpointSchema)) body: z.infer<typeof checkpointSchema>, @Game() game: GameClaims) {
    return this.service.checkpoint(game, body);
  }

  @Post('complete')
  @HttpCode(200)
  @ApiBearerAuth()
  @UseGuards(GameTokenGuard)
  complete(@Body(zodPipe(completeSchema)) body: CompleteInput, @Game() game: GameClaims, @Lang() lang: Locale) {
    return this.service.completeOwned(game, body, lang);
  }
}
