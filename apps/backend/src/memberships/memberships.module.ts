import { Module } from '@nestjs/common';
import { InvitationsModule } from '../invitations/invitations.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({ imports: [InvitationsModule], controllers: [MembershipsController], providers: [MembershipsService] })
export class MembershipsModule {}
