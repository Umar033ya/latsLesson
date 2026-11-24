import { createHash, randomBytes, randomInt } from 'node:crypto';

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function randomOpaqueToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

/** Human friendly, unambiguous invitation code: LL-XXXX-XXXX */
export function generateInvitationCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    if (i === 4) suffix += '-';
    suffix += alphabet[randomInt(alphabet.length)];
  }
  return `LL-${suffix}`;
}

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
