import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { GameSessionsModule } from '../game-sessions/game-sessions.module';
import { GameTokenGuard } from '../game-sessions/game-token.guard';
import { LobbiesController, RoomController } from './lobbies.controller';
import { LobbiesService } from './lobbies.service';
import { LobbySyncController } from './lobby-sync.controller';
import { LobbySyncService } from './lobby-sync.service';
import { LobbyTokenGuard } from './lobby-token.guard';

@Module({
  imports: [JwtModule.register({}), CampaignsModule, GameSessionsModule],
  controllers: [LobbiesController, RoomController, LobbySyncController],
  providers: [LobbiesService, LobbySyncService, LobbyTokenGuard, GameTokenGuard],
})
export class LobbiesModule {}
