import { Hammer, Package, X } from 'lucide-react';
import { WORKBENCH_RECIPES, canCraftRecipe } from '../game/craftingSystem';
import { useViewportLayout } from '../game/responsiveLayout';
import { InventoryState, WeaponId } from '../game/types';
import { formatTpl, tRecipe, tResource, tResourceName, tWeaponLabel, useI18n } from '../i18n';

interface WorkbenchModalProps {
  workbenchName: string;
  inventory: InventoryState;
  totalInventoryItems: number;
  packCapacity: number;
  unlockedWeaponIds: WeaponId[];
  reserveAmmo: number;
  maxReserveAmmo: number;
  isTouchMode: boolean;
  onCraftRecipe: (recipeId: string) => void;
  onClose: () => void;
}

export function WorkbenchModal({
  workbenchName,
  inventory,
  totalInventoryItems,
  packCapacity,
  unlockedWeaponIds,
  reserveAmmo,
  maxReserveAmmo,
  isTouchMode,
  onCraftRecipe,
  onClose,
}: WorkbenchModalProps) {
  const { dir, t } = useI18n();
  const wbCopy = t.workbenchModal;
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;
  const combatCtx = { unlockedWeaponIds, reserveAmmo, maxReserveAmmo };

  return (
    <div
      dir={dir}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workbench-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070a0f]/84 px-3 py-3 sm:px-4 sm:py-4"
      style={{
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingLeft: 'max(12px, env(safe-area-inset-left))',
        paddingRight: 'max(12px, env(safe-area-inset-right))',
      }}
    >
      <div
        className={`w-full max-h-[92dvh] flex flex-col bg-[#10151f] border border-stone-700/80 rounded-xl shadow-2xl overflow-hidden ${
          isCompactLandscape ? 'max-w-2xl' : 'max-w-lg'
        }`}
      >
        {/* Header */}
        <div
          className={`border-b border-stone-800 flex items-start justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2.5' : 'px-4 py-3.5 sm:px-6 sm:py-4'
          }`}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Hammer className="w-5 h-5 text-amber-400 shrink-0" aria-hidden="true" />
              <h2
                id="workbench-title"
                className="font-display text-2xl font-bold tracking-wider text-stone-100 leading-none truncate"
              >
                {(workbenchName || wbCopy.defaultTitle).toUpperCase()}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-2 font-mono-tabular">
              <Package className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
              <span>
                {formatTpl(wbCopy.headerStats, {
                  used: totalInventoryItems,
                  cap: packCapacity,
                  wood: inventory.wood ?? 0,
                  scrap: inventory.scrap_metal ?? 0,
                })}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={wbCopy.closeAria}
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipes List */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-3">
          {WORKBENCH_RECIPES.map((recipe) => {
            const check = canCraftRecipe(recipe, inventory, packCapacity, combatCtx);
            const recText = tRecipe(recipe.id, recipe);
            const kind = recipe.outputKind ?? 'resource';
            let outputBadgeText = '';
            if (kind === 'weapon') {
              outputBadgeText = formatTpl(wbCopy.weaponOutputBadge, {
                weapon: recipe.outputWeaponId ? tWeaponLabel(recipe.outputWeaponId) : recText.name,
              });
            } else if (kind === 'ammo') {
              outputBadgeText = formatTpl(wbCopy.ammoOutputBadge, {
                qty: recipe.outputAmount,
                unit: t.combat.ammoUnit,
                reserve: reserveAmmo,
                max: maxReserveAmmo,
              });
            } else if (recipe.outputResourceId) {
              const outRes = tResource(recipe.outputResourceId);
              const ownedOut = inventory[recipe.outputResourceId] ?? 0;
              outputBadgeText = formatTpl(wbCopy.outputBadge, {
                qty: recipe.outputAmount,
                item: outRes.name,
                owned: ownedOut,
              });
            }

            return (
              <div
                key={recipe.id}
                className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-baseline justify-between sm:justify-start gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">{recText.name}</h3>
                    <span className="font-mono-tabular text-[11px] font-semibold text-emerald-300 whitespace-nowrap">
                      {outputBadgeText}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-snug">{recText.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono-tabular">
                    {recipe.ingredients.map((ing) => {
                      const ingName = tResourceName(ing.resourceId, ing.amount);
                      const have = inventory[ing.resourceId] ?? 0;
                      const met = have >= ing.amount;
                      return (
                        <span
                          key={ing.resourceId}
                          className={`px-2 py-0.5 rounded border ${
                            met
                              ? 'border-emerald-600/50 bg-[#0f1f19] text-emerald-300'
                              : 'border-rose-700/60 bg-[#231015] text-rose-300'
                          }`}
                        >
                          <bdi dir="ltr">{ing.amount}</bdi> {ingName} (<bdi dir="ltr">{have}</bdi>)
                        </span>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!check.ok}
                  onClick={() => onCraftRecipe(recipe.id)}
                  className={`min-h-[44px] px-4 rounded-lg text-xs sm:text-sm font-bold shrink-0 transition-colors ${
                    check.ok
                      ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 cursor-pointer'
                      : 'bg-stone-800 text-stone-500 border border-stone-700 cursor-not-allowed'
                  }`}
                >
                  {check.ok ? wbCopy.craftBtn : check.reason}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className={`border-t border-stone-800 flex items-center justify-between gap-3 shrink-0 ${
            isCompactLandscape ? 'px-4 py-2' : 'px-4 py-3 sm:px-6'
          }`}
        >
          <span className="text-xs text-stone-400 font-mono-tabular">
            {isTouchMode ? wbCopy.footerTouch : wbCopy.footerDesktop}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            {wbCopy.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
