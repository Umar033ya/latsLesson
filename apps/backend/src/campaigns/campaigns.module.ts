import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { LevelsService } from './levels.service';
import { QuestionPicker } from './question-picker';

@Module({ controllers: [CampaignsController], providers: [CampaignsService, QuestionPicker, LevelsService], exports: [CampaignsService, QuestionPicker, LevelsService] })
export class CampaignsModule {}
