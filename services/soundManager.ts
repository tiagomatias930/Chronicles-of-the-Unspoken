import { GameLevel } from '../types';

export class SoundManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: AudioNode[] = [];
  private isMuted: boolean = false;
  private currentLevel: GameLevel | null = null;
  private readonly MASTER_VOL = 0.1; // Reduced from 0.4 to 0.1 for background subtlety

  constructor() {
    // AudioContext must be initialized after a user gesture usually, 
    // but we prepare the class structure here.
  }

  private initCtx() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.isMuted ? 0 : this.MASTER_VOL;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.linearRampToValueAtTime(muted ? 0 : this.MASTER_VOL, now + 0.5);
    }
  }

  public async playAmbience(level: GameLevel) {
    this.initCtx();
    if (this.currentLevel === level) return;
    this.currentLevel = level;

    // Fade out old sounds
    this.stopCurrentSounds();

    // Start new patch based on level
    switch (level) {
      case GameLevel.LOBBY:
      case GameLevel.VICTORY:
        this.playLobbyDrone();
        break;
      case GameLevel.INTERROGATION:
        this.playTensionDrone();
        break;
      case GameLevel.MARKET:
        this.playCityAmbience();
        break;
      case GameLevel.DEFUSAL:
        this.playHazardDrone();
        break;
    }
  }

  private stopCurrentSounds() {
    // Fade out all active nodes and disconnect them
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.activeNodes.forEach((node) => {
      if (node instanceof OscillatorNode || node instanceof AudioBufferSourceNode) {
        try {
             node.stop(now + 2);
        } catch(e) {}
      }
      if (node instanceof GainNode) {
         node.gain.linearRampToValueAtTime(0, now + 2);
      }
    });
    
    // Clear array after fade time
    setTimeout(() => {
        this.activeNodes = [];
    }, 2000);
  }

  // --- SOUND PATCHES ---

  private playLobbyDrone() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Deep Sub Bass
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 40;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 200;

    // LFO for filter movement
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1; // Slow breathing
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.3, t + 4); // Slow fade in

    osc1.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    lfo.start();

    this.activeNodes.push(osc1, lfo, gain);
  }

  private playTensionDrone() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // Unsettling Binaural Beat (Two oscillators slightly detuned)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.value = 60;

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 62; // 2Hz beat frequency

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.2, t + 2);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);

    osc1.start();
    osc2.start();

    this.activeNodes.push(osc1, osc2, gain);
  }

  private playCityAmbience() {
     if (!this.ctx || !this.masterGain) return;
     const t = this.ctx.currentTime;

     // Pink Noise approximation
     const bufferSize = 2 * this.ctx.sampleRate;
     const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
     const output = noiseBuffer.getChannelData(0);
     let lastOut = 0; 
     for (let i = 0; i < bufferSize; i++) {
       const white = Math.random() * 2 - 1;
       output[i] = (lastOut + (0.02 * white)) / 1.02;
       lastOut = output[i];
       output[i] *= 1.5; // Reduced from 3.5 to prevent clipping and loudness
     }

     const noise = this.ctx.createBufferSource();
     noise.buffer = noiseBuffer;
     noise.loop = true;

     const filter = this.ctx.createBiquadFilter();
     filter.type = 'highpass';
     filter.frequency.value = 1000; // Increased from 300 to 1000 to clear voice range

     const gain = this.ctx.createGain();
     gain.gain.setValueAtTime(0, t);
     gain.gain.linearRampToValueAtTime(0.15, t + 2);

     noise.connect(filter);
     filter.connect(gain);
     gain.connect(this.masterGain);
     noise.start();

     this.activeNodes.push(noise, gain);
  }

  private playHazardDrone() {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;

    // High pitched unstable drone
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 100; // Low base
    
    // Pitch modulation (Warning siren effect slow)
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sawtooth';
    lfo.frequency.value = 0.5;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 5; // Subtle pitch shift
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 10;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.5);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    lfo.start();

    this.activeNodes.push(osc, lfo, gain);
  }
}