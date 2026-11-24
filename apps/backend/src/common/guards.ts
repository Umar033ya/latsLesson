import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from './prisma.service';
import { ORG_ACCESS_KEY, ROLES_KEY } from './decorators';
import { Role } from '@last-lesson/shared-types';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, _info: any): TUser {
    if (err || !user) throw err || new UnauthorizedException('Authentication required');
    return user as TUser;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles || roles.length === 0) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (!roles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}

@Injectable()
export class OrgAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const source = this.reflector.getAllAndOverride<'param' | 'body' | undefined>(ORG_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!source) return true;
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) throw new UnauthorizedException();
    if (user.role === 'SUPER_ADMIN') return true;
    const organizationId: string | undefined =
      source === 'param' ? (req.params.organizationId ?? req.params.id) : req.body?.organizationId;
    if (!organizationId) throw new ForbiddenException('Organization is required');

    const [adminLink, membership] = await Promise.all([
      this.prisma.organizationAdmin.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } },
      }),
      this.prisma.membership.findUnique({
        where: { userId_organizationId: { userId: user.id, organizationId } },
      }),
    ]);
    if (!adminLink && !membership) {
      throw new ForbiddenException('You do not belong to this organization');
    }
    return true;
  }
}
