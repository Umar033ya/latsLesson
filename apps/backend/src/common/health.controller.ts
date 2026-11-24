import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', service: 'last-lesson-backend', time: new Date().toISOString() };
  }
}
