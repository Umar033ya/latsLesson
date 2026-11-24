import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { DIFFICULTY_VALUES } from '@last-lesson/constants';
import { Difficulty, Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { QuestionsService } from './questions.service';

@ApiTags('questions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  findAll(
    @CurrentUser() user: any,
    @Query('subjectId') subjectId?: string,
    @Query('difficulty') difficulty?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const valid = DIFFICULTY_VALUES.includes(difficulty as any) ? (difficulty as Difficulty) : undefined;
    return this.service.findAll(user, { subjectId, difficulty: valid, organizationId });
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @ApiOperation({ summary: 'Create a question; answers are stored server-side only' })
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Patch(':id/active')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  setActive(@Param('id') id: string, @Body(zodPipe(z.object({ isActive: z.boolean() }))) body: any, @CurrentUser() user: any) {
    return this.service.setActive(id, body.isActive, user);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.remove(id, user);
  }

  @Get('play')
  @Roles(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Answer-free question payload for gameplay' })
  play(
    @CurrentUser() user: any,
    @Query('subjectId') subjectId: string,
    @Query('difficulty') difficulty?: string,
    @Query('topics') topics?: string,
    @Query('limit') limit?: string,
  ) {
    const orgIds: string[] = user.organizationIds ?? [];
    return this.service.getPlayQuestions({
      subjectId,
      topics: topics ? topics.split(',').filter(Boolean) : [],
      difficulty: (DIFFICULTY_VALUES.includes(difficulty as any) ? difficulty : 'MEDIUM') as Difficulty,
      organizationId: user.role === 'GAMER' ? orgIds[0] ?? null : null,
      limit: limit ? Math.min(Number(limit), 30) : 20,
    });
  }
}
