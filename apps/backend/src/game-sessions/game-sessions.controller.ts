import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { completeSessionSchema, createSessionSchema } from '@last-lesson/validation';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { GameSessionsService } from './game-sessions.service';

@ApiTags('game-sessions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('game-sessions')
export class GameSessionsController {
  constructor(private readonly service: GameSessionsService) {}

  @Post()
  @Roles(Role.GAMER)
  @ApiOperation({ summary: 'Start a game. Questions contain no answers and are fixed for this session.' })
  create(@Body(zodPipe(createSessionSchema)) body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Get('history')
  @Roles(Role.GAMER)
  history(@CurrentUser() user: any) {
    return this.service.history(user.id);
  }

  @Get(':id')
  @Roles(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Post(':id/answers')
  @Roles(Role.GAMER)
  @ApiOperation({ summary: 'Submit one answer. Grading happens on the server.' })
  submit(@Param('id') id: string, @Body() body: any, @CurrentUser() user: any) {
    return this.service.submitAnswer(id, body, user);
  }

  @Post(':id/complete')
  @Roles(Role.GAMER)
  complete(@Param('id') id: string, @Body(zodPipe(completeSessionSchema)) body: any, @CurrentUser() user: any) {
    return this.service.complete(id, body, user);
  }

  @Post(':id/abandon')
  @Roles(Role.GAMER)
  abandon(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.abandon(id, user);
  }
}
