import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { QuestionsModule } from '../questions/questions.module';
import { GameSessionsController } from './game-sessions.controller';
import { GameSessionsService } from './game-sessions.service';

@Module({ imports: [CommonModule, QuestionsModule], controllers: [GameSessionsController], providers: [GameSessionsService], exports: [GameSessionsService] })
export class GameSessionsModule {}
