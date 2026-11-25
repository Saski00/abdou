import { Droplet, HeartPulse, Utensils, X, Zap } from 'lucide-react';
import {
  RESOURCE_DEFINITIONS,
  RESOURCE_ORDER,
  RESOURCE_PURPOSE_HINTS,
  getTotalInventoryItems,
} from '../game/resources';
import { CONSUMABLE_DEFINITIONS } from '../game/survivalSystem';
import { HudSnapshot, ResourceId } from '../game/types';

interface InventoryModalProps {
  hud: HudSnapshot;
  isTouchMode: boolean;
  onConsumeItem: (resourceId: ResourceId) => void;
  onClose: () => void;
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
  onClose,
}: InventoryModalProps) {
  const { inventory } = hud;
  const totalCount = getTotalInventoryItems(inventory);

  const isTargetStatFull = (id: ResourceId): boolean => {
    if (id === 'canned_food') return hud.hunger >= hud.maxHunger;
    if (id === 'water_bottle') return hud.thirst >= hud.maxThirst;
    if (id === 'medical_supplies') return hud.health >= hud.maxHealth;
    return false;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/78 px-4 py-4"
      style={{
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(16px, env(safe-area-inset-left))',
        paddingRight: 'max(16px, env(safe-area-inset-right))',
      }}
    >
      <div className="w-full max-w-lg max-h-[88dvh] overflow-y-auto touch-pan-y bg-[#10151f] border border-stone-700/75 rounded-xl p-5 sm:p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2
              id="inventory-title"
              className="font-display text-3xl font-bold tracking-wider text-stone-100 leading-none"
            >
              SUPPLIES PACK
            </h2>
            <p className="text-xs text-stone-400 mt-1 font-mono-tabular">
              Capacity{' '}
              <span
                className={
                  totalCount >= hud.packCapacity
                    ? 'text-rose-300 font-bold'
                    : totalCount >= hud.packCapacity - 2
                      ? 'text-amber-300 font-semibold'
                      : 'text-stone-200 font-semibold'
                }
              >
                {totalCount}/{hud.packCapacity}
              </span>{' '}
              · Shop Lv {hud.shop.shopLevel} (+2 slots/Lv)
            </p>
            <div className="h-1.5 w-44 bg-stone-900 rounded-sm overflow-hidden border border-stone-800 mt-1.5">
              <div
                className={`h-full transition-[width] duration-150 ${
                  totalCount >= hud.packCapacity
                    ? 'bg-rose-500'
                    : totalCount >= hud.packCapacity - 2
                      ? 'bg-amber-400'
                      : 'bg-sky-400'
                }`}
                style={{
                  width: `${Math.min(100, Math.round((totalCount / Math.max(1, hud.packCapacity)) * 100))}%`,
                }}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inventory"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Vitals Summary */}
        <div className="grid grid-cols-4 gap-2 mb-4 p-2.5 rounded-lg bg-[#0b0e15] border border-stone-800">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <HeartPulse className="w-3 h-3 text-rose-400" />
              <span>Health</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-stone-100">
              {hud.health}%
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <Utensils className="w-3 h-3 text-amber-400" />
              <span>Hunger</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-stone-100">
              {hud.hunger}%
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <Droplet className="w-3 h-3 text-sky-400" />
              <span>Thirst</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-stone-100">
              {hud.thirst}%
            </span>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-1 text-[11px] text-stone-400">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Energy</span>
            </div>
            <span className="font-mono-tabular text-sm font-bold text-stone-100">
              {hud.energy}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {RESOURCE_ORDER.map((id) => {
            const def = RESOURCE_DEFINITIONS[id];
            const consumable = CONSUMABLE_DEFINITIONS[id];
            const qty = Math.max(0, inventory[id] ?? 0);
            const hasAny = qty > 0;
            const statFull = consumable ? isTargetStatFull(id) : false;
            const canUse = Boolean(consumable && hasAny && !statFull);

            return (
              <div
                key={id}
                className={`flex items-center justify-between gap-3 rounded-lg border px-3.5 py-3 transition-colors ${
                  hasAny
                    ? 'bg-[#161c29] border-stone-600/80'
                    : 'bg-[#0c1018] border-stone-800/80 opacity-70'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-[#0b0e15] border border-stone-700/70 flex items-center justify-center shrink-0">
                    <ResourceIcon id={id} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-100 truncate">
                      {def.name}
                    </div>
                    <div className="text-[11px] text-stone-400 truncate">
                      {RESOURCE_PURPOSE_HINTS[id]}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {consumable && (
                    <button
                      type="button"
                      disabled={!canUse}
                      onClick={() => onConsumeItem(id)}
                      className={`h-9 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                        canUse
                          ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                          : 'bg-stone-800 text-stone-500 border border-stone-700/70 cursor-not-allowed'
                      }`}
                    >
                      {statFull && hasAny ? 'Full' : consumable.actionLabel}
                    </button>
                  )}

                  <div
                    className={`font-mono-tabular text-base font-bold px-2.5 py-1 rounded-md border shrink-0 min-w-[40px] text-center ${
                      hasAny
                        ? 'bg-amber-500/15 border-amber-500/45 text-amber-300'
                        : 'bg-stone-900 border-stone-800 text-stone-500'
                    }`}
                  >
                    {qty}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 pt-4 border-t border-stone-800 flex items-center justify-between gap-4">
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode ? 'Tap Close to resume exploring' : '1 Eat · 2 Drink · 3 Med · I/Esc Close'}
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
