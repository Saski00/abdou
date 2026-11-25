import { RESOURCE_DEFINITIONS, addInventoryResourceCapped, consumeInventoryResource, getTotalInventoryItems } from './resources';
import { InventoryState, ResourceId } from './types';

export interface WorkbenchRecipeIngredient {
  resourceId: ResourceId;
  amount: number;
}

export interface WorkbenchRecipe {
  id: string;
  name: string;
  description: string;
  outputResourceId: ResourceId;
  outputAmount: number;
  ingredients: WorkbenchRecipeIngredient[];
}

export const WORKBENCH_RECIPES: WorkbenchRecipe[] = [
  {
    id: 'craft_medkit',
    name: 'Assemble Field Medkit',
    description: 'Brace splints and sterile gauze using timber and clean scrap shears.',
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
    outputResourceId: 'water_bottle',
    outputAmount: 1,
    ingredients: [{ resourceId: 'wood', amount: 2 }],
  },
  {
    id: 'craft_ration',
    name: 'Preserve Tin Ration',
    description: 'Seal dry emergency rations in reclaimed tinware over a bench burner.',
    outputResourceId: 'canned_food',
    outputAmount: 1,
    ingredients: [
      { resourceId: 'scrap_metal', amount: 1 },
      { resourceId: 'wood', amount: 1 },
    ],
  },
];

export interface WorkbenchCraftResult {
  ok: boolean;
  nextInventory: InventoryState;
  message: string;
  tone: 'resource' | 'world' | 'warning';
}

export function canCraftRecipe(
  recipe: WorkbenchRecipe,
  inventory: InventoryState,
  packCapacity: number
): { ok: boolean; reason: string | null } {
  let inputCount = 0;
  for (const ing of recipe.ingredients) {
    inputCount += ing.amount;
    const have = Math.max(0, inventory[ing.resourceId] ?? 0);
    if (have < ing.amount) {
      const def = RESOURCE_DEFINITIONS[ing.resourceId];
      return {
        ok: false,
        reason: `Need ${ing.amount} ${ing.amount === 1 ? def.name : def.pluralName}`,
      };
    }
  }

  const currentItems = getTotalInventoryItems(inventory);
  const netAfter = currentItems - inputCount + recipe.outputAmount;
  if (netAfter > packCapacity) {
    return {
      ok: false,
      reason: `Pack full (${currentItems}/${packCapacity})`,
    };
  }

  return { ok: true, reason: null };
}

export function craftWorkbenchRecipe(
  recipeId: string,
  inventory: InventoryState,
  packCapacity: number
): WorkbenchCraftResult {
  const recipe = WORKBENCH_RECIPES.find((r) => r.id === recipeId);
  if (!recipe) {
    return {
      ok: false,
      nextInventory: inventory,
      message: 'Unknown workbench recipe',
      tone: 'warning',
    };
  }

  const check = canCraftRecipe(recipe, inventory, packCapacity);
  if (!check.ok) {
    return {
      ok: false,
      nextInventory: inventory,
      message: check.reason ?? 'Cannot craft right now',
      tone: 'warning',
    };
  }

  let next = { ...inventory };
  for (const ing of recipe.ingredients) {
    next = consumeInventoryResource(next, ing.resourceId, ing.amount);
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
      message: `Pack full (${getTotalInventoryItems(inventory)}/${packCapacity})`,
      tone: 'warning',
    };
  }

  const outDef = RESOURCE_DEFINITIONS[recipe.outputResourceId];
  return {
    ok: true,
    nextInventory: addRes.nextInventory,
    message: `Crafted +${recipe.outputAmount} ${outDef.name}`,
    tone: 'resource',
  };
}
