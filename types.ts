
export type GameSide = 'LEFT' | 'RIGHT';

export type GameState = 'LOBBY' | 'SELECTING_SIDE' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED';

export interface PlayerData {
  id: string;
  side: GameSide | null;
  score: number;
}

export interface BallData {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface NetworkPayload {
  type: 'SYNC_STATE' | 'INPUT_UPDATE' | 'SIDE_SELECTED' | 'START_COUNTDOWN';
  ball?: BallData;
  hostPaddleY?: number;
  guestPaddleY?: number;
  hostScore?: number;
  guestScore?: number;
  side?: GameSide;
  gameState?: GameState;
  countdown?: number;
}
