import { getLanguage, tr } from '../i18n';
import { SessionError, type LinkState } from './session';

const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1`;
const FATAL = new Set(['GAME_TOKEN_INVALID', 'TICKET_INVALID', 'SESSION_FINISHED', 'SESSION_EXPIRED', 'CENTER_SUSPENDED', 'CENTER_INACTIVE', 'SUBSCRIPTION_ENDED']);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let listener: (s: LinkState) => void = () => undefined;
export const onLink = (fn: (s: LinkState) => void) => {
  listener = fn;
};

export interface RequestOptions {
  token?: string;
  body?: unknown;
  /** How many times to try again after a lost connection or a 5xx reply. Requests carry a requestId, so repeats are safe. */
  retries?: number;
  timeoutMs?: number;
}

/** fetch with timeout, backoff and one error type. Client errors are never retried. */
export async function request<T>(method: 'GET' | 'POST' | 'PUT', path: string, { token, body, retries = 5, timeoutMs = 12_000 }: RequestOptions = {}): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(BASE + path, {
        method,
        signal: controller.signal,
        headers: { 'X-LL-Lang': getLanguage(), ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.ok) {
        listener('online');
        return (await res.json()) as T;
      }
      const error = ((await res.json().catch(() => null)) as { error?: { code: string; message: string } } | null)?.error;
      if (res.status < 500 && res.status !== 429) {
        listener('online');
        throw new SessionError(error?.code ?? 'ERROR', error?.message ?? 'The request was rejected', FATAL.has(error?.code ?? ''));
      }
      if (attempt >= retries) throw new SessionError('SERVER', tr('The school records are not answering. Your progress is safe. Try again in a moment.'));
    } catch (error) {
      if (error instanceof SessionError) throw error;
      if (attempt >= retries) throw new SessionError('OFFLINE', tr('The line is dead. Check your connection and try again.'));
    } finally {
      clearTimeout(timer);
    }
    listener('retrying');
    await sleep(Math.min(8000, 600 * 2 ** attempt) + Math.random() * 300);
  }
}
