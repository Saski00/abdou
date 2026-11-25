export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private nightGain: GainNode | null = null;
  private nightSource: AudioBufferSourceNode | null = null;
  private electricGain: GainNode | null = null;
  private electricOsc: OscillatorNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private volume = 0.55;
  private muted = false;
  private isPlayingAmbience = false;
  private lastAmbientCueAt = 0;

  public unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;
      this.masterGain.connect(this.ctx.destination);
      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 2.0);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setSettings(volume: number, muted: boolean): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime,
        0.04
      );
    }
  }

  public startAmbience(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.isPlayingAmbience) return;
    try {
      // 1. Base Wind Bed
      const source = this.ctx.createBufferSource();
      source.buffer = this.noiseBuffer;
      source.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 300;
      filter.Q.value = 0.8;

      const gain = this.ctx.createGain();
      gain.gain.value = 0.07;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      source.start();

      // 2. Light Rain Bed (bandpass noise, silent until rainIntensity > 0)
      const rainSrc = this.ctx.createBufferSource();
      rainSrc.buffer = this.noiseBuffer;
      rainSrc.loop = true;

      const rainFilter = this.ctx.createBiquadFilter();
      rainFilter.type = 'bandpass';
      rainFilter.frequency.value = 1750;
      rainFilter.Q.value = 0.55;

      const rainGain = this.ctx.createGain();
      rainGain.gain.value = 0.0;

      rainSrc.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(this.masterGain);
      rainSrc.start(0, 0.4);

      // 3. Subtle Nighttime Air Ambience
      const nightSrc = this.ctx.createBufferSource();
      nightSrc.buffer = this.noiseBuffer;
      nightSrc.loop = true;

      const nightFilter = this.ctx.createBiquadFilter();
      nightFilter.type = 'bandpass';
      nightFilter.frequency.value = 540;
      nightFilter.Q.value = 2.6;

      const nightGain = this.ctx.createGain();
      nightGain.gain.value = 0.0;

      nightSrc.connect(nightFilter);
      nightFilter.connect(nightGain);
      nightGain.connect(this.masterGain);
      nightSrc.start(0, 1.0);

      // 4. Subtle Generator / Powered Sign Electrical Hum (audible near Last Shop & calibrated relay)
      const elecOsc = this.ctx.createOscillator();
      elecOsc.type = 'sawtooth';
      elecOsc.frequency.value = 120;

      const elecFilter = this.ctx.createBiquadFilter();
      elecFilter.type = 'lowpass';
      elecFilter.frequency.value = 195;

      const elecGain = this.ctx.createGain();
      elecGain.gain.value = 0.0;

      elecOsc.connect(elecFilter);
      elecFilter.connect(elecGain);
      elecGain.connect(this.masterGain);
      elecOsc.start();

      this.windSource = source;
      this.windFilter = filter;
      this.windGain = gain;
      this.rainSource = rainSrc;
      this.rainFilter = rainFilter;
      this.rainGain = rainGain;
      this.nightSource = nightSrc;
      this.nightGain = nightGain;
      this.electricOsc = elecOsc;
      this.electricGain = elecGain;
      this.isPlayingAmbience = true;
    } catch {
      // Ignore blocked audio context errors
    }
  }

  public setAmbienceActive(active: boolean): void {
    if (!this.ctx || !this.windGain) return;
    const target = active ? 0.07 : 0.015;
    this.windGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.25);
    if (!active) {
      this.rainGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      this.nightGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      this.electricGain?.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
    }
  }

  public updateAtmosphere(
    active: boolean,
    rainIntensity: number,
    nightFactor: number,
    isIndoors: boolean,
    powerHumFactor = 0
  ): void {
    if (!this.ctx || !this.isPlayingAmbience || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const indoorAtten = isIndoors ? 0.35 : 1.0;

    if (this.windGain && this.windFilter) {
      const baseWind = active ? (0.065 + rainIntensity * 0.03) * (isIndoors ? 0.45 : 1.0) : 0.015;
      const targetFreq = isIndoors ? 210 : 280 + rainIntensity * 140 - nightFactor * 40;
      this.windGain.gain.setTargetAtTime(baseWind, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
    }

    if (this.rainGain && this.rainFilter) {
      const targetRain = active ? Math.max(0, Math.min(1, rainIntensity)) * 0.14 * indoorAtten : 0;
      this.rainGain.gain.setTargetAtTime(targetRain, now, 0.35);
      this.rainFilter.frequency.setTargetAtTime(isIndoors ? 920 : 1750, now, 0.35);
    }

    if (this.nightGain) {
      const targetNight = active
        ? Math.max(0, Math.min(1, nightFactor)) * 0.032 * (isIndoors ? 0.4 : 1.0)
        : 0;
      this.nightGain.gain.setTargetAtTime(targetNight, now, 0.45);
    }

    if (this.electricGain) {
      const clampedHum = Math.max(0, Math.min(1, powerHumFactor));
      const targetHum = active ? clampedHum * 0.014 : 0;
      this.electricGain.gain.setTargetAtTime(targetHum, now, 0.35);
    }
  }

  public playFootstep(sprinting: boolean, onRoad: boolean): void {
    if (
      !this.ctx ||
      !this.masterGain ||
      !this.noiseBuffer ||
      this.muted ||
      this.ctx.state !== 'running'
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = onRoad
      ? 760 + Math.random() * 180
      : 1080 + Math.random() * 220;
    filter.Q.value = 1.4;

    const gain = this.ctx.createGain();
    const peak = sprinting ? 0.11 : 0.065;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.085);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 1.2, 0.09);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sprinting ? 102 : 84, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(sprinting ? 0.085 : 0.045, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(thudGain);
    thudGain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playLand(): void {
    this.playFootstep(true, true);
  }

  public playUiClick(pitch = 520): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.65, now + 0.045);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playFlashlightClick(on: boolean): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 1400 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(on ? 2100 : 620, now + 0.025);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playPickup(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playDoorToggle(opening: boolean): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(opening ? 140 : 190, now);
    osc.frequency.exponentialRampToValueAtTime(opening ? 210 : 105, now + 0.11);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playContainerOpen(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playConsume(kind: 'food' | 'water' | 'med'): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    if (kind === 'water') {
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(860, now + 0.12);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.15);
      return;
    }

    if (kind === 'food') {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(340, now);
      osc.frequency.exponentialRampToValueAtTime(510, now + 0.09);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.075, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    // med
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(680, now + 0.07);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playRestToggle(resting: boolean): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(resting ? 260 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(resting ? 190 : 290, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playMeleeSwing(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') {
      return;
    }
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.frequency.exponentialRampToValueAtTime(240, now + 0.12);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.11, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.8, 0.15);
  }

  public playMeleeHit(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playPlayerHurt(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.16);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.13, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playZombieGroan(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 78 + Math.random() * 18;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.72, now + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playZombieDeath(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.34);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  public playCashRegister(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    // Two crisp chime notes for completing a shop sale
    const notes = [880, 1318.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t0 = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  }

  public playStockTransfer(): void {
    this.unlock();
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.06);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playShopBell(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = [1568, 2093];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const t0 = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.055, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playBirdChirp(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    this.lastAmbientCueAt = now;

    const chirps = Math.random() > 0.45 ? 2 : 1;
    for (let i = 0; i < chirps; i++) {
      const t0 = now + i * 0.16;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      const f0 = 2150 + Math.random() * 650;
      osc.frequency.setValueAtTime(f0, t0);
      osc.frequency.exponentialRampToValueAtTime(f0 * 1.32, t0 + 0.045);
      osc.frequency.exponentialRampToValueAtTime(f0 * 0.92, t0 + 0.095);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.022, t0 + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t0);
      osc.stop(t0 + 0.11);
    }
  }

  public playWoodCreak(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    this.lastAmbientCueAt = now;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 105 + Math.random() * 45;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 0.72, now + 0.36);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 260;
    filter.Q.value = 3.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.03, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playDistantThud(isThunder = false): void {
    if (
      !this.ctx ||
      !this.masterGain ||
      !this.noiseBuffer ||
      this.muted ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.0) return;
    this.lastAmbientCueAt = now;

    const duration = isThunder ? 1.45 : 0.45;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(isThunder ? 185 : 130, now);
    filter.frequency.exponentialRampToValueAtTime(55, now + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isThunder ? 0.11 : 0.05, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 0.4, duration + 0.05);
  }

  public playDistantZombieGroan(distance: number): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    this.lastAmbientCueAt = now;

    const atten = Math.max(0.15, Math.min(1, 1 - (distance - 8) / 28));
    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    const base = 70 + Math.random() * 14;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 0.68, now + 0.45);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.036 * atten, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playRadioPing(): void {
    if (!this.ctx || !this.masterGain || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.0) return;
    this.lastAmbientCueAt = now;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.setValueAtTime(1486, now + 0.07);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.028, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public dispose(): void {
    for (const src of [this.windSource, this.rainSource, this.nightSource, this.electricOsc]) {
      if (src) {
        try {
          src.stop();
        } catch {
          // ignore
        }
      }
    }
    this.windSource = null;
    this.rainSource = null;
    this.nightSource = null;
    this.electricOsc = null;
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.isPlayingAmbience = false;
  }

  private createNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.12;
    }
    return buffer;
  }
}
