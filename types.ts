export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export enum GameLevel {
  LOBBY = 0,
  INTERROGATION = 1,
  MARKET = 2,
  DEFUSAL = 3,
  VICTORY = 4
}

export interface AudioConfig {
  sampleRate: number;
}

export interface PCMFloat32Data {
  data: Float32Array;
}

// Level 1 State
export interface InterrogationState {
  suspectStress: number; // 0-100
  resistance: number; // 100-0 (0 = Win)
  lastThought: string;
}

// Level 2 State
export interface MarketState {
  credits: number;
  lastItem: string;
  lastOffer: number;
  message: string;
}

// Level 3 State
export interface BombState {
  status: 'active' | 'exploded' | 'defused';
  message: string;
  stability: number;
  timePenalty?: number;
}