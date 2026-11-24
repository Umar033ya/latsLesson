import type { AnswerResponse, LobbySync, PlayQuestion, PlaySession, SessionOutcome, SessionSummary } from '@last-lesson/scenario';
import { request } from './http';
import { SessionError, type GameSession, type Presence, type RoomLink } from './session';

const TOKEN_KEY = 'last-lesson-game-token';
const PENDING_KEY = 'last-lesson-pending-result';
const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
const store = {
  get: (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } },
  set: (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* private mode */ } },
  del: (s: Storage, k: string) => { try { s.removeItem(k); } catch { /* private mode */ } },
};

interface Pending {
  token: string;
  sessionId: string;
  body: { requestId: string; outcome: SessionOutcome; stats: { pages: number; caught: number } };
}

export class RemoteSession implements GameSession {
  readonly live = true;
  readonly room?: RoomLink;
  private seq: number;
  private queued: Record<string, unknown> | null = null;
  private saving = false;
  /** The same id for every try, so a hand-in whose reply was lost is recognised by the server. */
  private readonly handInId = newId();
  /** One requestId per question and answer text: pressing "answer" again after a lost reply cannot count twice. */
  private inFlight = new Map<string, string>();

  private constructor(
    readonly data: PlaySession,
    private readonly token: string,
  ) {
    this.seq = data.checkpoint?.seq ?? 0;
    // A late position is worthless, so these requests are never repeated.
    const once = { token, retries: 0, timeoutMs: 5000 };
    if (data.lobby) this.room = { sync: (me: Presence) => request<LobbySync>('POST', '/play/lobby', { ...once, body: me }), watch: () => request<LobbySync>('GET', '/play/lobby', once) };
  }

  /** Opens the session from a launch link, or recovers the one that was open before a refresh. */
  static async open(): Promise<RemoteSession | null> {
    await RemoteSession.flushPending();
    const ticket = new URLSearchParams(location.hash.slice(1)).get('ticket');
    if (ticket) {
      history.replaceState(null, '', location.pathname + location.search);
      const { token, session } = await request<{ token: string; session: PlaySession }>('POST', '/play/exchange', { body: { ticket }, retries: 2 });
      store.set(sessionStorage, TOKEN_KEY, token);
      return new RemoteSession(session, token);
    }
    const token = store.get(sessionStorage, TOKEN_KEY);
    if (!token) return null;
    try {
      const session = await request<PlaySession>('GET', '/play/session', { token, retries: 3 });
      if (session.status !== 'IN_PROGRESS') {
        store.del(sessionStorage, TOKEN_KEY);
        return null;
      }
      return new RemoteSession(session, token);
    } catch (error) {
      if (error instanceof SessionError && error.fatal) store.del(sessionStorage, TOKEN_KEY);
      throw error;
    }
  }

  async answer(question: PlayQuestion, answer: unknown, elapsedMs: number): Promise<AnswerResponse> {
    const key = `${question.id}:${JSON.stringify(answer)}`;
    const requestId = this.inFlight.get(key) ?? newId();
    this.inFlight.set(key, requestId);
    const result = await request<AnswerResponse>('POST', '/play/answers', { token: this.token, body: { gateId: question.gateId, questionId: question.id, answer, requestId, elapsedMs: Math.round(elapsedMs) } });
    this.inFlight.delete(key);
    return result;
  }

  hint(question: PlayQuestion) {
    return request<{ hint: string; hintsLeft: number }>('POST', '/play/hint', { token: this.token, body: { questionId: question.id } });
  }

  /** Latest state wins; a slow save never blocks the game. */
  save(state: Record<string, unknown>) {
    this.queued = state;
    if (!this.saving) void this.drain();
  }

  private async drain() {
    this.saving = true;
    while (this.queued) {
      const state = this.queued;
      this.queued = null;
      this.seq += 1;
      try {
        await request('PUT', '/play/checkpoint', { token: this.token, body: { seq: this.seq, state }, retries: 3 });
      } catch {
        // The next checkpoint carries everything; nothing is lost by skipping one.
      }
    }
    this.saving = false;
  }

  async complete(outcome: SessionOutcome, stats: { pages: number; caught: number }): Promise<SessionSummary> {
    const pending: Pending = { token: this.token, sessionId: this.data.sessionId, body: { requestId: this.handInId, outcome, stats } };
    // Kept until the server confirms, so a result survives a closed tab or a dead connection.
    store.set(localStorage, PENDING_KEY, JSON.stringify(pending));
    const summary = await request<SessionSummary>('POST', '/play/complete', { token: this.token, body: pending.body, retries: 6 });
    store.del(localStorage, PENDING_KEY);
    store.del(sessionStorage, TOKEN_KEY);
    return summary;
  }

  static async flushPending(): Promise<void> {
    const raw = store.get(localStorage, PENDING_KEY);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw) as Pending;
      await request('POST', '/play/complete', { token: pending.token, body: pending.body, retries: 1 });
      store.del(localStorage, PENDING_KEY);
    } catch (error) {
      if (error instanceof SessionError && error.fatal) store.del(localStorage, PENDING_KEY);
    }
  }
}
