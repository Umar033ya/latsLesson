import { Module } from '@nestjs/common';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { GameSessionsModule } from '../game-sessions/game-sessions.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

@Module({ imports: [CampaignsModule, GameSessionsModule, AnalyticsModule], controllers: [StudentController], providers: [StudentService] })
export class StudentModule {}
