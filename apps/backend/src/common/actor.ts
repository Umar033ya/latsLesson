import type { Role } from '@last-lesson/shared-types';
import { forbidden, invalid } from './errors';

export interface Actor {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  role: Role;
  locale: string;
  /** CENTER_ADMIN: centers they administer. TEACHER: their center. GAMER: centers they belong to. SUPER_ADMIN: empty. */
  organizationIds: string[];
  /** Set when the session was opened with an access code and is limited to that center. */
  boundOrg?: string;
}

/**
 * The only way a request is turned into a tenant id.
 * Center admins can never address a center they do not administer, even if they send its id.
 */
export function resolveOrg(actor: Actor, requested?: string | null): string {
  if (actor.role === 'SUPER_ADMIN') {
    if (!requested) throw invalid('organizationId is required');
    return requested;
  }
  if (actor.role !== 'CENTER_ADMIN') throw forbidden();
  if (requested && !actor.organizationIds.includes(requested)) throw forbidden('You cannot manage this center');
  const organizationId = requested ?? actor.organizationIds[0];
  if (!organizationId) throw forbidden('Your account is not assigned to a center');
  return organizationId;
}

/** The center whose rooms this person may open: a teacher's own center, or one a center admin manages. */
export function hostOrg(actor: Actor, requested?: string | null): string {
  if (actor.role !== 'TEACHER') return resolveOrg(actor, requested);
  const organizationId = actor.organizationIds[0];
  if (!organizationId) throw forbidden('Your account is not assigned to a center');
  if (requested && requested !== organizationId) throw forbidden('You cannot manage this center');
  return organizationId;
}

/** The center a student is acting in. */
export function studentOrg(actor: Actor): string {
  const organizationId = actor.organizationIds[0];
  if (actor.role !== 'GAMER' || !organizationId) throw forbidden('Enter an access code from your education center first');
  return organizationId;
}
