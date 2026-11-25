import { InventoryState, ResourceId } from './types';
import { tResource, tResourceName } from '../i18n';

export interface ResourceDefinition {
  id: ResourceId;
  assetId: string;
  name: string;
  pluralName: string;
  category: 'Food' | 'Water' | 'Material' | 'Medical';
  accentColor: string;
}

export const RESOURCE_DEFINITIONS: Record<ResourceId, ResourceDefinition> = {
  canned_food: {
    id: 'canned_food',
    assetId: 'resource.canned_food',
    name: 'Canned Food',
    pluralName: 'Canned Food',
    category: 'Food',
    accentColor: '#f59e0b',
  },
  water_bottle: {
    id: 'water_bottle',
    assetId: 'resource.water_bottle',
    name: 'Water Bottle',
    pluralName: 'Water Bottles',
    category: 'Water',
    accentColor: '#38bdf8',
  },
  scrap_metal: {
    id: 'scrap_metal',
    assetId: 'resource.scrap_metal',
    name: 'Scrap Metal',
    pluralName: 'Scrap Metal',
    category: 'Material',
    accentColor: '#94a3b8',
  },
  wood: {
    id: 'wood',
    assetId: 'resource.wood',
    name: 'Wood',
    pluralName: 'Wood',
    category: 'Material',
    accentColor: '#d97706',
  },
  medical_supplies: {
    id: 'medical_supplies',
    assetId: 'resource.medical_supplies',
    name: 'Medical Supplies',
    pluralName: 'Medical Supplies',
    category: 'Medical',
    accentColor: '#fb7185',
  },
};

export const RESOURCE_ORDER: ResourceId[] = [
  'canned_food',
  'water_bottle',
  'scrap_metal',
  'wood',
  'medical_supplies',
];

export const BASE_PACK_CAPACITY = 16;

export function getPackCapacity(shopLevel: number): number {
  const safeLevel = Math.max(1, Math.floor(shopLevel));
  return BASE_PACK_CAPACITY + (safeLevel - 1) * 2;
}

export const RESOURCE_PURPOSE_HINTS: Record<ResourceId, string> = {
  canned_food: 'Eat (+42 Hunger) or stock on shelf ($10)',
  water_bottle: 'Drink (+45 Thirst) or stock on shelf ($8)',
  scrap_metal: 'Sell ($12), recruit staff, or repair North Relay',
  wood: 'Sell ($9), recruit staff, or brace North Relay',
  medical_supplies: 'Use (+35 Health) or sell high ($22)',
};

export function getLocalizedResourcePurposeHint(id: ResourceId): string {
  return tResource(id).purposeHint || RESOURCE_PURPOSE_HINTS[id];
}

export function createInitialInventory(): InventoryState {
  return {
    canned_food: 0,
    water_bottle: 0,
    scrap_metal: 0,
    wood: 0,
    medical_supplies: 0,
  };
}

export function createStarterInventory(): InventoryState {
  return {
    canned_food: 1,
    water_bottle: 1,
    scrap_metal: 0,
    wood: 1,
    medical_supplies: 0,
  };
}

export function addInventoryResource(
  inventory: InventoryState,
  id: ResourceId,
  amount: number
): InventoryState {
  const safeDelta = Math.max(0, Math.floor(amount));
  const current = Math.max(0, inventory[id] ?? 0);
  return {
    ...inventory,
    [id]: current + safeDelta,
  };
}

export function addInventoryResourceCapped(
  inventory: InventoryState,
  id: ResourceId,
  amount: number,
  maxCapacity: number
): { nextInventory: InventoryState; added: number; overflow: number } {
  const safeDelta = Math.max(0, Math.floor(amount));
  const currentTotal = getTotalInventoryItems(inventory);
  const free = Math.max(0, Math.floor(maxCapacity) - currentTotal);
  const added = Math.min(safeDelta, free);
  const overflow = safeDelta - added;
  if (added <= 0) {
    return { nextInventory: inventory, added: 0, overflow: safeDelta };
  }
  return {
    nextInventory: addInventoryResource(inventory, id, added),
    added,
    overflow,
  };
}

export function consumeInventoryResource(
  inventory: InventoryState,
  id: ResourceId,
  amount = 1
): InventoryState {
  const safeDelta = Math.max(0, Math.floor(amount));
  const current = Math.max(0, inventory[id] ?? 0);
  return {
    ...inventory,
    [id]: Math.max(0, current - safeDelta),
  };
}

export function getTotalInventoryItems(inventory: InventoryState): number {
  let total = 0;
  for (const id of RESOURCE_ORDER) {
    total += Math.max(0, inventory[id] ?? 0);
  }
  return total;
}

export function formatResourceCollectedLabel(id: ResourceId, amount: number): string {
  const count = Math.max(1, Math.floor(amount));
  const label = tResourceName(id, count);
  return `+${count} ${label}`;
}
