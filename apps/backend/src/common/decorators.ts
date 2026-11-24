import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { toLocale } from '@last-lesson/scenario';
import { Role } from '@last-lesson/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);
/** Reader's language: an explicit header from our clients, English otherwise. */
export const Lang = createParamDecorator((_data: unknown, ctx: ExecutionContext) => toLocale(ctx.switchToHttp().getRequest().headers['x-ll-lang']));
export const ClientIp = createParamDecorator((_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().ip);
