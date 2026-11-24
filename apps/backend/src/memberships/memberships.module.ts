import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({ imports: [CommonModule, InvitationsModule], controllers: [MembershipsController], providers: [MembershipsService], exports: [MembershipsService] })
export class MembershipsModule {}
