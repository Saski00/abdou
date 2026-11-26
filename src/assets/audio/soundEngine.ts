import { HorrorAudioLevel } from '../../game/types';

export interface AudioChannelSettings {
  ambientVolume?: number;
  sfxVolume?: number;
  musicVolume?: number;
  dialogueVolume?: number;
  horrorAudioLevel?: HorrorAudioLevel;
}

export interface AtmosphereAudioContext {
  dangerFactor?: number;
  isSafeBase?: boolean;
  windGust?: number;
  silenceFactor?: number;
}

const MAX_CONCURRENT_CUES = 7;

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private dialogueGain: GainNode | null = null;

  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainSource: AudioBufferSourceNode | null = null;
  private nightGain: GainNode | null = null;
  private nightSource: AudioBufferSourceNode | null = null;
  private indoorToneGain: GainNode | null = null;
  private indoorToneSource: AudioBufferSourceNode | null = null;
  private electricGain: GainNode | null = null;
  private electricOsc: OscillatorNode | null = null;

  // Adaptive music / tension pads
  private dreadGain: GainNode | null = null;
  private dreadOscA: OscillatorNode | null = null;
  private dreadOscB: OscillatorNode | null = null;
  private safePadGain: GainNode | null = null;
  private safeOscA: OscillatorNode | null = null;
  private safeOscB: OscillatorNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private volume = 0.55;
  private ambientVolume = 0.85;
  private sfxVolume = 0.9;
  private musicVolume = 0.65;
  private dialogueVolume = 0.85;
  private horrorAudioLevel: HorrorAudioLevel = 'full';
  private muted = false;

  private isPlayingAmbience = false;
  private lastAmbientCueAt = 0;
  private lastHeartbeatAt = 0;
  private activeCueVoices = 0;

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

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = this.ambientVolume;
      this.ambientGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.dialogueGain = this.ctx.createGain();
      this.dialogueGain.gain.value = this.dialogueVolume;
      this.dialogueGain.connect(this.masterGain);

      this.noiseBuffer = this.createNoiseBuffer(this.ctx, 2.0);
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  public setSettings(
    volume: number,
    muted: boolean,
    channels?: AudioChannelSettings
  ): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.muted = muted;
    if (channels) {
      if (typeof channels.ambientVolume === 'number') {
        this.ambientVolume = Math.max(0, Math.min(1, channels.ambientVolume));
      }
      if (typeof channels.sfxVolume === 'number') {
        this.sfxVolume = Math.max(0, Math.min(1, channels.sfxVolume));
      }
      if (typeof channels.musicVolume === 'number') {
        this.musicVolume = Math.max(0, Math.min(1, channels.musicVolume));
      }
      if (typeof channels.dialogueVolume === 'number') {
        this.dialogueVolume = Math.max(0, Math.min(1, channels.dialogueVolume));
      }
      if (channels.horrorAudioLevel) {
        this.horrorAudioLevel = channels.horrorAudioLevel;
      }
    }

    if (this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain?.gain.setTargetAtTime(this.muted ? 0 : this.volume, now, 0.04);
      this.ambientGain?.gain.setTargetAtTime(this.ambientVolume, now, 0.05);
      this.sfxGain?.gain.setTargetAtTime(this.sfxVolume, now, 0.05);
      this.musicGain?.gain.setTargetAtTime(this.musicVolume, now, 0.05);
      this.dialogueGain?.gain.setTargetAtTime(this.dialogueVolume, now, 0.05);
    }
  }

  public startAmbience(): void {
    if (
      !this.ctx ||
      !this.ambientGain ||
      !this.musicGain ||
      !this.noiseBuffer ||
      this.isPlayingAmbience
    ) {
      return;
    }
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
      gain.gain.value = 0.065;

      source.connect(filter);
      filter.connect(gain);
      gain.connect(this.ambientGain);
      source.start();

      // 2. Rain Bed
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
      rainGain.connect(this.ambientGain);
      rainSrc.start(0, 0.4);

      // 3. Nighttime Outdoor Air Ambience
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
      nightGain.connect(this.ambientGain);
      nightSrc.start(0, 1.0);

      // 4. Hollow Abandoned Indoor Room Tone
      const indoorSrc = this.ctx.createBufferSource();
      indoorSrc.buffer = this.noiseBuffer;
      indoorSrc.loop = true;

      const indoorFilter = this.ctx.createBiquadFilter();
      indoorFilter.type = 'bandpass';
      indoorFilter.frequency.value = 148;
      indoorFilter.Q.value = 1.9;

      const indoorGain = this.ctx.createGain();
      indoorGain.gain.value = 0.0;

      indoorSrc.connect(indoorFilter);
      indoorFilter.connect(indoorGain);
      indoorGain.connect(this.ambientGain);
      indoorSrc.start(0, 1.45);

      // 5. Generator / Powered Relay Hum
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
      elecGain.connect(this.ambientGain);
      elecOsc.start();

      // 6. Adaptive Tension / Dread Sub-Drone (outside / danger / night)
      const dreadOscA = this.ctx.createOscillator();
      dreadOscA.type = 'sine';
      dreadOscA.frequency.value = 55;

      const dreadOscB = this.ctx.createOscillator();
      dreadOscB.type = 'triangle';
      dreadOscB.frequency.value = 82.9;

      const dreadFilter = this.ctx.createBiquadFilter();
      dreadFilter.type = 'lowpass';
      dreadFilter.frequency.value = 155;

      const dreadGain = this.ctx.createGain();
      dreadGain.gain.value = 0.0;

      dreadOscA.connect(dreadFilter);
      dreadOscB.connect(dreadFilter);
      dreadFilter.connect(dreadGain);
      dreadGain.connect(this.musicGain);
      dreadOscA.start();
      dreadOscB.start();

      // 7. Adaptive Warm Safe-Haven Pad (only audible inside The Last Shop)
      const safeOscA = this.ctx.createOscillator();
      safeOscA.type = 'sine';
      safeOscA.frequency.value = 146.83; // D3

      const safeOscB = this.ctx.createOscillator();
      safeOscB.type = 'sine';
      safeOscB.frequency.value = 220.0; // A3 warm fifth

      const safeFilter = this.ctx.createBiquadFilter();
      safeFilter.type = 'lowpass';
      safeFilter.frequency.value = 340;

      const safePadGain = this.ctx.createGain();
      safePadGain.gain.value = 0.0;

      safeOscA.connect(safeFilter);
      safeOscB.connect(safeFilter);
      safeFilter.connect(safePadGain);
      safePadGain.connect(this.musicGain);
      safeOscA.start();
      safeOscB.start();

      this.windSource = source;
      this.windFilter = filter;
      this.windGain = gain;
      this.rainSource = rainSrc;
      this.rainFilter = rainFilter;
      this.rainGain = rainGain;
      this.nightSource = nightSrc;
      this.nightGain = nightGain;
      this.indoorToneSource = indoorSrc;
      this.indoorToneGain = indoorGain;
      this.electricOsc = elecOsc;
      this.electricGain = elecGain;
      this.dreadOscA = dreadOscA;
      this.dreadOscB = dreadOscB;
      this.dreadGain = dreadGain;
      this.safeOscA = safeOscA;
      this.safeOscB = safeOscB;
      this.safePadGain = safePadGain;
      this.isPlayingAmbience = true;
    } catch {
      // Ignore blocked audio context errors
    }
  }

  public setAmbienceActive(active: boolean): void {
    if (!this.ctx || !this.windGain) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.065 : 0.012;
    this.windGain.gain.setTargetAtTime(target, now, 0.25);
    if (!active) {
      this.rainGain?.gain.setTargetAtTime(0, now, 0.25);
      this.nightGain?.gain.setTargetAtTime(0, now, 0.25);
      this.indoorToneGain?.gain.setTargetAtTime(0, now, 0.25);
      this.electricGain?.gain.setTargetAtTime(0, now, 0.25);
      this.dreadGain?.gain.setTargetAtTime(0, now, 0.4);
      this.safePadGain?.gain.setTargetAtTime(0, now, 0.4);
    }
  }

  public updateAtmosphere(
    active: boolean,
    rainIntensity: number,
    nightFactor: number,
    isIndoors: boolean,
    powerHumFactor = 0,
    extra: AtmosphereAudioContext = {}
  ): void {
    if (!this.ctx || !this.isPlayingAmbience || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const rain = Math.max(0, Math.min(1, rainIntensity));
    const night = Math.max(0, Math.min(1, nightFactor));
    const gust = Math.max(0, Math.min(1, extra.windGust ?? 0.22));
    const danger = Math.max(0, Math.min(1, extra.dangerFactor ?? 0));
    const isSafeBase = Boolean(extra.isSafeBase);
    const silence = Math.max(0, Math.min(0.88, extra.silenceFactor ?? 0));
    const calmScale = 1 - silence;
    const indoorAtten = isIndoors ? 0.34 : 1.0;

    if (this.windGain && this.windFilter) {
      const baseWind = active
        ? (0.048 + rain * 0.024 + gust * 0.036) * (isIndoors ? 0.38 : 1.0) * calmScale
        : 0.012;
      const targetFreq = isIndoors
        ? 185 + gust * 45
        : 240 + rain * 130 + gust * 220 - night * 35;
      this.windGain.gain.setTargetAtTime(baseWind, now, 0.35);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);
    }

    if (this.rainGain && this.rainFilter) {
      const targetRain = active ? rain * 0.14 * indoorAtten * calmScale : 0;
      this.rainGain.gain.setTargetAtTime(targetRain, now, 0.35);
      this.rainFilter.frequency.setTargetAtTime(isIndoors ? 860 : 1750 + gust * 260, now, 0.35);
    }

    if (this.nightGain) {
      const targetNight = active
        ? night * 0.032 * (isIndoors ? 0.32 : 1.0) * calmScale
        : 0;
      this.nightGain.gain.setTargetAtTime(targetNight, now, 0.45);
    }

    if (this.indoorToneGain) {
      const targetRoomTone = active && isIndoors && !isSafeBase
        ? (0.028 + danger * 0.018) * (1 - silence * 0.5)
        : 0;
      this.indoorToneGain.gain.setTargetAtTime(targetRoomTone, now, 0.55);
    }

    if (this.electricGain) {
      const clampedHum = Math.max(0, Math.min(1, powerHumFactor));
      const targetHum = active ? clampedHum * 0.014 : 0;
      this.electricGain.gain.setTargetAtTime(targetHum, now, 0.35);
    }

    // Adaptive Music Beds (Dread outside/danger vs Warmth inside The Last Shop)
    const horrorScale =
      this.horrorAudioLevel === 'off' ? 0 : this.horrorAudioLevel === 'reduced' ? 0.45 : 1.0;

    if (this.dreadGain) {
      const tensionWeight =
        !active || isSafeBase || horrorScale === 0
          ? 0
          : Math.min(1, danger * 0.65 + night * 0.25 + (isIndoors ? 0.24 : 0) + silence * 0.2);
      const targetDread = tensionWeight > 0.12 ? tensionWeight * 0.036 * horrorScale : 0;
      this.dreadGain.gain.setTargetAtTime(targetDread, now, 1.1);
    }

    if (this.safePadGain) {
      const targetSafe = active && isSafeBase ? 0.022 : 0;
      this.safePadGain.gain.setTargetAtTime(targetSafe, now, 1.2);
    }
  }

  private getHorrorCueMultiplier(): number {
    if (this.horrorAudioLevel === 'off') return 0;
    if (this.horrorAudioLevel === 'reduced') return 0.45;
    return 1;
  }

  private tryReserveVoice(durationSec: number): boolean {
    if (this.activeCueVoices >= MAX_CONCURRENT_CUES) return false;
    this.activeCueVoices += 1;
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        this.activeCueVoices = Math.max(0, this.activeCueVoices - 1);
      }, Math.ceil(durationSec * 1000) + 40);
    } else {
      this.activeCueVoices = Math.max(0, this.activeCueVoices - 1);
    }
    return true;
  }

  public playFootstep(sprinting: boolean, onRoad: boolean): void {
    const out = this.sfxGain ?? this.masterGain;
    if (
      !this.ctx ||
      !out ||
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
    gain.connect(out);
    src.start(now, Math.random() * 1.2, 0.09);

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(sprinting ? 102 : 84, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.06);

    const thudGain = this.ctx.createGain();
    thudGain.gain.setValueAtTime(sprinting ? 0.085 : 0.045, now);
    thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.065);

    osc.connect(thudGain);
    thudGain.connect(out);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(190, now + 0.09);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  public playLand(): void {
    this.playFootstep(true, true);
  }

  public playUiClick(pitch = 520): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.65, now + 0.045);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.055);
  }

  public playFlashlightClick(on: boolean): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(on ? 1400 : 980, now);
    osc.frequency.exponentialRampToValueAtTime(on ? 2100 : 620, now + 0.025);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.035);
  }

  public playPickup(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.08);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playDoorToggle(opening: boolean): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playContainerOpen(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.06);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playConsume(kind: 'food' | 'water' | 'med'): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
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
      gain.connect(out);
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
      gain.connect(out);
      osc.start(now);
      osc.stop(now + 0.13);
      return;
    }

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.setValueAtTime(680, now + 0.07);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.065, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playRestToggle(resting: boolean): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(resting ? 260 : 210, now);
    osc.frequency.exponentialRampToValueAtTime(resting ? 190 : 290, now + 0.12);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playMeleeSwing(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') {
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
    gain.connect(out);
    src.start(now, Math.random() * 0.8, 0.15);
  }

  public playMeleeHit(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(175, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playPlayerHurt(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  public playZombieGroan(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.32)) return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.32);
  }

  public playZombieDeath(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(125, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.34);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.37);
  }

  public playCashRegister(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;

    const notes = [880, 1318.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !out) return;
      const t0 = now + idx * 0.055;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.085, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.22);
    });
  }

  public playStockTransfer(): void {
    this.unlock();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(480, now + 0.06);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.09);
  }

  public playShopBell(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const notes = [1568, 2093];
    notes.forEach((freq, idx) => {
      if (!this.ctx || !out) return;
      const t0 = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.055, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.34);
      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.36);
    });
  }

  public playBirdChirp(): void {
    const out = this.ambientGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    if (!this.tryReserveVoice(0.3)) return;
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
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.11);
    }
  }

  public playWoodCreak(): void {
    const out = this.ambientGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    if (!this.tryReserveVoice(0.45)) return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.44);
  }

  public playMetalGroan(): void {
    const mult = this.getHorrorCueMultiplier();
    const out = this.ambientGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || mult === 0 || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.6) return;
    if (!this.tryReserveVoice(0.95)) return;
    this.lastAmbientCueAt = now;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    const base = 66 + Math.random() * 24;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 0.84, now + 0.85);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 185;
    filter.Q.value = 4.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.032 * mult, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.92);
  }

  public playWaterDrip(): void {
    const out = this.ambientGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.3) return;
    if (!this.tryReserveVoice(0.2)) return;
    this.lastAmbientCueAt = now;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    const f0 = 920 + Math.random() * 340;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.48, now + 0.055);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.018, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playBuildingKnock(): void {
    const mult = this.getHorrorCueMultiplier();
    const out = this.ambientGain ?? this.masterGain;
    if (
      !this.ctx ||
      !out ||
      !this.noiseBuffer ||
      this.muted ||
      mult === 0 ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.8) return;
    if (!this.tryReserveVoice(0.7)) return;
    this.lastAmbientCueAt = now;

    const knocks = Math.random() > 0.45 ? 2 : 1;
    for (let i = 0; i < knocks; i++) {
      const t0 = now + i * 0.24;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(118 - i * 8, t0);
      osc.frequency.exponentialRampToValueAtTime(48, t0 + 0.14);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(0.048 * mult, t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.2);
    }
  }

  public playDistantThud(isThunder = false): void {
    const out = this.ambientGain ?? this.masterGain;
    if (
      !this.ctx ||
      !out ||
      !this.noiseBuffer ||
      this.muted ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.0) return;
    if (!this.tryReserveVoice(isThunder ? 1.5 : 0.5)) return;
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
    gain.gain.linearRampToValueAtTime(isThunder ? 0.11 : 0.045, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random() * 0.4, duration + 0.05);
  }

  public playDistantZombieGroan(distance: number): void {
    const out = this.ambientGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    if (!this.tryReserveVoice(0.5)) return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playRadioPing(): void {
    const out = this.dialogueGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.0) return;
    if (!this.tryReserveVoice(0.2)) return;
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
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playRadioStaticCutoff(): void {
    const mult = this.getHorrorCueMultiplier();
    const out = this.dialogueGain ?? this.masterGain;
    if (
      !this.ctx ||
      !out ||
      !this.noiseBuffer ||
      this.muted ||
      mult === 0 ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (now - this.lastAmbientCueAt < 1.2) return;
    if (!this.tryReserveVoice(0.55)) return;
    this.lastAmbientCueAt = now;

    // Brief bandpass crackle followed by sharp dead-air click
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2200, now);
    filter.frequency.linearRampToValueAtTime(1450, now + 0.35);
    filter.Q.value = 1.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.055 * mult, now + 0.04);
    gain.gain.setValueAtTime(0.04 * mult, now + 0.32);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, Math.random() * 0.5, 0.45);

    const tone = this.ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.setValueAtTime(1486, now + 0.06);
    tone.frequency.setValueAtTime(980, now + 0.22);

    const toneGain = this.ctx.createGain();
    toneGain.gain.setValueAtTime(0.0001, now + 0.05);
    toneGain.gain.linearRampToValueAtTime(0.022 * mult, now + 0.09);
    toneGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.36);

    tone.connect(toneGain);
    toneGain.connect(out);
    tone.start(now + 0.05);
    tone.stop(now + 0.38);
  }

  public playHeartbeatPulse(intensity = 0.7): void {
    const mult = this.getHorrorCueMultiplier();
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || mult === 0 || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - this.lastHeartbeatAt < 0.85) return;
    if (!this.tryReserveVoice(0.45)) return;
    this.lastHeartbeatAt = now;

    const amp = Math.max(0.15, Math.min(1, intensity)) * 0.075 * mult;
    const beats = [0, 0.19];
    beats.forEach((offset, idx) => {
      if (!this.ctx || !out) return;
      const t0 = now + offset;
      const osc = this.ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(idx === 0 ? 58 : 50, t0);
      osc.frequency.exponentialRampToValueAtTime(34, t0 + 0.14);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(amp * (idx === 0 ? 1 : 0.72), t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.17);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.18);
    });
  }

  public playApparitionSting(): void {
    const mult = this.getHorrorCueMultiplier();
    const out = this.ambientGain ?? this.masterGain;
    if (
      !this.ctx ||
      !out ||
      !this.noiseBuffer ||
      this.muted ||
      mult === 0 ||
      this.ctx.state !== 'running'
    ) {
      return;
    }
    const now = this.ctx.currentTime;
    if (!this.tryReserveVoice(0.85)) return;

    // Gentle airy sigh + subtle low harmonic fade (no loud jumpscare)
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(880, now);
    filter.frequency.exponentialRampToValueAtTime(320, now + 0.7);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045 * mult, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, 0.2, 0.8);
  }

  public playKnifeSwing(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.18)) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1600, now);
    filter.frequency.exponentialRampToValueAtTime(650, now + 0.13);
    filter.Q.value = 1.6;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.13, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    src.start(now, 0.05, 0.16);
  }

  public playKnifeHit(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.2)) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(290, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.11);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playCritHit(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.24)) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(62, now + 0.18);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 950;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.21);
  }

  public playPistolShot(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || !this.noiseBuffer || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.42)) return;
    const now = this.ctx.currentTime;

    // Punchy low chamber thump
    const punch = this.ctx.createOscillator();
    punch.type = 'sine';
    punch.frequency.setValueAtTime(195, now);
    punch.frequency.exponentialRampToValueAtTime(48, now + 0.11);

    const punchGain = this.ctx.createGain();
    punchGain.gain.setValueAtTime(0.001, now);
    punchGain.gain.linearRampToValueAtTime(0.32, now + 0.006);
    punchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    punch.connect(punchGain);
    punchGain.connect(out);
    punch.start(now);
    punch.stop(now + 0.14);

    // Sharp crack & decaying gunshot tail
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.28);
    filter.Q.value = 0.8;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.001, now);
    noiseGain.gain.linearRampToValueAtTime(0.38, now + 0.008);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(out);
    noise.start(now, Math.random() * 0.25, 0.36);
  }

  public playDryFire(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.1)) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1180, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.045);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playPistolReload(complete = false): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.22)) return;
    const now = this.ctx.currentTime;

    const freqs = complete ? [520, 780] : [410, 320];
    freqs.forEach((f, idx) => {
      if (!this.ctx || !out) return;
      const t0 = now + idx * 0.085;
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, t0);
      osc.frequency.exponentialRampToValueAtTime(f * 0.68, t0 + 0.05);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, t0);
      gain.gain.linearRampToValueAtTime(0.11, t0 + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.065);

      osc.connect(gain);
      gain.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.07);
    });
  }

  public playWeaponSwitch(): void {
    const out = this.sfxGain ?? this.masterGain;
    if (!this.ctx || !out || this.muted || this.ctx.state !== 'running') return;
    if (!this.tryReserveVoice(0.12)) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(540, now + 0.055);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.08, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);

    osc.connect(gain);
    gain.connect(out);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public dispose(): void {
    for (const src of [
      this.windSource,
      this.rainSource,
      this.nightSource,
      this.indoorToneSource,
      this.electricOsc,
      this.dreadOscA,
      this.dreadOscB,
      this.safeOscA,
      this.safeOscB,
    ]) {
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
    this.indoorToneSource = null;
    this.electricOsc = null;
    this.dreadOscA = null;
    this.dreadOscB = null;
    this.safeOscA = null;
    this.safeOscB = null;
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
