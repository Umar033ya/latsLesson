import { Body, Controller, createParamDecorator, ExecutionContext, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { lobbySyncSchema, type LobbySyncInput } from '@last-lesson/validation';
import { zodPipe } from '../common/zod-validation.pipe';
import { GameTokenGuard, type GameClaims } from '../game-sessions/game-token.guard';
import { LobbySyncService } from './lobby-sync.service';

const Game = createParamDecorator((_: unknown, ctx: ExecutionContext): GameClaims => ctx.switchToHttp().getRequest().game);

@ApiTags('play')
@ApiBearerAuth()
@UseGuards(GameTokenGuard)
@Controller('play/lobby')
export class LobbySyncController {
  constructor(private readonly service: LobbySyncService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Send my position and phrase, receive the other players and the standings' })
  sync(@Body(zodPipe(lobbySyncSchema)) body: LobbySyncInput, @Game() game: GameClaims) {
    return this.service.sync(game, body);
  }

  @Get()
  @ApiOperation({ summary: 'Standings only, for the result screen' })
  watch(@Game() game: GameClaims) {
    return this.service.sync(game, null);
  }
}
