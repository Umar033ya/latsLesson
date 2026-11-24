import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { createOrganizationSchema, organizationStatusSchema, paginationSchema, updateOrganizationSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { OrganizationsService } from './organizations.service';

const listSchema = paginationSchema.extend({ status: z.enum(['ACTIVE', 'SUSPENDED', 'INACTIVE']).optional(), planId: z.string().uuid().optional() });

/** Education centers as seen by the platform owner. Centers edit themselves through /center. */
@ApiTags('organizations')
@Auth(Role.SUPER_ADMIN)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Post()
  create(@Body(zodPipe(createOrganizationSchema)) body: z.infer<typeof createOrganizationSchema>, @CurrentUser() user: Actor) {
    return this.service.create(body, user);
  }

  @Get()
  findAll(@Query(zodPipe(listSchema)) query: z.infer<typeof listSchema>) {
    return this.service.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', IdPipe) id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id', IdPipe) id: string, @Body(zodPipe(organizationStatusSchema)) body: z.infer<typeof organizationStatusSchema>, @CurrentUser() user: Actor) {
    return this.service.updateStatus(id, body.status, body.reason, user);
  }

  @Patch(':id')
  update(@Param('id', IdPipe) id: string, @Body(zodPipe(updateOrganizationSchema)) body: z.infer<typeof updateOrganizationSchema>, @CurrentUser() user: Actor) {
    return this.service.update(id, body, user);
  }
}
