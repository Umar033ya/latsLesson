import type { LobbyState } from '@last-lesson/scenario';
import { callAs } from './api';

/** A room token opens one room and nothing else, so it may stay in the tab. The account token never does. */
const TOKEN = 'last-lesson-room';
const LAUNCHED = 'last-lesson-room-launched';

const read = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
};

export type RoomState = LobbyState & { me: { id: string; nickname: string; color: number; finished: boolean } };

export const roomToken = () => read(TOKEN);
export function enterRoom(token: string) {
  write(TOKEN, token);
  write(LAUNCHED, null);
}
export function forgetRoom() {
  write(TOKEN, null);
  write(LAUNCHED, null);
}
/** The game opens by itself once; after that the player decides. */
export const wasLaunched = () => read(LAUNCHED) === 'yes';
export const markLaunched = () => write(LAUNCHED, 'yes');

export const roomCall = <T>(method: 'GET' | 'POST', path: string) => callAs<T>(roomToken(), method, path, method === 'POST' ? {} : undefined);
export const isRoomCode = (value: string) => value.replace(/[\s-]/g, '').match(/^\d{6}$/) !== null;
