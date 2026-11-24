import { Module } from '@nestjs/common';
import { CommonModule } from '../common/common.module';
import { InvitationRedemptionService } from './invitation-redemption.service';
import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [CommonModule],
  controllers: [InvitationsController],
  providers: [InvitationsService, InvitationRedemptionService],
  exports: [InvitationRedemptionService, InvitationsService],
})
export class InvitationsModule {}
