import { useEffect, useRef, useState } from 'react';
import {
  Backpack,
  BedDouble,
  Compass,
  Droplet,
  Flashlight,
  HeartPulse,
  Lightbulb,
  Map as MapIcon,
  Pause,
  Sword,
  Utensils,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { ViewportLayout } from '../game/responsiveLayout';
import { HudSnapshot, ResourceId } from '../game/types';
import { formatTpl, useI18n } from '../i18n';

interface HudOverlayProps {
  hud: HudSnapshot;
  muted: boolean;
  isPlaying: boolean;
  isTouchMode: boolean;
  viewport: ViewportLayout;
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
  viewport,
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
  const { dir, t } = useI18n();

  const hpPct = Math.max(0, Math.min(100, (hud.health / hud.maxHealth) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stamina / hud.maxStamina) * 100));

  const healthCritical = hud.health <= 25;
  const hungerLow = hud.hunger <= 40;
  const hungerCritical = hud.hunger <= 25;
  const thirstLow = hud.thirst <= 40;
  const thirstCritical = hud.thirst <= 25;
  const energyLow = hud.energy <= 25;

  const foodQty = hud.inventory.canned_food ?? 0;
  const waterQty = hud.inventory.water_bottle ?? 0;
  const medQty = hud.inventory.medical_supplies ?? 0;

  const [damageFlash, setDamageFlash] = useState(false);
  const [staminaHoldVisible, setStaminaHoldVisible] = useState(false);
  const [gearPeekVisible, setGearPeekVisible] = useState(false);
  const prevFlashlightRef = useRef(hud.flashlightOn);
  const trackedMission = hud.missions.trackedMission;
  const nextObjective =
    trackedMission?.objectives.find((o) => !o.completed) ??
    trackedMission?.objectives[0] ??
    null;

  const isCompactLandscape = viewport.isCompactLandscape;
  const isPortrait = viewport.orientation === 'portrait';
  const isNarrowPortrait = viewport.isNarrowPortrait;
  const isDesktopLike = !isCompactLandscape && viewport.width >= 640;

  useEffect(() => {
    if (hud.damagePulseId <= 0) return;
    setDamageFlash(true);
    const timer = window.setTimeout(() => setDamageFlash(false), 240);
    return () => window.clearTimeout(timer);
  }, [hud.damagePulseId]);

  const staminaUsedNow =
    hud.isSprinting || hud.isExhausted || hud.stamina < hud.maxStamina - 1;

  useEffect(() => {
    if (staminaUsedNow) {
      setStaminaHoldVisible(true);
      return;
    }
    if (!staminaHoldVisible) return;
    const timer = window.setTimeout(() => setStaminaHoldVisible(false), 1100);
    return () => window.clearTimeout(timer);
  }, [staminaUsedNow, staminaHoldVisible]);

  useEffect(() => {
    if (hud.attackPulseId <= 0) return;
    setGearPeekVisible(true);
    const timer = window.setTimeout(() => setGearPeekVisible(false), 2400);
    return () => window.clearTimeout(timer);
  }, [hud.attackPulseId]);

  useEffect(() => {
    if (prevFlashlightRef.current === hud.flashlightOn) return;
    prevFlashlightRef.current = hud.flashlightOn;
    setGearPeekVisible(true);
    const timer = window.setTimeout(() => setGearPeekVisible(false), 2000);
    return () => window.clearTimeout(timer);
  }, [hud.flashlightOn]);

  const showStaminaBar = staminaUsedNow || staminaHoldVisible;
  const showGearBadge = isPlaying && !isInventoryOpen && (hud.inActiveCombat || gearPeekVisible);
  const packNearFull = hud.totalInventoryItems >= Math.max(1, hud.packCapacity - 2);
  const packFull = hud.totalInventoryItems >= hud.packCapacity;

  const healthBarWidth = isDesktopLike
    ? 'w-[180px]'
    : isCompactLandscape
      ? 'w-[144px]'
      : isNarrowPortrait
        ? 'w-[128px]'
        : 'w-[152px]';

  const handleUrgentNeedTap = (id: ResourceId, qty: number) => {
    if (qty > 0) {
      onConsumeItem(id);
    } else {
      onOpenInventory();
    }
  };

  return (
    <div
      dir={dir}
      className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between"
      style={{
        paddingTop: isCompactLandscape
          ? 'max(8px, env(safe-area-inset-top))'
          : 'max(10px, env(safe-area-inset-top))',
        paddingBottom: isCompactLandscape
          ? 'max(8px, env(safe-area-inset-bottom))'
          : 'max(14px, env(safe-area-inset-bottom))',
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

      {/* Minimal Center Reticle */}
      {isPlaying && !isInventoryOpen && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`rounded-full transition-transform duration-100 ${
              hud.interactionPrompt
                ? 'w-2 h-2 bg-amber-400 ring-2 ring-amber-400/40 scale-110'
                : 'w-1.5 h-1.5 bg-stone-100/75 ring-1 ring-black/60'
            }`}
          />
        </div>
      )}

      {/* Contextual Interaction Prompt (Only when looking at/near an interactable) */}
      {isPlaying && !isInventoryOpen && hud.interactionPrompt && (
        <div
          className={`fixed inset-x-0 flex justify-center px-4 pointer-events-none ${
            isCompactLandscape ? 'top-[56%]' : 'top-[55%]'
          }`}
        >
          <div
            className={`bg-[#0e121a]/92 backdrop-blur-sm border border-amber-500/60 rounded-lg shadow-xl flex items-center gap-2 ${
              isCompactLandscape ? 'px-2.5 py-1' : 'px-3 py-1.5'
            }`}
          >
            <span className="font-mono-tabular text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500 text-stone-950">
              {isTouchMode ? t.hud.tapKeyLabel : <bdi dir="ltr">E</bdi>}
            </span>
            <div className="flex items-baseline gap-1.5 text-xs sm:text-sm">
              <span className="font-semibold text-amber-300">
                {hud.interactionPrompt.actionLabel}
              </span>
              <span className="text-stone-100 font-medium">{hud.interactionPrompt.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* Top HUD Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          {/* Top-Start: Minimal Health + Dynamic Stamina + Conditional Need Alerts / Combat */}
          <div className="flex flex-col items-start gap-1.5 min-w-0">
            <div
              className={`bg-[#0e121a]/82 backdrop-blur-sm border rounded-lg shadow-lg transition-colors ${healthBarWidth} ${
                isDesktopLike ? 'px-3 py-2' : 'px-2.5 py-1.5'
              } ${healthCritical ? 'border-rose-500/85' : 'border-stone-700/55'}`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1 min-w-0">
                  <HeartPulse
                    className={`w-3.5 h-3.5 shrink-0 ${
                      healthCritical ? 'text-rose-400' : 'text-rose-400/90'
                    }`}
                    aria-hidden="true"
                  />
                  <span className="text-[11px] font-semibold tracking-wide text-stone-200 uppercase">
                    {t.hud.hpShort}
                  </span>
                </div>
                <span
                  className={`font-mono-tabular text-xs font-bold ${
                    healthCritical ? 'text-rose-300' : 'text-stone-100'
                  }`}
                >
                  <bdi dir="ltr">{hud.health}</bdi>
                </span>
              </div>

              <div className="h-1.5 w-full bg-stone-900/90 rounded-sm overflow-hidden border border-stone-800/80">
                <div
                  className={`h-full transition-[width] duration-150 ease-out ${
                    healthCritical ? 'bg-rose-400' : 'bg-rose-500'
                  }`}
                  style={{ width: `${hpPct}%` }}
                />
              </div>

              {/* Dynamic Sprint Stamina (fades away when rested & full) */}
              <div
                aria-hidden={!showStaminaBar}
                aria-label={formatTpl(t.hud.sprintStaminaAria, { pct: hud.stamina })}
                className={`overflow-hidden transition-[opacity,max-height,margin] duration-200 ${
                  showStaminaBar
                    ? 'opacity-100 max-h-3 mt-1.5'
                    : 'opacity-0 max-h-0 mt-0 pointer-events-none'
                }`}
              >
                <div className="h-[3px] w-full bg-stone-900 rounded-sm overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-75 ease-linear ${
                      hud.isExhausted ? 'bg-amber-600' : 'bg-amber-300'
                    }`}
                    style={{ width: `${stamPct}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Conditional Need Alerts & Resting State (hidden when healthy/idle) */}
            {isPlaying &&
              !isInventoryOpen &&
              (healthCritical || hungerLow || thirstLow || energyLow || hud.isResting) && (
                <div
                  className="flex flex-wrap items-center gap-1.5 pointer-events-auto max-w-[230px]"
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {healthCritical && medQty > 0 && (
                    <button
                      type="button"
                      onClick={() => handleUrgentNeedTap('medical_supplies', medQty)}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-rose-500/92 hover:bg-rose-400 border border-rose-200/80 text-white text-[11px] font-bold flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-transform"
                    >
                      <HeartPulse className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatTpl(t.hud.healBtn, { qty: medQty })}</span>
                    </button>
                  )}

                  {hungerLow && (
                    <button
                      type="button"
                      onClick={() => handleUrgentNeedTap('canned_food', foodQty)}
                      aria-label={
                        hud.hunger === 0
                          ? `${t.hud.starvingLabel} (${foodQty})`
                          : `${t.hud.hungryLabel} ${hud.hunger}%`
                      }
                      className={`min-h-[36px] px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-transform ${
                        hungerCritical
                          ? 'bg-[#2a1216]/94 border-rose-500/80 text-rose-200'
                          : 'bg-[#0e121a]/88 border-amber-500/55 text-amber-200'
                      }`}
                    >
                      <Utensils className="w-3 h-3 shrink-0" />
                      <span className="font-mono-tabular">
                        {hud.hunger === 0 ? (
                          t.hud.starvingLabel
                        ) : (
                          <>
                            {hungerCritical ? t.hud.lowFoodLabel : t.hud.hungryLabel}{' '}
                            <bdi dir="ltr">{hud.hunger}%</bdi>
                          </>
                        )}
                      </span>
                      {foodQty > 0 && (
                        <span className="text-amber-300 font-bold">{t.hud.eatSuffix}</span>
                      )}
                    </button>
                  )}

                  {thirstLow && (
                    <button
                      type="button"
                      onClick={() => handleUrgentNeedTap('water_bottle', waterQty)}
                      aria-label={
                        hud.thirst === 0
                          ? `${t.hud.dehydratedLabel} (${waterQty})`
                          : `${t.hud.thirstyLabel} ${hud.thirst}%`
                      }
                      className={`min-h-[36px] px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-transform ${
                        thirstCritical
                          ? 'bg-[#2a1216]/94 border-rose-500/80 text-rose-200'
                          : 'bg-[#0e121a]/88 border-sky-500/55 text-sky-200'
                      }`}
                    >
                      <Droplet className="w-3 h-3 shrink-0" />
                      <span className="font-mono-tabular">
                        {hud.thirst === 0 ? (
                          t.hud.dehydratedLabel
                        ) : (
                          <>
                            {thirstCritical ? t.hud.lowWaterLabel : t.hud.thirstyLabel}{' '}
                            <bdi dir="ltr">{hud.thirst}%</bdi>
                          </>
                        )}
                      </span>
                      {waterQty > 0 && (
                        <span className="text-sky-300 font-bold">{t.hud.drinkSuffix}</span>
                      )}
                    </button>
                  )}

                  {energyLow && !hud.isResting && (
                    <button
                      type="button"
                      onClick={onToggleRest}
                      className="min-h-[36px] px-2 py-1 rounded-lg bg-[#0e121a]/88 border border-emerald-500/55 text-emerald-200 text-[11px] font-semibold flex items-center gap-1 shadow-md cursor-pointer active:scale-95 transition-transform"
                    >
                      <Zap className="w-3 h-3 shrink-0" />
                      <span className="font-mono-tabular">
                        {formatTpl(t.hud.tiredRestLabel, { pct: hud.energy })}
                      </span>
                    </button>
                  )}

                  {hud.isResting && (
                    <button
                      type="button"
                      onClick={onToggleRest}
                      className="min-h-[36px] px-2.5 py-1 rounded-lg bg-emerald-500/92 hover:bg-emerald-400 border border-emerald-200 text-stone-950 text-[11px] font-bold flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 transition-transform"
                    >
                      <BedDouble className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono-tabular">
                        {formatTpl(t.hud.restingEnergyStand, {
                          pct: hud.energy,
                          action: isTouchMode ? t.hud.standUpTouch : t.hud.standDesktop,
                        })}
                      </span>
                    </button>
                  )}
                </div>
              )}

            {/* Contextual Combat & Gear Indicator (only during combat, melee swing, or light toggle) */}
            {showGearBadge && (
              <div className="bg-[#0e121a]/82 backdrop-blur-sm border border-stone-700/55 rounded-lg px-2.5 py-1 flex items-center gap-2 text-[11px] text-stone-200 shadow-md">
                <Sword
                  className={`w-3.5 h-3.5 shrink-0 ${
                    hud.inActiveCombat ? 'text-rose-400' : 'text-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-medium whitespace-nowrap">{hud.weaponLabel}</span>
                <span className="text-stone-600" aria-hidden="true">
                  ·
                </span>
                <Flashlight
                  className={`w-3 h-3 shrink-0 ${
                    hud.flashlightOn ? 'text-amber-300' : 'text-stone-500'
                  }`}
                  aria-hidden="true"
                />
                <span className="text-stone-400 font-mono-tabular whitespace-nowrap">
                  {hud.flashlightOn ? t.hud.lightOnShort : t.hud.lightOffShort}
                </span>
              </div>
            )}
          </div>

          {/* Top-End: Quiet Time + Clean Menu Buttons + Single-Line Active Objective */}
          <div className="flex flex-col items-end gap-1.5 min-w-0">
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 pointer-events-auto">
              {/* Unboxed minimal time (and cash only inside The Last Shop) */}
              <div
                className="hidden sm:flex items-center gap-1.5 pe-1 text-xs font-mono-tabular text-stone-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] whitespace-nowrap"
                aria-label={`${formatTpl(t.hud.dayPrefix, { day: hud.day })}, ${hud.formattedTime}`}
              >
                <span className="font-semibold text-amber-300">
                  {formatTpl(t.hud.dayPrefix, { day: hud.day })}
                </span>
                <span className="text-stone-500" aria-hidden="true">
                  ·
                </span>
                <bdi dir="ltr">{hud.formattedTime}</bdi>
                {hud.insideShop && (
                  <>
                    <span className="text-stone-500" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-bold text-emerald-300">
                      <bdi dir="ltr">${hud.money}</bdi>
                    </span>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={onOpenMap}
                aria-label={`${t.hud.mapAria} (${hud.discoveredLocationIds.length})`}
                className={`h-11 ${
                  isDesktopLike ? 'px-2.5' : 'w-11'
                } flex items-center justify-center gap-1.5 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isMapOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : 'bg-[#0e121a]/82 backdrop-blur-sm border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <MapIcon className={`w-4 h-4 ${isMapOpen ? 'text-stone-950' : 'text-sky-300'}`} />
                {!isTouchMode && isDesktopLike && (
                  <bdi dir="ltr" className="text-[11px] opacity-80 font-mono-tabular">
                    N
                  </bdi>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenMissions}
                aria-label={`${t.hud.missionsAria} (${hud.missions.mainCompletedCount}/${hud.missions.mainTotalCount})`}
                className={`h-11 ${
                  isDesktopLike ? 'px-2.5' : 'w-11'
                } flex items-center justify-center gap-1 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isMissionsOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : 'bg-[#0e121a]/82 backdrop-blur-sm border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <Compass
                  className={`w-4 h-4 shrink-0 ${
                    isMissionsOpen ? 'text-stone-950' : 'text-amber-400'
                  }`}
                />
                {!isTouchMode && isDesktopLike && (
                  <bdi dir="ltr" className="text-[11px] opacity-80 font-mono-tabular">
                    M
                  </bdi>
                )}
              </button>

              <button
                type="button"
                onClick={onOpenInventory}
                aria-label={`${t.hud.inventoryAria} (${hud.totalInventoryItems}/${hud.packCapacity})`}
                className={`h-11 ${
                  isDesktopLike || packNearFull ? 'px-2.5' : 'w-11'
                } flex items-center justify-center gap-1 rounded-lg border transition-colors cursor-pointer shadow-lg whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400 ${
                  isInventoryOpen && !isMissionsOpen && !isMapOpen
                    ? 'bg-amber-500 border-amber-300 text-stone-950'
                    : packFull
                      ? 'bg-[#260e12]/92 border-rose-500/80 text-rose-200 hover:border-rose-400'
                      : packNearFull
                        ? 'bg-[#0e121a]/88 border-amber-500/65 text-amber-200 hover:border-amber-400'
                        : 'bg-[#0e121a]/82 backdrop-blur-sm border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500'
                }`}
              >
                <Backpack className="w-4 h-4 shrink-0" />
                {packNearFull && (
                  <bdi dir="ltr" className="font-mono-tabular text-[11px] font-bold">
                    {hud.totalInventoryItems}/{hud.packCapacity}
                  </bdi>
                )}
                {!isTouchMode && isDesktopLike && (
                  <bdi dir="ltr" className="text-[11px] opacity-80 font-mono-tabular">
                    I
                  </bdi>
                )}
              </button>

              <button
                type="button"
                onClick={onToggleMute}
                aria-label={muted ? t.hud.unmuteAria : t.hud.muteAria}
                title={muted ? t.hud.unmuteAria : t.hud.muteAria}
                className="h-11 w-11 flex items-center justify-center rounded-lg bg-[#0e121a]/82 backdrop-blur-sm border border-stone-700/60 text-stone-300 hover:text-stone-100 hover:border-stone-500 transition-colors cursor-pointer shadow-lg shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onPauseClick}
                aria-label={t.hud.pauseAria}
                className="h-11 w-11 flex items-center justify-center rounded-lg bg-[#0e121a]/82 backdrop-blur-sm border border-stone-700/60 text-stone-200 hover:text-white hover:border-stone-500 transition-colors cursor-pointer shadow-lg shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>

            {/* Minimal Single-Line Current Objective Indicator */}
            {isPlaying && !isInventoryOpen && trackedMission && nextObjective && (
              <button
                type="button"
                onClick={onOpenMissions}
                onPointerDown={(e) => e.stopPropagation()}
                aria-label={`${t.hud.objectiveAria}: ${nextObjective.description}`}
                className={`pointer-events-auto flex items-center gap-1.5 rounded-lg bg-[#0e121a]/78 backdrop-blur-sm border border-stone-700/50 hover:border-amber-500/60 px-2.5 py-1 text-start transition-colors cursor-pointer shadow-md ${
                  isDesktopLike
                    ? 'max-w-[300px]'
                    : isCompactLandscape
                      ? 'max-w-[215px]'
                      : 'max-w-[205px]'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden="true" />
                <span className="text-[11px] font-medium text-stone-200 truncate">
                  {nextObjective.description}
                </span>
                <bdi
                  dir="ltr"
                  className="font-mono-tabular text-[10px] font-semibold text-amber-300 shrink-0"
                >
                  {Math.min(nextObjective.current, nextObjective.target)}/{nextObjective.target}
                </bdi>
              </button>
            )}

            {/* Mobile compact time readout subtly below right bar */}
            {!isDesktopLike && (
              <div className="sm:hidden text-[10px] font-mono-tabular text-stone-300/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] pe-0.5 whitespace-nowrap">
                {formatTpl(t.hud.dayPrefix, { day: hud.day })} ·{' '}
                <bdi dir="ltr">{hud.formattedTime}</bdi>
                {hud.insideShop ? (
                  <>
                    {' · '}
                    <bdi dir="ltr">${hud.money}</bdi>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Brief Auto-Expiring Pickup / Survival / Mission Feedback Toast */}
        {hud.latestToast && !isInventoryOpen && (
          <div className="flex justify-center">
            <div
              key={hud.latestToast.id}
              role="status"
              aria-live="polite"
              className={`px-3 py-1 rounded-lg border text-xs font-medium shadow-lg backdrop-blur-sm ${
                hud.latestToast.tone === 'warning'
                  ? 'bg-[#260e12]/94 border-rose-500/80 text-rose-200'
                  : hud.latestToast.tone === 'resource'
                    ? 'bg-[#101621]/92 border-amber-500/65 text-amber-200'
                    : 'bg-[#0e121a]/90 border-stone-600/75 text-stone-200'
              }`}
            >
              {hud.latestToast.text}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Narrative / Guidance / Unobtrusive Desktop Key Prompt */}
      <div
        className={`flex flex-col items-center justify-end gap-1.5 ${
          isTouchMode
            ? isCompactLandscape
              ? 'mb-1'
              : isPortrait
                ? 'mb-36'
                : 'mb-24'
            : 'min-h-[48px]'
        }`}
      >
        {hud.contextMessage && !isInventoryOpen && (
          <div
            role="status"
            aria-live="polite"
            className={`bg-[#0e121a]/92 backdrop-blur-sm border border-stone-700/65 rounded-lg shadow-xl ${
              isCompactLandscape
                ? 'max-w-[min(360px,calc(100vw-305px))] px-3 py-1.5'
                : 'max-w-sm sm:max-w-lg w-full sm:w-auto px-4 py-2.5 sm:px-5 sm:py-3'
            }`}
          >
            {hud.contextTitle && (
              <p className="text-[11px] font-semibold tracking-wide text-amber-400 mb-0.5 truncate">
                {hud.contextTitle}
              </p>
            )}
            <p className="text-xs text-stone-200 leading-snug">{hud.contextMessage}</p>
          </div>
        )}

        {isPlaying && !isInventoryOpen && !hud.contextMessage && hud.guidanceHint && (
          <div
            role="note"
            onPointerDown={(e) => e.stopPropagation()}
            className={`pointer-events-auto bg-[#0e141e]/92 backdrop-blur-sm border border-sky-500/45 rounded-lg shadow-xl flex items-start gap-2 ${
              isCompactLandscape
                ? 'max-w-[min(360px,calc(100vw-305px))] ps-2.5 pe-1.5 py-1.5'
                : 'max-w-sm sm:max-w-lg w-full sm:w-auto ps-3.5 pe-2 py-2'
            }`}
          >
            <Lightbulb className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold tracking-wide text-sky-300 leading-tight truncate">
                {hud.guidanceHint.title}
              </div>
              <p className="text-[11px] sm:text-xs text-stone-200 leading-snug mt-0.5">
                {hud.guidanceHint.message}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onDismissGuidance(hud.guidanceHint!.id)}
              aria-label={t.hud.dismissHintAria}
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
            <div className="bg-[#0e121a]/80 backdrop-blur-sm border border-stone-700/45 rounded-lg px-3.5 py-1 text-[11px] text-stone-300 font-mono-tabular text-center">
              {t.hud.desktopControlsBanner}
            </div>
          )}
      </div>
    </div>
  );
}
