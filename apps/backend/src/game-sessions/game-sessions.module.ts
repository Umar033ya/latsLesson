import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CampaignsModule } from '../campaigns/campaigns.module';
import { GameSessionsController } from './game-sessions.controller';
import { GameSessionsService } from './game-sessions.service';
import { GameTokenGuard } from './game-token.guard';
import { PlayController } from './play.controller';
import { PlayService } from './play.service';

@Module({
  imports: [JwtModule.register({}), CampaignsModule],
  controllers: [GameSessionsController, PlayController],
  providers: [GameSessionsService, PlayService, GameTokenGuard],
  exports: [GameSessionsService, PlayService],
})
export class GameSessionsModule {}
