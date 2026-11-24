import { Module } from '@nestjs/common';
import { InvitationRedemptionService } from './invitation-redemption.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationRedemptionService],
  exports: [InvitationsService, InvitationRedemptionService],
})
export class InvitationsModule {}
