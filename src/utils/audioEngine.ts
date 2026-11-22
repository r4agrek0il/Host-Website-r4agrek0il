// Continuous low-volume Web Audio synthwave atmospheric loop + tactile UI tones.
// Ducks automatically when YouTube track audio is playing unmuted so there is zero audio conflict.

class CyberAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null;
  private lfo: OscillatorNode | null = null;
  private running = false;
  private muted = false;
  private duckedForTrack = false;

  public isRunning(): boolean {
    return this.running;
  }

  public isAudible(): boolean {
    return this.running && !this.muted && !this.duckedForTrack;
  }

  public setMasterMuted(nextMuted: boolean): void {
    this.muted = nextMuted;
    this.syncGain();
  }

  public setDuckForYouTube(youtubeAudible: boolean): void {
    this.duckedForTrack = youtubeAudible;
    this.syncGain();
  }

  private syncGain(): void {
    if (!this.ctx || !this.masterGain || !this.running) return;
    const now = this.ctx.currentTime;
    const target = this.muted || this.duckedForTrack ? 0.0001 : 0.028;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(target, now, 0.25);
  }

  public startLoop(): void {
    if (typeof window === 'undefined') return;
    if (this.running) {
      if (this.ctx?.state === 'suspended') {
        void this.ctx.resume();
      }
      this.syncGain();
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    try {
      if (!this.ctx) {
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }

      const now = this.ctx.currentTime;
      const master = this.ctx.createGain();
      const initialGain = this.muted || this.duckedForTrack ? 0.0001 : 0.028;
      master.gain.setValueAtTime(0.0001, now);
      master.gain.setTargetAtTime(initialGain, now, 0.5);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);
      filter.Q.setValueAtTime(2.2, now);

      // Warm A-minor 9th synthwave pad (A1, E2, B2)
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(55.0, now);

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(82.41, now);

      const osc3 = this.ctx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(123.47, now);

      // Slow filter sweep LFO
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.setValueAtTime(0.14, now);
      lfoGain.gain.setValueAtTime(130, now);
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(master);
      master.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      lfo.start(now);

      this.masterGain = master;
      this.osc1 = osc1;
      this.osc2 = osc2;
      this.osc3 = osc3;
      this.lfo = lfo;
      this.running = true;
    } catch {
      // Browser blocked AudioContext prior to gesture; will retry on user gesture
    }
  }

  public stopLoop(): void {
    if (!this.running || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(0.0001, now, 0.12);
    }

    const o1 = this.osc1;
    const o2 = this.osc2;
    const o3 = this.osc3;
    const lfo = this.lfo;
    window.setTimeout(() => {
      try {
        o1?.stop();
        o2?.stop();
        o3?.stop();
        lfo?.stop();
      } catch {
        // Ignore
      }
    }, 260);

    this.osc1 = null;
    this.osc2 = null;
    this.osc3 = null;
    this.lfo = null;
    this.running = false;
  }

  public playUiPulse(freq = 640): void {
    if (this.muted || !this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.22, now + 0.055);

    gain.gain.setValueAtTime(0.018, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const cyberAudio = new CyberAudioEngine();
