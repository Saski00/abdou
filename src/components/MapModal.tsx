import { useState } from 'react';
import { Compass, KeyRound, MapPin, Navigation, Store, Target, X } from 'lucide-react';
import { ENTERABLE_BUILDINGS } from '../assets/maps/buildingLayouts';
import { NEIGHBORHOOD_MAP } from '../assets/maps/neighborhoodMap';
import { useViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot, WorldRegionId } from '../game/types';
import {
  LOCATION_BY_ID,
  WORLD_LOCATIONS,
  WORLD_REGIONS,
  WorldLocationDef,
  getLocalizedBearingLabel,
  getLocalizedLocation,
  getLocalizedRegion,
} from '../game/worldLocations';
import { formatTpl, tDanger, tMission, useI18n } from '../i18n';

interface MapModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onClose: () => void;
}

const WORLD_MIN_X = -50;
const WORLD_MAX_X = 50;
const WORLD_MIN_Z = -51;
const WORLD_MAX_Z = 51;

function toMapPctX(x: number): number {
  return ((x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * 100;
}

function toMapPctY(z: number): number {
  return ((z - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * 100;
}

function toMapX(x: number): number {
  return Math.max(4, Math.min(96, toMapPctX(x)));
}

function toMapY(z: number): number {
  return Math.max(4, Math.min(96, toMapPctY(z)));
}

const REGION_MAP_ANCHORS: { id: WorldRegionId; x: number; z: number }[] = [
  { id: 'main_street', x: -16, z: 1.5 },
  { id: 'residential_district', x: -30, z: -13.5 },
  { id: 'commercial_district', x: 15, z: -19.5 },
  { id: 'industrial_zone', x: 32, z: 22.5 },
  { id: 'military_checkpoint', x: 0, z: -39.5 },
  { id: 'research_facility', x: 31, z: -36.5 },
  { id: 'police_station', x: -22, z: 39.5 },
  { id: 'medical_district', x: 24, z: 39.5 },
];

export function MapModal({ hud, isTouchMode, onClose }: MapModalProps) {
  const { dir, t } = useI18n();
  const mapCopy = t.mapModal;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const isLandscape = viewport.orientation === 'landscape';
  const discoveredSet = new Set(hud.discoveredLocationIds);
  const discoveredRegionSet = new Set(hud.discoveredRegionIds);
  const discoveredLocations = WORLD_LOCATIONS.filter((loc) => discoveredSet.has(loc.id)).map(
    (loc) => getLocalizedLocation(loc.id) ?? loc
  );
  const totalCount = WORLD_LOCATIONS.length;
  const undiscoveredCount = Math.max(0, totalCount - discoveredLocations.length);
  const playableBuildings = [
    ...ENTERABLE_BUILDINGS.map((b) => ({ id: b.id, x: b.x, z: b.z, w: b.w, d: b.d })),
    ...NEIGHBORHOOD_MAP.buildings
      .filter((b) => b.x >= -46 && b.x <= 46 && b.z >= -48 && b.z <= 48)
      .map((b) => ({ id: b.id, x: b.x, z: b.z, w: b.w, d: b.d })),
  ];

  const initialSelected =
    (hud.currentLocationId && discoveredSet.has(hud.currentLocationId)
      ? hud.currentLocationId
      : null) ??
    discoveredLocations[0]?.id ??
    'last_shop';

  const [selectedId, setSelectedId] = useState<string>(initialSelected);
  const selectedLoc: WorldLocationDef | null =
    discoveredLocations.find((l) => l.id === selectedId) ?? discoveredLocations[0] ?? null;

  const playerPctX = toMapX(hud.playerX);
  const playerPctY = toMapY(hud.playerZ);
  const facingDeg = (-hud.playerYaw * 180) / Math.PI;
  const trackedMission = hud.missions.trackedMission;
  const trackedMissionLoc = trackedMission ? tMission(trackedMission.id) : null;
  const trackedLoc =
    trackedMission?.targetZoneId ? LOCATION_BY_ID[trackedMission.targetZoneId] ?? null : null;
  const trackedDx = trackedLoc ? trackedLoc.x - hud.playerX : 0;
  const trackedDz = trackedLoc ? trackedLoc.z - hud.playerZ : 0;
  const trackedDist = trackedLoc ? Math.round(Math.hypot(trackedDx, trackedDz)) : 0;
  const trackedBearing = trackedLoc ? getLocalizedBearingLabel(trackedDx, trackedDz) : '';

  const legendShopLabel = mapCopy.compactShop.replace(/[:：]\s*$/, '');
  const legendChartedLabel = mapCopy.compactCharted.replace(/[:：]\s*$/, '');
  const legendBlockLabel = mapCopy.compactBlock.replace(/[:：]\s*$/, '');

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/84 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-4xl max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2.5' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="map-modal-title"
                className={`font-display font-bold tracking-wider text-stone-100 leading-none truncate uppercase ${
                  isCompactLandscape ? 'text-xl' : 'text-2xl sm:text-3xl'
                }`}
              >
                {mapCopy.title}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1 truncate">
              {hud.currentRegionName && (
                <>
                  <span className="text-amber-300 font-semibold">{hud.currentRegionName}</span>
                  <span className="text-stone-600"> · </span>
                </>
              )}
              <span className="text-stone-200 font-medium">{hud.currentLocationName}</span> ·{' '}
              <span className="font-mono-tabular text-sky-300">
                {formatTpl(mapCopy.chartedRatio, {
                  done: discoveredLocations.length,
                  total: totalCount,
                })}
              </span>
              <span className="hidden sm:inline text-stone-600"> · </span>
              <span className="hidden sm:inline font-mono-tabular text-stone-300">
                {formatTpl(mapCopy.dayTimeWeather, {
                  day: hud.day,
                  time: hud.formattedTime,
                  phase: hud.dayPhaseLabel,
                  weather: hud.weatherLabel,
                })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={mapCopy.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div
          className={`flex-1 min-h-0 gap-3 ${
            isLandscape
              ? 'grid grid-cols-[auto_1fr] items-stretch overflow-hidden p-3 sm:p-4'
              : 'overflow-y-auto touch-pan-y p-4 grid grid-cols-1 gap-4'
          }`}
        >
          {/* Top-down Street, Alley, Parking & Discovered POI Chart (always LTR spatial coordinates) */}
          <div
            dir="ltr"
            className={`relative aspect-[100/102] rounded-lg border border-stone-700/80 bg-[#0b1018] overflow-hidden select-none ${
              isCompactLandscape
                ? 'h-full w-auto max-w-[48vw]'
                : isLandscape
                  ? 'w-[min(420px,calc(92dvh-160px))] max-w-full'
                  : 'w-full max-w-[440px] mx-auto'
            }`}
          >
            {/* Subtle Map Grid */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                backgroundSize: '12.5% 12.5%',
              }}
            />

            {/* Roads, Alleys & Parking Lots from NEIGHBORHOOD_MAP */}
            {NEIGHBORHOOD_MAP.roads.map((r, idx) => {
              const left = Math.max(0, toMapPctX(r.x - r.w * 0.5));
              const right = Math.min(100, toMapPctX(r.x + r.w * 0.5));
              const top = Math.max(0, toMapPctY(r.z - r.d * 0.5));
              const bottom = Math.min(100, toMapPctY(r.z + r.d * 0.5));
              const width = Math.max(1, right - left);
              const height = Math.max(1, bottom - top);

              const kindClass =
                r.roadKind === 'parking'
                  ? 'bg-[#1a293d] border border-amber-400/35 flex items-center justify-center'
                  : r.roadKind === 'alley'
                    ? 'bg-[#1a2434] border border-stone-600/65'
                    : 'bg-[#263244] border border-stone-500/55';

              return (
                <div
                  key={`road_${idx}`}
                  aria-hidden="true"
                  className={`absolute ${kindClass}`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                >
                  {r.roadKind === 'parking' && (
                    <span className="text-[8px] font-mono-tabular font-bold text-amber-300/75">
                      P
                    </span>
                  )}
                </div>
              );
            })}

            {/* Building Architectural Footprints */}
            {playableBuildings.map((b) => {
              const left = Math.max(0, toMapPctX(b.x - b.w * 0.5));
              const right = Math.min(100, toMapPctX(b.x + b.w * 0.5));
              const top = Math.max(0, toMapPctY(b.z - b.d * 0.5));
              const bottom = Math.min(100, toMapPctY(b.z + b.d * 0.5));
              const width = Math.max(1.5, right - left);
              const height = Math.max(1.5, bottom - top);
              const isSafe = b.id === 'last_shop';
              const isKnown = discoveredSet.has(b.id);

              return (
                <div
                  key={`bld_${b.id}`}
                  aria-hidden="true"
                  className={`absolute rounded-[2px] border ${
                    isSafe
                      ? 'bg-amber-950/50 border-amber-400/70'
                      : isKnown
                        ? 'bg-sky-950/45 border-sky-400/65'
                        : 'bg-[#141c28]/90 border-stone-600/55'
                  }`}
                  style={{
                    left: `${left}%`,
                    top: `${top}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                  }}
                />
              );
            })}

            {/* Centerline Dashes for Major Arteries */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 border-t border-dashed border-amber-400/25 pointer-events-none"
              style={{ top: `${toMapPctY(0)}%` }}
            />
            <div
              aria-hidden="true"
              className="absolute inset-y-0 border-l border-dashed border-amber-400/25 pointer-events-none"
              style={{ left: `${toMapPctX(0)}%` }}
            />

            {/* Road Corridor Names */}
            <div
              aria-hidden="true"
              className="absolute left-2 -translate-y-1/2 text-[8px] sm:text-[9px] font-mono-tabular uppercase tracking-widest text-stone-300/85 pointer-events-none"
              style={{ top: `${toMapPctY(0)}%` }}
            >
              {mapCopy.roadLabels.mainBlvd}
            </div>
            <div
              aria-hidden="true"
              className="absolute left-2 -translate-y-1/2 text-[8px] font-mono-tabular uppercase tracking-wider text-stone-300/75 pointer-events-none"
              style={{ top: `${toMapPctY(-33)}%` }}
            >
              {mapCopy.roadLabels.northSt}
            </div>
            <div
              aria-hidden="true"
              className="absolute left-2 -translate-y-1/2 text-[8px] font-mono-tabular uppercase tracking-wider text-stone-300/75 pointer-events-none"
              style={{ top: `${toMapPctY(34.5)}%` }}
            >
              {mapCopy.roadLabels.southSt}
            </div>
            <div
              aria-hidden="true"
              className="absolute bottom-1.5 -translate-x-1/2 text-[8px] font-mono-tabular uppercase tracking-wider text-stone-300/85 pointer-events-none"
              style={{ left: `${toMapPctX(0)}%` }}
            >
              {mapCopy.roadLabels.centralAve}
            </div>
            <div
              aria-hidden="true"
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono-tabular text-sky-300/60 pointer-events-none whitespace-nowrap"
              style={{ left: `${toMapPctX(-22.8)}%`, top: `${toMapPctY(27.5)}%` }}
            >
              {mapCopy.roadLabels.mapleAlley}
            </div>
            <div
              aria-hidden="true"
              className="absolute -translate-x-1/2 -translate-y-1/2 text-[7px] font-mono-tabular text-sky-300/60 pointer-events-none whitespace-nowrap"
              style={{ left: `${toMapPctX(22.8)}%`, top: `${toMapPctY(-17.5)}%` }}
            >
              {mapCopy.roadLabels.freightAlley}
            </div>

            {/* Subtle Region Labels */}
            {REGION_MAP_ANCHORS.map((reg) => {
              const regionKnown = discoveredRegionSet.has(reg.id);
              const regLoc = getLocalizedRegion(reg.id);
              return (
                <div
                  key={reg.id}
                  aria-hidden="true"
                  style={{ left: `${toMapX(reg.x)}%`, top: `${toMapY(reg.z)}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 text-[8px] sm:text-[9px] font-mono-tabular uppercase tracking-widest pointer-events-none whitespace-nowrap ${
                    regionKnown ? 'text-amber-300/80 font-semibold' : 'text-slate-400/60'
                  }`}
                >
                  {regLoc.mapShortLabel ?? regLoc.name}
                </div>
              );
            })}

            {/* Discovered Locations ONLY */}
            {discoveredLocations.map((loc) => {
              const isSafe = loc.category === 'safe_base';
              const isSelected = selectedLoc?.id === loc.id;
              const isCurrent = hud.currentLocationId === loc.id;
              const left = toMapX(loc.x);
              const top = toMapY(loc.z);

              return (
                <button
                  key={loc.id}
                  type="button"
                  onClick={() => setSelectedId(loc.id)}
                  style={{ left: `${left}%`, top: `${top}%` }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-1.5 py-0.5 text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md whitespace-nowrap ${
                    isSafe
                      ? isSelected
                        ? 'bg-amber-500 border-amber-200 text-stone-950 z-20 scale-105'
                        : 'bg-[#2a1f10]/95 border-amber-500/80 text-amber-200 hover:border-amber-300 z-10'
                      : isSelected
                        ? 'bg-sky-400 border-sky-100 text-stone-950 z-20 scale-105'
                        : isCurrent
                          ? 'bg-[#172334] border-sky-400 text-sky-200 z-10'
                          : 'bg-[#141b27]/95 border-stone-500/80 text-stone-200 hover:border-stone-300 z-10'
                  }`}
                >
                  {isSafe ? (
                    <Store className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <MapPin className="w-2.5 h-2.5 shrink-0" aria-hidden="true" />
                  )}
                  <span>{loc.shortName}</span>
                </button>
              );
            })}

            {/* Tracked Objective Signal Lead */}
            {trackedLoc && (
              <div
                aria-label={mapCopy.trackedLeadAria}
                style={{ left: `${toMapX(trackedLoc.x)}%`, top: `${toMapY(trackedLoc.z)}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-none flex flex-col items-center"
              >
                <div className="w-8 h-8 rounded-full border-2 border-dashed border-amber-400/90 bg-amber-500/10 flex items-center justify-center">
                  {!discoveredSet.has(trackedLoc.id) && (
                    <Target className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                  )}
                </div>
                {!discoveredSet.has(trackedLoc.id) && (
                  <span className="mt-0.5 text-[9px] font-mono-tabular font-semibold text-amber-300 bg-[#0b1018]/90 px-1 rounded whitespace-nowrap">
                    {formatTpl(mapCopy.leadBearingDist, {
                      bearing: trackedBearing,
                      dist: trackedDist,
                    })}
                  </span>
                )}
              </div>
            )}

            {/* Player Current Position & Heading */}
            <div
              aria-label={mapCopy.yourPosAria}
              style={{
                left: `${playerPctX}%`,
                top: `${playerPctY}%`,
                transform: `translate(-50%, -50%) rotate(${facingDeg}deg)`,
              }}
              className="absolute z-30 pointer-events-none flex items-center justify-center"
            >
              <div className="w-6 h-6 rounded-full bg-emerald-400/20 border border-emerald-400/70 flex items-center justify-center">
                <Navigation className="w-3.5 h-3.5 text-emerald-300 fill-emerald-300" />
              </div>
            </div>

            {/* Compass Rose Label */}
            <div className="absolute top-2 right-2 bg-[#0b0f17]/90 border border-stone-700/80 rounded px-2 py-1 text-[10px] font-mono-tabular text-stone-300 pointer-events-none">
              {mapCopy.compassLabel}
            </div>

            {/* Compact Map Legend */}
            <div className="absolute top-2 left-2 bg-[#0b0f17]/90 border border-stone-700/80 rounded px-2 py-1 flex items-center gap-2 text-[9px] font-mono-tabular text-stone-300 pointer-events-none">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-amber-400 inline-block rounded-[1px]" />
                {legendShopLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-sky-400 inline-block rounded-[1px]" />
                {legendChartedLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 bg-[#1a2232] border border-stone-500 inline-block rounded-[1px]" />
                {legendBlockLabel}
              </span>
            </div>
          </div>

          {/* Side Panel: Selected Location Details, Keys & Discovered List */}
          <div
            className={`flex flex-col gap-2.5 min-h-0 ${
              isLandscape ? 'overflow-y-auto touch-pan-y pe-1' : ''
            }`}
          >
            {selectedLoc && (
              <div className="rounded-lg border border-stone-700/80 bg-[#141b27] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-amber-400 truncate">
                    {getLocalizedRegion(selectedLoc.regionId).name} ·{' '}
                    {selectedLoc.category === 'safe_base'
                      ? mapCopy.catSafeBase
                      : selectedLoc.category === 'building'
                        ? mapCopy.catInterior
                        : mapCopy.catLandmark}
                  </span>
                  <span
                    className={`text-[10px] font-mono-tabular font-semibold shrink-0 ${
                      selectedLoc.dangerLevel === 'safe'
                        ? 'text-emerald-300'
                        : selectedLoc.dangerLevel === 'high'
                          ? 'text-rose-300'
                          : selectedLoc.dangerLevel === 'moderate'
                            ? 'text-amber-300'
                            : 'text-sky-300'
                    }`}
                  >
                    {tDanger(selectedLoc.dangerLevel)}
                  </span>
                </div>
                <div className="text-base font-bold text-stone-100">{selectedLoc.name}</div>
                <div className="text-xs text-stone-400">
                  {selectedLoc.subtitle} ·{' '}
                  <span className="text-sky-300 font-medium">{selectedLoc.lootFocus}</span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed pt-1">
                  {selectedLoc.description}
                </p>
                {selectedLoc.discoveryReward && (
                  <div className="pt-1 text-[11px] font-mono-tabular text-emerald-300">
                    {formatTpl(mapCopy.discoveryBonusClaimed, {
                      label: selectedLoc.discoveryReward.label,
                    })}
                  </div>
                )}
              </div>
            )}

            {trackedMission && (
              <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  <span>
                    {formatTpl(mapCopy.trackedLeadHeader, {
                      chapter: trackedMissionLoc?.chapterLabel ?? trackedMission.chapterLabel,
                    })}
                  </span>
                  {trackedLoc && (
                    <span className="text-sky-300">
                      {trackedBearing} · <bdi dir="ltr">{trackedDist}m</bdi>
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-stone-100 mt-0.5">
                  {trackedMissionLoc?.title ?? trackedMission.title}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                  {(() => {
                    const nextObj = trackedMission.objectives.find((o) => !o.completed);
                    if (nextObj) {
                      return trackedMissionLoc?.objectiveLabels[nextObj.id] ?? nextObj.description;
                    }
                    return trackedMissionLoc?.description ?? trackedMission.description;
                  })()}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-2.5 space-y-1.5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
                <span>
                  {formatTpl(mapCopy.areasHeader, {
                    done: hud.discoveredRegionIds.length,
                    total: WORLD_REGIONS.length,
                  })}
                </span>
                <span className="font-mono-tabular">
                  {undiscoveredCount > 0
                    ? formatTpl(mapCopy.unexploredCount, { count: undiscoveredCount })
                    : mapCopy.allMapped}
                </span>
              </div>
              <div className="grid grid-cols-1 gap-1">
                {discoveredLocations.map((loc) => {
                  const active = selectedLoc?.id === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => setSelectedId(loc.id)}
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-md border text-start flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1a2232] border-amber-500/70 text-stone-100'
                          : 'bg-[#10151f] border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-semibold truncate">{loc.name}</div>
                        <div className="text-[10px] text-stone-500 truncate">
                          {getLocalizedRegion(loc.regionId).name} · {loc.lootFocus}
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-400 font-mono-tabular shrink-0">
                        {tDanger(loc.dangerLevel)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-4 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs text-stone-400 font-mono-tabular truncate">
              {isTouchMode ? mapCopy.footerTouch : mapCopy.footerDesktop}
            </span>
            {hud.collectedKeyIds.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono-tabular text-amber-300 shrink-0">
                <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                {formatTpl(mapCopy.keysRatio, { count: hud.collectedKeyIds.length })}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            {mapCopy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
