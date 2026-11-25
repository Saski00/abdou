import { useSyncExternalStore } from 'react';
import {
  DayPhase,
  EmployeeProfession,
  LocationDangerLevel,
  ResourceId,
  WeatherKind,
  WorldRegionId,
} from '../game/types';
import { AR_TRANSLATIONS } from './ar';
import { EN_TRANSLATIONS } from './en';
import {
  ClueTranslation,
  ContextZoneTranslation,
  DecorationTranslation,
  ExaminePropTranslation,
  FurnitureTranslation,
  GameLanguage,
  GuidanceHintTranslation,
  MissionTranslation,
  ProfessionTranslation,
  RecipeTranslation,
  ResourceTranslation,
  SearchPropTranslation,
  ShopLevelTranslation,
  StorageTierTranslation,
  StoryObjectTranslation,
  SurvivorTranslation,
  TextDirection,
  TranslationCatalog,
  VehicleTranslation,
  WorldLocationTranslation,
  WorldRegionTranslation,
} from './types';

export type { GameLanguage, TextDirection, TranslationCatalog };

const CATALOGS: Record<GameLanguage, TranslationCatalog> = {
  en: EN_TRANSLATIONS,
  ar: AR_TRANSLATIONS,
};

let currentLanguage: GameLanguage = 'en';
const listeners = new Set<() => void>();

export function sanitizeLanguage(raw: unknown): GameLanguage {
  return raw === 'ar' ? 'ar' : 'en';
}

export function getLanguage(): GameLanguage {
  return currentLanguage;
}

export function getDirection(lang: GameLanguage = currentLanguage): TextDirection {
  return CATALOGS[lang].dir;
}

export function isRtl(lang: GameLanguage = currentLanguage): boolean {
  return CATALOGS[lang].dir === 'rtl';
}

export function getTranslations(lang: GameLanguage = currentLanguage): TranslationCatalog {
  return CATALOGS[lang];
}

export function applyDocumentLanguage(lang: GameLanguage = currentLanguage): void {
  if (typeof document === 'undefined') return;
  const cat = CATALOGS[lang];
  const root = document.documentElement;
  if (root.lang !== cat.lang) root.lang = cat.lang;
  if (root.dir !== cat.dir) root.dir = cat.dir;
  document.title = cat.meta.appTitle;

  const metaDesc = document.querySelector('meta[name="description"]');
  if (metaDesc) metaDesc.setAttribute('content', cat.meta.appDescription);
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', cat.meta.appTitle);
  const ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', cat.meta.appDescription);
}

export function setLanguage(next: GameLanguage): GameLanguage {
  const clean = sanitizeLanguage(next);
  const changed = clean !== currentLanguage;
  currentLanguage = clean;
  applyDocumentLanguage(clean);
  if (changed) {
    for (const listener of listeners) {
      listener();
    }
  }
  return currentLanguage;
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useI18n() {
  const lang = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage);
  const t = CATALOGS[lang];
  return {
    lang,
    dir: t.dir,
    rtl: t.dir === 'rtl',
    t,
  };
}

export function formatTpl(
  template: string,
  vars: Record<string, string | number | undefined | null>
): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key: string) => {
    const val = vars[key];
    return val === undefined || val === null ? '' : String(val);
  });
}

export const formatTemplate = formatTpl;

export function tResource(
  id: ResourceId,
  lang: GameLanguage = currentLanguage
): ResourceTranslation {
  return CATALOGS[lang].resources[id];
}

export function tResourceName(
  id: ResourceId,
  count = 1,
  lang: GameLanguage = currentLanguage
): string {
  const res = CATALOGS[lang].resources[id];
  return count === 1 ? res.name : res.pluralName;
}

export function tRecipe(
  id: string,
  fallback?: RecipeTranslation,
  lang: GameLanguage = currentLanguage
): RecipeTranslation {
  return (
    CATALOGS[lang].recipes[id] ??
    fallback ?? {
      name: id,
      description: '',
    }
  );
}

export function tDayPhase(
  phase: DayPhase,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].dayPhases[phase] ?? phase;
}

export function tWeather(
  weather: WeatherKind,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].weathers[weather] ?? weather;
}

export function tDanger(
  danger: LocationDangerLevel,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].dangerLevels[danger] ?? danger;
}

export function tBearing(
  bearing: string,
  lang: GameLanguage = currentLanguage
): string {
  const key = bearing as keyof TranslationCatalog['bearings'];
  return CATALOGS[lang].bearings[key] ?? bearing;
}

export function tShopLevel(
  level: number,
  lang: GameLanguage = currentLanguage
): ShopLevelTranslation {
  return CATALOGS[lang].shopLevels[level] ?? CATALOGS[lang].shopLevels[1];
}

export function tStorageTier(
  tier: number,
  lang: GameLanguage = currentLanguage
): StorageTierTranslation | null {
  return CATALOGS[lang].storageTiers[tier] ?? null;
}

export function tDecoration(
  id: string,
  fallbackName = '',
  fallbackDesc = '',
  fallbackCategory = '',
  lang: GameLanguage = currentLanguage
): DecorationTranslation {
  return (
    CATALOGS[lang].decorations[id] ?? {
      name: fallbackName || id,
      description: fallbackDesc,
      category: fallbackCategory,
    }
  );
}

export function tProfession(
  prof: EmployeeProfession,
  lang: GameLanguage = currentLanguage
): ProfessionTranslation {
  return CATALOGS[lang].professions[prof];
}

export function tSurvivor(
  id: string,
  lang: GameLanguage = currentLanguage
): SurvivorTranslation | null {
  return CATALOGS[lang].survivors[id] ?? null;
}

export function tMission(
  id: string,
  lang: GameLanguage = currentLanguage
): MissionTranslation | null {
  return CATALOGS[lang].missions[id] ?? null;
}

export function tClue(
  id: string,
  lang: GameLanguage = currentLanguage
): ClueTranslation | null {
  return CATALOGS[lang].clues[id] ?? null;
}

export function tStoryObject(
  id: string,
  lang: GameLanguage = currentLanguage
): StoryObjectTranslation | null {
  return CATALOGS[lang].storyObjects[id] ?? null;
}

export function tRegion(
  id: WorldRegionId,
  lang: GameLanguage = currentLanguage
): WorldRegionTranslation {
  return CATALOGS[lang].regions[id];
}

export function tLocation(
  id: string,
  lang: GameLanguage = currentLanguage
): WorldLocationTranslation | null {
  return CATALOGS[lang].locations[id] ?? null;
}

export function tContextZone(
  id: string,
  lang: GameLanguage = currentLanguage
): ContextZoneTranslation | null {
  return CATALOGS[lang].contextZones[id] ?? null;
}

export function tDoorName(
  id: string,
  fallback: string,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].doors[id] ?? fallback;
}

export function tLockedHint(
  keyOrToolId: string | undefined,
  fallback?: string,
  lang: GameLanguage = currentLanguage
): string {
  if (keyOrToolId && CATALOGS[lang].lockedHints[keyOrToolId]) {
    return CATALOGS[lang].lockedHints[keyOrToolId];
  }
  return fallback ?? '';
}

export function tContainerName(
  id: string,
  fallback: string,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].containers[id] ?? fallback;
}

export function tKeyName(
  id: string,
  fallback: string,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].keys[id] ?? fallback;
}

export function tShopStationName(
  id: string,
  fallback: string,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].shopStations[id] ?? fallback;
}

export function tVehicle(
  id: string,
  lang: GameLanguage = currentLanguage
): VehicleTranslation | null {
  return CATALOGS[lang].vehicles[id] ?? null;
}

export function tWorkbenchName(
  id: string,
  fallback: string,
  lang: GameLanguage = currentLanguage
): string {
  return CATALOGS[lang].workbenches[id] ?? fallback;
}

export function tSearchProp(
  id: string,
  lang: GameLanguage = currentLanguage
): SearchPropTranslation | null {
  return CATALOGS[lang].searchProps[id] ?? null;
}

export function tExamineProp(
  id: string,
  lang: GameLanguage = currentLanguage
): ExaminePropTranslation | null {
  return CATALOGS[lang].examineProps[id] ?? null;
}

export function tFurniture(
  id: string,
  lang: GameLanguage = currentLanguage
): FurnitureTranslation | null {
  return CATALOGS[lang].furniture[id] ?? null;
}

export function tGuidanceHint(
  id: string,
  lang: GameLanguage = currentLanguage
): GuidanceHintTranslation | null {
  return CATALOGS[lang].guidanceHints[id] ?? null;
}

export function tWeaponLabel(
  raw?: string,
  lang: GameLanguage = currentLanguage
): string {
  if (!raw || raw === 'Steel Pipe') {
    return CATALOGS[lang].gameMessages.locationsFallback.weaponSteelPipe;
  }
  return raw;
}
