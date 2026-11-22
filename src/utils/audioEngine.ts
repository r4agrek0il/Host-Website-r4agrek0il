// Lightweight Web Audio API ambient synthwave engine + tactile UI tones.
// Starts disabled by default and activates strictly on explicit user interaction.

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private active = false;

  public isActive(): boolean {
    return this.active;
  }

  public toggle(): boolean {
    if (this.active) {
      this.stopAmbience();
      return false;
    }
    this.startAmbience();
    return true;
  }

  public startAmbience(): void {
    if (typeof window === 'undefined' || this.active) return;

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    const now = this.ctx.currentTime;
    const master = this.ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.045, now + 0.8);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);

    // Subtle analog-style fifth chord drone (A1 + E2)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, now);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(82.41, now);

    // Gentle filter sweep LFO
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.18, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(master);
    master.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    lfo.start(now);

    this.masterGain = master;
    this.osc1 = osc1;
    this.osc2 = osc2;
    this.lfo = lfo;
    this.active = true;
  }

  public stopAmbience(): void {
    if (!this.active || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now);
      this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    }

    const o1 = this.osc1;
    const o2 = this.osc2;
    const lfo = this.lfo;
    window.setTimeout(() => {
      try {
        o1?.stop();
        o2?.stop();
        lfo?.stop();
      } catch {
        // Ignore already stopped oscillators
      }
    }, 280);

    this.osc1 = null;
    this.osc2 = null;
    this.lfo = null;
    this.active = false;
  }

  public playUiPulse(freq = 640): void {
    if (!this.active || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + 0.06);

    gain.gain.setValueAtTime(0.025, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.09);
  }
}

export const cyberAudio = new CyberAudioEngine();
