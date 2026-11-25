import { clamp } from './collision';
import { DEFAULT_DAY_LENGTH_SECONDS } from './timeSystem';
import { GameSettings } from './types';

export const SETTINGS_STORAGE_KEY = 'last_shop_settings_v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  language: 'en',
  masterVolume: 0.55,
  muted: false,
  mouseSensitivity: 1.0,
  shadowsEnabled: true,
  lightingQuality: 'atmospheric',
  flashlightOn: true,
  touchControls: 'auto',
  screenOrientation: 'auto',
  dayLengthSeconds: DEFAULT_DAY_LENGTH_SECONDS,
};

export function sanitizeGameSettings(raw: Partial<GameSettings> | null | undefined): GameSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_GAME_SETTINGS };
  }
  const language = raw.language === 'ar' ? 'ar' : 'en';
  const touchControls =
    raw.touchControls === 'auto' || raw.touchControls === 'on' || raw.touchControls === 'off'
      ? raw.touchControls
      : DEFAULT_GAME_SETTINGS.touchControls;
  const screenOrientation =
    raw.screenOrientation === 'auto' ||
    raw.screenOrientation === 'portrait' ||
    raw.screenOrientation === 'landscape'
      ? raw.screenOrientation
      : DEFAULT_GAME_SETTINGS.screenOrientation;
  const lightingQuality =
    raw.lightingQuality === 'atmospheric' || raw.lightingQuality === 'performance'
      ? raw.lightingQuality
      : DEFAULT_GAME_SETTINGS.lightingQuality;
  const dayLengthSeconds =
    raw.dayLengthSeconds === 120 || raw.dayLengthSeconds === 300 || raw.dayLengthSeconds === 900
      ? raw.dayLengthSeconds
      : DEFAULT_GAME_SETTINGS.dayLengthSeconds;

  return {
    language,
    masterVolume:
      typeof raw.masterVolume === 'number' && Number.isFinite(raw.masterVolume)
        ? clamp(raw.masterVolume, 0, 1)
        : DEFAULT_GAME_SETTINGS.masterVolume,
    muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_GAME_SETTINGS.muted,
    mouseSensitivity:
      typeof raw.mouseSensitivity === 'number' && Number.isFinite(raw.mouseSensitivity)
        ? clamp(raw.mouseSensitivity, 0.3, 2.5)
        : DEFAULT_GAME_SETTINGS.mouseSensitivity,
    shadowsEnabled:
      typeof raw.shadowsEnabled === 'boolean'
        ? raw.shadowsEnabled
        : DEFAULT_GAME_SETTINGS.shadowsEnabled,
    lightingQuality,
    flashlightOn:
      typeof raw.flashlightOn === 'boolean'
        ? raw.flashlightOn
        : DEFAULT_GAME_SETTINGS.flashlightOn,
    touchControls,
    screenOrientation,
    dayLengthSeconds,
  };
}

export function loadSettingsFromStorage(): GameSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ...DEFAULT_GAME_SETTINGS };
    }
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_GAME_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return sanitizeGameSettings(parsed);
  } catch {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveSettingsToStorage(settings: GameSettings): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitizeGameSettings(settings)));
  } catch {
    // Ignore storage quota / privacy mode restrictions
  }
}
