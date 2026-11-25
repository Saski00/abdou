import { useState } from 'react';
import {
  BedDouble,
  Droplet,
  Flashlight,
  HeartPulse,
  KeyRound,
  MapPin,
  Sword,
  Utensils,
  X,
  Zap,
} from 'lucide-react';
import { useViewportLayout } from '../game/responsiveLayout';
import {
  RESOURCE_DEFINITIONS,
  RESOURCE_ORDER,
  getLocalizedResourcePurposeHint,
  getTotalInventoryItems,
} from '../game/resources';
import { CONSUMABLE_DEFINITIONS } from '../game/survivalSystem';
import { HudSnapshot, ResourceId } from '../game/types';
import { TranslationCatalog, formatTpl, tResource, useI18n } from '../i18n';

interface InventoryModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onConsumeItem: (resourceId: ResourceId) => void;
  onToggleRest: () => void;
  onToggleFlashlight: () => void;
  onClose: () => void;
}

type PackCategoryTab = 'all' | 'consumables' | 'medical' | 'materials' | 'gear';

function getVitalCondition(
  kind: 'health' | 'hunger' | 'thirst' | 'energy',
  value: number,
  invCopy: TranslationCatalog['inventoryModal'],
  isResting = false
): { label: string; toneClass: string } {
  if (kind === 'health') {
    if (value <= 25) return { label: invCopy.condCritical, toneClass: 'text-rose-300' };
    if (value <= 60) return { label: invCopy.condInjured, toneClass: 'text-amber-300' };
    return { label: invCopy.condHealthy, toneClass: 'text-emerald-300' };
  }
  if (kind === 'hunger') {
    if (value === 0) return { label: invCopy.condStarving, toneClass: 'text-rose-300' };
    if (value <= 25) return { label: invCopy.condCritical, toneClass: 'text-rose-300' };
    if (value <= 45) return { label: invCopy.condHungry, toneClass: 'text-amber-300' };
    return { label: invCopy.condWellFed, toneClass: 'text-stone-400' };
  }
  if (kind === 'thirst') {
    if (value === 0) return { label: invCopy.condDehydrated, toneClass: 'text-rose-300' };
    if (value <= 25) return { label: invCopy.condCritical, toneClass: 'text-rose-300' };
    if (value <= 45) return { label: invCopy.condThirsty, toneClass: 'text-amber-300' };
    return { label: invCopy.condHydrated, toneClass: 'text-stone-400' };
  }
  if (isResting) return { label: invCopy.condResting, toneClass: 'text-emerald-300' };
  if (value <= 25) return { label: invCopy.condExhausted, toneClass: 'text-amber-300' };
  if (value <= 55) return { label: invCopy.condTired, toneClass: 'text-stone-300' };
  return { label: invCopy.condRested, toneClass: 'text-stone-400' };
}

function ResourceIcon({ id }: { id: ResourceId }) {
  switch (id) {
    case 'canned_food':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="6" y="4" width="12" height="16" rx="2" fill="#a6342a" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="6" y1="8" x2="18" y2="8" stroke="#cbd5e1" strokeWidth="1.5" />
          <line x1="6" y1="16" x2="18" y2="16" stroke="#cbd5e1" strokeWidth="1.5" />
          <rect x="9" y="10.5" width="6" height="3" rx="0.5" fill="#fbbf24" />
        </svg>
      );
    case 'water_bottle':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="10" y="2.5" width="4" height="2.5" rx="0.6" fill="#2563eb" />
          <path
            d="M9.5 5.5H14.5L16.5 9V19.5C16.5 20.6 15.6 21.5 14.5 21.5H9.5C8.4 21.5 7.5 20.6 7.5 19.5V9L9.5 5.5Z"
            fill="#38bdf8"
            fillOpacity="0.28"
            stroke="#7dd3fc"
            strokeWidth="1.5"
          />
          <rect x="7.8" y="12" width="8.4" height="4" fill="#e2e8f0" fillOpacity="0.75" />
        </svg>
      );
    case 'scrap_metal':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M4 15L10 6L19 9L15 19L4 15Z"
            fill="#475569"
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12.5" r="2.2" fill="#1e293b" stroke="#cbd5e1" strokeWidth="1.3" />
          <line x1="6.5" y1="17.5" x2="19.5" y2="6.5" stroke="#cbd5e1" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case 'wood':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="3" y="6" width="18" height="4.5" rx="1" fill="#92400e" stroke="#d97706" strokeWidth="1.3" />
          <rect x="4.5" y="13" width="16.5" height="4.5" rx="1" fill="#78350f" stroke="#d97706" strokeWidth="1.3" />
          <line x1="8" y1="5.5" x2="8" y2="18" stroke="#1e293b" strokeWidth="1.6" />
          <line x1="16" y1="5.5" x2="16" y2="18" stroke="#1e293b" strokeWidth="1.6" />
        </svg>
      );
    case 'medical_supplies':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="4" y="6.5" width="16" height="13" rx="2" fill="#e5e7eb" stroke="#94a3b8" strokeWidth="1.4" />
          <path d="M9.5 6.5V4.8C9.5 4.2 10 3.8 10.5 3.8H13.5C14 3.8 14.5 4.2 14.5 4.8V6.5" stroke="#94a3b8" strokeWidth="1.5" />
          <path d="M10.7 9.5H13.3V11.7H15.5V14.3H13.3V16.5H10.7V14.3H8.5V11.7H10.7V9.5Z" fill="#dc2626" />
        </svg>
      );
  }
}

export function InventoryModal({
  hud,
  isTouchMode,
  onConsumeItem,
  onToggleRest,
  onToggleFlashlight,
  onClose,
}: InventoryModalProps) {
  const { dir, t } = useI18n();
  const invCopy = t.inventoryModal;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const [activeTab, setActiveTab] = useState<PackCategoryTab>('all');

  const categoryTabs: { id: PackCategoryTab; label: string }[] = [
    { id: 'all', label: invCopy.tabAll },
    { id: 'consumables', label: invCopy.tabConsumables },
    { id: 'medical', label: invCopy.tabMedical },
    { id: 'materials', label: invCopy.tabMaterials },
    { id: 'gear', label: invCopy.tabGear },
  ];

  const { inventory } = hud;
  const totalCount = getTotalInventoryItems(inventory);

  const healthCond = getVitalCondition('health', hud.health, invCopy);
  const hungerCond = getVitalCondition('hunger', hud.hunger, invCopy);
  const thirstCond = getVitalCondition('thirst', hud.thirst, invCopy);
  const energyCond = getVitalCondition('energy', hud.energy, invCopy, hud.isResting);

  const isTargetStatFull = (id: ResourceId): boolean => {
    if (id === 'canned_food') return hud.hunger >= hud.maxHunger;
    if (id === 'water_bottle') return hud.thirst >= hud.maxThirst;
    if (id === 'medical_supplies') return hud.health >= hud.maxHealth;
    return false;
  };

  const filteredResources = RESOURCE_ORDER.filter((id) => {
    const cat = RESOURCE_DEFINITIONS[id].category;
    if (activeTab === 'all') return true;
    if (activeTab === 'consumables') return cat === 'Food' || cat === 'Water';
    if (activeTab === 'medical') return cat === 'Medical';
    if (activeTab === 'materials') return cat === 'Material';
    return false;
  });

  const showItemsSection = activeTab !== 'gear';
  const showGearSection = activeTab === 'all' || activeTab === 'gear';

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/80 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/75 rounded-xl shadow-2xl overflow-hidden ${
          isCompactLandscape ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        {/* Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-4 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2.5' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <h2
              id="inventory-title"
              className={`font-display font-bold tracking-wider text-stone-100 leading-none uppercase ${
                isCompactLandscape ? 'text-2xl' : 'text-2xl sm:text-3xl'
              }`}
            >
              {invCopy.title}
            </h2>
            <p className="text-xs text-stone-400 mt-1 font-mono-tabular truncate">
              {invCopy.packWord}{' '}
              <bdi
                dir="ltr"
                className={
                  totalCount >= hud.packCapacity
                    ? 'text-rose-300 font-bold'
                    : totalCount >= hud.packCapacity - 2
                      ? 'text-amber-300 font-semibold'
                      : 'text-stone-200 font-semibold'
                }
              >
                {totalCount}/{hud.packCapacity}
              </bdi>{' '}
              · {invCopy.cashWord}{' '}
              <bdi dir="ltr" className="text-emerald-300 font-semibold">
                ${hud.money}
              </bdi>{' '}
              · {invCopy.shopLvWord} <bdi dir="ltr">{hud.shop.shopLevel}</bdi>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={invCopy.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div
          className={`flex-1 min-h-0 overflow-y-auto touch-pan-y ${
            isCompactLandscape ? 'p-4 space-y-3' : 'p-4 sm:p-5 space-y-4'
          }`}
        >
          {/* Detailed Player Status Panel */}
          <section
            aria-label={invCopy.title}
            className="rounded-lg border border-stone-800 bg-[#0b0e15] p-3 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs text-stone-300 min-w-0">
                <MapPin
                  className={`w-3.5 h-3.5 shrink-0 ${
                    hud.isSafeHaven ? 'text-emerald-300' : 'text-amber-400'
                  }`}
                  aria-hidden="true"
                />
                <span className="font-medium truncate">{hud.currentLocationName}</span>
                <span className="text-stone-600" aria-hidden="true">
                  ·
                </span>
                <span className="text-stone-400 truncate">
                  {hud.isSafeHaven ? invCopy.safeHavenLabel : hud.currentRegionName}
                </span>
                <span className="hidden sm:inline text-stone-600" aria-hidden="true">
                  ·
                </span>
                <span className="hidden sm:inline text-stone-400 font-mono-tabular">
                  {hud.dayPhaseLabel} · {hud.weatherLabel}
                </span>
              </div>

              <button
                type="button"
                onClick={onToggleRest}
                className={`min-h-[36px] px-3 rounded-md border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  hud.isResting
                    ? 'bg-emerald-500 border-emerald-300 text-stone-950'
                    : 'bg-[#141b27] border-stone-700 text-emerald-300 hover:border-emerald-400'
                }`}
              >
                <BedDouble className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{hud.isResting ? invCopy.standUpBtn : invCopy.restNowBtn}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Health */}
              <div className="rounded-md border border-stone-800/90 bg-[#10151f] px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-stone-300 font-medium">
                    <HeartPulse className="w-3 h-3 text-rose-400" aria-hidden="true" />
                    {invCopy.healthLabel}
                  </span>
                  <bdi dir="ltr" className="font-mono-tabular font-bold text-stone-100">
                    {hud.health}%
                  </bdi>
                </div>
                <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden mb-1">
                  <div
                    className="h-full bg-rose-500 transition-[width] duration-150"
                    style={{ width: `${Math.max(0, Math.min(100, hud.health))}%` }}
                  />
                </div>
                <div className={`text-[10px] font-medium ${healthCond.toneClass}`}>
                  {healthCond.label}
                </div>
              </div>

              {/* Hunger */}
              <div className="rounded-md border border-stone-800/90 bg-[#10151f] px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-stone-300 font-medium">
                    <Utensils className="w-3 h-3 text-amber-400" aria-hidden="true" />
                    {invCopy.hungerLabel}
                  </span>
                  <bdi dir="ltr" className="font-mono-tabular font-bold text-stone-100">
                    {hud.hunger}%
                  </bdi>
                </div>
                <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden mb-1">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      hud.hunger <= 25 ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hud.hunger))}%` }}
                  />
                </div>
                <div className={`text-[10px] font-medium ${hungerCond.toneClass}`}>
                  {hungerCond.label}
                </div>
              </div>

              {/* Thirst */}
              <div className="rounded-md border border-stone-800/90 bg-[#10151f] px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-stone-300 font-medium">
                    <Droplet className="w-3 h-3 text-sky-400" aria-hidden="true" />
                    {invCopy.thirstLabel}
                  </span>
                  <bdi dir="ltr" className="font-mono-tabular font-bold text-stone-100">
                    {hud.thirst}%
                  </bdi>
                </div>
                <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden mb-1">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      hud.thirst <= 25 ? 'bg-rose-500' : 'bg-sky-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hud.thirst))}%` }}
                  />
                </div>
                <div className={`text-[10px] font-medium ${thirstCond.toneClass}`}>
                  {thirstCond.label}
                </div>
              </div>

              {/* Energy */}
              <div className="rounded-md border border-stone-800/90 bg-[#10151f] px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-stone-300 font-medium">
                    <Zap className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    {invCopy.energyLabel}
                  </span>
                  <bdi dir="ltr" className="font-mono-tabular font-bold text-stone-100">
                    {hud.energy}%
                  </bdi>
                </div>
                <div className="h-1.5 w-full bg-stone-900 rounded-sm overflow-hidden mb-1">
                  <div
                    className={`h-full transition-[width] duration-150 ${
                      hud.energy <= 25 ? 'bg-amber-500' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, hud.energy))}%` }}
                  />
                </div>
                <div className={`text-[10px] font-medium ${energyCond.toneClass}`}>
                  {formatTpl(invCopy.staminaInline, { cond: energyCond.label, pct: hud.stamina })}
                </div>
              </div>
            </div>

            {hud.staff.unpaidCount > 0 && (
              <div className="text-[11px] font-semibold text-rose-300 pt-0.5">
                {formatTpl(invCopy.payrollOverdueBanner, { count: hud.staff.unpaidCount })}
              </div>
            )}
          </section>

          {/* Category Tabs */}
          <div
            role="tablist"
            aria-label={invCopy.title}
            className="flex flex-wrap items-center gap-1.5"
          >
            {categoryTabs.map((tabItem) => {
              const selected = activeTab === tabItem.id;
              return (
                <button
                  key={tabItem.id}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  onClick={() => setActiveTab(tabItem.id)}
                  className={`min-h-[40px] px-3 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
                    selected
                      ? 'bg-amber-500 border-amber-300 text-stone-950'
                      : 'bg-[#141b27] border-stone-700/80 text-stone-300 hover:text-white hover:border-stone-500'
                  }`}
                >
                  {tabItem.label}
                </button>
              );
            })}
          </div>

          {/* Resource & Consumable Items */}
          {showItemsSection && (
            <div
              className={`grid gap-2 ${
                isCompactLandscape ? 'grid-cols-2' : 'grid-cols-1 gap-2.5'
              }`}
            >
              {filteredResources.map((id) => {
                const resText = tResource(id);
                const consumable = CONSUMABLE_DEFINITIONS[id];
                const qty = Math.max(0, inventory[id] ?? 0);
                const hasAny = qty > 0;
                const statFull = consumable ? isTargetStatFull(id) : false;
                const canUse = Boolean(consumable && hasAny && !statFull);
                const consumeLabel = resText.consumeActionLabel ?? consumable?.actionLabel ?? '';

                return (
                  <div
                    key={id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 transition-colors ${
                      hasAny
                        ? 'bg-[#161c29] border-stone-600/80'
                        : 'bg-[#0c1018] border-stone-800/80 opacity-75'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#0b0e15] border border-stone-700/70 flex items-center justify-center shrink-0">
                        <ResourceIcon id={id} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-stone-100 truncate">
                          {resText.name}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {getLocalizedResourcePurposeHint(id)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {consumable && (
                        <button
                          type="button"
                          disabled={!canUse}
                          onClick={() => onConsumeItem(id)}
                          className={`min-h-[38px] px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                            canUse
                              ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                              : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                          }`}
                        >
                          {statFull && hasAny ? invCopy.fullBtn : consumeLabel}
                        </button>
                      )}

                      <div
                        className={`font-mono-tabular text-base font-bold px-2.5 py-1 rounded-md border shrink-0 min-w-[40px] text-center ${
                          hasAny
                            ? 'bg-amber-500/15 border-amber-500/45 text-amber-300'
                            : 'bg-stone-900 border-stone-800 text-stone-500'
                        }`}
                      >
                        <bdi dir="ltr">{qty}</bdi>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Equipped Gear & Keys Section */}
          {showGearSection && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#141b27] border border-stone-700/70 flex items-center justify-center shrink-0">
                      <Sword className="w-4 h-4 text-amber-400" aria-hidden="true" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-100 truncate">
                        {hud.weaponLabel}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">
                        {formatTpl(invCopy.equippedMeleeSub, { count: hud.zombiesDefeated })}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono-tabular text-emerald-300 font-semibold shrink-0">
                    {invCopy.readyBadge}
                  </span>
                </div>

                <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#141b27] border border-stone-700/70 flex items-center justify-center shrink-0">
                      <Flashlight
                        className={`w-4 h-4 ${
                          hud.flashlightOn ? 'text-amber-300' : 'text-stone-400'
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-stone-100 truncate">
                        {invCopy.tacticalFlashlightTitle}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate">
                        {hud.flashlightOn
                          ? invCopy.flashlightBeamActive
                          : invCopy.flashlightStealthOff}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onToggleFlashlight}
                    className={`min-h-[36px] px-3 rounded-md border text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                      hud.flashlightOn
                        ? 'bg-amber-500 border-amber-300 text-stone-950'
                        : 'bg-[#161c29] border-stone-700 text-stone-200 hover:border-stone-500'
                    }`}
                  >
                    {hud.flashlightOn ? invCopy.turnOffBtn : invCopy.turnOnBtn}
                  </button>
                </div>
              </div>

              <div className="rounded-lg border border-stone-800 bg-[#0b0e15] px-3.5 py-2.5">
                <div className="flex items-center justify-between text-[11px] text-stone-400">
                  <span className="flex items-center gap-1.5 font-semibold text-stone-300">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    {invCopy.keysAccessTitle}
                  </span>
                  <span className="font-mono-tabular text-amber-300">
                    {formatTpl(invCopy.keysFoundCount, { count: hud.collectedKeyIds.length })}
                  </span>
                </div>
                {hud.collectedKeyIds.length === 0 ? (
                  <p className="text-[11px] text-stone-500 mt-1">{invCopy.noKeysHint}</p>
                ) : (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {hud.collectedKeyIds.map((kid) => {
                      const info = invCopy.keyHints[kid];
                      return (
                        <div
                          key={kid}
                          title={info?.hint ?? kid}
                          className="px-2.5 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-[11px] font-medium text-amber-200"
                        >
                          {info?.label ?? kid}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-4 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular truncate">
            {isTouchMode ? invCopy.footerTouch : invCopy.footerDesktop}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-sm transition-colors cursor-pointer shrink-0"
          >
            {invCopy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
