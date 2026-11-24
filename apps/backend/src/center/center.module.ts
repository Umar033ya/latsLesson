import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { GameSessionsModule } from '../game-sessions/game-sessions.module';
import { CenterController } from './center.controller';
import { CenterService } from './center.service';
import { TeachersService } from './teachers.service';
import { StudentsService } from './students.service';

@Module({ imports: [InvitationsModule, AnalyticsModule, GameSessionsModule], controllers: [CenterController], providers: [CenterService, StudentsService, TeachersService] })
export class CenterModule {}
