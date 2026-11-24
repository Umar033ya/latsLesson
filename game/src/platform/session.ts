import type { AnswerResponse, Facing, LobbySync, PhraseId, PlayQuestion, PlaySession, SessionOutcome, SessionSummary } from '@last-lesson/scenario';

export interface Presence {
  x: number;
  y: number;
  dir: Facing;
  moving: boolean;
  hidden: boolean;
  phrase: PhraseId | null;
}

/** The connection to the other players of a room. */
export interface RoomLink {
  sync(me: Presence): Promise<LobbySync>;
  watch(): Promise<LobbySync>;
}

/** Everything the game needs from outside. Scenes depend on this interface, never on fetch. */
export interface GameSession {
  readonly data: PlaySession;
  /** false for the offline demo: nothing is recorded anywhere. */
  readonly live: boolean;
  /** Present only when a class plays together. */
  readonly room?: RoomLink;
  answer(question: PlayQuestion, answer: unknown, elapsedMs: number): Promise<AnswerResponse>;
  hint(question: PlayQuestion): Promise<{ hint: string; hintsLeft: number }>;
  save(state: Record<string, unknown>): void;
  complete(outcome: SessionOutcome, stats: { pages: number; caught: number }): Promise<SessionSummary>;
}

/** A problem the player should read. `fatal` means this session cannot continue. */
export class SessionError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly fatal = false,
  ) {
    super(message);
  }
}

export type LinkState = 'online' | 'retrying';
