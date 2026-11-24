import { Module } from '@nestjs/common';
import { CampaignsController } from './campaigns.controller';
import { CampaignsService } from './campaigns.service';
import { QuestionPicker } from './question-picker';

@Module({ controllers: [CampaignsController], providers: [CampaignsService, QuestionPicker], exports: [CampaignsService, QuestionPicker] })
export class CampaignsModule {}
