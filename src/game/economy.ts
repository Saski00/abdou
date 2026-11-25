import {
  RESOURCE_DEFINITIONS,
  RESOURCE_ORDER,
  addInventoryResource,
  consumeInventoryResource,
  createInitialInventory,
  getTotalInventoryItems,
} from './resources';
import { SavedEconomyState } from './saveSystem';
import {
  ActiveCustomerSummary,
  CustomerSaleRecord,
  InventoryState,
  ResourceId,
  ShopBusinessStats,
  ShopDecorationConfig,
  ShopLevelConfig,
  ShopSnapshot,
  ShopTransactionRecord,
  StorageUpgradeConfig,
} from './types';

export type ItemRarity = 'Common' | 'Uncommon' | 'Rare';

export interface ShopItemPriceDefinition {
  id: ResourceId;
  displayName: string;
  pluralName: string;
  basePrice: number;
  sellPrice: number;
  category: 'Food' | 'Water' | 'Material' | 'Medical';
  rarity: ItemRarity;
}

export const SHOP_ITEM_PRICES: Record<ResourceId, ShopItemPriceDefinition> = {
  canned_food: {
    id: 'canned_food',
    displayName: RESOURCE_DEFINITIONS.canned_food.name,
    pluralName: RESOURCE_DEFINITIONS.canned_food.pluralName,
    basePrice: 18,
    sellPrice: 14,
    category: 'Food',
    rarity: 'Common',
  },
  water_bottle: {
    id: 'water_bottle',
    displayName: RESOURCE_DEFINITIONS.water_bottle.name,
    pluralName: RESOURCE_DEFINITIONS.water_bottle.pluralName,
    basePrice: 14,
    sellPrice: 11,
    category: 'Water',
    rarity: 'Common',
  },
  wood: {
    id: 'wood',
    displayName: RESOURCE_DEFINITIONS.wood.name,
    pluralName: RESOURCE_DEFINITIONS.wood.pluralName,
    basePrice: 12,
    sellPrice: 9,
    category: 'Material',
    rarity: 'Common',
  },
  scrap_metal: {
    id: 'scrap_metal',
    displayName: RESOURCE_DEFINITIONS.scrap_metal.name,
    pluralName: RESOURCE_DEFINITIONS.scrap_metal.pluralName,
    basePrice: 20,
    sellPrice: 16,
    category: 'Material',
    rarity: 'Uncommon',
  },
  medical_supplies: {
    id: 'medical_supplies',
    displayName: RESOURCE_DEFINITIONS.medical_supplies.name,
    pluralName: RESOURCE_DEFINITIONS.medical_supplies.pluralName,
    basePrice: 36,
    sellPrice: 28,
    category: 'Medical',
    rarity: 'Rare',
  },
};

export const SHOP_LEVEL_CONFIGS: ShopLevelConfig[] = [
  {
    level: 1,
    name: 'Small Survival Shop',
    description: 'Starter outpost with single counter, backroom locker, and front display shelf.',
    upgradeCost: 0,
    customerCapacity: 2,
    employeeCapacity: 1,
    baseStorageCapacity: 12,
    shelfDisplaySlotsPerItem: 5,
    benefits: ['2 active customers · 1 staff slot', '12 base storage slots', 'Front display shelf'],
  },
  {
    level: 2,
    name: 'Improved Store',
    description: 'Expands front-room display shelving, interior trim, and warm wall lighting.',
    upgradeCost: 65,
    customerCapacity: 3,
    employeeCapacity: 2,
    baseStorageCapacity: 20,
    shelfDisplaySlotsPerItem: 10,
    benefits: [
      '3 active customers · 2 staff slots (+1)',
      '20 base storage slots (+8)',
      'Second retail shelf + warm wall lighting',
    ],
  },
  {
    level: 3,
    name: 'Large General Store',
    description: 'Opens a walkable North Showroom Wing behind the storeroom with expanded shelving.',
    upgradeCost: 140,
    customerCapacity: 4,
    employeeCapacity: 3,
    baseStorageCapacity: 30,
    shelfDisplaySlotsPerItem: 15,
    benefits: [
      '4 active customers · 3 staff slots (+1)',
      '30 base storage slots (+10)',
      'Walkable North Showroom Annex + extra shelf',
    ],
  },
  {
    level: 4,
    name: 'Advanced Trading Center',
    description: 'Adds a secondary counter wing, bright overhead strips, and exterior lit marquee.',
    upgradeCost: 240,
    customerCapacity: 5,
    employeeCapacity: 4,
    baseStorageCapacity: 44,
    shelfDisplaySlotsPerItem: 20,
    benefits: [
      '5 active customers · 4 staff slots (+1)',
      '44 base storage slots (+14)',
      'Secondary service counter + exterior marquee',
    ],
  },
  {
    level: 5,
    name: 'Major Survivor Trading Hub',
    description: 'Full regional trading hub with central showcase island, full racks, and hub banner.',
    upgradeCost: 380,
    customerCapacity: 6,
    employeeCapacity: 5,
    baseStorageCapacity: 60,
    shelfDisplaySlotsPerItem: 25,
    benefits: [
      '6 active customers · 5 staff slots (+1)',
      '60 base storage slots (+16)',
      'Central showcase island + Trading Hub signage',
    ],
  },
];

export const MAX_SHOP_LEVEL = SHOP_LEVEL_CONFIGS.length;

export const STORAGE_UPGRADE_TIERS: StorageUpgradeConfig[] = [
  {
    tier: 1,
    id: 'storage_tier_1',
    name: 'Reinforced Backroom Rack',
    description: 'Installs heavy steel shelving along the east storeroom wall.',
    cost: 45,
    capacityBonus: 12,
  },
  {
    tier: 2,
    id: 'storage_tier_2',
    name: 'West Wall Cargo Shelving',
    description: 'Adds multi-tier cargo shelving on the west storeroom wall.',
    cost: 85,
    capacityBonus: 18,
  },
  {
    tier: 3,
    id: 'storage_tier_3',
    name: 'Industrial Vault Lockers',
    description: 'Secures high-capacity steel supply lockers along the partition.',
    cost: 140,
    capacityBonus: 25,
  },
];

export const MAX_STORAGE_TIER = STORAGE_UPGRADE_TIERS.length;

export const SHOP_DECORATIONS: ShopDecorationConfig[] = [
  {
    id: 'deco_sign',
    name: 'Illuminated Open Sign',
    description: 'Powered window neon sign and storefront trim welcoming survivors.',
    cost: 35,
    category: 'Signage',
  },
  {
    id: 'deco_floor',
    name: 'Woven Market Runners',
    description: 'Clean heavy-duty floor runners through the front aisle and counter.',
    cost: 40,
    category: 'Interior',
  },
  {
    id: 'deco_lighting',
    name: 'Overhead Market Pendants',
    description: 'Suspended warm shop lamps brightening the front sales floor.',
    cost: 45,
    category: 'Lighting',
  },
  {
    id: 'deco_table',
    name: 'Window Display Table',
    description: 'Front-right showcase table with lantern and packed display goods.',
    cost: 55,
    category: 'Display',
  },
  {
    id: 'deco_shelves',
    name: 'West Wall Side Rack',
    description: 'Additional timber display rack fitted south of the main counter.',
    cost: 65,
    category: 'Display',
  },
  {
    id: 'deco_fridge',
    name: 'Restored Beverage Cooler',
    description: 'Glass-front powered chiller cabinet beside the retail aisle.',
    cost: 75,
    category: 'Equipment',
  },
];

export function getShopLevelConfig(level: number): ShopLevelConfig {
  const clamped = Math.max(1, Math.min(MAX_SHOP_LEVEL, Math.floor(level)));
  return SHOP_LEVEL_CONFIGS[clamped - 1];
}

export function getNextShopLevelConfig(level: number): ShopLevelConfig | null {
  if (level >= MAX_SHOP_LEVEL) return null;
  return SHOP_LEVEL_CONFIGS[level];
}

export function getNextStorageUpgradeConfig(tier: number): StorageUpgradeConfig | null {
  if (tier >= MAX_STORAGE_TIER) return null;
  return STORAGE_UPGRADE_TIERS[tier];
}

export function computeStorageCapacity(shopLevel: number, storageTier: number): number {
  const lvl = getShopLevelConfig(shopLevel);
  const clampedTier = Math.max(0, Math.min(MAX_STORAGE_TIER, Math.floor(storageTier)));
  let bonus = 0;
  for (let i = 0; i < clampedTier; i++) {
    bonus += STORAGE_UPGRADE_TIERS[i].capacityBonus;
  }
  return lvl.baseStorageCapacity + bonus;
}

export function computeStockValue(
  shopStock: InventoryState,
  prices: Record<ResourceId, ShopItemPriceDefinition> = SHOP_ITEM_PRICES
): number {
  let total = 0;
  for (const id of RESOURCE_ORDER) {
    const qty = Math.max(0, Math.floor(shopStock[id] ?? 0));
    const def = prices[id];
    if (def && qty > 0) {
      total += qty * def.sellPrice;
    }
  }
  return total;
}

export interface EconomyConfig {
  startingMoney: number;
  allowNegativeMoney: boolean;
  prices: Record<ResourceId, ShopItemPriceDefinition>;
}

export const DEFAULT_ECONOMY_CONFIG: EconomyConfig = {
  startingMoney: 50,
  allowNegativeMoney: false,
  prices: SHOP_ITEM_PRICES,
};

export interface ShopTransferResult {
  ok: boolean;
  nextInventory: InventoryState;
  record: ShopTransactionRecord;
}

export interface ShopSaleResult {
  ok: boolean;
  earned: number;
  record: ShopTransactionRecord;
}

export interface ShopUpgradeResult {
  ok: boolean;
  record: ShopTransactionRecord;
}

export function formatMoney(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded}`;
}

export function createInitialShopSnapshot(startingMoney = DEFAULT_ECONOMY_CONFIG.startingMoney): ShopSnapshot {
  const lvl1 = getShopLevelConfig(1);
  const cleanMoney = Math.max(0, Math.round(startingMoney));
  return {
    money: cleanMoney,
    shopLevel: 1,
    shopLevelName: lvl1.name,
    maxShopLevel: MAX_SHOP_LEVEL,
    storageTier: 0,
    maxStorageTier: MAX_STORAGE_TIER,
    storageCapacity: lvl1.baseStorageCapacity,
    customerCapacity: lvl1.customerCapacity,
    employeeCapacity: lvl1.employeeCapacity,
    trafficBonusPct: 0,
    ownedDecorations: [],
    shopManualOpen: true,
    shopAcceptingCustomers: true,
    shopStatusReason: 'Open for survivors (06:00 - 19:30)',
    shopStock: createInitialInventory(),
    shopStorage: createInitialInventory(),
    totalStockItems: 0,
    totalStorageItems: 0,
    totalSalesCount: 0,
    totalRevenueEarned: 0,
    customerSalesCount: 0,
    customerItemsSold: 0,
    customerRevenueEarned: 0,
    recentCustomerSales: [],
    activeCustomers: [],
    stats: {
      totalRevenue: 0,
      totalItemsSold: 0,
      customersServed: 0,
      currentShopLevel: 1,
      currentStockValue: 0,
      totalMoneyAvailable: cleanMoney,
    },
    lastTransaction: null,
  };
}

function sanitizeQuantity(quantity: number): number {
  if (!Number.isFinite(quantity)) return 0;
  return Math.max(0, Math.floor(quantity));
}

export class ShopEconomySystem {
  private readonly cfg: EconomyConfig;
  private money: number;
  private shopLevel = 1;
  private storageTier = 0;
  private ownedDecorations = new Set<string>();
  private shopStock: InventoryState;
  private shopStorage: InventoryState;
  private totalSalesCount = 0;
  private totalRevenueEarned = 0;
  private customerSalesCount = 0;
  private customerItemsSold = 0;
  private customerRevenueEarned = 0;
  private recentCustomerSales: CustomerSaleRecord[] = [];
  private shopManualOpen = true;
  private lastTransaction: ShopTransactionRecord | null = null;
  private nextTxId = 1;

  constructor(config: Partial<EconomyConfig> = {}) {
    this.cfg = {
      startingMoney: config.startingMoney ?? DEFAULT_ECONOMY_CONFIG.startingMoney,
      allowNegativeMoney: config.allowNegativeMoney ?? DEFAULT_ECONOMY_CONFIG.allowNegativeMoney,
      prices: config.prices ?? DEFAULT_ECONOMY_CONFIG.prices,
    };
    this.money = Math.max(0, Math.round(this.cfg.startingMoney));
    this.shopStock = createInitialInventory();
    this.shopStorage = createInitialInventory();
  }

  public reset(): void {
    this.money = Math.max(0, Math.round(this.cfg.startingMoney));
    this.shopLevel = 1;
    this.storageTier = 0;
    this.ownedDecorations.clear();
    this.shopStock = createInitialInventory();
    this.shopStorage = createInitialInventory();
    this.totalSalesCount = 0;
    this.totalRevenueEarned = 0;
    this.customerSalesCount = 0;
    this.customerItemsSold = 0;
    this.customerRevenueEarned = 0;
    this.recentCustomerSales = [];
    this.shopManualOpen = true;
    this.lastTransaction = null;
  }

  public getShopLevel(): number {
    return this.shopLevel;
  }

  public getStorageTier(): number {
    return this.storageTier;
  }

  public getStorageCapacity(): number {
    return computeStorageCapacity(this.shopLevel, this.storageTier);
  }

  public getCustomerCapacity(): number {
    return getShopLevelConfig(this.shopLevel).customerCapacity;
  }

  public getEmployeeCapacity(): number {
    return getShopLevelConfig(this.shopLevel).employeeCapacity;
  }

  public getOwnedDecorations(): string[] {
    return Array.from(this.ownedDecorations);
  }

  public getCustomerTrafficMultiplier(): number {
    let varietyCount = 0;
    for (const id of RESOURCE_ORDER) {
      if ((this.shopStock[id] ?? 0) > 0) varietyCount += 1;
    }
    const levelBonus = Math.max(0, this.shopLevel - 1) * 0.06;
    const decorBonus = this.ownedDecorations.size * 0.03;
    const varietyBonus = varietyCount * 0.025;
    return Math.min(1.45, Number((1 + levelBonus + decorBonus + varietyBonus).toFixed(2)));
  }

  public payRecruitmentFee(
    survivorName: string,
    amount: number,
    timeLabel = ''
  ): { ok: boolean; record: ShopTransactionRecord } {
    const clean = Math.max(0, Math.round(amount));
    if (clean > 0) {
      const spendRes = this.spendMoney(clean);
      if (!spendRes.ok) {
        return {
          ok: false,
          record: this.recordError(
            `Need ${formatMoney(clean)} to recruit ${survivorName}`,
            timeLabel
          ),
        };
      }
    }
    return {
      ok: true,
      record: this.recordTx({
        kind: 'staff',
        moneyDelta: -clean,
        message:
          clean > 0
            ? `Recruited ${survivorName} (${formatMoney(clean)})`
            : `Recruited ${survivorName}`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public payEmployeeSalary(
    employeeName: string,
    salary: number,
    timeLabel = ''
  ): { ok: boolean; record: ShopTransactionRecord } {
    const clean = Math.max(1, Math.round(salary));
    const spendRes = this.spendMoney(clean);
    if (!spendRes.ok) {
      return {
        ok: false,
        record: this.recordError(
          `Insufficient funds for ${employeeName}'s salary (${formatMoney(clean)})`,
          timeLabel
        ),
      };
    }
    return {
      ok: true,
      record: this.recordTx({
        kind: 'salary',
        moneyDelta: -clean,
        message: `Paid ${employeeName} salary (${formatMoney(clean)})`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public depositCollectedToStorage(
    resourceId: ResourceId,
    quantity: number,
    collectorName: string,
    timeLabel = ''
  ): { ok: boolean; deposited: number; record: ShopTransactionRecord } {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    if (qty <= 0) {
      return {
        ok: false,
        deposited: 0,
        record: this.recordError('Nothing collected to deposit', timeLabel),
      };
    }

    const usedStorage = getTotalInventoryItems(this.shopStorage);
    const maxCap = this.getStorageCapacity();
    const free = Math.max(0, maxCap - usedStorage);
    if (free <= 0) {
      return {
        ok: false,
        deposited: 0,
        record: this.recordError(
          `${collectorName}: backroom storage full (${usedStorage}/${maxCap})`,
          timeLabel
        ),
      };
    }

    const deposited = Math.min(qty, free);
    this.shopStorage = addInventoryResource(this.shopStorage, resourceId, deposited);
    const itemName = deposited === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      deposited,
      record: this.recordTx({
        kind: 'staff',
        resourceId,
        itemName: def.displayName,
        quantity: deposited,
        moneyDelta: 0,
        message: `${collectorName} stored ${deposited} ${itemName} in backroom`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public recordStaffNotice(message: string, timeLabel = ''): ShopTransactionRecord {
    return this.recordTx({
      kind: 'staff',
      moneyDelta: 0,
      message,
      timestampLabel: timeLabel,
    });
  }

  public grantMissionReward(
    moneyAmount: number,
    message: string,
    timeLabel = ''
  ): ShopTransactionRecord {
    const clean = Math.max(0, Math.round(moneyAmount));
    if (clean > 0) {
      this.addMoney(clean);
    }
    return this.recordTx({
      kind: 'mission',
      moneyDelta: clean,
      message,
      timestampLabel: timeLabel,
    });
  }

  public upgradeShopLevel(timeLabel = ''): ShopUpgradeResult {
    const nextCfg = getNextShopLevelConfig(this.shopLevel);
    if (!nextCfg) {
      return {
        ok: false,
        record: this.recordError('Shop is already at maximum level (Level 5)', timeLabel),
      };
    }

    const spendRes = this.spendMoney(nextCfg.upgradeCost);
    if (!spendRes.ok) {
      return {
        ok: false,
        record: this.recordError(
          `Need ${formatMoney(nextCfg.upgradeCost)} to upgrade to ${nextCfg.name}`,
          timeLabel
        ),
      };
    }

    this.shopLevel = nextCfg.level;
    return {
      ok: true,
      record: this.recordTx({
        kind: 'upgrade',
        moneyDelta: -nextCfg.upgradeCost,
        message: `Upgraded to Level ${nextCfg.level}: ${nextCfg.name}`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public upgradeStorageTier(timeLabel = ''): ShopUpgradeResult {
    const nextCfg = getNextStorageUpgradeConfig(this.storageTier);
    if (!nextCfg) {
      return {
        ok: false,
        record: this.recordError('Storage racks are already at maximum tier', timeLabel),
      };
    }

    const spendRes = this.spendMoney(nextCfg.cost);
    if (!spendRes.ok) {
      return {
        ok: false,
        record: this.recordError(
          `Need ${formatMoney(nextCfg.cost)} for ${nextCfg.name}`,
          timeLabel
        ),
      };
    }

    this.storageTier = nextCfg.tier;
    const newCap = this.getStorageCapacity();
    return {
      ok: true,
      record: this.recordTx({
        kind: 'upgrade',
        moneyDelta: -nextCfg.cost,
        message: `Installed ${nextCfg.name} (${newCap} storage capacity)`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public purchaseDecoration(decorationId: string, timeLabel = ''): ShopUpgradeResult {
    const deco = SHOP_DECORATIONS.find((d) => d.id === decorationId);
    if (!deco) {
      return {
        ok: false,
        record: this.recordError('Unknown shop decoration', timeLabel),
      };
    }

    if (this.ownedDecorations.has(deco.id)) {
      return {
        ok: false,
        record: this.recordError(`${deco.name} is already installed`, timeLabel),
      };
    }

    const spendRes = this.spendMoney(deco.cost);
    if (!spendRes.ok) {
      return {
        ok: false,
        record: this.recordError(
          `Need ${formatMoney(deco.cost)} for ${deco.name}`,
          timeLabel
        ),
      };
    }

    this.ownedDecorations.add(deco.id);
    return {
      ok: true,
      record: this.recordTx({
        kind: 'upgrade',
        moneyDelta: -deco.cost,
        message: `Installed ${deco.name} in shop`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public isShopManualOpen(): boolean {
    return this.shopManualOpen;
  }

  public setShopManualOpen(open: boolean, timeLabel = ''): boolean {
    this.shopManualOpen = open;
    this.recordTx({
      kind: 'transfer',
      moneyDelta: 0,
      message: open ? 'Shop opened for survivor customers' : 'Shop closed to new customers',
      timestampLabel: timeLabel,
    });
    return this.shopManualOpen;
  }

  public getMoney(): number {
    return this.money;
  }

  public getPriceDefinition(id: ResourceId): ShopItemPriceDefinition {
    return this.cfg.prices[id];
  }

  public addMoney(amount: number): number {
    if (!Number.isFinite(amount) || amount <= 0) return this.money;
    this.money = Math.round(this.money + amount);
    return this.money;
  }

  public spendMoney(amount: number): { ok: boolean; error?: string; balance: number } {
    const clean = Number.isFinite(amount) ? Math.round(amount) : 0;
    if (clean <= 0) {
      return { ok: false, error: 'Invalid spend amount', balance: this.money };
    }
    if (!this.cfg.allowNegativeMoney && this.money < clean) {
      return {
        ok: false,
        error: `Insufficient funds (need ${formatMoney(clean)})`,
        balance: this.money,
      };
    }
    this.money -= clean;
    return { ok: true, balance: this.money };
  }

  public getShopStock(): InventoryState {
    return { ...this.shopStock };
  }

  public getShopStorage(): InventoryState {
    return { ...this.shopStorage };
  }

  public transferInventoryToStock(
    inventory: InventoryState,
    resourceId: ResourceId,
    quantity: number,
    timeLabel = ''
  ): ShopTransferResult {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, inventory[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError('Select at least 1 item to stock', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Not enough ${def.displayName} in pack (${available} available)`,
          timeLabel
        ),
      };
    }

    const nextInventory = consumeInventoryResource(inventory, resourceId, qty);
    this.shopStock = addInventoryResource(this.shopStock, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      nextInventory,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Stocked ${qty} ${itemName} on shop shelf`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public transferStockToInventory(
    inventory: InventoryState,
    resourceId: ResourceId,
    quantity: number,
    timeLabel = '',
    packCapacity = Infinity
  ): ShopTransferResult {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, this.shopStock[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError('Select at least 1 item to take', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Only ${available} ${def.displayName} in shop stock`,
          timeLabel
        ),
      };
    }

    const packUsed = getTotalInventoryItems(inventory);
    if (Number.isFinite(packCapacity) && packUsed + qty > packCapacity) {
      const free = Math.max(0, Math.floor(packCapacity) - packUsed);
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Pack full (${packUsed}/${packCapacity} · ${free} slot${free === 1 ? '' : 's'} left)`,
          timeLabel
        ),
      };
    }

    this.shopStock = consumeInventoryResource(this.shopStock, resourceId, qty);
    const nextInventory = addInventoryResource(inventory, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      nextInventory,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Returned ${qty} ${itemName} to pack`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public transferInventoryToStorage(
    inventory: InventoryState,
    resourceId: ResourceId,
    quantity: number,
    timeLabel = ''
  ): ShopTransferResult {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, inventory[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError('Select at least 1 item to store', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Not enough ${def.displayName} in pack (${available} available)`,
          timeLabel
        ),
      };
    }

    const usedStorage = getTotalInventoryItems(this.shopStorage);
    const maxCap = this.getStorageCapacity();
    if (usedStorage + qty > maxCap) {
      const free = Math.max(0, maxCap - usedStorage);
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Storage full (${usedStorage}/${maxCap} used · ${free} space left)`,
          timeLabel
        ),
      };
    }

    const nextInventory = consumeInventoryResource(inventory, resourceId, qty);
    this.shopStorage = addInventoryResource(this.shopStorage, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      nextInventory,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Stored ${qty} ${itemName} in backroom locker`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public transferStorageToInventory(
    inventory: InventoryState,
    resourceId: ResourceId,
    quantity: number,
    timeLabel = '',
    packCapacity = Infinity
  ): ShopTransferResult {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, this.shopStorage[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError('Select at least 1 item to retrieve', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Only ${available} ${def.displayName} in storage`,
          timeLabel
        ),
      };
    }

    const packUsed = getTotalInventoryItems(inventory);
    if (Number.isFinite(packCapacity) && packUsed + qty > packCapacity) {
      const free = Math.max(0, Math.floor(packCapacity) - packUsed);
      return {
        ok: false,
        nextInventory: inventory,
        record: this.recordError(
          `Pack full (${packUsed}/${packCapacity} · ${free} slot${free === 1 ? '' : 's'} left)`,
          timeLabel
        ),
      };
    }

    this.shopStorage = consumeInventoryResource(this.shopStorage, resourceId, qty);
    const nextInventory = addInventoryResource(inventory, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      nextInventory,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Retrieved ${qty} ${itemName} from storage`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public transferStorageToStock(
    resourceId: ResourceId,
    quantity: number,
    timeLabel = ''
  ): { ok: boolean; record: ShopTransactionRecord } {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, this.shopStorage[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        record: this.recordError('Select at least 1 item to move to shelf', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        record: this.recordError(`Only ${available} ${def.displayName} in storage`, timeLabel),
      };
    }

    this.shopStorage = consumeInventoryResource(this.shopStorage, resourceId, qty);
    this.shopStock = addInventoryResource(this.shopStock, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Moved ${qty} ${itemName} from storage to shop stock`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public transferStockToStorage(
    resourceId: ResourceId,
    quantity: number,
    timeLabel = ''
  ): { ok: boolean; record: ShopTransactionRecord } {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, this.shopStock[resourceId] ?? 0);

    if (qty <= 0) {
      return {
        ok: false,
        record: this.recordError('Select at least 1 item to move to storage', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        record: this.recordError(`Only ${available} ${def.displayName} in shop stock`, timeLabel),
      };
    }

    const usedStorage = getTotalInventoryItems(this.shopStorage);
    const maxCap = this.getStorageCapacity();
    if (usedStorage + qty > maxCap) {
      const free = Math.max(0, maxCap - usedStorage);
      return {
        ok: false,
        record: this.recordError(
          `Storage full (${usedStorage}/${maxCap} used · ${free} space left)`,
          timeLabel
        ),
      };
    }

    this.shopStock = consumeInventoryResource(this.shopStock, resourceId, qty);
    this.shopStorage = addInventoryResource(this.shopStorage, resourceId, qty);
    const itemName = qty === 1 ? def.displayName : def.pluralName;

    return {
      ok: true,
      record: this.recordTx({
        kind: 'transfer',
        resourceId,
        itemName: def.displayName,
        quantity: qty,
        moneyDelta: 0,
        message: `Moved ${qty} ${itemName} from shop stock to storage`,
        timestampLabel: timeLabel,
      }),
    };
  }

  public sellStockItem(
    resourceId: ResourceId,
    quantity: number,
    timeLabel = '',
    options: { source?: 'manual' | 'customer'; buyerName?: string } = {}
  ): ShopSaleResult {
    const qty = sanitizeQuantity(quantity);
    const def = this.cfg.prices[resourceId];
    const available = Math.max(0, this.shopStock[resourceId] ?? 0);
    const source = options.source ?? 'manual';
    const buyerName = options.buyerName?.trim() || 'Survivor';

    if (qty <= 0) {
      return {
        ok: false,
        earned: 0,
        record: this.recordError('Select at least 1 item to sell', timeLabel),
      };
    }

    if (available < qty) {
      return {
        ok: false,
        earned: 0,
        record: this.recordError(
          `Cannot sell ${qty} ${def.displayName} (${available} in stock)`,
          timeLabel
        ),
      };
    }

    const earned = qty * def.sellPrice;
    this.shopStock = consumeInventoryResource(this.shopStock, resourceId, qty);
    this.addMoney(earned);
    this.totalSalesCount += qty;
    this.totalRevenueEarned += earned;

    const itemName = qty === 1 ? def.displayName : def.pluralName;
    const record = this.recordTx({
      kind: 'sale',
      source,
      customerName: source === 'customer' ? buyerName : undefined,
      resourceId,
      itemName: def.displayName,
      quantity: qty,
      unitPrice: def.sellPrice,
      moneyDelta: earned,
      message:
        source === 'customer'
          ? `${buyerName} bought ${qty} ${itemName} (+${formatMoney(earned)})`
          : `Sold ${qty} ${itemName} for ${formatMoney(earned)}`,
      timestampLabel: timeLabel,
    });

    if (source === 'customer') {
      this.customerSalesCount += 1;
      this.customerItemsSold += qty;
      this.customerRevenueEarned += earned;
      this.recentCustomerSales = [
        {
          id: record.id,
          customerName: buyerName,
          resourceId,
          itemName: def.displayName,
          quantity: qty,
          unitPrice: def.sellPrice,
          totalRevenue: earned,
          timestampLabel: timeLabel,
        },
        ...this.recentCustomerSales,
      ].slice(0, 10);
    }

    return {
      ok: true,
      earned,
      record,
    };
  }

  public getSnapshot(
    activeCustomers: ActiveCustomerSummary[] = [],
    shopAcceptingCustomers = this.shopManualOpen,
    shopStatusReason = this.shopManualOpen ? 'Open for survivors' : 'Closed by owner'
  ): ShopSnapshot {
    const stockCopy: InventoryState = createInitialInventory();
    const storageCopy: InventoryState = createInitialInventory();
    for (const id of RESOURCE_ORDER) {
      stockCopy[id] = Math.max(0, this.shopStock[id] ?? 0);
      storageCopy[id] = Math.max(0, this.shopStorage[id] ?? 0);
    }

    const levelCfg = getShopLevelConfig(this.shopLevel);
    const storageCapacity = this.getStorageCapacity();
    const stockValue = computeStockValue(stockCopy, this.cfg.prices);
    const stats: ShopBusinessStats = {
      totalRevenue: this.totalRevenueEarned,
      totalItemsSold: this.totalSalesCount,
      customersServed: this.customerSalesCount,
      currentShopLevel: this.shopLevel,
      currentStockValue: stockValue,
      totalMoneyAvailable: this.money,
    };

    return {
      money: this.money,
      shopLevel: this.shopLevel,
      shopLevelName: levelCfg.name,
      maxShopLevel: MAX_SHOP_LEVEL,
      storageTier: this.storageTier,
      maxStorageTier: MAX_STORAGE_TIER,
      storageCapacity,
      customerCapacity: levelCfg.customerCapacity,
      employeeCapacity: levelCfg.employeeCapacity,
      trafficBonusPct: Math.round((this.getCustomerTrafficMultiplier() - 1) * 100),
      ownedDecorations: this.getOwnedDecorations(),
      shopManualOpen: this.shopManualOpen,
      shopAcceptingCustomers,
      shopStatusReason,
      shopStock: stockCopy,
      shopStorage: storageCopy,
      totalStockItems: getTotalInventoryItems(stockCopy),
      totalStorageItems: getTotalInventoryItems(storageCopy),
      totalSalesCount: this.totalSalesCount,
      totalRevenueEarned: this.totalRevenueEarned,
      customerSalesCount: this.customerSalesCount,
      customerItemsSold: this.customerItemsSold,
      customerRevenueEarned: this.customerRevenueEarned,
      recentCustomerSales: this.recentCustomerSales,
      activeCustomers,
      stats,
      lastTransaction: this.lastTransaction,
    };
  }

  public exportState(): SavedEconomyState {
    return {
      money: this.money,
      shopLevel: this.shopLevel,
      storageTier: this.storageTier,
      ownedDecorations: this.getOwnedDecorations(),
      shopManualOpen: this.shopManualOpen,
      shopStock: this.getShopStock(),
      shopStorage: this.getShopStorage(),
      totalSalesCount: this.totalSalesCount,
      totalRevenueEarned: this.totalRevenueEarned,
      customerSalesCount: this.customerSalesCount,
      customerItemsSold: this.customerItemsSold,
      customerRevenueEarned: this.customerRevenueEarned,
    };
  }

  public importState(raw: Partial<SavedEconomyState> | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.money === 'number' && Number.isFinite(raw.money)) {
      this.money = Math.max(0, Math.round(raw.money));
    }
    if (typeof raw.shopLevel === 'number' && Number.isFinite(raw.shopLevel)) {
      this.shopLevel = Math.max(1, Math.min(MAX_SHOP_LEVEL, Math.floor(raw.shopLevel)));
    }
    if (typeof raw.storageTier === 'number' && Number.isFinite(raw.storageTier)) {
      this.storageTier = Math.max(0, Math.min(MAX_STORAGE_TIER, Math.floor(raw.storageTier)));
    }
    if (Array.isArray(raw.ownedDecorations)) {
      for (const id of raw.ownedDecorations) {
        if (typeof id === 'string' && SHOP_DECORATIONS.some((d) => d.id === id)) {
          this.ownedDecorations.add(id);
        }
      }
    }
    if (typeof raw.shopManualOpen === 'boolean') {
      this.shopManualOpen = raw.shopManualOpen;
    }
    if (raw.shopStock && typeof raw.shopStock === 'object') {
      for (const id of RESOURCE_ORDER) {
        const val = raw.shopStock[id];
        this.shopStock[id] = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
      }
    }
    if (raw.shopStorage && typeof raw.shopStorage === 'object') {
      for (const id of RESOURCE_ORDER) {
        const val = raw.shopStorage[id];
        this.shopStorage[id] = typeof val === 'number' && Number.isFinite(val) ? Math.max(0, Math.floor(val)) : 0;
      }
    }
    if (typeof raw.totalSalesCount === 'number' && Number.isFinite(raw.totalSalesCount)) {
      this.totalSalesCount = Math.max(0, Math.floor(raw.totalSalesCount));
    }
    if (typeof raw.totalRevenueEarned === 'number' && Number.isFinite(raw.totalRevenueEarned)) {
      this.totalRevenueEarned = Math.max(0, Math.round(raw.totalRevenueEarned));
    }
    if (typeof raw.customerSalesCount === 'number' && Number.isFinite(raw.customerSalesCount)) {
      this.customerSalesCount = Math.max(0, Math.floor(raw.customerSalesCount));
    }
    if (typeof raw.customerItemsSold === 'number' && Number.isFinite(raw.customerItemsSold)) {
      this.customerItemsSold = Math.max(0, Math.floor(raw.customerItemsSold));
    }
    if (typeof raw.customerRevenueEarned === 'number' && Number.isFinite(raw.customerRevenueEarned)) {
      this.customerRevenueEarned = Math.max(0, Math.round(raw.customerRevenueEarned));
    }
  }

  private recordError(message: string, timestampLabel: string): ShopTransactionRecord {
    return this.recordTx({
      kind: 'error',
      moneyDelta: 0,
      message,
      timestampLabel,
    });
  }

  private recordTx(
    tx: Omit<ShopTransactionRecord, 'id'>
  ): ShopTransactionRecord {
    const record: ShopTransactionRecord = {
      ...tx,
      id: this.nextTxId++,
    };
    this.lastTransaction = record;
    return record;
  }
}
