import { useEffect, useState } from 'react';
import {
  Backpack,
  BedDouble,
  ChevronDown,
  ChevronUp,
  CloudFog,
  CloudRain,
  Compass,
  Droplet,
  HeartPulse,
  Lightbulb,
  Map as MapIcon,
  MapPin,
  Moon,
  Pause,
  Sun,
  Sunrise,
  Sunset,
  Utensils,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { HudSnapshot, ResourceId } from '../game/types';
import { LOCATION_BY_ID, getBearingLabel } from '../game/worldLocations';

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  isPlaying: boolean;
  isTouchMode: boolean;
  isInventoryOpen: boolean;
  isMissionsOpen: boolean;
  isMapOpen: boolean;
  onPauseClick: () => void;
  onOpenInventory: () => void;
  onOpenMissions: () => void;
  onOpenMap: () => void;
  onDismissGuidance: (hintId: string) => void;
  onToggleMute: () => void;
  onConsumeItem: (resourceId: ResourceId) => void;
  onToggleRest: () => void;
}

export function HudOverlay({
  hud,
  muted,
  isPlaying,
  isTouchMode,
  isInventoryOpen,
  isMissionsOpen,
  isMapOpen,
  onPauseClick,
  onOpenInventory,
  onOpenMissions,
  onOpenMap,
  onDismissGuidance,
  onToggleMute,
  onConsumeItem,
  onToggleRest,
}: HudOverlayProps) {
  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const hungerPct = Math.max(0, Math.min(100, (hud.hunger / hud.maxHunger) * 100));
  const thirstPct = Math.max(0, Math.min(100, (hud.thirst / hud.maxThirst) * 100));
  const energyPct = Math.max(0, Math.min(100, (hud.energy / hud.maxEnergy) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));

  const healthCritical = hud.health <= 25;
  const hungerCritical = hud.hunger <= 25;
  const thirstCritical = hud.thirst <= 25;
  const energyLow = hud.energy <= 25;
  const anyCritical = healthCritical || hungerCritical || thirstCritical;

  const foodQty = hud.inventory.canned_food ?? 0;
  const waterQty = hud.inventory.water_bottle ?? 0;
  const medQty = hud.inventory.medical_supplies ?? 0;

  const [damageFlash, setDamageFlash] = useState(false);
  const [trackerCollapsed, setTrackerCollapsed] = useState(false);
  const trackedMission = hud.missions.trackedMission;

  useEffect(() => {
    if (hud.damagePulseId <= 0) return;
    setDamageFlash(true);
    const timer = window.setTimeout(() => setDamageFlash(false), 240);
    return () => window.clearTimeout(timer);
  }, [hud.damagePulseId]);

  return (
    <div
      className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between"
      style={{
        paddingTop: 'max(10px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(10px, env(safe-area-inset-left))',
        paddingRight: 'max(10px, env(safe-area-inset-right))',
      }}
    >
      {/* Subtle Damage Hit Edge Flash */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 pointer-events-none transition-opacity duration-200 ${
          damageFlash ? 'opacity-100' : 'opacity-0'
        }`}
        style={{
          boxShadow: 'inset 0 0 85px rgba(225, 29, 72, 0.55)',
        }}
      />

      {/* Subtle Center First-Person Reticle */}
      {isPlaying && !isInventoryOpen && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`rounded-full transition-all duration-100 ${
              hud.interactionPrompt
                ? 'w-2 h-2 bg-amber-400 ring-2 ring-amber-400/35'
                : 'w-1.5 h-1.5 bg-stone-100/75 ring-1 ring-black/60'
            }`}
          />
        </div>
      )}

      {/* Targeted Interaction Prompt below Reticle */}
      {isPlaying && !isInventoryOpen && hud.interactionPrompt && (
        <div className="fixed inset-x-0 top-[55%] flex justify-center px-4 pointer-events-none">
          <div className="bg-[#0e121a]/94 border border-amber-500/65 rounded-lg px-3.5 py-2 shadow-xl flex items-center gap-2.5">
            <span className="font-mono-tabular text-xs font-bold px-2 py-0.5 rounded bg-amber-500 text-stone-950">
              {isTouchMode ? 'TAP' : 'E'}
            </span>
            <div className="flex items-baseline gap-1.5 text-xs sm:text-sm">
              <span className="font-semibold text-amber-300">
                {hud.interactionPrompt.actionLabel}
              </span>
              <span className="text-stone-100 font-medium">
                {hud.interactionPrompt.name}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Top Section: Survival Needs + Clock + Feedback Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          {/* Top-Left: Survival Status Bars + Touch Quick Bar */}
          <div className="flex flex-col gap-1.5 items-start">
            <div
              className={`bg-[#0e121a]/92 border rounded-lg px-2.5 py-2 sm:px-3.5 sm:py-2.5 w-[150px] sm:w-[224px] shadow-lg transition-colors ${
                anyCritical ? 'border-rose-500/80' : 'border-stone-700/60'
              }`}
            >
              {/* Health */}
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <HeartPulse
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      healthCritical ? 'text-rose-400' : 'text-rose-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[10px] sm:text-xs font-semibold text-stone-200 truncate">
                    Health
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-[10px] sm:text-xs font-semibold ${
                    healthCritical ? 'text-rose-300' : 'text-stone-100'
                  }`}
                >
                  {hud.health}
                </span>
              </div>
              <div className="h-1.5 sm:h-2 w-full bg-stone-900 rounded-sm overflow-hidden border border-stone-800 mb-1.5 sm:mb-2">
                <div
                  className={`h-full transition-[width] duration-150 ease-out ${
                    healthCritical ? 'bg-rose-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              {/* Hunger */}
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Utensils
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      hungerCritical ? 'text-rose-400' : 'text-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] sm:text-xs font-medium truncate ${
                      hungerCritical ? 'text-rose-300 font-semibold' : 'text-stone-300'
                    }`}
                  >
                    {hud.hunger === 0 ? 'Starving' : 'Hunger'}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-[10px] sm:text-xs font-medium ${
                    hungerCritical ? 'text-rose-300 font-semibold' : 'text-stone-200'
                  }`}
                >
                  {hud.hunger}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden border border-stone-800 mb-1.5 sm:mb-2">
                <div
                  className={`h-full transition-[width] duration-150 ease-out ${
                    hungerCritical ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${hungerPct}%` }}
                />
              </div>

              {/* Thirst */}
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Droplet
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      thirstCritical ? 'text-rose-400' : 'text-sky-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] sm:text-xs font-medium truncate ${
                      thirstCritical ? 'text-rose-300 font-semibold' : 'text-stone-300'
                    }`}
                  >
                    {hud.thirst === 0 ? 'Dehydrated' : 'Thirst'}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-[10px] sm:text-xs font-medium ${
                    thirstCritical ? 'text-rose-300 font-semibold' : 'text-stone-200'
                  }`}
                >
                  {hud.thirst}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden border border-stone-800 mb-1.5 sm:mb-2">
                <div
                  className={`h-full transition-[width] duration-150 ease-out ${
                    thirstCritical ? 'bg-rose-500' : 'bg-sky-400'
                  }`}
                  style={{ width: `${thirstPct}%` }}
                />
              </div>

              {/* Energy */}
              <div className="flex items-center justify-between gap-1.5 mb-0.5">
                <div className="flex items-center gap-1 sm:gap-1.5 min-w-0">
                  <Zap
                    className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${
                      hud.isResting
                        ? 'text-emerald-300'
                        : energyLow
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`text-[10px] sm:text-xs font-medium truncate ${
                      hud.isResting
                        ? 'text-emerald-300 font-semibold'
                        : energyLow
                          ? 'text-amber-300 font-semibold'
                          : 'text-stone-300'
                    }`}
                  >
                    {hud.isResting ? 'Resting' : 'Energy'}
                  </span>
                </div>
                <span className="font-mono-tabular text-[10px] sm:text-xs font-medium text-stone-200">
                  {hud.energy}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden border border-stone-800 mb-1">
                <div
                  className={`h-full transition-[width] duration-150 ease-out ${
                    hud.isResting
                      ? 'bg-emerald-300'
                      : energyLow
                        ? 'bg-amber-500'
                        : 'bg-emerald-400'
                  }`}
                  style={{ width: `${energyPct}%` }}
                />
              </div>

              {/* Subtle Sprint Stamina Hairline */}
              <div
                className="h-[3px] w-full bg-stone-900 rounded-sm overflow-hidden"
                aria-label={`Sprint stamina ${hud.stamina}%`}
              >
                <div
                  className={`h-full transition-[width] duration-75 ease-linear ${
                    hud.isExhausted ? 'bg-amber-600/80' : 'bg-amber-300/80'
                  }`}
                  style={{ width: `${stamPct}%` }}
                />
              </div>
            </div>

            {/* Mobile Quick-Use & Rest Action Bar (clear of left joystick & right look pad) */}
            {isPlaying && !isInventoryOpen && isTouchMode && (
              <div
                className="flex items-center gap-1 pointer-events-auto"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => onConsumeItem('canned_food')}
                  aria-label={`Eat canned food (${foodQty} left)`}
                  className={`h-11 min-w-[44px] px-1.5 rounded-lg border flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ${
                    foodQty > 0 && hungerCritical
                      ? 'bg-amber-500 border-amber-200 text-stone-950 font-bold'
                      : foodQty > 0
                        ? 'bg-[#0e121a]/92 border-stone-600/80 text-amber-300'
                        : 'bg-[#0e121a]/75 border-stone-800 text-stone-500'
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono-tabular text-[11px] font-bold">{foodQty}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConsumeItem('water_bottle')}
                  aria-label={`Drink water bottle (${waterQty} left)`}
                  className={`h-11 min-w-[44px] px-1.5 rounded-lg border flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ${
                    waterQty > 0 && thirstCritical
                      ? 'bg-sky-400 border-sky-200 text-stone-950 font-bold'
                      : waterQty > 0
                        ? 'bg-[#0e121a]/92 border-stone-600/80 text-sky-300'
                        : 'bg-[#0e121a]/75 border-stone-800 text-stone-500'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono-tabular text-[11px] font-bold">{waterQty}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConsumeItem('medical_supplies')}
                  aria-label={`Use medical supplies (${medQty} left)`}
                  className={`h-11 min-w-[44px] px-1.5 rounded-lg border flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ${
                    medQty > 0 && hud.health < 75
                      ? 'bg-rose-500 border-rose-200 text-white font-bold'
                      : medQty > 0
                        ? 'bg-[#0e121a]/92 border-stone-600/80 text-rose-300'
                        : 'bg-[#0e121a]/75 border-stone-800 text-stone-500'
                  }`}
                >
                  <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono-tabular text-[11px] font-bold">{medQty}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleRest}
                  aria-label={hud.isResting ? 'Stop resting' : 'Rest to recover energy'}
                  className={`h-11 min-w-[44px] px-2 rounded-lg border flex items-center justify-center gap-1 shadow-md active:scale-95 transition-all cursor-pointer ${
                    hud.isResting
                      ? 'bg-emerald-500 border-emerald-200 text-stone-950 font-bold'
                      : 'bg-[#0e121a]/92 border-stone-600/80 text-emerald-300'
                  }`}
                >
                  <BedDouble className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold whitespace-nowrap">
                    {hud.isResting ? 'Up' : 'Rest'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Top-Right: Day, Time, Weather, Missions, Inventory Pack, Mute & Pause + Mission Tracker */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="flex items-center gap-1.5 sm:gap-2 pointer-events-auto">
              <div className="bg-[#0e121a]/92 border border-stone-700/60 rounded-lg px-2 py-1.5 sm:px-3.5 sm:py-2 flex flex-col justify-center shadow-lg">
                <div className="flex items-center gap-1.5 sm:gap-2 leading-none">
                  <span className="font-display text-sm sm:text-lg font-bold tracking-wide text-amber-400 font-mono-tabular whitespace-nowrap">
                    DAY {hud.day}
                  </span>
                  <span className="text-stone-600 text-xs" aria-hidden="true">·</span>
                  <span className="font-mono-tabular text-xs sm:text-sm font-semibold text-stone-100 whitespace-nowrap">
                    {hud.formattedTime}
                  </span>
                  <span className="text-stone-600 text-xs" aria-hidden="true">·</span>
                  <span
                    aria-label={`Money balance $${hud.money}`}
                    className="font-mono-tabular text-xs sm:text-sm font-bold text-emerald-300 whitespace-nowrap"
                  >
                    ${hud.money}
                  </span>
                  {!isTouchMode && (
                    <>
                      <span className="hidden lg:inline text-stone-600 text-xs" aria-hidden="true">·</span>
                      <span className="hidden lg:inline text-xs text-stone-300 whitespace-nowrap">
                        Light {hud.flashlightOn ? 'On' : 'Off'} (F)
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-300 mt-1 leading-none whitespace-nowrap">
                  {hud.weather === 'rain' ? (
                    <CloudRain className="w-3 h-3 text-sky-300 shrink-0" aria-hidden="true" />
                  ) : hud.weather === 'fog' ? (
                    <CloudFog className="w-3 h-3 text-slate-300 shrink-0" aria-hidden="true" />
                  ) : hud.dayPhaseLabel === 'Night' ? (
                    <Moon className="w-3 h-3 text-indigo-300 shrink-0" aria-hidden="true" />
                  ) : hud.dayPhaseLabel === 'Dawn' ? (
                    <Sunrise className="w-3 h-3 text-amber-300 shrink-0" aria-hidden="true" />
                  ) : hud.dayPhaseLabel === 'Sunset' ? (
                    <Sunset className="w-3 h-3 text-orange-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <Sun className="w-3 h-3 text-amber-300 shrink-0" aria-hidden="true" />
                  )}
                  <span>{hud.dayPhaseLabel}</span>
                  <span className="text-stone-600" aria-hidden="true">·</span>
                  <span>{hud.weatherLabel}</span>
                  <span className="hidden sm:inline text-stone-600" aria-hidden="true">·</span>
                  <span className="hidden sm:inline text-amber-300/90 font-mono-tabular">
                    Shop Lv {hud.shop.shopLevel}
                  </span>
                  {hud.staff.employees.length > 0 && (
                    <>
                      <span className="hidden sm:inline text-stone-600" aria-hidden="true">·</span>
                      <span
                        className={`hidden sm:inline font-mono-tabular ${
                          hud.staff.unpaidCount > 0 ? 'text-rose-300 font-semibold' : 'text-sky-300'
                        }`}
                      >
                        Staff {hud.staff.employees.length}/{hud.staff.employeeCapacity}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-stone-300 mt-1 leading-none whitespace-nowrap">
                  <MapPin
                    className={`w-3 h-3 shrink-0 ${
                      hud.isSafeHaven ? 'text-emerald-300' : 'text-amber-400'
                    }`}
                    aria-hidden="true"
                  />
                  <span
                    className={`truncate max-w-[125px] sm:max-w-[190px] font-medium ${
                      hud.isSafeHaven ? 'text-emerald-200' : 'text-stone-200'
                    }`}
                  >
                    {hud.currentLocationName}
                  </span>
                  {hud.isSafeHaven ? (
                    <span className="hidden sm:inline text-emerald-300/90 text-[10px] font-semibold">
                      · Safe Haven
                    </span>
                  ) : hud.currentLocationDanger === 'high' ? (
                    <span className="hidden sm:inline text-rose-300 text-[10px] font-semibold">
                      · High Risk
                    </span>
                  ) : hud.currentLocationDanger === 'moderate' ? (
                    <span className="hidden sm:inline text-amber-300 text-[10px] font-medium">
                      · Mod Risk
                    </span>
                  ) : null}
                  {!hud.isSafeHaven && hud.dayPhaseLabel === 'Night' && (
                    <span
                      className={`hidden md:inline text-[10px] font-mono-tabular ${
                        hud.flashlightOn ? 'text-amber-300' : 'text-sky-300'
                      }`}
                    >
                      · {hud.flashlightOn ? 'Beam Alert' : 'Low Vis'}
                    </span>
                  )}
                </div>
                {hud.staff.unpaidCount > 0 && (
                  <div className="mt-1 text-[10px] sm:text-[11px] font-semibold text-rose-300 leading-none">
                    Payroll Overdue ({hud.staff.unpaidCount} paused)
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenMap}
                aria-label={`Open neighborhood map (${hud.discoveredLocationIds.length} locations discovered)`}
                className={`h-11 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isMapOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : 'bg-[#0e121a]/92 border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <MapIcon
                  className={`w-4 h-4 ${isMapOpen ? 'text-stone-950' : 'text-sky-300'}`}
                />
                {!isTouchMode && (
                  <span className="hidden sm:inline text-[11px] opacity-80 font-mono-tabular">
                    (N)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenMissions}
                aria-label={`Open missions (${hud.missions.mainCompletedCount} of ${hud.missions.mainTotalCount} main completed)`}
                className={`h-11 px-2.5 sm:px-3 flex items-center gap-1.5 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isMissionsOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : 'bg-[#0e121a]/92 border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span className="font-mono-tabular text-xs font-bold">
                  {hud.missions.mainCompletedCount}/{hud.missions.mainTotalCount}
                </span>
                {!isTouchMode && (
                  <span className="hidden sm:inline text-[11px] opacity-75 font-mono-tabular">
                    (M)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenInventory}
                aria-label={`Open pack (${hud.totalInventoryItems} of ${hud.packCapacity} items)`}
                className={`h-11 px-2.5 sm:px-3.5 flex items-center gap-1.5 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isInventoryOpen && !isMissionsOpen && !isMapOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : hud.totalInventoryItems >= hud.packCapacity
                      ? 'bg-[#260e12]/95 border-rose-500/80 text-rose-200 hover:border-rose-400'
                      : hud.totalInventoryItems >= hud.packCapacity - 2
                        ? 'bg-[#0e121a]/92 border-amber-500/65 text-amber-200 hover:border-amber-400'
                        : 'bg-[#0e121a]/92 border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <Backpack className="w-4 h-4" />
                <span className="font-mono-tabular text-xs font-bold">
                  {hud.totalInventoryItems}/{hud.packCapacity}
                </span>
                {!isTouchMode && (
                  <span className="hidden sm:inline text-[11px] opacity-75 font-mono-tabular">
                    (I)
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                title={muted ? 'Unmute audio' : 'Mute audio'}
                className="h-11 w-10 sm:w-11 flex items-center justify-center rounded-lg bg-[#0e121a]/92 border border-stone-700/60 text-stone-300 hover:text-stone-100 hover:border-stone-500 transition-colors cursor-pointer shadow-lg shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onPauseClick}
                aria-label="Pause game"
                className="h-11 w-10 sm:w-auto sm:px-3.5 flex items-center justify-center gap-2 rounded-lg bg-[#0e121a]/92 border border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500 transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <Pause className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold tracking-wide">Pause</span>
              </button>
            </div>

            {/* Collapsible Active Mission Tracker */}
            {isPlaying && !isInventoryOpen && (trackedMission || hud.missions.endingCompleted) && (
              <div
                className="w-[180px] sm:w-[264px] bg-[#0e121a]/90 border border-stone-700/65 rounded-lg shadow-lg pointer-events-auto overflow-hidden"
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-1 px-2.5 py-1.5 bg-[#131924]/90 border-b border-stone-800/80">
                  <button
                    type="button"
                    onClick={onOpenMissions}
                    className="min-w-0 flex-1 text-left cursor-pointer group"
                  >
                    <div className="text-[10px] font-mono-tabular uppercase tracking-wider text-amber-400 truncate">
                      {trackedMission ? trackedMission.chapterLabel : 'Beacon Online'}
                    </div>
                    <div className="text-[11px] sm:text-xs font-bold text-stone-100 group-hover:text-amber-200 truncate">
                      {trackedMission
                        ? trackedMission.title
                        : 'Freeplay · Story Complete'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTrackerCollapsed((v) => !v)}
                    aria-label={trackerCollapsed ? 'Expand mission tracker' : 'Collapse mission tracker'}
                    className="w-7 h-7 flex items-center justify-center rounded text-stone-400 hover:text-stone-100 hover:bg-stone-800 cursor-pointer shrink-0"
                  >
                    {trackerCollapsed ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronUp className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {!trackerCollapsed && trackedMission && (
                  <button
                    type="button"
                    onClick={onOpenMissions}
                    className="w-full px-2.5 py-1.5 text-left space-y-1 hover:bg-[#141b27]/80 transition-colors cursor-pointer"
                  >
                    {trackedMission.targetZoneId && LOCATION_BY_ID[trackedMission.targetZoneId] && (() => {
                      const targetLoc = LOCATION_BY_ID[trackedMission.targetZoneId!];
                      const dx = targetLoc.x - hud.playerX;
                      const dz = targetLoc.z - hud.playerZ;
                      const dist = Math.round(Math.hypot(dx, dz));
                      const bearing = getBearingLabel(dx, dz);
                      const isHere = hud.currentLocationId === targetLoc.id;
                      return (
                        <div className="flex items-center justify-between gap-1 text-[10px] font-mono-tabular text-sky-300 pb-0.5">
                          <span className="truncate">
                            {isHere
                              ? `At ${targetLoc.shortName}`
                              : hud.discoveredLocationIds.includes(targetLoc.id)
                                ? targetLoc.shortName
                                : 'Signal Lead'}
                          </span>
                          <span className="shrink-0">
                            {isHere ? 'In Zone' : `${bearing} · ${dist}m`}
                          </span>
                        </div>
                      );
                    })()}
                    {trackedMission.objectives.slice(0, 3).map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center justify-between gap-1.5 text-[10px] sm:text-[11px]"
                      >
                        <span
                          className={`truncate ${
                            obj.completed ? 'text-stone-500 line-through' : 'text-stone-200'
                          }`}
                        >
                          {obj.description}
                        </span>
                        <span
                          className={`font-mono-tabular font-semibold shrink-0 ${
                            obj.completed ? 'text-emerald-300' : 'text-amber-300'
                          }`}
                        >
                          {Math.min(obj.current, obj.target)}/{obj.target}
                        </span>
                      </div>
                    ))}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Brief Collection / Survival Feedback Banner */}
        {hud.latestToast && !isInventoryOpen && (
          <div className="flex justify-center">
            <div
              key={hud.latestToast.id}
              role="status"
              aria-live="polite"
              className={`px-3.5 py-1.5 rounded-lg border text-xs sm:text-sm font-medium shadow-lg ${
                hud.latestToast.tone === 'warning'
                  ? 'bg-[#260e12]/95 border-rose-500/80 text-rose-200'
                  : hud.latestToast.tone === 'resource'
                    ? 'bg-[#101621]/95 border-amber-500/70 text-amber-200'
                    : 'bg-[#0e121a]/94 border-stone-600/80 text-stone-200'
              }`}
            >
              {hud.latestToast.text}
            </div>
          </div>
        )}
      </div>

      {/* Contextual Narrative Message / Desktop Quick-Controls Hint */}
      <div
        className={`flex flex-col items-center justify-end gap-2 ${
          isTouchMode ? 'mb-36 sm:mb-28' : 'min-h-[76px]'
        }`}
      >
        {hud.contextMessage && !isInventoryOpen && (
          <div
            role="status"
            aria-live="polite"
            className="max-w-sm sm:max-w-lg w-full sm:w-auto bg-[#0e121a]/94 border border-stone-700/70 rounded-lg px-4 py-2.5 sm:px-5 sm:py-3 shadow-xl"
          >
            {hud.contextTitle && (
              <p className="text-xs font-semibold tracking-wide text-amber-400 mb-0.5">
                {hud.contextTitle}
              </p>
            )}
            <p className="text-xs sm:text-sm text-stone-200 leading-snug">
              {hud.contextMessage}
            </p>
          </div>
        )}

        {isPlaying && !isInventoryOpen && !hud.contextMessage && hud.guidanceHint && (
          <div
            role="note"
            onPointerDown={(e) => e.stopPropagation()}
            className="pointer-events-auto max-w-sm sm:max-w-lg w-full sm:w-auto bg-[#0e141e]/94 border border-sky-500/50 rounded-lg pl-3.5 pr-2 py-2 shadow-xl flex items-start gap-2.5"
          >
            <Lightbulb className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold tracking-wide text-sky-300 leading-tight">
                {hud.guidanceHint.title}
              </div>
              <p className="text-xs text-stone-200 leading-snug mt-0.5">
                {hud.guidanceHint.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismissGuidance(hud.guidanceHint!.id)}
              aria-label="Dismiss hint"
              className="w-9 h-9 rounded-md flex items-center justify-center text-stone-400 hover:text-stone-100 hover:bg-stone-800 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {isPlaying &&
          !isInventoryOpen &&
          !isTouchMode &&
          !hud.pointerLocked &&
          !hud.contextMessage && (
            <div className="bg-[#0e121a]/88 border border-stone-700/50 rounded-lg px-4 py-1.5 text-xs text-stone-300 font-mono-tabular">
              Click lock · WASD Move · E Interact · L-Click / Q Attack · N Map · M Missions · I Pack · 1-3 Use · R Rest
            </div>
          )}
      </div>
    </div>
  );
}
