
export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export enum GameLevel {
  INTRO = -1,
  LOBBY = 0,
  INTERROGATION = 1,
  CYBER = 2,
  FORENSICS = 3,
  MARKET = 4,
  DEFUSAL = 5,
  VICTORY = 6
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

// Level 2 State (Cyber)
export interface CyberState {
  firewallIntegrity: number; // 100-0
  statusMessage: string;
  uploadSpeed: number;
}

// Level 3 State (Forensics) - NEW
export interface ForensicsState {
  corruptionLevel: number; // 100-0
  evidenceFound: string[];
  statusMessage: string;
}

// Level 4 State (Market)
export interface MarketState {
  credits: number;
  lastItem: string;
  lastOffer: number;
  message: string;
}

// Level 5 State (Bomb)
export interface BombState {
  status: 'active' | 'exploded' | 'defused';
  message: string;
  stability: number;
  timePenalty?: number;
}
