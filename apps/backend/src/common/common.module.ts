import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessService } from './access.service';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, RolesGuard } from './guards';
import { HealthController } from './health.controller';
import { RateLimitGuard, RateLimitService } from './rate-limit';

const shared = [PrismaService, AuditService, AccessService, RateLimitService, JwtAuthGuard, RolesGuard, RateLimitGuard];

@Global()
@Module({
  controllers: [HealthController],
  providers: [...shared, Reflector],
  exports: shared,
})
export class CommonModule {}
