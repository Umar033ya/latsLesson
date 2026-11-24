import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService, type AccessClaims } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly auth: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      algorithms: ['HS256'],
      audience: 'platform',
      // assertConfig() guarantees the secret exists before the server starts.
      secretOrKey: process.env.JWT_ACCESS_SECRET || 'unset-secret-the-server-refuses-to-start-with',
    });
  }

  validate(payload: AccessClaims) {
    return this.auth.validateClaims(payload);
  }
}
