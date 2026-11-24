import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, OrgAccessGuard, RolesGuard } from '../common/guards';
import { CurrentUser, RequireOrgAccess, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';

const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });
const updateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  logoUrl: z.string().url().nullable().optional(),
});

@ApiTags('organizations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OrgAccessGuard)
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN)
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  findAll(@CurrentUser() user: any) {
    return this.service.findAll(user);
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @RequireOrgAccess('param')
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.findOne(id, user);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN)
  updateStatus(@Param('id') id: string, @Body(zodPipe(statusSchema)) body: any, @CurrentUser() user: any) {
    return this.service.updateStatus(id, body.status, user);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @RequireOrgAccess('param')
  update(@Param('id') id: string, @Body(zodPipe(updateSchema)) body: any, @CurrentUser() user: any) {
    return this.service.update(id, body, user);
  }
}
