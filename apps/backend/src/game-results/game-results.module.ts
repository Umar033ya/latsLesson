import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { GameResultsController } from './game-results.controller';
import { GameResultsService } from './game-results.service';

@Module({ imports: [CommonModule], controllers: [GameResultsController], providers: [GameResultsService] })
export class GameResultsModule {}
