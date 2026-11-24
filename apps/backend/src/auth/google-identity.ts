import { Injectable } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { ApiException } from '../common/errors';

export interface GoogleProfile {
  sub: string;
  email: string;
  firstName: string;
  lastName: string;
}

/** Verifies Google ID tokens: signature, issuer, expiry and audience are checked by the official library. */
@Injectable()
export class GoogleIdentity {
  private readonly client = new OAuth2Client();

  /** The public OAuth client id, or null when Google sign-in is not configured. */
  get clientId(): string | null {
    return process.env.GOOGLE_CLIENT_ID || null;
  }

  async verify(credential: string): Promise<GoogleProfile> {
    const audience = this.clientId;
    if (!audience) throw new ApiException('GOOGLE_DISABLED', 'Google sign-in is not configured', 404);
    const payload = await this.client
      .verifyIdToken({ idToken: credential, audience })
      .then((ticket) => ticket.getPayload())
      .catch(() => undefined);
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new ApiException('GOOGLE_INVALID', 'Google could not confirm this account. Try again.', 401);
    const email = payload.email.toLowerCase();
    return { sub: payload.sub, email, firstName: (payload.given_name || email.split('@')[0]).slice(0, 80), lastName: (payload.family_name ?? '').slice(0, 80) };
  }
}
