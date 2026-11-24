import { applyDecorators, CanActivate, ExecutionContext, Injectable, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Role } from '@last-lesson/shared-types';
import { Roles, ROLES_KEY } from './decorators';
import { ApiException, forbidden } from './errors';

const unauthenticated = () => new ApiException('UNAUTHENTICATED', 'Sign in to continue', 401);

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err?.getStatus) throw err;
    if (err || !user) throw unauthenticated();
    return user as TUser;
  }
}

/** Deny by default: an endpoint behind this guard must name the roles it accepts. */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    const { user } = context.switchToHttp().getRequest();
    if (!user) throw unauthenticated();
    if (!roles?.includes(user.role)) throw forbidden('You do not have permission to perform this action');
    return true;
  }
}

/** Authenticated endpoint limited to the given roles. */
export const Auth = (...roles: Role[]) => applyDecorators(ApiBearerAuth(), UseGuards(JwtAuthGuard, RolesGuard), Roles(...roles));
