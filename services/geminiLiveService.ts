import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { ConnectionState } from '../types';
import { SYSTEM_INSTRUCTION, GEMINI_MODEL, INPUT_SAMPLE_RATE, AUDIO_SAMPLE_RATE } from '../constants';
import { base64ToBytes, bytesToBase64, decodeAudioData, float32To16BitPCM } from './audioUtils';

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
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }, // Deep, mysterious voice
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
    // Use ScriptProcessor for raw PCM access (bufferSize: 4096, 1 input channel, 1 output channel)
    this.audioScriptProcessor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.audioScriptProcessor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0); // Float32Array
      // Convert to 16-bit PCM for Gemini
      const pcm16 = float32To16BitPCM(inputData);
      const uint8Buffer = new Uint8Array(pcm16);
      
      const base64Data = bytesToBase64(uint8Buffer);

      // Send to Gemini
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
    this.audioScriptProcessor.connect(this.inputAudioContext.destination); // Required for script processor to run
  }

  private startVideoInput(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Send frames at ~2 FPS to allow emotion analysis without overwhelming bandwidth
    // Gemini Live is optimized for audio; video is auxiliary context.
    const FPS = 2; 

    this.videoInterval = window.setInterval(async () => {
      if (!ctx || !videoElement.videoWidth) return;

      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      ctx.drawImage(videoElement, 0, 0);

      const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];

      if (this.sessionPromise) {
        this.sessionPromise.then((session) => {
            session.sendRealtimeInput({
                media: {
                    mimeType: 'image/jpeg',
                    data: base64Image
                }
            });
        });
      }
    }, 1000 / FPS);
  }

  private async handleMessage(message: LiveServerMessage) {
    // Handle Audio Output
    const modelTurn = message.serverContent?.modelTurn;
    if (modelTurn?.parts?.[0]?.inlineData?.data) {
        const base64Audio = modelTurn.parts[0].inlineData.data;
        await this.playAudioChunk(base64Audio);
    }

    // Handle Interruption (User spoke over model)
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
        
        // Schedule seamless playback
        const currentTime = this.outputAudioContext.currentTime;
        if (this.nextStartTime < currentTime) {
            this.nextStartTime = currentTime;
        }
        
        source.start(this.nextStartTime);
        this.nextStartTime += audioBuffer.duration;
        
        this.sources.add(source);
        source.onended = () => {
            this.sources.delete(source);
        };
    } catch (e) {
        console.error("Error decoding audio chunk", e);
    }
  }

  private stopAudioPlayback() {
    this.sources.forEach(source => {
        try { source.stop(); } catch(e) {}
    });
    this.sources.clear();
    // Reset timer, adding a small buffer to avoid glitching if restarting immediately
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
    
    // Stop Audio Processing
    if (this.inputSource) {
        this.inputSource.disconnect();
        this.inputSource = null;
    }
    if (this.audioScriptProcessor) {
        this.audioScriptProcessor.disconnect();
        this.audioScriptProcessor = null;
    }

    // Stop Media Stream Tracks
    if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
    }

    // Close Gemini Session (LiveClient doesn't have an explicit close, but we stop sending data)
    // There isn't a direct .close() on the session object in the current SDK snippet, 
    // but stopping the stream essentially ends the user interaction. 
    this.sessionPromise = null;

    // Close Audio Contexts
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.inputAudioContext = null;
    this.outputAudioContext = null;
    this.outputNode = null;
  }
}
