import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InvitationsModule } from '../invitations/invitations.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleIdentity } from './google-identity';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [PassportModule, JwtModule.register({}), InvitationsModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleIdentity],
  exports: [AuthService],
})
export class AuthModule {}
