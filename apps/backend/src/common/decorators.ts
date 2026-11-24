import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '@last-lesson/shared-types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const ORG_ACCESS_KEY = 'org_access';
/**
 * Guards an endpoint by resolving the organization id from the given source.
 * 'param' reads :organizationId (or :id) from the route, 'body' reads body.organizationId.
 * SUPER_ADMIN bypasses the check. All other roles must be an assigned admin or a member.
 */
export const RequireOrgAccess = (source: 'param' | 'body' = 'param') => SetMetadata(ORG_ACCESS_KEY, source);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
