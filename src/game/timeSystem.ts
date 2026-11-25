import { DayPhase } from './types';

export const DEFAULT_DAY_LENGTH_SECONDS = 900; // 15 real minutes per 24-hour in-game day
export const INITIAL_START_HOUR = 8.0; // 08:00 Morning

export interface TimeSnapshot {
  day: number;
  timeOfDay: number; // [0, 1) where 0 = 00:00, 0.5 = 12:00
  hours: number;
  minutes: number;
  formattedTime: string;
  phase: DayPhase;
  /** -1 (midnight) to +1 (solar noon), 0 at 06:00 and 18:00 */
  sunElevation: number;
  /** Smooth 0 (night) -> 1 (bright day) */
  daylightFactor: number;
  /** Smooth 0 (day) -> 1 (night) */
  nightFactor: number;
  /** Smooth 0 (off in day) -> 1 (lit at dusk/night/pre-dawn) */
  lampFactor: number;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function classifyDayPhase(hoursFloat: number): DayPhase {
  if (hoursFloat >= 5.0 && hoursFloat < 7.5) return 'Dawn';
  if (hoursFloat >= 7.5 && hoursFloat < 12.0) return 'Morning';
  if (hoursFloat >= 12.0 && hoursFloat < 17.5) return 'Afternoon';
  if (hoursFloat >= 17.5 && hoursFloat < 20.0) return 'Sunset';
  return 'Night';
}

export class TimeSystem {
  public day = 1;
  public timeOfDay: number;
  private dayLengthSeconds: number;

  constructor(
    dayLengthSeconds = DEFAULT_DAY_LENGTH_SECONDS,
    startHour = INITIAL_START_HOUR
  ) {
    this.dayLengthSeconds = Math.max(30, Math.min(7200, dayLengthSeconds));
    this.timeOfDay = (((startHour % 24) + 24) % 24) / 24;
  }

  public setDayLengthSeconds(seconds: number): void {
    this.dayLengthSeconds = Math.max(30, Math.min(7200, seconds));
  }

  public getDayLengthSeconds(): number {
    return this.dayLengthSeconds;
  }

  public reset(startHour = INITIAL_START_HOUR): void {
    this.day = 1;
    this.timeOfDay = (((startHour % 24) + 24) % 24) / 24;
  }

  public setHour(hour: number, dayNumber = this.day): void {
    this.day = Math.max(1, Math.floor(dayNumber));
    this.timeOfDay = (((hour % 24) + 24) % 24) / 24;
  }

  public update(dt: number): void {
    if (dt <= 0) return;
    this.timeOfDay += dt / this.dayLengthSeconds;
    while (this.timeOfDay >= 1) {
      this.timeOfDay -= 1;
      this.day += 1;
    }
  }

  public getSnapshot(): TimeSnapshot {
    const totalMinutes = Math.floor(this.timeOfDay * 1440 + 1e-4) % 1440;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hoursFloat = this.timeOfDay * 24;

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');

    // Sun angle: -PI/2 at midnight, 0 at 06:00 sunrise, +PI/2 at 12:00 noon, PI at 18:00 sunset
    const sunAngle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sunElevation = Math.sin(sunAngle);

    // Daylight curve smoothly ramps through dawn (05:15..07:45) and dusk (17:15..19:45)
    const morningRamp = smoothstep(5.25, 7.75, hoursFloat);
    const eveningRamp = 1 - smoothstep(17.25, 19.75, hoursFloat);
    const daylightFactor = Math.max(0, Math.min(1, Math.min(morningRamp, eveningRamp)));
    const nightFactor = 1 - daylightFactor;

    // Street lamps turn on around sunset (17:50..18:35) and turn off after dawn (05:45..06:30)
    const lampOffDawn = 1 - smoothstep(5.75, 6.5, hoursFloat);
    const lampOnDusk = smoothstep(17.8, 18.55, hoursFloat);
    const lampFactor = Math.max(0, Math.min(1, Math.max(lampOffDawn, lampOnDusk)));

    return {
      day: this.day,
      timeOfDay: this.timeOfDay,
      hours,
      minutes,
      formattedTime: `${hh}:${mm}`,
      phase: classifyDayPhase(hoursFloat),
      sunElevation,
      daylightFactor,
      nightFactor,
      lampFactor,
    };
  }
}
