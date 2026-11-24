import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { AiPreparationController } from './ai-preparation.controller';
import { AiPreparationService } from './ai-preparation.service';

@Module({ imports: [CommonModule], controllers: [AiPreparationController], providers: [AiPreparationService] })
export class AiPreparationModule {}
