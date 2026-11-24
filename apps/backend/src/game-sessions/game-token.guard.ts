import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiException } from '../common/errors';

export interface GameClaims {
  sub: string;
  sid: string;
}

/** The game holds a token that can reach exactly one session and nothing else on the platform. */
@Injectable()
export class GameTokenGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const [scheme, token] = String(req.headers.authorization ?? '').split(' ');
    const denied = () => new ApiException('GAME_TOKEN_INVALID', 'This game link has expired. Open the game again from your student page.', 401);
    if (scheme !== 'Bearer' || !token) throw denied();
    try {
      req.game = await this.jwt.verifyAsync<GameClaims>(token, { secret: process.env.GAME_TOKEN_SECRET, audience: 'game', algorithms: ['HS256'] });
      return true;
    } catch {
      throw denied();
    }
  }
}
