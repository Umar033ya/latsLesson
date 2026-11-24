import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { planSchema, platformSettingsSchema, type PlanInput, type PlatformSettings } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { IdPipe, zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { AdminService } from './admin.service';

@ApiTags('admin')
@Auth(Role.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('settings')
  settings() {
    return this.service.settings();
  }

  @Put('settings')
  updateSettings(@Body(zodPipe(platformSettingsSchema)) body: PlatformSettings, @CurrentUser() user: Actor) {
    return this.service.updateSettings(body, user);
  }

  @Get('plans')
  plans() {
    return this.service.plans();
  }

  @Post('plans')
  createPlan(@Body(zodPipe(planSchema)) body: PlanInput, @CurrentUser() user: Actor) {
    return this.service.createPlan(body, user);
  }

  @Put('plans/:id')
  updatePlan(@Param('id', IdPipe) id: string, @Body(zodPipe(planSchema)) body: PlanInput, @CurrentUser() user: Actor) {
    return this.service.updatePlan(id, body, user);
  }

  @Delete('plans/:id')
  removePlan(@Param('id', IdPipe) id: string, @CurrentUser() user: Actor) {
    return this.service.removePlan(id, user);
  }

  @Get('security')
  security() {
    return this.service.security();
  }
}
