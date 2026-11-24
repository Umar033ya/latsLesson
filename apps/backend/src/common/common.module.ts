import { Global, Module } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard, OrgAccessGuard, RolesGuard } from './guards';

@Global()
@Module({
  providers: [PrismaService, AuditService, Reflector, JwtAuthGuard, RolesGuard, OrgAccessGuard],
  exports: [PrismaService, AuditService, JwtAuthGuard, RolesGuard, OrgAccessGuard],
})
export class CommonModule {}
