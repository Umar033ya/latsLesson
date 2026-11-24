import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { MembershipsModule } from './memberships/memberships.module';
import { InvitationsModule } from './invitations/invitations.module';
import { SubjectsModule } from './subjects/subjects.module';
import { QuestionsModule } from './questions/questions.module';
import { AiPreparationModule } from './ai-preparation/ai-preparation.module';
import { GamesModule } from './games/games.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { GameResultsModule } from './game-results/game-results.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    CommonModule,
    AuthModule,
    RolesModule,
    UsersModule,
    OrganizationsModule,
    MembershipsModule,
    InvitationsModule,
    SubjectsModule,
    QuestionsModule,
    AiPreparationModule,
    GamesModule,
    GameSessionsModule,
    GameResultsModule,
    AnalyticsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}
