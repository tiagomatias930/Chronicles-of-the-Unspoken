export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioConfig {
  sampleRate: number;
}

export interface PCMFloat32Data {
  data: Float32Array;
}

export interface GameLevelObjective {
  id: string;
  title: string;
  description: string;
  hint?: string;
}

export interface GameLevel {
  id: string;
  codename: string;
  difficulty: 'INITIATE' | 'OPERATIVE' | 'VETERAN';
  summary: string;
  systemInstruction: string;
  ambientTension: number;
  objectives: GameLevelObjective[];
}
