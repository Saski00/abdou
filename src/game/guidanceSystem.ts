import { GuidanceHintSummary } from './types';
import { tGuidanceHint } from '../i18n';

export interface GuidanceContext {
  playerDistanceMoved: number;
  insideShop: boolean;
  insideAnyBuilding: boolean;
  totalCollected: number;
  totalStockItems: number;
  totalSalesCount: number;
  money: number;
  shopLevel: number;
  employeeCount: number;
  hunger: number;
  thirst: number;
  energy: number;
  health: number;
  inventoryTotal: number;
  packCapacity?: number;
  inventoryOpenedCount: number;
  mapOpenedCount: number;
  missionsOpenedCount: number;
  nearbyZombieAlert: boolean;
  inActiveCombat: boolean;
  hasAttacked: boolean;
  hasConsumed: boolean;
  isTouchMode: boolean;
  isDayNightDark: boolean;
  flashlightOn: boolean;
}

interface GuidanceRule {
  id: string;
  priority: number;
  title: string;
  getMessage: (touch: boolean) => string;
  condition: (ctx: GuidanceContext) => boolean;
  isCompleted: (ctx: GuidanceContext) => boolean;
}

const GUIDANCE_RULES: GuidanceRule[] = [
  {
    id: 'combat_alert',
    priority: 100,
    title: 'Infected Nearby',
    getMessage: (touch) =>
      touch
        ? 'An infected noticed you! Tap Attack to swing your pipe or sprint away using the outer joystick ring.'
        : 'An infected noticed you! Left-Click or press Q to swing your pipe, or hold Shift to sprint clear.',
    condition: (ctx) => ctx.nearbyZombieAlert && !ctx.hasAttacked,
    isCompleted: (ctx) => ctx.hasAttacked,
  },
  {
    id: 'survival_critical',
    priority: 90,
    title: 'Watch Survival Needs',
    getMessage: (touch) =>
      touch
        ? 'Your hunger, thirst, or energy is getting low. Use the quick-use food/water buttons top-left or tap Rest.'
        : 'Hunger, thirst, or energy is dropping. Press 1 (Food), 2 (Water), 3 (Medkit), or R to Rest when safe.',
    condition: (ctx) =>
      ctx.hunger < 62 || ctx.thirst < 62 || ctx.energy < 45 || ctx.health < 65,
    isCompleted: (ctx) => ctx.hasConsumed,
  },
  {
    id: 'move_and_look',
    priority: 80,
    title: 'Explore District 04',
    getMessage: (touch) =>
      touch
        ? 'Drag the left joystick to walk (outer edge to sprint). Drag the right side of the screen to look around.'
        : 'Click the viewport to lock mouse look, move with WASD, and hold Shift to sprint.',
    condition: (ctx) => ctx.playerDistanceMoved < 4.5,
    isCompleted: (ctx) => ctx.playerDistanceMoved >= 4.5,
  },
  {
    id: 'enter_shop_hint',
    priority: 70,
    title: 'Your Base: The Last Shop',
    getMessage: (touch) =>
      touch
        ? 'Walk up to The Last Shop front door ahead, tap Interact to open it, and step inside.'
        : 'Walk to The Last Shop front door ahead, press E to open it, and step inside your safe base.',
    condition: (ctx) => !ctx.insideShop && ctx.totalStockItems < 2 && ctx.totalSalesCount === 0,
    isCompleted: (ctx) => ctx.insideShop || ctx.totalStockItems >= 2,
  },
  {
    id: 'shop_counter_hint',
    priority: 65,
    title: 'Stock Shelves & Open Business',
    getMessage: (touch) =>
      touch
        ? 'Approach the Shop Counter Register inside, tap Manage, and move at least 2 supplies onto Shelves.'
        : 'Approach the Shop Counter Register inside, press E to Manage, and move 2 supplies onto your Shelves.',
    condition: (ctx) => ctx.insideShop && ctx.totalStockItems < 2 && ctx.totalSalesCount === 0,
    isCompleted: (ctx) => ctx.totalStockItems >= 2 || ctx.totalSalesCount > 0,
  },
  {
    id: 'scavenge_ruins',
    priority: 55,
    title: 'Scavenge Abandoned Buildings',
    getMessage: (touch) =>
      touch
        ? 'Cross Main Blvd to Vale Corner Store or Depot 04. Tap Interact near crates, shelves, and loose supplies.'
        : 'Head across Main Blvd to Vale Corner Store or Depot 04. Press E on containers and supplies to gather stock.',
    condition: (ctx) => ctx.totalStockItems >= 2 && ctx.totalCollected < 4,
    isCompleted: (ctx) => ctx.totalCollected >= 4,
  },
  {
    id: 'pack_management',
    priority: 45,
    title: 'Check Your Pack',
    getMessage: (touch) =>
      touch
        ? 'Tap the Pack icon top-right anytime to inspect scavenged food, water, scrap, wood, and medical kits.'
        : 'Press I anytime to open your Pack and inspect gathered supplies or use food, water, and medkits.',
    condition: (ctx) => ctx.inventoryTotal >= 3 && ctx.inventoryOpenedCount === 0,
    isCompleted: (ctx) => ctx.inventoryOpenedCount > 0,
  },
  {
    id: 'pack_near_full',
    priority: 62,
    title: 'Backpack Nearly Full',
    getMessage: (touch) =>
      touch
        ? 'Your pack is almost full. Return to The Last Shop counter or backroom locker to stock shelves and store surplus.'
        : 'Your pack is almost full. Return to The Last Shop counter or backroom storage locker to bank supplies.',
    condition: (ctx) =>
      typeof ctx.packCapacity === 'number' &&
      ctx.packCapacity > 0 &&
      ctx.inventoryTotal >= ctx.packCapacity - 1 &&
      !ctx.insideShop,
    isCompleted: (ctx) =>
      typeof ctx.packCapacity === 'number' &&
      ctx.inventoryTotal < Math.max(4, ctx.packCapacity - 4) &&
      ctx.totalStockItems >= 2,
  },
  {
    id: 'flashlight_dark',
    priority: 40,
    title: 'Darkness & Stealth',
    getMessage: (touch) =>
      touch
        ? 'Use Flashlight bottom-right to search dark ruins—or switch it off outdoors at night so infected spot you less easily.'
        : 'Press F for Flashlight inside dark ruins, or switch it off on night streets to stay harder for infected to spot.',
    condition: (ctx) =>
      (ctx.isDayNightDark || (ctx.insideAnyBuilding && !ctx.insideShop)) && !ctx.flashlightOn,
    isCompleted: (ctx) =>
      (ctx.isDayNightDark || (ctx.insideAnyBuilding && !ctx.insideShop)) && ctx.flashlightOn,
  },
  {
    id: 'missions_and_map',
    priority: 30,
    title: 'Track Clues & Neighborhood Map',
    getMessage: (touch) =>
      touch
        ? 'Tap Missions or Map top-right to follow story chapters and see every District 04 location you discover.'
        : 'Press M for Missions or N for the Neighborhood Map to review discovered areas and story leads.',
    condition: (ctx) =>
      ctx.totalCollected >= 3 && ctx.mapOpenedCount === 0 && ctx.missionsOpenedCount === 0,
    isCompleted: (ctx) => ctx.mapOpenedCount > 0 || ctx.missionsOpenedCount > 0,
  },
  {
    id: 'grow_business',
    priority: 20,
    title: 'Expand & Hire Survivors',
    getMessage: () =>
      'Use earnings at the Shop Counter to upgrade to Level 2, and talk to friendly survivors around town to hire staff.',
    condition: (ctx) => ctx.money >= 95 && ctx.shopLevel === 1 && ctx.employeeCount === 0,
    isCompleted: (ctx) => ctx.shopLevel >= 2 || ctx.employeeCount >= 1,
  },
];

export class GuidanceSystem {
  public completedIds = new Set<string>();
  public dismissedIds = new Set<string>();
  private activeHintId: string | null = null;

  public reset(): void {
    this.completedIds.clear();
    this.dismissedIds.clear();
    this.activeHintId = null;
  }

  public dismissHint(id: string): void {
    this.dismissedIds.add(id);
    if (this.activeHintId === id) {
      this.activeHintId = null;
    }
  }

  public exportState(): { completedIds: string[]; dismissedIds: string[] } {
    return {
      completedIds: Array.from(this.completedIds),
      dismissedIds: Array.from(this.dismissedIds),
    };
  }

  public importState(raw?: { completedIds?: string[]; dismissedIds?: string[] }): void {
    this.reset();
    if (!raw) return;
    if (Array.isArray(raw.completedIds)) {
      for (const id of raw.completedIds) this.completedIds.add(id);
    }
    if (Array.isArray(raw.dismissedIds)) {
      for (const id of raw.dismissedIds) this.dismissedIds.add(id);
    }
  }

  public evaluate(ctx: GuidanceContext): GuidanceHintSummary | null {
    // Check completion on all non-completed rules first
    for (const rule of GUIDANCE_RULES) {
      if (!this.completedIds.has(rule.id) && rule.isCompleted(ctx)) {
        this.completedIds.add(rule.id);
        if (this.activeHintId === rule.id) {
          this.activeHintId = null;
        }
      }
    }

    // Never show non-essential guidance UI during active melee danger so combat stays clean
    if (ctx.inActiveCombat) {
      return null;
    }

    let best: GuidanceRule | null = null;
    for (const rule of GUIDANCE_RULES) {
      if (this.completedIds.has(rule.id) || this.dismissedIds.has(rule.id)) continue;
      if (!rule.condition(ctx)) continue;
      if (!best || rule.priority > best.priority) {
        best = rule;
      }
    }

    if (!best) {
      this.activeHintId = null;
      return null;
    }

    this.activeHintId = best.id;
    const locHint = tGuidanceHint(best.id);
    const localizedMessage = ctx.isTouchMode ? locHint?.touchMessage ?? locHint?.message : locHint?.message;
    return {
      id: best.id,
      title: locHint?.title ?? best.title,
      message: localizedMessage ?? best.getMessage(ctx.isTouchMode),
    };
  }
}
