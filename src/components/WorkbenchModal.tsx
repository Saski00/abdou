import { Hammer, Package, X } from 'lucide-react';
import { WORKBENCH_RECIPES, canCraftRecipe } from '../game/craftingSystem';
import { useViewportLayout } from '../game/responsiveLayout';
import { RESOURCE_DEFINITIONS } from '../game/resources';
import { InventoryState } from '../game/types';

interface WorkbenchModalProps {
  workbenchName: string;
  inventory: InventoryState;
  totalInventoryItems: number;
  packCapacity: number;
  isTouchMode: boolean;
  onCraftRecipe: (recipeId: string) => void;
  onClose: () => void;
}

export function WorkbenchModal({
  workbenchName,
  inventory,
  totalInventoryItems,
  packCapacity,
  isTouchMode,
  onCraftRecipe,
  onClose,
}: WorkbenchModalProps) {
  const viewport = useViewportLayout();
  const isCompactLandscape = viewport.isCompactLandscape;

  return (
    <div
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
                {workbenchName.toUpperCase()}
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1.5 flex items-center gap-2 font-mono-tabular">
              <Package className="w-3.5 h-3.5 text-stone-500 shrink-0" aria-hidden="true" />
              <span>
                Pack {totalInventoryItems}/{packCapacity} · Wood {inventory.wood ?? 0} · Scrap{' '}
                {inventory.scrap_metal ?? 0}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workbench"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recipes List */}
        <div className="flex-1 overflow-y-auto touch-pan-y px-4 py-4 sm:px-6 space-y-3">
          {WORKBENCH_RECIPES.map((recipe) => {
            const check = canCraftRecipe(recipe, inventory, packCapacity);
            const outDef = RESOURCE_DEFINITIONS[recipe.outputResourceId];
            const ownedOut = inventory[recipe.outputResourceId] ?? 0;

            return (
              <div
                key={recipe.id}
                className="rounded-lg border border-stone-700/80 bg-[#0b0e15] p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-baseline justify-between sm:justify-start gap-2">
                    <h3 className="text-sm font-semibold text-stone-100">{recipe.name}</h3>
                    <span className="font-mono-tabular text-[11px] font-semibold text-emerald-300 whitespace-nowrap">
                      +{recipe.outputAmount} {outDef.name} (Pack {ownedOut})
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 leading-snug">{recipe.description}</p>
                  <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] font-mono-tabular">
                    {recipe.ingredients.map((ing) => {
                      const def = RESOURCE_DEFINITIONS[ing.resourceId];
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
                          {ing.amount} {def.name} ({have})
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
                  {check.ok ? 'Craft' : check.reason}
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
            {isTouchMode ? 'Uses materials from your pack' : 'Esc to close'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg border border-stone-700 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs sm:text-sm font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
