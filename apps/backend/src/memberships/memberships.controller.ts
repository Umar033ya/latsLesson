import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { z } from 'zod';
import { Role } from '@last-lesson/shared-types';
import { JwtAuthGuard, OrgAccessGuard, RolesGuard } from '../common/guards';
import { CurrentUser, Roles } from '../common/decorators';
import { zodPipe } from '../common/zod-validation.pipe';
import { MembershipsService } from './memberships.service';

const joinSchema = z.object({ code: z.string().trim().min(4).max(64) });
const emailSchema = z.object({ email: z.string().email().toLowerCase() });

@ApiTags('memberships')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, OrgAccessGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('join')
  @Roles(Role.GAMER)
  join(@Body(zodPipe(joinSchema)) body: any, @CurrentUser() user: any) {
    return this.service.join(body.code, user.id);
  }

  @Get('me')
  @Roles(Role.GAMER, Role.CENTER_ADMIN, Role.SUPER_ADMIN)
  myOrganizations(@CurrentUser() user: any) {
    return this.service.myOrganizations(user.id);
  }

  @Get('organization/:organizationId/students')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  listStudents(@Param('organizationId') organizationId: string, @CurrentUser() user: any) {
    return this.service.listStudents(organizationId, user);
  }

  @Post('organization/:organizationId/students')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  addStudent(
    @Param('organizationId') organizationId: string,
    @Body(zodPipe(emailSchema)) body: any,
    @CurrentUser() user: any,
  ) {
    return this.service.addStudent(organizationId, body.email, user);
  }

  @Delete('organization/:organizationId/students/:userId')
  @Roles(Role.SUPER_ADMIN, Role.CENTER_ADMIN)
  removeStudent(
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: any,
  ) {
    return this.service.removeStudent(organizationId, userId, user);
  }
}
