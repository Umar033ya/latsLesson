import { CanActivate, createParamDecorator, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/errors';
import type { LobbyClaims } from './lobbies.service';

/** Audience "lobby": useless for the platform API and for the game API. */
@Injectable()
export class LobbyTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const [scheme, token] = String(req.headers.authorization ?? '').split(' ');
    const denied = () => new ApiException('LOBBY_TOKEN_INVALID', 'Join the room again with its code', 401);
    if (scheme !== 'Bearer' || !token) throw denied();
    try {
      req.lobby = await this.jwt.verifyAsync<LobbyClaims>(token, { secret: process.env.GAME_TOKEN_SECRET, audience: 'lobby', algorithms: ['HS256'] });
      return true;
    } catch {
      throw denied();
    }
  }
}

export const LobbyMember = createParamDecorator((_: unknown, ctx: ExecutionContext): LobbyClaims => ctx.switchToHttp().getRequest().lobby);
