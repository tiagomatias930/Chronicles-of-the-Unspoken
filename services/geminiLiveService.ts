
import { GoogleGenAI, LiveServerMessage, Modality, FunctionDeclaration, Type } from '@google/genai';
import { ConnectionState, GameLevel, InterrogationState, MarketState, BombState, CyberState, ForensicsState } from '../types';
import { GEMINI_MODEL, INPUT_SAMPLE_RATE, AUDIO_SAMPLE_RATE, getInstruction } from '../constants';
import { base64ToBytes, bytesToBase64, decodeAudioData, float32To16BitPCM } from './audioUtils';

// --- TOOLS DEFINITIONS ---

const interrogationTool: FunctionDeclaration = {
  name: 'updateInterrogation',
  description: 'Update the psychological state of the suspect Vex.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      suspectStress: { type: Type.NUMBER },
      resistance: { type: Type.NUMBER },
      lastThought: { type: Type.STRING },
    },
    required: ['suspectStress', 'resistance', 'lastThought'],
  },
};

const cyberTool: FunctionDeclaration = {
    name: 'updateCyberState',
    description: 'Update the firewall hacking progress.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            firewallIntegrity: { type: Type.NUMBER },
            statusMessage: { type: Type.STRING }
        },
        required: ['firewallIntegrity', 'statusMessage']
    }
};

const forensicsTool: FunctionDeclaration = {
    name: 'updateForensicsState',
    description: 'Update the digital forensics analysis progress.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            corruptionLevel: { type: Type.NUMBER },
            evidenceFound: { type: Type.ARRAY, items: { type: Type.STRING } },
            statusMessage: { type: Type.STRING }
        },
        required: ['corruptionLevel', 'evidenceFound', 'statusMessage']
    }
};

const marketTool: FunctionDeclaration = {
  name: 'assessItem',
  description: 'Evaluate an item shown to the camera.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemDesc: { type: Type.STRING },
      value: { type: Type.NUMBER },
      message: { type: Type.STRING },
    },
    required: ['itemDesc', 'value', 'message'],
  },
};

const bombTool: FunctionDeclaration = {
  name: 'updateBombState',
  description: 'Update bomb defusal status.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ['active', 'exploded', 'defused'] },
      message: { type: Type.STRING },
      stability: { type: Type.NUMBER },
      timePenalty: { type: Type.NUMBER },
    },
    required: ['status', 'message', 'stability'],
  },
};

export class GeminiLiveService {
  private client: GoogleGenAI | null = null;
  private sessionPromise: Promise<any> | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private outputNode: GainNode | null = null;
  private pannerNode: StereoPannerNode | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private audioScriptProcessor: ScriptProcessorNode | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private videoInterval: number | null = null;
  
  public onStateChange: (state: ConnectionState) => void = () => {};
  public onError: (error: string) => void = () => {};
  public onTranscript: (text: string, source: 'user' | 'model') => void = () => {};
  
  public onInterrogationUpdate: (state: InterrogationState) => void = () => {};
  public onCyberUpdate: (state: CyberState) => void = () => {};
  public onForensicsUpdate: (state: ForensicsState) => void = () => {};
  public onMarketUpdate: (state: MarketState) => void = () => {};
  public onBombUpdate: (state: BombState) => void = () => {};

  async connect(sourceElement: HTMLVideoElement | HTMLCanvasElement, level: GameLevel, lang: 'pt' | 'en', existingStream?: MediaStream) {
    try {
      this.onStateChange(ConnectionState.CONNECTING);
      
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found. Please check your .env configuration.");
      }
      this.client = new GoogleGenAI({ apiKey });

      const systemInstruction = getInstruction(level, lang);
      let tools: any[] = [];
      let voiceName = 'Puck';

      switch (level) {
        case GameLevel.INTERROGATION: tools = [{ functionDeclarations: [interrogationTool] }]; voiceName = 'Charon'; break;
        case GameLevel.CYBER: tools = [{ functionDeclarations: [cyberTool] }]; voiceName = 'Puck'; break;
        case GameLevel.FORENSICS: tools = [{ functionDeclarations: [forensicsTool] }]; voiceName = 'Kore'; break;
        case GameLevel.MARKET: tools = [{ functionDeclarations: [marketTool] }]; voiceName = 'Fenrir'; break;
        case GameLevel.DEFUSAL: tools = [{ functionDeclarations: [bombTool] }]; voiceName = 'Kore'; break;
        default: throw new Error("Invalid Level selected for connection.");
      }

      // Cross-browser AudioContext creation
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
          throw new Error("Web Audio API not supported in this browser.");
      }

      this.inputAudioContext = new AudioContextClass({ sampleRate: INPUT_SAMPLE_RATE });
      this.outputAudioContext = new AudioContextClass({ sampleRate: AUDIO_SAMPLE_RATE });
      this.outputNode = this.outputAudioContext.createGain();

      // Safe creation of StereoPanner (it might not exist in older Safari)
      if (this.outputAudioContext.createStereoPanner) {
          this.pannerNode = this.outputAudioContext.createStereoPanner();
          this.outputNode.connect(this.pannerNode);
          this.pannerNode.connect(this.outputAudioContext.destination);
      } else {
          console.warn("StereoPannerNode not supported, audio spatialization disabled.");
          this.pannerNode = null;
          this.outputNode.connect(this.outputAudioContext.destination);
      }

      if (existingStream) {
          this.stream = existingStream;
      } else {
          this.stream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true }, 
            video: { width: 640, height: 480, frameRate: 15 } 
          });
      }

      if (sourceElement instanceof HTMLVideoElement && sourceElement.srcObject !== this.stream) {
         sourceElement.srcObject = this.stream;
         await sourceElement.play().catch(e => console.warn("Video play failed", e));
      }

      this.sessionPromise = this.client.live.connect({
        model: GEMINI_MODEL,
        config: {
          responseModalities: [Modality.AUDIO],
          tools: tools,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
          systemInstruction: systemInstruction,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
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
            this.cleanup(!!existingStream); 
          },
          onerror: (err: any) => { 
            console.error("Gemini Live Error:", err);
            this.onStateChange(ConnectionState.ERROR); 
            this.onError('Connection error. Please check your network.'); 
            this.cleanup(!!existingStream); 
          },
        },
      });

      await this.sessionPromise;
    } catch (error: any) {
      this.onStateChange(ConnectionState.ERROR);
      this.onError(error.message || 'Failed to connect.');
      this.cleanup(!!existingStream);
    }
  }

  public setAudioPan(value: number) {
    if (this.pannerNode && this.outputAudioContext) {
      // value should be -1 (left) to 1 (right)
      this.pannerNode.pan.setTargetAtTime(value, this.outputAudioContext.currentTime, 0.1);
    }
  }

  private startAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;
    try {
      this.inputSource = this.inputAudioContext.createMediaStreamSource(this.stream);
      this.audioScriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);
      this.audioScriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = float32To16BitPCM(inputData);
        const base64Data = bytesToBase64(new Uint8Array(pcm16));
        
        this.sessionPromise?.then((session) => {
          session.sendRealtimeInput({ 
            media: { mimeType: 'audio/pcm;rate=16000', data: base64Data } 
          });
        });
      };
      this.inputSource.connect(this.audioScriptProcessor);
      this.audioScriptProcessor.connect(this.inputAudioContext.destination);
    } catch (e) {
      console.error("Audio input start failed", e);
    }
  }

  private startVideoInput(sourceElement: HTMLVideoElement | HTMLCanvasElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const FPS = 1.0;
    this.videoInterval = window.setInterval(async () => {
      if (!ctx || !this.sessionPromise) return;
      if (sourceElement instanceof HTMLVideoElement) {
          if (!sourceElement.videoWidth) return;
          canvas.width = 320; canvas.height = 240;
          ctx.drawImage(sourceElement, 0, 0, 320, 240);
      } else {
          canvas.width = 320; canvas.height = 240;
          ctx.drawImage(sourceElement, 0, 0, 320, 240);
      }
      const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      
      this.sessionPromise?.then((session) => {
        session.sendRealtimeInput({ 
          media: { mimeType: 'image/jpeg', data: base64Image } 
        });
      });
    }, 1000 / FPS);
  }

  private async handleMessage(message: LiveServerMessage) {
    if (message.serverContent?.outputTranscription?.text) this.onTranscript(message.serverContent.outputTranscription.text, 'model');
    if (message.serverContent?.inputTranscription?.text) this.onTranscript(message.serverContent.inputTranscription.text, 'user');

    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            const args = fc.args as any;
            if (fc.name === 'updateInterrogation') this.onInterrogationUpdate({ suspectStress: Number(args.suspectStress), resistance: Number(args.resistance), lastThought: String(args.lastThought) });
            else if (fc.name === 'updateCyberState') this.onCyberUpdate({ firewallIntegrity: Number(args.firewallIntegrity), statusMessage: String(args.statusMessage), uploadSpeed: 0 });
            else if (fc.name === 'updateForensicsState') this.onForensicsUpdate({ corruptionLevel: Number(args.corruptionLevel), evidenceFound: args.evidenceFound, statusMessage: String(args.statusMessage) });
            else if (fc.name === 'assessItem') this.onMarketUpdate({ credits: 0, lastItem: String(args.itemDesc), lastOffer: Number(args.value), message: String(args.message) });
            else if (fc.name === 'updateBombState') this.onBombUpdate({ status: args.status, message: args.message, stability: Number(args.stability), timePenalty: Number(args.timePenalty || 0) });
            
            this.sessionPromise?.then((session) => {
              session.sendToolResponse({ 
                functionResponses: { 
                  id: fc.id, 
                  name: fc.name, 
                  response: { result: "OK" } 
                } 
              });
            });
        }
    }
    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData?.data) await this.playAudioChunk(modelTurn.parts[0].inlineData.data);
    if (message.serverContent?.interrupted) this.stopAudioPlayback();
  }

  private async playAudioChunk(base64Audio: string) {
    if (!this.outputAudioContext || this.outputAudioContext.state === 'closed') return;
    try {
      const audioBytes = base64ToBytes(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext, AUDIO_SAMPLE_RATE);
      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputNode || this.outputAudioContext.destination);
      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextStartTime < currentTime) this.nextStartTime = currentTime;
      source.start(this.nextStartTime);
      this.nextStartTime += audioBuffer.duration;
      this.sources.add(source);
      source.onended = () => this.sources.delete(source);
    } catch (e) {
      console.error("Audio playback error", e);
    }
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => { try { source.stop(); } catch(e) {} });
    this.sources.clear();
    if (this.outputAudioContext && this.outputAudioContext.state !== 'closed') {
      this.nextStartTime = this.outputAudioContext.currentTime + 0.1;
    }
  }

  async disconnect() { 
    this.cleanup(true); 
    this.onStateChange(ConnectionState.DISCONNECTED); 
  }

  private cleanup(keepStream: boolean = false) {
    try {
      if (this.videoInterval) clearInterval(this.videoInterval);
      if (this.inputSource) this.inputSource.disconnect();
      if (this.audioScriptProcessor) this.audioScriptProcessor.disconnect();
      if (this.stream && !keepStream) this.stream.getTracks().forEach(track => track.stop());
      
      this.sessionPromise?.then(session => {
        try { session.close(); } catch (e) { console.warn("Session close error", e); }
      });
      
      this.sessionPromise = null;
      this.inputAudioContext?.close().catch(() => {});
      this.outputAudioContext?.close().catch(() => {});
      this.inputAudioContext = null;
      this.outputAudioContext = null;
      this.pannerNode = null;
      this.videoInterval = null;
      this.client = null;
      this.nextStartTime = 0;
      this.sources.clear();
    } catch (e) {
      console.error("Cleanup error", e);
    }
  }
}
