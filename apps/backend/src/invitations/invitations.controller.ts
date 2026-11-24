import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, OrgAccessGuard, RolesGuard } from '../common/guards';
import { CurrentUser, RequireOrgAccess, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { InvitationsService } from './invitations.service';

const validateBodySchema = z.object({ code: z.string().min(4).max(64) });
const activeBodySchema = z.object({ isActive: z.boolean() });

@ApiTags('invitations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OrgAccessGuard)
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly service: InvitationsService) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @RequireOrgAccess('body')
  @ApiOperation({ summary: 'Generate an invitation code (plaintext returned once)' })
  create(@Body() body: any, @CurrentUser() user: any) {
    return this.service.create(body, user);
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @ApiOperation({ summary: 'List invitation codes visible to the caller' })
  findAll(@CurrentUser() user: any, @Query('organizationId') organizationId?: string) {
    return this.service.findAll(user, organizationId);
  }

  @Post('validate')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  @ApiOperation({ summary: 'Check an invitation code without using it' })
  validate(@Body(zodPipe(validateBodySchema)) body: any) {
    return this.service.validate(body.code);
  }

  @Patch(':id/revoke')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @ApiOperation({ summary: 'Revoke an invitation code' })
  revoke(@Param('id') id: string, @CurrentUser() user: any) {
    return this.service.revoke(id, user);
  }

  @Patch(':id/active')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  @ApiOperation({ summary: 'Enable or disable an invitation code' })
  setActive(@Param('id') id: string, @Body(zodPipe(activeBodySchema)) body: any, @CurrentUser() user: any) {
    return this.service.setActive(id, body.isActive, user);
  }
}
