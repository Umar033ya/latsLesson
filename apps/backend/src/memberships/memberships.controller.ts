import { Body, Controller, Get, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { joinCenterSchema } from '@last-lesson/validation';
import { Auth } from '../common/guards';
import { CurrentUser } from '../common/decorators';
import { RateLimit, RateLimitGuard } from '../common/rate-limit';
import { zodPipe } from '../common/zod-validation.pipe';
import type { Actor } from '../common/actor';
import { MembershipsService } from './memberships.service';

/** Student-facing membership actions. Centers manage students through /center/students. */
@ApiTags('memberships')
@Auth(Role.GAMER)
@UseGuards(RateLimitGuard)
@Controller('memberships')
export class MembershipsController {
  constructor(private readonly service: MembershipsService) {}

  @Post('join')
  @HttpCode(200)
  @RateLimit('join', 10, 600)
  join(@Body(zodPipe(joinCenterSchema)) body: { code: string }, @CurrentUser() user: Actor) {
    return this.service.join(body.code, user.id);
  }

  @Get('me')
  mine(@CurrentUser() user: Actor) {
    return this.service.myOrganizations(user.id);
  }
}
