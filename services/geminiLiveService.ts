import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState, CyberState } from '../types';
import { GEMINI_MODEL, INPUT_SAMPLE_RATE, AUDIO_SAMPLE_RATE, INSTRUCTION_L1, INSTRUCTION_L2, INSTRUCTION_L3, INSTRUCTION_L_CYBER } from '../constants';
import { base64ToBytes, bytesToBase64, decodeAudioData, float32To16BitPCM } from './audioUtils';

// --- TOOLS DEFINITIONS ---

// L1 Tool
const interrogationTool: FunctionDeclaration = {
  name: 'updateInterrogation',
  description: 'Update the psychological state of the suspect Vex.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      suspectStress: { type: Type.NUMBER, description: 'Vex stress level (0-100)' },
      resistance: { type: Type.NUMBER, description: 'Resistance to confession (100-0). 0 means he confessed.' },
      lastThought: { type: Type.STRING, description: 'Internal monologue about the detective.' },
    },
    required: ['suspectStress', 'resistance', 'lastThought'],
  },
};

// L2 Tool (Cyber)
const cyberTool: FunctionDeclaration = {
    name: 'updateCyberState',
    description: 'Update the firewall hacking progress.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            firewallIntegrity: { type: Type.NUMBER, description: 'Percentage of firewall remaining (100-0)' },
            statusMessage: { type: Type.STRING, description: 'System status message or error code' }
        },
        required: ['firewallIntegrity', 'statusMessage']
    }
};

// L3 Tool (Market)
const marketTool: FunctionDeclaration = {
  name: 'assessItem',
  description: 'Evaluate an item shown to the camera.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemDesc: { type: Type.STRING, description: 'Sci-fi name of the detected object' },
      value: { type: Type.NUMBER, description: 'Credit value of the item' },
      message: { type: Type.STRING, description: 'Zero\'s comment on the item' },
    },
    required: ['itemDesc', 'value', 'message'],
  },
};

// L4 Tool (Bomb)
const bombTool: FunctionDeclaration = {
  name: 'updateBombState',
  description: 'Update bomb defusal status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ['active', 'exploded', 'defused'] },
      message: { type: Type.STRING, description: 'Instruction for the player' },
      stability: { type: Type.NUMBER, description: 'Stability %' },
      timePenalty: { type: Type.NUMBER, description: 'Seconds to remove' },
    },
    required: ['status', 'message', 'stability'],
  },
};

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
  public onTranscript: (text: string, source: 'user' | 'model') => void = () => {};
  
  // Level Callbacks
  public onInterrogationUpdate: (state: InterrogationState) => void = () => {};
  public onCyberUpdate: (state: CyberState) => void = () => {};
  public onMarketUpdate: (state: MarketState) => void = () => {};
  public onBombUpdate: (state: BombState) => void = () => {};

  constructor() {
    this.client = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async connect(sourceElement: HTMLVideoElement | HTMLCanvasElement, level: GameLevel) {
    try {
      this.onStateChange(ConnectionState.CONNECTING);

      // --- CONFIGURATION BASED ON LEVEL ---
      let systemInstruction = '';
      let tools: any[] = [];
      let voiceName = 'Puck';

      switch (level) {
        case GameLevel.INTERROGATION:
            systemInstruction = INSTRUCTION_L1;
            tools = [{ functionDeclarations: [interrogationTool] }];
            voiceName = 'Charon'; // Deep, mysterious
            break;
        case GameLevel.CYBER:
            systemInstruction = INSTRUCTION_L_CYBER;
            tools = [{ functionDeclarations: [cyberTool] }];
            voiceName = 'Puck'; // Glitchy/Trickster
            break;
        case GameLevel.MARKET:
            systemInstruction = INSTRUCTION_L2;
            tools = [{ functionDeclarations: [marketTool] }];
            voiceName = 'Fenrir'; // Rough
            break;
        case GameLevel.DEFUSAL:
            systemInstruction = INSTRUCTION_L3;
            tools = [{ functionDeclarations: [bombTool] }];
            voiceName = 'Kore'; // High pitched, panic
            break;
        default:
            throw new Error("Invalid Level");
      }

      // Audio Setup
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: INPUT_SAMPLE_RATE,
      });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: AUDIO_SAMPLE_RATE,
      });
      this.outputNode = this.outputAudioContext.createGain();
      this.outputNode.connect(this.outputAudioContext.destination);

      // Stream Setup
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15 } } 
      });

      if (sourceElement instanceof HTMLVideoElement) {
         sourceElement.srcObject = this.stream;
         await sourceElement.play();
      }

      // Connect to Gemini
      this.sessionPromise = this.client.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          tools: tools,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {}, // Enable transcription
          outputAudioTranscription: {}, // Enable transcription
        },
        callbacks: {
          onopen: () => {
            this.onStateChange(ConnectionState.CONNECTED);
            this.startAudioInput();
            this.startVideoInput(sourceElement);
          },
          onmessage: this.handleMessage.bind(this),
          onclose: () => {
            this.onStateChange(ConnectionState.DISCONNECTED);
            this.cleanup();
          },
          onerror: (err) => {
            console.error(err);
            this.onStateChange(ConnectionState.ERROR);
            this.onError('Connection error.');
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
      if (Math.sqrt(sum / inputData.length) > 0.02) this.onUserSpeaking();
      const pcm16 = float32To16BitPCM(inputData);
      const base64Data = bytesToBase64(new Uint8Array(pcm16));
      this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } });
      });
    };
    this.inputSource.connect(this.audioScriptProcessor);
    this.audioScriptProcessor.connect(this.inputAudioContext.destination);
  }

  private startVideoInput(sourceElement: HTMLVideoElement | HTMLCanvasElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FPS = 1.5; // Balance for all levels
    this.videoInterval = window.setInterval(async () => {
      if (!ctx) return;
      let w=0, h=0;
      if (sourceElement instanceof HTMLVideoElement) {
          if (!sourceElement.videoWidth) return;
          w = sourceElement.videoWidth; h = sourceElement.videoHeight;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(sourceElement, 0, 0);
      } else {
          w = sourceElement.width; h = sourceElement.height;
          canvas.width = w; canvas.height = h;
          ctx.drawImage(sourceElement, 0, 0);
      }
      const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ media: { mimeType: 'image/jpeg', data: base64Image } });
      });
    }, 1000 / FPS);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Transcriptions
    if (message.serverContent?.outputTranscription?.text) {
        this.onTranscript(message.serverContent.outputTranscription.text, 'model');
    }
    if (message.serverContent?.inputTranscription?.text) {
         this.onTranscript(message.serverContent.inputTranscription.text, 'user');
    }

    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            const args = fc.args as any;
            if (fc.name === 'updateInterrogation') {
                this.onInterrogationUpdate({
                    suspectStress: Number(args.suspectStress),
                    resistance: Number(args.resistance),
                    lastThought: String(args.lastThought)
                });
            } else if (fc.name === 'updateCyberState') {
                this.onCyberUpdate({
                    firewallIntegrity: Number(args.firewallIntegrity),
                    statusMessage: String(args.statusMessage),
                    uploadSpeed: Math.random() * 100 
                });
            } else if (fc.name === 'assessItem') {
                this.onMarketUpdate({
                    credits: 0, // Calculated in frontend
                    lastItem: String(args.itemDesc),
                    lastOffer: Number(args.value),
                    message: String(args.message)
                });
            } else if (fc.name === 'updateBombState') {
                this.onBombUpdate({
                    status: args.status,
                    message: args.message,
                    stability: Number(args.stability),
                    timePenalty: args.timePenalty ? Number(args.timePenalty) : 0
                });
            }
            this.sessionPromise?.then(session => {
                session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: "OK" } } });
            });
        }
    }
    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData?.data) {
        await this.playAudioChunk(modelTurn.parts[0].inlineData.data);
    }
    if (message.serverContent?.interrupted) {
        this.stopAudioPlayback();
    }
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext) return;
    const audioBytes = base64ToBytes(base64Audio);
    const audioBuffer = decodeAudioData(audioBytes, this.outputAudioContext, AUDIO_SAMPLE_RATE);
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = audioBuffer;
    if (this.outputNode) source.connect(this.outputNode);
    else source.connect(this.outputAudioContext.destination);
    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;
    source.start(this.nextStartTime);
    this.nextStartTime += audioBuffer.duration;
    this.sources.add(source);
    source.onended = () => this.sources.delete(source);
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => { try { source.stop(); } catch(e) {} });
    this.sources.clear();
    if (this.outputAudioContext) this.nextStartTime = this.outputAudioContext.currentTime + 0.1;
  }

  async disconnect() {
    this.cleanup();
    this.onStateChange(ConnectionState.DISCONNECTED);
  }

  private cleanup() {
    if (this.videoInterval) clearInterval(this.videoInterval);
    if (this.inputSource) this.inputSource.disconnect();
    if (this.audioScriptProcessor) this.audioScriptProcessor.disconnect();
    if (this.stream) this.stream.getTracks().forEach(track => track.stop());
    this.sessionPromise = null;
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.videoInterval = null;
  }
}