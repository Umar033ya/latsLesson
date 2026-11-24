import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AuditLogsController } from './audit-logs.controller';

@Module({ imports: [CommonModule], controllers: [AuditLogsController] })
export class AuditLogsModule {}
