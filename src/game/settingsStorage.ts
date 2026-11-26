import { clamp } from './collision';
import { DEFAULT_DAY_LENGTH_SECONDS } from './timeSystem';
import { GameSettings, GraphicsQuality, HorrorAudioLevel } from './types';

export const SETTINGS_STORAGE_KEY = 'last_shop_settings_v1';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  language: 'en',
  masterVolume: 0.55,
  ambientVolume: 0.85,
  sfxVolume: 0.9,
  musicVolume: 0.65,
  dialogueVolume: 0.85,
  horrorAudioLevel: 'full',
  muted: false,
  mouseSensitivity: 1.0,
  shadowsEnabled: true,
  lightingQuality: 'atmospheric',
  graphicsQuality: 'high',
  flashlightOn: true,
  touchControls: 'auto',
  screenOrientation: 'auto',
  dayLengthSeconds: DEFAULT_DAY_LENGTH_SECONDS,
};

function detectDefaultGraphicsQuality(): GraphicsQuality {
  if (typeof window === 'undefined') return DEFAULT_GAME_SETTINGS.graphicsQuality;
  const coarsePointer =
    typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  const touchCapable = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0;
  return coarsePointer || touchCapable ? 'medium' : 'high';
}

function sanitizeVolume(val: unknown, fallback: number): number {
  return typeof val === 'number' && Number.isFinite(val) ? clamp(val, 0, 1) : fallback;
}

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
  const shadowsEnabled =
    typeof raw.shadowsEnabled === 'boolean'
      ? raw.shadowsEnabled
      : DEFAULT_GAME_SETTINGS.shadowsEnabled;
  const graphicsQuality: GraphicsQuality =
    raw.graphicsQuality === 'low' ||
    raw.graphicsQuality === 'medium' ||
    raw.graphicsQuality === 'high'
      ? raw.graphicsQuality
      : lightingQuality === 'performance' && !shadowsEnabled
        ? 'low'
        : lightingQuality === 'performance'
          ? 'medium'
          : DEFAULT_GAME_SETTINGS.graphicsQuality;
  const horrorAudioLevel: HorrorAudioLevel =
    raw.horrorAudioLevel === 'full' ||
    raw.horrorAudioLevel === 'reduced' ||
    raw.horrorAudioLevel === 'off'
      ? raw.horrorAudioLevel
      : DEFAULT_GAME_SETTINGS.horrorAudioLevel;
  const dayLengthSeconds =
    raw.dayLengthSeconds === 120 || raw.dayLengthSeconds === 300 || raw.dayLengthSeconds === 900
      ? raw.dayLengthSeconds
      : DEFAULT_GAME_SETTINGS.dayLengthSeconds;

  return {
    language,
    masterVolume: sanitizeVolume(raw.masterVolume, DEFAULT_GAME_SETTINGS.masterVolume),
    ambientVolume: sanitizeVolume(raw.ambientVolume, DEFAULT_GAME_SETTINGS.ambientVolume),
    sfxVolume: sanitizeVolume(raw.sfxVolume, DEFAULT_GAME_SETTINGS.sfxVolume),
    musicVolume: sanitizeVolume(raw.musicVolume, DEFAULT_GAME_SETTINGS.musicVolume),
    dialogueVolume: sanitizeVolume(raw.dialogueVolume, DEFAULT_GAME_SETTINGS.dialogueVolume),
    horrorAudioLevel,
    muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_GAME_SETTINGS.muted,
    mouseSensitivity:
      typeof raw.mouseSensitivity === 'number' && Number.isFinite(raw.mouseSensitivity)
        ? clamp(raw.mouseSensitivity, 0.3, 2.5)
        : DEFAULT_GAME_SETTINGS.mouseSensitivity,
    shadowsEnabled,
    lightingQuality,
    graphicsQuality,
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
    if (!raw) {
      return {
        ...DEFAULT_GAME_SETTINGS,
        graphicsQuality: detectDefaultGraphicsQuality(),
      };
    }
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
