import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState } from '../types';
import { SYSTEM_INSTRUCTION, GEMINI_MODEL, INPUT_SAMPLE_RATE, AUDIO_SAMPLE_RATE } from '../constants';
import { base64ToBytes, bytesToBase64, decodeAudioData, float32To16BitPCM } from './audioUtils';

// Tool Definition: Bomb State Update
const updateBombStateTool: FunctionDeclaration = {
  name: 'updateBombState',
  description: 'Update the status of the bomb defusal operation based on visual analysis.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: {
        type: Type.STRING,
        enum: ['active', 'exploded', 'defused'],
        description: 'Current state of the bomb.',
      },
      message: {
        type: Type.STRING,
        description: 'Urgent instruction for the player displayed on the HUD.',
      },
      stability: {
        type: Type.NUMBER,
        description: 'Bomb stability percentage (0-100). Low stability risks detonation.',
      },
      timePenalty: {
        type: Type.NUMBER,
        description: 'Seconds to deduct from the timer as penalty for mistakes.',
      },
    },
    required: ['status', 'message', 'stability'],
  },
};

export interface BombState {
    status: 'active' | 'exploded' | 'defused';
    message: string;
    stability: number;
    timePenalty?: number;
}

export class GeminiLiveService {
  private client: GoogleGenAI;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private audioScriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private videoInterval: number | null = null;
  
  public onStateChange: (state: ConnectionState) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onUserSpeaking: () => void = () => {};
  public onBombUpdate: (state: BombState) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(videoElement: HTMLVideoElement) {
    try {
      this.onStateChange(ConnectionState.CONNECTING);

      // Setup Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AUDIO_SAMPLE_RATE,
      });

      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // Get Media Stream (Mic + Camera)
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
        }, 
        video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 }
        } 
      });

      // Show video in UI
      videoElement.srcObject = this.stream;
      await videoElement.play();

      // Initialize Gemini Live Session
      this.sessionPromise = this.client.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          tools: [{ functionDeclarations: [updateBombStateTool] }],
          speechConfig: {
            // 'Kore' is higher pitched, good for panic/stress
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }, 
          },
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        callbacks: {
          onopen: () => {
            this.onStateChange(ConnectionState.CONNECTED);
            this.startAudioInput();
            this.startVideoInput(videoElement);
          },
          onmessage: this.handleMessage.bind(this),
          onclose: () => {
            this.onStateChange(ConnectionState.DISCONNECTED);
            this.cleanup();
          },
          onerror: (err) => {
            console.error(err);
            this.onStateChange(ConnectionState.ERROR);
            this.onError('Connection error occurred.');
            this.cleanup();
          },
        },
      });

    } catch (error: any) {
      this.onStateChange(ConnectionState.ERROR);
      this.onError(error.message || 'Failed to connect.');
      this.cleanup();
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.audioScriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.audioScriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) sum += inputData[i] * inputData[i];
      const rms = Math.sqrt(sum / inputData.length);
      if (rms > 0.02) this.onUserSpeaking();

      const pcm16 = float32To16BitPCM(inputData);
      const uint8Buffer = new Uint8Array(pcm16);
      const base64Data = bytesToBase64(uint8Buffer);

      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
          session.sendRealtimeInput({
            media: {
              mimeType: 'audio/pcm;rate=16000',
              data: base64Data,
            },
          });
        });
      }
    };

    this.inputSource.connect(this.audioScriptProcessor);
    this.audioScriptProcessor.connect(this.inputAudioContext.destination);
  }

  private startVideoInput(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FPS = 2; // Need frequent updates for wire detection

    this.videoInterval = window.setInterval(async () => {
      if (!ctx || !videoElement.videoWidth) return;
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);
      const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
            session.sendRealtimeInput({
                media: { mimeType: 'image/jpeg', data: base64Image }
            });
        });
      }
    }, 1000 / FPS);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            if (fc.name === 'updateBombState') {
                const args = fc.args as any;
                this.onBombUpdate({
                    status: args.status,
                    message: args.message,
                    stability: Number(args.stability),
                    timePenalty: args.timePenalty ? Number(args.timePenalty) : 0
                });

                if (this.sessionPromise) {
                    this.sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: fc.id,
                                name: fc.name,
                                response: { result: "HUD updated" }
                            }
                        });
                    });
                }
            }
        }
    }

    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData?.data) {
        const base64Audio = modelTurn.parts[0].inlineData.data;
        await this.playAudioChunk(base64Audio);
    }

    if (message.serverContent?.interrupted) {
        this.stopAudioPlayback();
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) return;
    try {
        const audioBytes = base64ToBytes(base64Audio);
        const audioBuffer = decodeAudioData(audioBytes, this.outputAudioContext, AUDIO_SAMPLE_RATE);
        const source = this.outputAudioContext.createBufferSource();
        source.buffer = audioBuffer;
        
        if (this.outputNode) {
          source.connect(this.outputNode);
        } else {
          source.connect(this.outputAudioContext.destination);
        }
        
        const currentTime = this.outputAudioContext.currentTime;
        if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        this.sources.add(source);
        source.onended = () => this.sources.delete(source);
    } catch (e) {
        console.error("Error decoding audio chunk", e);
    }
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
    if (this.outputAudioContext) {
        this.nextStartTime = this.outputAudioContext.currentTime + 0.1;
    }
  }

  async disconnect() {
    this.cleanup();
    this.onStateChange(ConnectionState.DISCONNECTED);
  }

  private cleanup() {
    if (this.videoInterval) {
        clearInterval(this.videoInterval);
        this.videoInterval = null;
    }
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.audioScriptProcessor) {
        this.audioScriptProcessor.disconnect();
        this.audioScriptProcessor = null;
    }
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }
    this.sessionPromise = null;
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.outputNode = null;
  }
}