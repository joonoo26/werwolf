import type { GameState, PrivateView, PublicView } from '@dorf/engine';

export interface LoadedGame {
  room: {
    id: string;
    status: 'lobby' | 'running' | 'ended';
    mode: 'classic' | 'evening';
    target_minutes: number | null;
    host_user_id: string;
    /** Host-Konfiguration je Rolle (off | possible | guaranteed). */
    role_modes?: Record<string, 'off' | 'possible' | 'guaranteed'>;
  };
  version: number;
  state: GameState | null;
  players: {
    id: string;
    user_id: string;
    name: string;
    ready: boolean;
    age: number;
    gender: 'female' | 'male' | 'diverse';
    hair: 'black' | 'brown' | 'blonde' | 'red' | 'gray';
    eyes: 'brown' | 'blue' | 'green' | 'gray';
  }[];
}

export interface CommitPayload {
  state: GameState;
  public: PublicView;
  /** playerId → Privatsicht. Wird nur für den jeweiligen Eigentümer ausgeliefert. */
  private: Record<string, PrivateView>;
  packMembers: string[];
  alive: string[];
  nextDeadlineMs: number | null;
  status: 'running' | 'ended';
}

export class VersionConflictError extends Error {
  constructor() {
    super('version_conflict');
  }
}

/** Schmale Persistenzschnittstelle. Edge-Function (supabase-js RPC) und Tests (pg) implementieren sie. */
export interface Store {
  load(roomId: string): Promise<LoadedGame | null>;
  commit(roomId: string, expectedVersion: number, payload: CommitPayload): Promise<number>;
  start(roomId: string, hostUserId: string, payload: CommitPayload): Promise<number>;
  dueRooms(nowMs: number): Promise<string[]>;
}
