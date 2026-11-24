import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { materialSchema, type MaterialInput } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { MaterialsService } from './materials.service';

@ApiTags('learning-materials')
@Controller('materials')
export class MaterialsController {
  constructor(private readonly service: MaterialsService) {}

  @Get()
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  findAll(@CurrentUser() user: Actor, @Query('subjectId', OptionalIdPipe) subjectId?: string, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.findAll(user, subjectId, organizationId);
  }

  @Post()
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  create(@Body(zodPipe(materialSchema)) body: MaterialInput, @CurrentUser() user: Actor, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.create(body, user, organizationId);
  }

  @Put(':id')
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(materialSchema)) body: MaterialInput, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }

  @Delete(':id')
  @Auth(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  remove(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.remove(id, user);
  }
}
