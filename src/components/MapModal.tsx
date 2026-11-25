import { useState } from 'react';
import { Compass, MapPin, Navigation, Store, Target, X } from 'lucide-react';
import { HudSnapshot } from '../game/types';
import {
  LOCATION_BY_ID,
  WORLD_LOCATIONS,
  WorldLocationDef,
  getBearingLabel,
} from '../game/worldLocations';

interface MapModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onClose: () => void;
}

const WORLD_MIN_X = -46;
const WORLD_MAX_X = 46;
const WORLD_MIN_Z = -38;
const WORLD_MAX_Z = 38;

function toMapX(x: number): number {
  return Math.max(4, Math.min(96, ((x - WORLD_MIN_X) / (WORLD_MAX_X - WORLD_MIN_X)) * 100));
}

function toMapY(z: number): number {
  return Math.max(4, Math.min(96, ((z - WORLD_MIN_Z) / (WORLD_MAX_Z - WORLD_MIN_Z)) * 100));
}

export function MapModal({ hud, isTouchMode, onClose }: MapModalProps) {
  const discoveredSet = new Set(hud.discoveredLocationIds);
  const discoveredLocations = WORLD_LOCATIONS.filter((loc) => discoveredSet.has(loc.id));
  const totalCount = WORLD_LOCATIONS.length;
  const undiscoveredCount = Math.max(0, totalCount - discoveredLocations.length);

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
  const trackedLoc =
    trackedMission?.targetZoneId ? LOCATION_BY_ID[trackedMission.targetZoneId] ?? null : null;
  const trackedDx = trackedLoc ? trackedLoc.x - hud.playerX : 0;
  const trackedDz = trackedLoc ? trackedLoc.z - hud.playerZ : 0;
  const trackedDist = trackedLoc ? Math.round(Math.hypot(trackedDx, trackedDz)) : 0;
  const trackedBearing = trackedLoc ? getBearingLabel(trackedDx, trackedDz) : '';

  return (
    <div
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
      <div className="w-full max-w-3xl max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3.5 sm:px-6 sm:py-4 border-b border-stone-800 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="map-modal-title"
                className="font-display text-2xl sm:text-3xl font-bold tracking-wider text-stone-100 leading-none truncate"
              >
                DISTRICT 04 MAP
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 truncate">
              You are at: <span className="text-stone-200 font-medium">{hud.currentLocationName}</span> ·{' '}
              <span className="font-mono-tabular text-amber-300">
                {discoveredLocations.length}/{totalCount} Areas Discovered
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close neighborhood map"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto touch-pan-y p-4 sm:p-5 grid grid-cols-1 md:grid-cols-[1.35fr_1fr] gap-4">
          {/* Top-down Street & Discovered POI Chart */}
          <div className="relative aspect-[92/76] w-full rounded-lg border border-stone-700/80 bg-[#0b1018] overflow-hidden select-none">
            {/* Subtle Map Grid */}
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage:
                  'linear-gradient(to right, #334155 1px, transparent 1px), linear-gradient(to bottom, #334155 1px, transparent 1px)',
                backgroundSize: '12.5% 14.28%',
              }}
            />

            {/* Main Blvd (East-West, z=0, d=14) */}
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 bg-[#1f2937] border-y border-stone-600/70 flex items-center justify-between px-3"
              style={{
                top: `${toMapY(-7)}%`,
                height: `${toMapY(7) - toMapY(-7)}%`,
              }}
            >
              <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-widest text-stone-400">
                Main Blvd
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono-tabular uppercase tracking-widest text-stone-400">
                Main Blvd
              </span>
            </div>

            {/* Central Ave (North-South, x=0, w=12) */}
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 bg-[#1f2937] border-x border-stone-600/70 flex flex-col justify-between items-center py-2"
              style={{
                left: `${toMapX(-6)}%`,
                width: `${toMapX(6) - toMapX(-6)}%`,
              }}
            >
              <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-stone-400">
                N
              </span>
              <span className="text-[9px] font-mono-tabular uppercase tracking-wider text-stone-400">
                S
              </span>
            </div>

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
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-md border px-2 py-1 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-md whitespace-nowrap ${
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
                    <Store className="w-3 h-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                  )}
                  <span>{loc.shortName}</span>
                </button>
              );
            })}

            {/* Tracked Objective Signal Lead (without revealing undiscovered place name) */}
            {trackedLoc && (
              <div
                aria-label="Tracked mission lead"
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
                    Lead · {trackedBearing} {trackedDist}m
                  </span>
                )}
              </div>
            )}

            {/* Player Current Position & Heading */}
            <div
              aria-label="Your current position"
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
              N ↑ · E →
            </div>
          </div>

          {/* Right Panel: Selected Location Details & Discovered List */}
          <div className="flex flex-col gap-3 min-h-0">
            {selectedLoc && (
              <div className="rounded-lg border border-stone-700/80 bg-[#141b27] p-3.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono-tabular uppercase tracking-wider text-amber-400">
                    {selectedLoc.category === 'safe_base'
                      ? 'Safe Haven'
                      : selectedLoc.category === 'building'
                        ? 'Explored Interior'
                        : 'Discovered Landmark'}
                  </span>
                  <span
                    className={`text-[10px] font-mono-tabular font-semibold ${
                      selectedLoc.dangerLevel === 'safe'
                        ? 'text-emerald-300'
                        : selectedLoc.dangerLevel === 'high'
                          ? 'text-rose-300'
                          : selectedLoc.dangerLevel === 'moderate'
                            ? 'text-amber-300'
                            : 'text-sky-300'
                    }`}
                  >
                    {selectedLoc.dangerLevel === 'safe'
                      ? 'Safe Zone'
                      : selectedLoc.dangerLevel === 'high'
                        ? 'High Risk'
                        : selectedLoc.dangerLevel === 'moderate'
                          ? 'Moderate Risk'
                          : 'Low Risk'}
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
              </div>
            )}

            {trackedMission && (
              <div className="rounded-lg border border-stone-800 bg-[#0c1018] px-3.5 py-2.5">
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400">
                  <span>Tracked Lead · {trackedMission.chapterLabel}</span>
                  {trackedLoc && (
                    <span className="text-sky-300">
                      {trackedBearing} · {trackedDist}m
                    </span>
                  )}
                </div>
                <div className="text-xs font-semibold text-stone-100 mt-0.5">
                  {trackedMission.title}
                </div>
                <div className="text-[11px] text-stone-400 mt-0.5 leading-snug">
                  {trackedMission.objectives.find((o) => !o.completed)?.description ??
                    trackedMission.description}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-stone-800 bg-[#0b0e15] p-2.5 space-y-1.5 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
                <span>Discovered Areas</span>
                <span className="font-mono-tabular">
                  {undiscoveredCount > 0 ? `${undiscoveredCount} Unexplored` : 'All Mapped'}
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
                      className={`min-h-[40px] px-2.5 py-1.5 rounded-md border text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1a2232] border-amber-500/70 text-stone-100'
                          : 'bg-[#10151f] border-stone-800 text-stone-300 hover:border-stone-600'
                      }`}
                    >
                      <span className="text-xs font-semibold truncate">{loc.name}</span>
                      <span className="text-[10px] text-stone-400 font-mono-tabular shrink-0">
                        {loc.dangerLevel === 'safe' ? 'Safe' : loc.dangerLevel}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 sm:px-6 border-t border-stone-800 flex items-center justify-between gap-4 shrink-0">
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode
              ? 'Explore streets and buildings to reveal them on your map'
              : 'Explore to chart new areas · N or Esc to close'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
