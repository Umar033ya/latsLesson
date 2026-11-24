import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { contentStatusSchema, createQuestionSchema, difficultySchema, importQuestionsSchema, paginationSchema, questionTypeSchema, type CreateQuestionInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { QuestionsService } from './questions.service';

const optionalUuid = z.union([z.string().uuid(), z.literal('').transform(() => undefined)]).optional();
export const questionQuery = paginationSchema.extend({
  organizationId: optionalUuid,
  subjectId: optionalUuid,
  topicId: optionalUuid,
  collectionId: optionalUuid,
  difficulty: difficultySchema.optional(),
  type: questionTypeSchema.optional(),
  status: contentStatusSchema.optional(),
  scope: z.enum(['all', 'official', 'own']).default('all'),
});
export type QuestionQuery = z.infer<typeof questionQuery>;

@ApiTags('questions')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
@Controller('questions')
export class QuestionsController {
  constructor(private readonly service: QuestionsService) {}

  @Get()
  findAll(@Query(zodPipe(questionQuery)) query: QuestionQuery, @CurrentUser() user: Actor) {
    return this.service.findAll(user, query);
  }

  @Get('export')
  @ApiOperation({ summary: 'All questions owned by the center (or official ones for a super admin) in import format' })
  export(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.export(user, organizationId);
  }

  @Post('import')
  @HttpCode(200)
  @ApiOperation({ summary: 'Validate and import questions. dryRun reports problems without saving.' })
  import(@Body(zodPipe(importQuestionsSchema)) body: z.infer<typeof importQuestionsSchema>, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.import(body, user, organizationId);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.visible(id, user);
  }

  @Post()
  create(@Body(zodPipe(createQuestionSchema)) body: CreateQuestionInput, @CurrentUser() user: Actor) {
    return this.service.create(body, user);
  }

  @Put(':id')
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(createQuestionSchema)) body: CreateQuestionInput, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }

  @Patch(':id/status')
  setStatus(@Param('id', IdPipe) id: string, @Body(zodPipe(z.object({ status: contentStatusSchema }))) body: { status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' }, @CurrentUser() user: Actor) {
    return this.service.setStatus(id, body.status, user);
  }

  @Delete(':id')
  remove(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.remove(id, user);
  }
}
