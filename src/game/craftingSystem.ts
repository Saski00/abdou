import { addInventoryResourceCapped, consumeInventoryResource, getTotalInventoryItems } from './resources';
import { InventoryState, ResourceId, WeaponId } from './types';
import { formatTpl, getTranslations, tResourceName, tWeaponLabel } from '../i18n';

export interface WorkbenchRecipeIngredient {
  resourceId: ResourceId;
  amount: number;
}

export interface WorkbenchRecipe {
  id: string;
  name: string;
  description: string;
  outputKind?: 'resource' | 'weapon' | 'ammo';
  outputResourceId?: ResourceId;
  outputWeaponId?: WeaponId;
  outputAmount: number;
  ingredients: WorkbenchRecipeIngredient[];
}

export interface WorkbenchCombatContext {
  unlockedWeaponIds: WeaponId[];
  reserveAmmo: number;
  maxReserveAmmo: number;
}

export const WORKBENCH_RECIPES: WorkbenchRecipe[] = [
  {
    id: 'craft_medkit',
    name: 'Assemble Field Medkit',
    description: 'Brace splints and sterile gauze using timber and clean scrap shears.',
    outputKind: 'resource',
    outputResourceId: 'medical_supplies',
    outputAmount: 1,
    ingredients: [
      { resourceId: 'wood', amount: 2 },
      { resourceId: 'scrap_metal', amount: 1 },
    ],
  },
  {
    id: 'craft_water',
    name: 'Charcoal Water Filter',
    description: 'Char timber into a slow carbon filter and boil clean drinking water.',
    outputKind: 'resource',
    outputResourceId: 'water_bottle',
    outputAmount: 1,
    ingredients: [{ resourceId: 'wood', amount: 2 }],
  },
  {
    id: 'craft_ration',
    name: 'Preserve Tin Ration',
    description: 'Seal dry emergency rations in reclaimed tinware over a bench burner.',
    outputKind: 'resource',
    outputResourceId: 'canned_food',
    outputAmount: 1,
    ingredients: [
      { resourceId: 'scrap_metal', amount: 1 },
      { resourceId: 'wood', amount: 1 },
    ],
  },
  {
    id: 'craft_scrap_blade',
    name: 'Forge Combat Knife',
    description: 'Grind salvaged steel plate into a fast, quiet close-quarters blade.',
    outputKind: 'weapon',
    outputWeaponId: 'scrap_blade',
    outputAmount: 1,
    ingredients: [
      { resourceId: 'scrap_metal', amount: 2 },
      { resourceId: 'wood', amount: 1 },
    ],
  },
  {
    id: 'craft_pistol_ammo',
    name: 'Press 9mm Scrap Rounds',
    description: 'Hand-load 7 salvaged 9mm rounds for the Service Pistol.',
    outputKind: 'ammo',
    outputAmount: 7,
    ingredients: [
      { resourceId: 'scrap_metal', amount: 1 },
      { resourceId: 'wood', amount: 1 },
    ],
  },
];

export interface WorkbenchCraftResult {
  ok: boolean;
  nextInventory: InventoryState;
  unlockedWeaponId?: WeaponId;
  ammoGranted?: number;
  message: string;
  tone: 'resource' | 'world' | 'warning';
}

export function canCraftRecipe(
  recipe: WorkbenchRecipe,
  inventory: InventoryState,
  packCapacity: number,
  combatCtx?: WorkbenchCombatContext
): { ok: boolean; reason: string | null; alreadyOwned?: boolean } {
  const t = getTranslations();
  const kind = recipe.outputKind ?? 'resource';

  if (kind === 'weapon' && recipe.outputWeaponId && combatCtx) {
    if (combatCtx.unlockedWeaponIds.includes(recipe.outputWeaponId)) {
      return {
        ok: false,
        reason: t.workbenchModal.ownedWeaponBtn,
        alreadyOwned: true,
      };
    }
  }

  if (kind === 'ammo' && combatCtx) {
    if (combatCtx.reserveAmmo >= combatCtx.maxReserveAmmo) {
      return {
        ok: false,
        reason: t.workbenchModal.ammoFullBtn,
      };
    }
  }

  let inputCount = 0;
  for (const ing of recipe.ingredients) {
    inputCount += ing.amount;
    const have = Math.max(0, inventory[ing.resourceId] ?? 0);
    if (have < ing.amount) {
      const itemName = tResourceName(ing.resourceId, ing.amount);
      return {
        ok: false,
        reason: formatTpl(t.gameMessages.toasts.craftMissingMaterial, {
          qty: ing.amount,
          name: itemName,
          have,
        }),
      };
    }
  }

  if (kind === 'resource' && recipe.outputResourceId) {
    const currentItems = getTotalInventoryItems(inventory);
    const netAfter = currentItems - inputCount + recipe.outputAmount;
    if (netAfter > packCapacity) {
      return {
        ok: false,
        reason: formatTpl(t.gameMessages.toasts.craftPackFull, {
          used: currentItems,
          cap: packCapacity,
        }),
      };
    }
  }

  return { ok: true, reason: null };
}

export function craftWorkbenchRecipe(
  recipeId: string,
  inventory: InventoryState,
  packCapacity: number,
  combatCtx?: WorkbenchCombatContext
): WorkbenchCraftResult {
  const t = getTranslations();
  const recipe = WORKBENCH_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) {
    return {
      ok: false,
      nextInventory: inventory,
      message: t.gameMessages.toasts.cannotCraftUnknown,
      tone: 'warning',
    };
  }

  const check = canCraftRecipe(recipe, inventory, packCapacity, combatCtx);
  if (!check.ok) {
    return {
      ok: false,
      nextInventory: inventory,
      message: check.reason ?? t.gameMessages.toasts.cannotCraftUnknown,
      tone: 'warning',
    };
  }

  let next = { ...inventory };
  for (const ing of recipe.ingredients) {
    next = consumeInventoryResource(next, ing.resourceId, ing.amount);
  }

  const kind = recipe.outputKind ?? 'resource';
  const recipeTitle = t.recipes[recipe.id]?.name ?? recipe.name;

  if (kind === 'weapon' && recipe.outputWeaponId) {
    return {
      ok: true,
      nextInventory: next,
      unlockedWeaponId: recipe.outputWeaponId,
      message: formatTpl(t.gameMessages.toasts.craftedSuccess, {
        name: recipeTitle,
        qty: 1,
        output: tWeaponLabel(recipe.outputWeaponId),
      }),
      tone: 'resource',
    };
  }

  if (kind === 'ammo') {
    return {
      ok: true,
      nextInventory: next,
      ammoGranted: recipe.outputAmount,
      message: formatTpl(t.gameMessages.toasts.craftedSuccess, {
        name: recipeTitle,
        qty: recipe.outputAmount,
        output: t.combat.ammoUnit,
      }),
      tone: 'resource',
    };
  }

  if (!recipe.outputResourceId) {
    return {
      ok: false,
      nextInventory: inventory,
      message: t.gameMessages.toasts.cannotCraftUnknown,
      tone: 'warning',
    };
  }

  const addRes = addInventoryResourceCapped(
    next,
    recipe.outputResourceId,
    recipe.outputAmount,
    packCapacity
  );
  if (addRes.added < recipe.outputAmount) {
    return {
      ok: false,
      nextInventory: inventory,
      message: formatTpl(t.gameMessages.toasts.craftPackFull, {
        used: getTotalInventoryItems(inventory),
        cap: packCapacity,
      }),
      tone: 'warning',
    };
  }

  const outName = tResourceName(recipe.outputResourceId, recipe.outputAmount);
  return {
    ok: true,
    nextInventory: addRes.nextInventory,
    message: formatTpl(t.gameMessages.toasts.craftedSuccess, {
      name: recipeTitle,
      qty: recipe.outputAmount,
      output: outName,
    }),
    tone: 'resource',
  };
}
