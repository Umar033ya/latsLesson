import { Module } from '@nestjs/common';
import { AiPreparationController } from './ai-preparation.controller';
import { AiPreparationService } from './ai-preparation.service';
import { StudyGuideProvider } from './study-guide.provider';

@Module({ controllers: [AiPreparationController], providers: [AiPreparationService, StudyGuideProvider] })
export class AiPreparationModule {}
