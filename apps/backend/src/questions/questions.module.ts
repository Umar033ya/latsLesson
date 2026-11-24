import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({ imports: [CommonModule], controllers: [QuestionsController], providers: [QuestionsService], exports: [QuestionsService] })
export class QuestionsModule {}
