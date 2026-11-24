import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({ imports: [CommonModule], controllers: [SubjectsController], providers: [SubjectsService], exports: [SubjectsService] })
export class SubjectsModule {}
