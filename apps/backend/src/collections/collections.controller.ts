import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { collectionSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { CollectionsService } from './collections.service';

type Input = z.infer<typeof collectionSchema>;

@ApiTags('question-collections')
@Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get()
  findAll(@CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.findAll(user, organizationId);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body(zodPipe(collectionSchema)) body: Input, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.create(body, user, organizationId);
  }

  @Put(':id')
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(collectionSchema)) body: Input, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  remove(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.remove(id, user);
  }
}
