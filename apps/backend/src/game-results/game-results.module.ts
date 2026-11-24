import { Module } from '@nestjs/common';
import { GameSessionsModule } from '../game-sessions/game-sessions.module';
import { GameResultsController } from './game-results.controller';
import { GameResultsService } from './game-results.service';

@Module({ imports: [GameSessionsModule], controllers: [GameResultsController], providers: [GameResultsService], exports: [GameResultsService] })
export class GameResultsModule {}
