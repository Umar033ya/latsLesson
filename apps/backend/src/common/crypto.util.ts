import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Human friendly, unambiguous access code: LL-XXXX-XXXX (40 random bits). */
export function generateInvitationCode(): string {
  const block = () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `LL-${block()}-${block()}`;
}

/** Accepts codes typed in lower case, with spaces, or without dashes. */
export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Access codes are short enough to brute force offline from a plain hash, so they are stored
 * as an HMAC keyed with a secret that is not in the database.
 */
export function hashCode(code: string): string {
  const pepper = process.env.CODE_PEPPER;
  if (!pepper) throw new Error('CODE_PEPPER is not configured');
  return createHmac('sha256', pepper).update(normalizeCode(code)).digest('hex');
}

export const codeHint = (code: string) => normalizeCode(code).slice(-4);
