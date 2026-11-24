import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { subjectSchema, topicSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { SubjectsService } from './subjects.service';

const subjectPatch = subjectSchema.partial().extend({ isActive: z.boolean().optional() });
const topicPatch = topicSchema.partial().extend({ isActive: z.boolean().optional() });

/** Subjects and topics are shared by the whole platform and managed by super admins. */
@ApiTags('subjects')
@Controller('subjects')
export class SubjectsController {
  constructor(private readonly service: SubjectsService) {}

  @Get()
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  findAll(@CurrentUser() user: Actor, @Query('all') all?: string) {
    return this.service.findAll(user.role === Role.SUPER_ADMIN && all === 'true');
  }

  @Post()
  @Auth(Role.SUPER_ADMIN)
  create(@Body(zodPipe(subjectSchema)) body: z.infer<typeof subjectSchema>, @CurrentUser() user: Actor) {
    return this.service.create(body, user);
  }

  @Patch(':id')
  @Auth(Role.SUPER_ADMIN)
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(subjectPatch)) body: z.infer<typeof subjectPatch>, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }

  @Post(':id/topics')
  @Auth(Role.SUPER_ADMIN)
  createTopic(@Param('id', IdPipe) id: string, @Body(zodPipe(topicSchema)) body: z.infer<typeof topicSchema>, @CurrentUser() user: Actor) {
    return this.service.createTopic(id, body, user);
  }

  @Patch('topics/:topicId')
  @Auth(Role.SUPER_ADMIN)
  updateTopic(@Param('topicId', IdPipe) id: string, @Body(zodPipe(topicPatch)) body: z.infer<typeof topicPatch>, @CurrentUser() user: Actor) {
    return this.service.updateTopic(id, body, user);
  }

  @Delete('topics/:topicId')
  @Auth(Role.SUPER_ADMIN)
  removeTopic(@Param('topicId', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.removeTopic(id, user);
  }
}
