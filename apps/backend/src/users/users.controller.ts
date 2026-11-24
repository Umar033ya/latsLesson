import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { createAdminSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, OptionalIdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { UsersService } from './users.service';

/** Platform accounts. Super admins only; centers manage their students through /center. */
@ApiTags('users')
@Auth(Role.SUPER_ADMIN)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get('admins')
  admins(@Query('search') search?: string, @Query('organizationId', OptionalIdPipe) organizationId?: string) {
    return this.service.listAdmins({ search, organizationId });
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create a center administrator. A generated password is returned once.' })
  createAdmin(@Body(zodPipe(createAdminSchema)) body: z.infer<typeof createAdminSchema>, @CurrentUser() user: Actor) {
    return this.service.createAdmin(body, user);
  }

  @Post(':id/assign')
  @HttpCode(200)
  assign(@Param('id', IdPipe) id: string, @Body(zodPipe(z.object({ organizationId: z.string().uuid() }))) body: { organizationId: string }, @CurrentUser() user: Actor) {
    return this.service.assignAdmin(id, body.organizationId, user);
  }

  @Delete(':id/assign/:organizationId')
  unassign(@Param('id', IdPipe) id: string, @Param('organizationId', IdPipe) organizationId: string, @CurrentUser() user: Actor) {
    return this.service.unassignAdmin(id, organizationId, user);
  }

  @Patch(':id/status')
  setStatus(@Param('id', IdPipe) id: string, @Body(zodPipe(z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) }))) body: { status: 'ACTIVE' | 'SUSPENDED' }, @CurrentUser() user: Actor) {
    return this.service.setStatus(id, body.status, user);
  }

  @Post(':id/reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Issue a temporary password for a center administrator (returned once)' })
  resetPassword(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.resetPassword(id, user);
  }
}
