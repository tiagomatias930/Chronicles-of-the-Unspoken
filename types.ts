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
