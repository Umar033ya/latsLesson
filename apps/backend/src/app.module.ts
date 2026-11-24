import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AdminModule } from './admin/admin.module';
import { CenterModule } from './center/center.module';
import { MembershipsModule } from './memberships/memberships.module';
import { InvitationsModule } from './invitations/invitations.module';
import { SubjectsModule } from './subjects/subjects.module';
import { QuestionsModule } from './questions/questions.module';
import { CollectionsModule } from './collections/collections.module';
import { MaterialsModule } from './materials/materials.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { AiPreparationModule } from './ai-preparation/ai-preparation.module';
import { GamesModule } from './games/games.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { LobbiesModule } from './lobbies/lobbies.module';
import { GameResultsModule } from './game-results/game-results.module';
import { StudentModule } from './student/student.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    CommonModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    AdminModule,
    CenterModule,
    MembershipsModule,
    InvitationsModule,
    SubjectsModule,
    QuestionsModule,
    CollectionsModule,
    MaterialsModule,
    CampaignsModule,
    AiPreparationModule,
    GamesModule,
    GameSessionsModule,
    LobbiesModule,
    GameResultsModule,
    StudentModule,
    AnalyticsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
