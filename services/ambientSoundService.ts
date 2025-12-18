export class AmbientSoundService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isPlaying: boolean = false;
  
  // Nodes
  private drones: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  
  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;

  async init() {
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Master Chain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.4;
    this.masterGain.connect(this.ctx.destination);

    // Reverb (Convolution) to create space
    const reverbBuffer = this.createReverbBuffer(3, 2);
    const convolver = this.ctx.createConvolver();
    convolver.buffer = reverbBuffer;
    
    // We mix dry and wet signals
    const sceneGain = this.ctx.createGain();
    // Connect scene to Reverb (Wet)
    sceneGain.connect(convolver).connect(this.masterGain);
    // Connect scene directly to Master (Dry)
    sceneGain.connect(this.masterGain);

    this.setupDrone(sceneGain);
    this.setupNoise(sceneGain);
  }

  private createReverbBuffer(duration: number, decay: number): AudioBuffer {
    if (!this.ctx) throw new Error("No Context");
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < length; i++) {
        const n = i / length;
        // Simple exponential decay noise
        const env = Math.pow(1 - n, decay);
        left[i] = (Math.random() * 2 - 1) * env;
        right[i] = (Math.random() * 2 - 1) * env;
    }
    return impulse;
  }

  private setupDrone(destination: AudioNode) {
    if (!this.ctx) return;
    
    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.0; // Start silent, fade in later
    
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 80; // Very deep start
    this.droneFilter.Q.value = 0.5;
    
    this.droneGain.connect(this.droneFilter).connect(destination);

    // Create 3 oscillators for a dark, detuned chord (C#1 based drone)
    // Frequencies: 34.65Hz (C#1), 51.91Hz (G#1 - Fifth), 69.30Hz (C#2 - Octave)
    const freqs = [34.65, 51.91, 69.30]; 
    
    freqs.forEach(f => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.value = f;
        // Slight detune for analog "warmth" and instability
        osc.detune.value = Math.random() * 15 - 7.5;
        osc.start();
        osc.connect(this.droneGain!);
        this.drones.push(osc);
    });
  }

  private setupNoise(destination: AudioNode) {
    if (!this.ctx) return;
    
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = buffer;
    this.noiseNode.loop = true;

    // Filter noise to sound like distant rain/city atmosphere
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 1200;
    noiseFilter.Q.value = 0.8;

    this.noiseGain = this.ctx.createGain();
    this.noiseGain.gain.value = 0.03; // Background texture layer

    this.noiseNode.connect(noiseFilter).connect(this.noiseGain).connect(destination);
    this.noiseNode.start();
  }

  public async start() {
    if (!this.ctx) await this.init();
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    
    // Fade in
    if (this.droneGain) {
        this.droneGain.gain.setTargetAtTime(0.3, this.ctx!.currentTime, 3);
    }
    this.isPlaying = true;
  }

  public stop() {
    // We usually don't stop ambient music fully in this app context, 
    // but if we did, we'd fade out.
    if (!this.ctx || !this.droneGain) return;
    this.droneGain.gain.setTargetAtTime(0, this.ctx.currentTime, 2);
    // Don't fully suspend to allow quick resume
  }

  public setTension(level: number) {
    // level: 0.0 (calm) to 1.0 (tense)
    if (!this.ctx || !this.droneFilter || !this.droneGain) return;
    
    const now = this.ctx.currentTime;
    
    // Tension increases filter cutoff: 80Hz (muffled) -> 500Hz (aggressive)
    const targetFreq = 80 + (level * 420);
    this.droneFilter.frequency.setTargetAtTime(targetFreq, now, 3); // Slow transition

    // Tension increases volume slightly: 0.3 -> 0.5
    const targetGain = 0.3 + (level * 0.2);
    this.droneGain.gain.setTargetAtTime(targetGain, now, 3);
  }
  
  public toggleMute(shouldMute: boolean) {
      if (!this.masterGain || !this.ctx) return;
      // Smooth mute transition
      const val = shouldMute ? 0 : 0.4;
      this.masterGain.gain.setTargetAtTime(val, this.ctx.currentTime, 0.5);
  }
}
