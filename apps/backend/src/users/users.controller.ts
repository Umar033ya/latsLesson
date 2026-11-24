import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { ROLE_VALUES } from '@last-lesson/constants';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { UsersService } from './users.service';

const assignSchema = z.object({ organizationId: z.string().uuid() });
const statusSchema = z.object({ status: z.enum(['ACTIVE', 'SUSPENDED']) });

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  list(
    @CurrentUser() user: any,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    const validRole = ROLE_VALUES.includes(role as any) ? (role as Role) : undefined;
    return this.service.list(user, { role: validRole, search, organizationId });
  }

  @Post('admins')
  @Roles(Role.SUPER_ADMIN)
  createAdmin(@Body() body: any, @CurrentUser() user: any) {
    return this.service.createAdmin(body, user);
  }

  @Post(':id/assign')
  @Roles(Role.SUPER_ADMIN)
  assign(@Param('id') id: string, @Body(zodPipe(assignSchema)) body: any, @CurrentUser() user: any) {
    return this.service.assignAdmin(id, body.organizationId, user);
  }

  @Patch(':id/status')
  @Roles(Role.SUPER_ADMIN)
  setStatus(@Param('id') id: string, @Body(zodPipe(statusSchema)) body: any, @CurrentUser() user: any) {
    return this.service.setStatus(id, body.status, user);
  }

  @Get('profile')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN, Role.GAMER)
  profile(@CurrentUser() user: any) {
    return this.service.getProfile(user.id);
  }
}
