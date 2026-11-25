import type { SerializedMissionState } from './missionSystem';
import type {
  EmployeeProfession,
  EmployeeStatus,
  InventoryState,
  WeatherKind,
} from './types';

export const SAVE_STORAGE_KEY = 'last_shop_save_v1';
export const CURRENT_SAVE_VERSION = 1;

export interface SavedPlayerState {
  x: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface SavedSurvivalState {
  health: number;
  hunger: number;
  thirst: number;
  energy: number;
  isResting: boolean;
}

export interface SavedTimeWeatherState {
  day: number;
  timeOfDay: number;
  weather: WeatherKind;
}

export interface SavedEconomyState {
  money: number;
  shopLevel: number;
  storageTier: number;
  ownedDecorations: string[];
  shopManualOpen: boolean;
  shopStock: InventoryState;
  shopStorage: InventoryState;
  totalSalesCount: number;
  totalRevenueEarned: number;
  customerSalesCount: number;
  customerItemsSold: number;
  customerRevenueEarned: number;
}

export interface SavedEmployeeEntry {
  id: string;
  survivorId: string;
  name: string;
  variant: number;
  profession: EmployeeProfession;
  status: EmployeeStatus;
  health: number;
  recruitedDay: number;
  unpaidReason: string | null;
}

export interface SavedStaffState {
  recruitedSurvivorIds: string[];
  employees: SavedEmployeeEntry[];
  nextSalaryInSeconds: number;
  nextEmployeeSeq: number;
  lastSalaryNotice: string | null;
}

export interface SavedWorldInteractablesState {
  collectedResourceIds: string[];
  openDoorIds: string[];
  searchedContainerIds: string[];
}

export interface SavedZombieState {
  zombiesDefeated: number;
  deadZombieIds: string[];
  spawnedSurges: {
    surgeId: string;
    zombies: { id: string; x: number; z: number; health: number; dead: boolean }[];
  }[];
}

export interface SavedGameData {
  version: number;
  savedAtIso: string;
  day: number;
  formattedTime: string;
  activeMissionTitle: string;
  player: SavedPlayerState;
  inventory: InventoryState;
  survival: SavedSurvivalState;
  timeWeather: SavedTimeWeatherState;
  economy: SavedEconomyState;
  staff: SavedStaffState;
  world: SavedWorldInteractablesState;
  zombies: SavedZombieState;
  missions: SerializedMissionState;
  discoveredLocationIds?: string[];
  guidance?: {
    completedIds: string[];
    dismissedIds: string[];
  };
}

export interface SavedGameSummary {
  day: number;
  formattedTime: string;
  activeMissionTitle: string;
  money: number;
  shopLevel: number;
  savedAtIso: string;
}

function getStorage(): Storage | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    // Ignore storage unavailability (SSR / blocked cookies)
  }
  return null;
}

export function serializeSaveData(data: SavedGameData): string {
  return JSON.stringify(data);
}

export function deserializeSaveData(raw: string | null): SavedGameData | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedGameData>;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.version !== 'number' || parsed.version > CURRENT_SAVE_VERSION) {
      return null;
    }
    if (!parsed.player || !parsed.inventory || !parsed.economy || !parsed.missions) {
      return null;
    }
    return parsed as SavedGameData;
  } catch {
    return null;
  }
}

export function saveGameToStorage(data: SavedGameData): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(SAVE_STORAGE_KEY, serializeSaveData(data));
    return true;
  } catch {
    return false;
  }
}

export function loadGameFromStorage(): SavedGameData | null {
  const storage = getStorage();
  if (!storage) return null;
  return deserializeSaveData(storage.getItem(SAVE_STORAGE_KEY));
}

export function getSavedGameSummary(): SavedGameSummary | null {
  const data = loadGameFromStorage();
  if (!data) return null;
  return {
    day: Math.max(1, Math.floor(data.day || 1)),
    formattedTime: data.formattedTime || '08:00',
    activeMissionTitle: data.activeMissionTitle || 'District 04 Survivor',
    money: Math.round(data.economy?.money ?? 50),
    shopLevel: Math.max(1, Math.floor(data.economy?.shopLevel ?? 1)),
    savedAtIso: data.savedAtIso || '',
  };
}

export function hasSavedGame(): boolean {
  return loadGameFromStorage() !== null;
}

export function clearSavedGame(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore
  }
}
