import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { Auth } from '../common/guards';
import type { Locale } from '@last-lesson/scenario';
import { CurrentUser, Lang } from '../common/decorators';
import type { Actor } from '../common/actor';
import { AnalyticsService } from '../analytics/analytics.service';
import { StudentService } from './student.service';

@ApiTags('student')
@Auth(Role.GAMER)
@Controller('student')
export class StudentController {
  constructor(
    private readonly service: StudentService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('home')
  @ApiOperation({ summary: 'Center branding, assigned campaigns and a short progress summary' })
  home(@CurrentUser() user: Actor, @Lang() lang: Locale) {
    return this.service.home(user, lang);
  }

  @Get('progress')
  progress(@CurrentUser() user: Actor) {
    return this.analytics.student(user.id);
  }
}
