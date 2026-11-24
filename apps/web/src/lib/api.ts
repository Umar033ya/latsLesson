import { create } from 'zustand';

const BASE = `${(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')}/api/v1`;

export interface Me {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  locale: string;
  role: 'SUPER_ADMIN' | 'CENTER_ADMIN' | 'TEACHER' | 'GAMER';
  signIn: { password: boolean; google: boolean };
  organizations: Array<{ id: string; name: string; slug: string; logoUrl: string | null; status: string; subscriptionEndsAt: string | null; branding: { displayName: string; accent: string; logoUrl: string | null; theme: string }; features: Record<string, boolean> }>;
}

interface AuthState {
  me: Me | null;
  ready: boolean;
}
/** The access token lives in memory only; the refresh token is an httpOnly cookie scripts cannot read. */
let accessToken: string | null = null;
let langHeader = 'en';
export const setLangHeader = (value: string) => {
  langHeader = value;
};
export const useAuth = create<AuthState>(() => ({ me: null, ready: false }));

export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: number,
    readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
let refreshing: Promise<boolean> | null = null;

async function raw(method: Method, path: string, body?: unknown, token = accessToken): Promise<Response> {
  try {
    return await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: { 'X-LL-Client': 'web', 'X-LL-Lang': langHeader, ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('OFFLINE', 'No connection to the server. Check your network and try again.', 0);
  }
}

async function refresh(): Promise<boolean> {
  refreshing ??= raw('POST', '/auth/refresh')
    .then(async (r) => {
      accessToken = r.ok ? ((await r.json()) as { accessToken: string }).accessToken : null;
      return r.ok;
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function failure(res: Response): Promise<ApiError> {
  const error = ((await res.json().catch(() => null)) as { error?: { code: string; message: string; details?: { fields?: Record<string, string[]> } } } | null)?.error;
  return new ApiError(error?.code ?? 'ERROR', error?.message ?? 'The server could not complete the request. Try again.', res.status, error?.details?.fields);
}

/** A request with its own token (a room pass). The signed-in account is not involved. */
export async function callAs<T>(token: string | null, method: Method, path: string, body?: unknown): Promise<T> {
  const res = await raw(method, path, body, token);
  if (!res.ok) throw await failure(res);
  return (await res.json()) as T;
}

export async function call<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await raw(method, path, body);
  if (res.status === 401 && accessToken && !path.startsWith('/auth/login') && !path.startsWith('/auth/code') && (await refresh())) res = await raw(method, path, body);
  if (res.ok) return (await res.json()) as T;
  if (res.status === 401 && useAuth.getState().me) {
    accessToken = null;
    useAuth.setState({ me: null });
  }
  throw await failure(res);
}

export const get = <T>(path: string, params?: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') q.set(k, String(v));
  return call<T>('GET', q.size ? `${path}?${q}` : path);
};
export const post = <T>(path: string, body: unknown = {}) => call<T>('POST', path, body);
export const put = <T>(path: string, body: unknown) => call<T>('PUT', path, body);
export const patch = <T>(path: string, body: unknown) => call<T>('PATCH', path, body);
export const del = <T>(path: string) => call<T>('DELETE', path);

export async function startSession(token: string): Promise<Me> {
  accessToken = token;
  const me = await get<Me>('/auth/me');
  useAuth.setState({ me, ready: true });
  return me;
}

/** Runs once on load: continues the session from the refresh cookie when there is one. */
export async function restoreSession() {
  try {
    if (await refresh()) useAuth.setState({ me: await get<Me>('/auth/me') });
  } catch {
    /* stays signed out */
  }
  useAuth.setState({ ready: true });
}

export async function signOut() {
  await raw('POST', '/auth/logout').catch(() => undefined);
  accessToken = null;
  useAuth.setState({ me: null });
}

export const homeOf = (me: Me) => ({ SUPER_ADMIN: '/admin', CENTER_ADMIN: '/center', TEACHER: '/teacher', GAMER: '/student' })[me.role];
