import { WeatherKind } from './types';

export interface WeatherConfig {
  minDurationSec: number;
  maxDurationSec: number;
  transitionSpeed: number;
}

export const DEFAULT_WEATHER_CONFIG: WeatherConfig = {
  minDurationSec: 85,
  maxDurationSec: 155,
  transitionSpeed: 0.22,
};

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  clear: 'Clear',
  rain: 'Light Rain',
  fog: 'Foggy',
};

export interface WeatherSnapshot {
  weather: WeatherKind;
  label: string;
  rainIntensity: number; // smooth 0..1
  fogIntensity: number;  // smooth 0..1
}

export class WeatherSystem {
  public targetWeather: WeatherKind = 'clear';
  public rainIntensity = 0;
  public fogIntensity = 0;

  private timerSec = 95;
  private config: WeatherConfig;

  constructor(config: WeatherConfig = DEFAULT_WEATHER_CONFIG) {
    this.config = { ...config };
    this.reset('clear');
  }

  public reset(initial: WeatherKind = 'clear'): void {
    this.targetWeather = initial;
    this.rainIntensity = initial === 'rain' ? 1 : 0;
    this.fogIntensity = initial === 'fog' ? 1 : 0;
    this.timerSec = this.pickDuration();
  }

  public setWeather(next: WeatherKind, immediate = false): void {
    this.targetWeather = next;
    this.timerSec = this.pickDuration();
    if (immediate) {
      this.rainIntensity = next === 'rain' ? 1 : 0;
      this.fogIntensity = next === 'fog' ? 1 : 0;
    }
  }

  public update(dt: number): void {
    if (dt <= 0) return;

    this.timerSec -= dt;
    if (this.timerSec <= 0) {
      this.targetWeather = this.pickNextWeather(this.targetWeather);
      this.timerSec = this.pickDuration();
    }

    const targetRain = this.targetWeather === 'rain' ? 1 : 0;
    const targetFog = this.targetWeather === 'fog' ? 1 : 0;
    const step = 1 - Math.exp(-this.config.transitionSpeed * dt);

    this.rainIntensity += (targetRain - this.rainIntensity) * step;
    this.fogIntensity += (targetFog - this.fogIntensity) * step;

    if (Math.abs(this.rainIntensity - targetRain) < 0.002) {
      this.rainIntensity = targetRain;
    }
    if (Math.abs(this.fogIntensity - targetFog) < 0.002) {
      this.fogIntensity = targetFog;
    }
  }

  public getSnapshot(): WeatherSnapshot {
    return {
      weather: this.targetWeather,
      label: WEATHER_LABELS[this.targetWeather],
      rainIntensity: this.rainIntensity,
      fogIntensity: this.fogIntensity,
    };
  }

  private pickDuration(): number {
    const span = this.config.maxDurationSec - this.config.minDurationSec;
    return this.config.minDurationSec + Math.random() * span;
  }

  private pickNextWeather(current: WeatherKind): WeatherKind {
    const r = Math.random();
    if (current === 'clear') {
      return r < 0.52 ? 'rain' : 'fog';
    }
    if (current === 'rain') {
      return r < 0.65 ? 'clear' : 'fog';
    }
    return r < 0.65 ? 'clear' : 'rain';
  }
}
