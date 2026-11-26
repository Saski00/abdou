import { formatMoney } from './economy';
import {
  RESOURCE_ORDER,
  addInventoryResourceCapped,
  consumeInventoryResource,
  getTotalInventoryItems,
} from './resources';
import { SavedWorldEventsState } from './saveSystem';
import {
  ActiveWorldEventPin,
  InventoryState,
  LocationDangerLevel,
  ResourceId,
  WeatherKind,
  WorldEventBannerSummary,
  WorldEventCategory,
  WorldEventChoiceSummary,
  WorldEventVisualKind,
  WorldRegionId,
} from './types';
import { getLocalizedBearingLabel } from './worldLocations';
import { formatTpl, getTranslations, tResourceName } from '../i18n';

export interface EventAnchorDef {
  id: string;
  regionId: WorldRegionId;
  x: number;
  z: number;
  minDanger?: LocationDangerLevel;
}

export const WORLD_EVENT_ANCHORS: EventAnchorDef[] = [
  { id: 'anchor_shop_porch', regionId: 'main_street', x: -15.5, z: -7.8 },
  { id: 'anchor_crossroads_east', regionId: 'main_street', x: 9.5, z: -3.5 },
  { id: 'anchor_diner_camp', regionId: 'residential_district', x: -12.5, z: 22.0 },
  { id: 'anchor_maple_alley', regionId: 'residential_district', x: -22.8, z: 22.0 },
  { id: 'anchor_evac_lot', regionId: 'residential_district', x: -28.0, z: -25.5 },
  { id: 'anchor_freight_alley', regionId: 'commercial_district', x: 22.8, z: -14.5 },
  { id: 'anchor_industrial_yard', regionId: 'industrial_zone', x: 25.5, z: 19.0 },
  { id: 'anchor_police_lot', regionId: 'police_station', x: -28.5, z: 37.5 },
  { id: 'anchor_clinic_bay', regionId: 'medical_district', x: 14.5, z: 36.5 },
  { id: 'anchor_roadblock_edge', regionId: 'military_checkpoint', x: 4.2, z: -24.0 },
];

export const ANCHOR_BY_ID: Record<string, EventAnchorDef> = Object.fromEntries(
  WORLD_EVENT_ANCHORS.map((a) => [a.id, a])
);

export interface WorldEventChoiceDef {
  id: string;
  tone?: 'primary' | 'risk' | 'neutral';
  costMoney?: number;
  costResources?: Partial<InventoryState>;
  rewardMoney?: number;
  rewardResources?: Partial<InventoryState>;
  healDelta?: number;
  goodwillDelta?: number;
  noiseRadius?: number;
  /** If true, triggers a nearby zombie investigation/surge around target or player */
  alertNearbyZombiesRadius?: number;
  spawnProwlerNearTarget?: boolean;
  /** Opens/focuses an atmosphere flash or sound cue */
  soundCue?: 'pickup' | 'cash' | 'radio' | 'creak' | 'thud' | 'groan' | 'bell';
}

export interface WorldEventDef {
  id: string;
  category: WorldEventCategory;
  visualKind: WorldEventVisualKind;
  importantOneTime?: boolean;
  cooldownSec: number;
  durationSec: number | null;
  requiresProximityToDecide: boolean;
  /** Whether choice popup opens automatically when triggered (e.g., shop door visitor) */
  autoPromptChoice?: boolean;
  anchorIds?: string[];
  choices: WorldEventChoiceDef[];
}

export const WORLD_EVENT_DEFINITIONS: WorldEventDef[] = [
  // 1. EXPLORATION EVENTS
  {
    id: 'ev_supply_drop_alley',
    category: 'exploration',
    visualKind: 'crate',
    cooldownSec: 130,
    durationSec: 110,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_freight_alley',
      'anchor_evac_lot',
      'anchor_maple_alley',
      'anchor_police_lot',
      'anchor_clinic_bay',
    ],
    choices: [
      {
        id: 'pry_careful',
        tone: 'primary',
        costResources: { scrap_metal: 1 },
        rewardMoney: 12,
        rewardResources: { canned_food: 1, medical_supplies: 1 },
        noiseRadius: 7.5,
        soundCue: 'pickup',
      },
      {
        id: 'smash_grab',
        tone: 'risk',
        rewardResources: { canned_food: 1, water_bottle: 1 },
        noiseRadius: 17.5,
        alertNearbyZombiesRadius: 20,
        soundCue: 'thud',
      },
      {
        id: 'leave_cache',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_distress_signal',
    category: 'exploration',
    visualKind: 'beacon',
    cooldownSec: 150,
    durationSec: 75,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_diner_camp',
      'anchor_freight_alley',
      'anchor_roadblock_edge',
      'anchor_clinic_bay',
    ],
    choices: [
      {
        id: 'recover_beacon',
        tone: 'primary',
        rewardMoney: 22,
        rewardResources: { scrap_metal: 1, water_bottle: 1 },
        noiseRadius: 9.0,
        soundCue: 'radio',
      },
      {
        id: 'salvage_battery',
        tone: 'risk',
        rewardMoney: 10,
        rewardResources: { scrap_metal: 2 },
        noiseRadius: 15.0,
        alertNearbyZombiesRadius: 18,
        soundCue: 'thud',
      },
      {
        id: 'ignore_signal',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_env_forgotten_stash',
    category: 'exploration',
    visualKind: 'crate',
    importantOneTime: true,
    cooldownSec: 220,
    durationSec: 140,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_evac_lot',
      'anchor_industrial_yard',
      'anchor_police_lot',
    ],
    choices: [
      {
        id: 'claim_stash',
        tone: 'primary',
        rewardMoney: 25,
        rewardResources: { wood: 2, medical_supplies: 1 },
        noiseRadius: 7.0,
        soundCue: 'pickup',
      },
      {
        id: 'leave_stash',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_danger_warning_cues',
    category: 'exploration',
    visualKind: 'none',
    cooldownSec: 115,
    durationSec: 14,
    requiresProximityToDecide: false,
    choices: [],
  },

  // 2. ZOMBIE ACTIVITY EVENTS
  {
    id: 'ev_prowling_pack',
    category: 'zombie_activity',
    visualKind: 'none',
    cooldownSec: 105,
    durationSec: 14,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_noise_convergence',
    category: 'zombie_activity',
    visualKind: 'none',
    cooldownSec: 100,
    durationSec: 12,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_night_stalker',
    category: 'zombie_activity',
    visualKind: 'none',
    cooldownSec: 125,
    durationSec: 14,
    requiresProximityToDecide: false,
    choices: [],
  },

  // 3. SURVIVOR ENCOUNTERS (connected to StaffSystem goodwill & recruitment fees)
  {
    id: 'ev_injured_traveler',
    category: 'survivor',
    visualKind: 'npc_survivor',
    cooldownSec: 155,
    durationSec: 95,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_diner_camp',
      'anchor_crossroads_east',
      'anchor_clinic_bay',
      'anchor_evac_lot',
    ],
    choices: [
      {
        id: 'treat_medkit',
        tone: 'primary',
        costResources: { medical_supplies: 1 },
        rewardMoney: 34,
        rewardResources: { scrap_metal: 1 },
        goodwillDelta: 1,
        soundCue: 'pickup',
      },
      {
        id: 'share_water',
        tone: 'primary',
        costResources: { water_bottle: 1 },
        rewardMoney: 16,
        goodwillDelta: 1,
        soundCue: 'pickup',
      },
      {
        id: 'leave_traveler',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_hiding_survivor',
    category: 'survivor',
    visualKind: 'npc_survivor',
    cooldownSec: 165,
    durationSec: 90,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_maple_alley',
      'anchor_freight_alley',
      'anchor_industrial_yard',
    ],
    choices: [
      {
        id: 'share_ration_escort',
        tone: 'primary',
        costResources: { canned_food: 1 },
        rewardMoney: 22,
        rewardResources: { wood: 2 },
        goodwillDelta: 1,
        soundCue: 'cash',
      },
      {
        id: 'warn_quietly',
        tone: 'neutral',
        rewardMoney: 8,
        soundCue: 'radio',
      },
    ],
  },
  {
    id: 'ev_distrustful_scavenger',
    category: 'survivor',
    visualKind: 'npc_survivor',
    cooldownSec: 150,
    durationSec: 85,
    requiresProximityToDecide: true,
    anchorIds: [
      'anchor_freight_alley',
      'anchor_industrial_yard',
      'anchor_roadblock_edge',
    ],
    choices: [
      {
        id: 'barter_food',
        tone: 'primary',
        costResources: { canned_food: 1 },
        rewardMoney: 14,
        rewardResources: { scrap_metal: 2 },
        soundCue: 'pickup',
      },
      {
        id: 'stand_firm',
        tone: 'risk',
        rewardResources: { wood: 1 },
        noiseRadius: 12.5,
        alertNearbyZombiesRadius: 15,
        soundCue: 'thud',
      },
      {
        id: 'back_away',
        tone: 'neutral',
      },
    ],
  },

  // 4. SHOP EVENTS
  {
    id: 'ev_shop_wandering_trader',
    category: 'shop',
    visualKind: 'npc_trader',
    cooldownSec: 170,
    durationSec: 90,
    requiresProximityToDecide: true,
    anchorIds: ['anchor_shop_porch'],
    choices: [
      {
        id: 'trade_scrap_for_med',
        tone: 'primary',
        costResources: { scrap_metal: 2 },
        rewardResources: { medical_supplies: 1 },
        soundCue: 'cash',
      },
      {
        id: 'buy_rations_bundle',
        tone: 'primary',
        costMoney: 22,
        rewardResources: { canned_food: 2, water_bottle: 1 },
        soundCue: 'cash',
      },
      {
        id: 'sell_pack_crate',
        tone: 'primary',
        costResources: { canned_food: 1, water_bottle: 1 },
        rewardMoney: 38,
        soundCue: 'cash',
      },
      {
        id: 'dismiss_trader',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_shop_shelter_seeker',
    category: 'shop',
    visualKind: 'npc_survivor',
    cooldownSec: 165,
    durationSec: 65,
    requiresProximityToDecide: false,
    autoPromptChoice: true,
    anchorIds: ['anchor_shop_porch'],
    choices: [
      {
        id: 'offer_shelter_water',
        tone: 'primary',
        costResources: { water_bottle: 1 },
        rewardMoney: 26,
        goodwillDelta: 1,
        soundCue: 'bell',
      },
      {
        id: 'offer_warmth_only',
        tone: 'primary',
        rewardMoney: 10,
        soundCue: 'bell',
      },
      {
        id: 'turn_away',
        tone: 'neutral',
      },
    ],
  },
  {
    id: 'ev_shop_perimeter_scare',
    category: 'shop',
    visualKind: 'none',
    cooldownSec: 135,
    durationSec: 14,
    requiresProximityToDecide: false,
    choices: [],
  },

  // 5. ATMOSPHERE & HORROR EVENTS
  {
    id: 'ev_atmo_radio_static',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 110,
    durationSec: 11,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_atmo_power_flicker',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 120,
    durationSec: 10,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_atmo_fresh_tracks',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 115,
    durationSec: 11,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_atmo_distant_silhouette',
    category: 'atmosphere',
    visualKind: 'silhouette',
    cooldownSec: 165,
    durationSec: 24,
    requiresProximityToDecide: false,
    anchorIds: [
      'anchor_maple_alley',
      'anchor_evac_lot',
      'anchor_freight_alley',
      'anchor_roadblock_edge',
      'anchor_clinic_bay',
    ],
    choices: [],
  },
  {
    id: 'ev_atmo_radio_cutoff',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 135,
    durationSec: 10,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_atmo_building_sound',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 120,
    durationSec: 10,
    requiresProximityToDecide: false,
    choices: [],
  },
  {
    id: 'ev_atmo_uncanny_silence',
    category: 'atmosphere',
    visualKind: 'none',
    cooldownSec: 155,
    durationSec: 9,
    requiresProximityToDecide: false,
    choices: [],
  },
];

export const WORLD_EVENT_BY_ID: Record<string, WorldEventDef> = Object.fromEntries(
  WORLD_EVENT_DEFINITIONS.map((e) => [e.id, e])
);

export interface ActiveWorldEventInstance {
  instanceId: string;
  eventId: string;
  anchorId: string;
  x: number;
  z: number;
  remainingSec: number | null;
  discoveredInWorld: boolean;
}

export interface WorldEventEvalContext {
  playerX: number;
  playerZ: number;
  insideShop: boolean;
  isIndoors: boolean;
  currentRegionId: WorldRegionId;
  dangerTier: LocationDangerLevel;
  day: number;
  nightFactor: number;
  weather: WeatherKind;
  health: number;
  money: number;
  shopLevel: number;
  totalStockItems: number;
  totalSalesCount: number;
  employeeCount: number;
  activeGuardCount: number;
  unrecruitedSurvivorCount: number;
  completedMainMissions: number;
  inActiveCombat: boolean;
  modalBlocking: boolean;
  livingZombieCount: number;
  nearbyLivingZombies: number;
  nearbyAlertedZombies: number;
  noiseLevel: number;
  inventory: InventoryState;
  packCapacity: number;
}

export interface WorldEventTriggerSideEffects {
  spawnProwlers?: { count: number; targetX: number; targetZ: number; minDistanceFromPlayer: number };
  migrateZombies?: { targetX: number; targetZ: number; maxCount: number; maxSearchRadius: number };
  emitNoise?: { x: number; z: number; radius: number };
  soundCue?: 'radio' | 'creak' | 'thud' | 'groan' | 'bell' | 'radio_cutoff' | 'knock' | 'apparition';
  flashStrength?: number;
  powerFlickerSeconds?: number;
  silenceSeconds?: number;
  toast?: { text: string; tone: 'resource' | 'world' | 'warning' };
  openChoiceModal?: boolean;
}

export interface WorldEventChoiceOutcome {
  ok: boolean;
  nextInventory: InventoryState;
  moneyDelta: number;
  healDelta: number;
  goodwillDelta: number;
  noiseEvent?: { x: number; z: number; radius: number };
  alertZombiesRadius?: number;
  soundCue?: WorldEventChoiceDef['soundCue'];
  toast: { text: string; tone: 'resource' | 'world' | 'warning' };
}

export interface WorldEventTickOutput {
  triggeredEvent?: WorldEventDef;
  expiredEventId?: string;
  sideEffects?: WorldEventTriggerSideEffects;
}

const DEFAULT_GLOBAL_COOLDOWN_SEC = 52;
const INITIAL_WARMUP_SEC = 22;
const EVALUATION_INTERVAL_SEC = 1.25;
const RECENT_HISTORY_LIMIT = 5;
const PROXIMITY_DECIDE_RANGE = 3.6;

export class WorldEventSystem {
  public activeEvent: ActiveWorldEventInstance | null = null;
  public survivorGoodwill = 0;
  public resolvedCount = 0;

  private completedImportantIds = new Set<string>();
  private recentEventIds: string[] = [];
  private cooldownRemainingById = new Map<string, number>();
  private globalCooldownRemaining = INITIAL_WARMUP_SEC;
  private evalAccumSec = 0;
  private nextInstanceSeq = 1;
  private bannerDismissedInstanceId: string | null = null;
  private rngState = 1337;

  constructor(seed = 1337) {
    this.rngState = Math.max(1, Math.floor(seed));
  }

  public reset(): void {
    this.activeEvent = null;
    this.survivorGoodwill = 0;
    this.resolvedCount = 0;
    this.completedImportantIds.clear();
    this.recentEventIds = [];
    this.cooldownRemainingById.clear();
    this.globalCooldownRemaining = INITIAL_WARMUP_SEC;
    this.evalAccumSec = 0;
    this.nextInstanceSeq = 1;
    this.bannerDismissedInstanceId = null;
  }

  private rand(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 4294967296;
  }

  public exportState(): SavedWorldEventsState {
    const cooldownRemainingById: Record<string, number> = {};
    for (const [id, rem] of this.cooldownRemainingById.entries()) {
      if (rem > 0.5) cooldownRemainingById[id] = Math.round(rem * 10) / 10;
    }
    return {
      completedImportantIds: Array.from(this.completedImportantIds),
      recentEventIds: [...this.recentEventIds],
      cooldownRemainingById,
      globalCooldownRemaining: Math.round(Math.max(0, this.globalCooldownRemaining) * 10) / 10,
      survivorGoodwill: this.survivorGoodwill,
      resolvedCount: this.resolvedCount,
      activeEvent: this.activeEvent ? { ...this.activeEvent } : null,
    };
  }

  public importState(raw: SavedWorldEventsState | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;
    if (Array.isArray(raw.completedImportantIds)) {
      for (const id of raw.completedImportantIds) {
        if (WORLD_EVENT_BY_ID[id]) this.completedImportantIds.add(id);
      }
    }
    if (Array.isArray(raw.recentEventIds)) {
      this.recentEventIds = raw.recentEventIds
        .filter((id) => Boolean(WORLD_EVENT_BY_ID[id]))
        .slice(-RECENT_HISTORY_LIMIT);
    }
    if (raw.cooldownRemainingById && typeof raw.cooldownRemainingById === 'object') {
      for (const [id, rem] of Object.entries(raw.cooldownRemainingById)) {
        if (WORLD_EVENT_BY_ID[id] && typeof rem === 'number' && rem > 0) {
          this.cooldownRemainingById.set(id, rem);
        }
      }
    }
    if (typeof raw.globalCooldownRemaining === 'number' && Number.isFinite(raw.globalCooldownRemaining)) {
      this.globalCooldownRemaining = Math.max(0, raw.globalCooldownRemaining);
    }
    if (typeof raw.survivorGoodwill === 'number' && Number.isFinite(raw.survivorGoodwill)) {
      this.survivorGoodwill = Math.max(0, Math.floor(raw.survivorGoodwill));
    }
    if (typeof raw.resolvedCount === 'number' && Number.isFinite(raw.resolvedCount)) {
      this.resolvedCount = Math.max(0, Math.floor(raw.resolvedCount));
    }
    if (raw.activeEvent && WORLD_EVENT_BY_ID[raw.activeEvent.eventId]) {
      const def = WORLD_EVENT_BY_ID[raw.activeEvent.eventId];
      // Important one-time events that were already resolved should never duplicate on reload
      if (!(def.importantOneTime && this.completedImportantIds.has(def.id))) {
        this.activeEvent = { ...raw.activeEvent };
      }
    }
  }

  public dismissBanner(): void {
    if (!this.activeEvent) return;
    const def = WORLD_EVENT_BY_ID[this.activeEvent.eventId];
    if (!def || def.choices.length === 0) {
      this.activeEvent = null;
      return;
    }
    this.bannerDismissedInstanceId = this.activeEvent.instanceId;
  }

  public isActiveBannerDismissed(): boolean {
    return (
      this.activeEvent !== null &&
      this.bannerDismissedInstanceId === this.activeEvent.instanceId
    );
  }

  public clearActiveEvent(): void {
    this.activeEvent = null;
    this.bannerDismissedInstanceId = null;
  }

  public dissolveActiveSilhouette(): boolean {
    if (!this.activeEvent || this.activeEvent.eventId !== 'ev_atmo_distant_silhouette') {
      return false;
    }
    this.activeEvent = null;
    this.bannerDismissedInstanceId = null;
    this.globalCooldownRemaining = Math.max(this.globalCooldownRemaining, 40);
    return true;
  }

  public getCompletedImportantIds(): string[] {
    return Array.from(this.completedImportantIds);
  }

  public getCooldownRemaining(eventId: string): number {
    return this.cooldownRemainingById.get(eventId) ?? 0;
  }

  /**
   * Throttled evaluation called inside engine update. Only runs full eligibility checks every 1.25s.
   */
  public step(dt: number, ctx: WorldEventEvalContext, forceEvaluateNow = false): WorldEventTickOutput {
    if (dt <= 0 && !forceEvaluateNow) return {};

    // Tick timers smoothly
    if (dt > 0) {
      this.globalCooldownRemaining = Math.max(0, this.globalCooldownRemaining - dt);
      for (const [id, rem] of this.cooldownRemainingById.entries()) {
        const next = rem - dt;
        if (next <= 0) {
          this.cooldownRemainingById.delete(id);
        } else {
          this.cooldownRemainingById.set(id, next);
        }
      }
    }

    // Active event expiry tracking
    if (this.activeEvent && this.activeEvent.remainingSec !== null && dt > 0) {
      this.activeEvent.remainingSec = Math.max(0, this.activeEvent.remainingSec - dt);
      const distToTarget = Math.hypot(
        this.activeEvent.x - ctx.playerX,
        this.activeEvent.z - ctx.playerZ
      );
      if (distToTarget <= PROXIMITY_DECIDE_RANGE) {
        this.activeEvent.discoveredInWorld = true;
      }

      if (this.activeEvent.remainingSec <= 0) {
        const expiredId = this.activeEvent.eventId;
        const t = getTranslations().worldEvents.toasts;
        this.activeEvent = null;
        this.bannerDismissedInstanceId = null;
        let msg = t.encounterExpired;
        if (expiredId === 'ev_distress_signal') msg = t.signalExpired;
        else if (expiredId === 'ev_shop_wandering_trader') msg = t.traderDeparted;
        else if (expiredId === 'ev_supply_drop_alley' || expiredId === 'ev_env_forgotten_stash') {
          msg = t.cacheExpired;
        }
        return {
          expiredEventId: expiredId,
          sideEffects:
            expiredId === 'ev_supply_drop_alley' ||
            expiredId === 'ev_distress_signal' ||
            expiredId === 'ev_shop_wandering_trader' ||
            expiredId === 'ev_injured_traveler' ||
            expiredId === 'ev_hiding_survivor' ||
            expiredId === 'ev_shop_shelter_seeker'
              ? { toast: { text: msg, tone: 'world' } }
              : undefined,
        };
      }
    }

    if (!forceEvaluateNow) {
      this.evalAccumSec += dt;
      if (this.evalAccumSec < EVALUATION_INTERVAL_SEC) return {};
      this.evalAccumSec = 0;
    }

    // Never spawn a new major event while one is active, in active combat, or while a modal is open
    if (this.activeEvent || ctx.inActiveCombat || ctx.modalBlocking) {
      return {};
    }
    if (this.globalCooldownRemaining > 0) {
      return {};
    }

    const picked = this.selectWeightedEvent(ctx);
    if (!picked) {
      // Short retry delay so we don't churn weights if nothing currently fits
      this.globalCooldownRemaining = 10;
      return {};
    }

    return this.activateEvent(picked.def, picked.anchor, ctx);
  }

  public triggerSpecificEvent(
    eventId: string,
    ctx: WorldEventEvalContext,
    anchorOverrideId?: string
  ): WorldEventTickOutput {
    const def = WORLD_EVENT_BY_ID[eventId];
    if (!def) return {};
    const anchor =
      (anchorOverrideId ? ANCHOR_BY_ID[anchorOverrideId] : null) ??
      this.pickBestAnchorForEvent(def, ctx) ??
      WORLD_EVENT_ANCHORS[0];
    return this.activateEvent(def, anchor, ctx);
  }

  private activateEvent(
    def: WorldEventDef,
    anchor: EventAnchorDef | null,
    ctx: WorldEventEvalContext
  ): WorldEventTickOutput {
    const t = getTranslations();
    const evCopy = t.worldEvents.events[def.id];
    const ax = anchor ? anchor.x : ctx.playerX;
    const az = anchor ? anchor.z : ctx.playerZ;

    this.activeEvent = {
      instanceId: `wev_${this.nextInstanceSeq++}`,
      eventId: def.id,
      anchorId: anchor?.id ?? 'local',
      x: ax,
      z: az,
      remainingSec: def.durationSec,
      discoveredInWorld: !def.requiresProximityToDecide,
    };
    this.bannerDismissedInstanceId = null;

    this.cooldownRemainingById.set(def.id, def.cooldownSec);
    this.globalCooldownRemaining =
      def.choices.length > 0 ? DEFAULT_GLOBAL_COOLDOWN_SEC + 14 : DEFAULT_GLOBAL_COOLDOWN_SEC - 8;
    this.recentEventIds.push(def.id);
    if (this.recentEventIds.length > RECENT_HISTORY_LIMIT) {
      this.recentEventIds.shift();
    }

    const sideEffects: WorldEventTriggerSideEffects = {};

    if (def.id === 'ev_prowling_pack') {
      const target = anchor ?? WORLD_EVENT_ANCHORS[1];
      sideEffects.spawnProwlers = {
        count: ctx.nightFactor >= 0.5 || ctx.day >= 2 ? 2 : 1,
        targetX: target.x,
        targetZ: target.z,
        minDistanceFromPlayer: 21,
      };
      sideEffects.migrateZombies = {
        targetX: ctx.playerX,
        targetZ: ctx.playerZ,
        maxCount: 2,
        maxSearchRadius: 28,
      };
      sideEffects.soundCue = 'groan';
      sideEffects.toast = { text: t.worldEvents.toasts.prowlerNearbyCue, tone: 'warning' };
    } else if (def.id === 'ev_noise_convergence') {
      const originX = ctx.playerX + (this.rand() > 0.5 ? 10 : -10);
      const originZ = ctx.playerZ + (this.rand() > 0.5 ? 9 : -9);
      sideEffects.emitNoise = { x: originX, z: originZ, radius: 19 };
      sideEffects.soundCue = 'thud';
      sideEffects.toast = { text: t.worldEvents.toasts.noiseAttractsCue, tone: 'warning' };
    } else if (def.id === 'ev_night_stalker') {
      sideEffects.spawnProwlers = {
        count: 1,
        targetX: ctx.playerX,
        targetZ: ctx.playerZ,
        minDistanceFromPlayer: 23,
      };
      sideEffects.soundCue = 'groan';
      sideEffects.flashStrength = 0.28;
    } else if (def.id === 'ev_shop_perimeter_scare') {
      // Spawn/attract near shop outer street (-2.5 to -15.5) so shop guards or player react
      sideEffects.spawnProwlers = {
        count: 1,
        targetX: -15.5,
        targetZ: -4.5,
        minDistanceFromPlayer: 18,
      };
      sideEffects.soundCue = ctx.activeGuardCount > 0 ? 'bell' : 'groan';
      sideEffects.toast = { text: t.worldEvents.toasts.perimeterWarningCue, tone: 'warning' };
    } else if (def.id === 'ev_danger_warning_cues') {
      sideEffects.soundCue = 'groan';
    } else if (def.id === 'ev_distress_signal') {
      sideEffects.soundCue = 'radio';
    } else if (def.id === 'ev_shop_wandering_trader' || def.id === 'ev_shop_shelter_seeker') {
      sideEffects.soundCue = 'bell';
      if (def.autoPromptChoice && ctx.insideShop) {
        sideEffects.openChoiceModal = true;
      }
    } else if (def.id === 'ev_atmo_radio_static') {
      sideEffects.soundCue = 'radio';
    } else if (def.id === 'ev_atmo_power_flicker') {
      sideEffects.soundCue = 'creak';
      sideEffects.powerFlickerSeconds = 4.5;
    } else if (def.id === 'ev_atmo_fresh_tracks') {
      sideEffects.soundCue = 'thud';
    } else if (def.id === 'ev_atmo_distant_silhouette') {
      sideEffects.soundCue = 'apparition';
    } else if (def.id === 'ev_atmo_radio_cutoff') {
      sideEffects.soundCue = 'radio_cutoff';
    } else if (def.id === 'ev_atmo_building_sound') {
      sideEffects.soundCue = 'knock';
    } else if (def.id === 'ev_atmo_uncanny_silence') {
      sideEffects.silenceSeconds = 8.5;
    }

    if (evCopy && def.choices.length > 0 && !sideEffects.toast) {
      sideEffects.toast = {
        text: evCopy.title,
        tone: def.category === 'zombie_activity' ? 'warning' : 'world',
      };
    }

    return {
      triggeredEvent: def,
      sideEffects,
    };
  }

  private selectWeightedEvent(
    ctx: WorldEventEvalContext
  ): { def: WorldEventDef; anchor: EventAnchorDef | null } | null {
    const candidates: { def: WorldEventDef; weight: number; anchor: EventAnchorDef | null }[] = [];

    for (const def of WORLD_EVENT_DEFINITIONS) {
      if (def.importantOneTime && this.completedImportantIds.has(def.id)) continue;
      if ((this.cooldownRemainingById.get(def.id) ?? 0) > 0) continue;
      if (this.recentEventIds.includes(def.id)) continue;

      const weight = this.computeEligibilityWeight(def, ctx);
      if (weight <= 0) continue;

      const anchor = this.pickBestAnchorForEvent(def, ctx);
      if (def.anchorIds && def.anchorIds.length > 0 && !anchor) continue;

      candidates.push({ def, weight, anchor });
    }

    if (candidates.length === 0) return null;

    let totalWeight = 0;
    for (const c of candidates) totalWeight += c.weight;
    let roll = this.rand() * totalWeight;
    for (const c of candidates) {
      roll -= c.weight;
      if (roll <= 0) {
        return { def: c.def, anchor: c.anchor };
      }
    }
    const last = candidates[candidates.length - 1];
    return { def: last.def, anchor: last.anchor };
  }

  private computeEligibilityWeight(def: WorldEventDef, ctx: WorldEventEvalContext): number {
    const distFromShop = Math.hypot(ctx.playerX + 15.5, ctx.playerZ + 13.5);
    const nearShop = ctx.insideShop || distFromShop <= 14;
    const outdoors = !ctx.isIndoors;

    switch (def.id) {
      case 'ev_supply_drop_alley': {
        if (ctx.insideShop) return 0;
        let w = 18;
        if (ctx.completedMainMissions >= 1) w += 6;
        if (ctx.dangerTier === 'moderate' || ctx.dangerTier === 'high') w += 6;
        return w;
      }
      case 'ev_distress_signal': {
        let w = 14;
        if (ctx.nightFactor >= 0.35 || ctx.weather !== 'clear') w += 8;
        if (ctx.completedMainMissions >= 2) w += 5;
        return w;
      }
      case 'ev_env_forgotten_stash': {
        if (ctx.insideShop) return 0;
        if (ctx.day < 1) return 0;
        return ctx.completedMainMissions >= 1 ? 12 : 7;
      }
      case 'ev_danger_warning_cues': {
        if (ctx.insideShop) return 0;
        if (ctx.dangerTier === 'high' || ctx.nearbyLivingZombies >= 2) return 14;
        if (ctx.nightFactor >= 0.55) return 9;
        return 0;
      }
      case 'ev_prowling_pack': {
        if (ctx.insideShop) return 0;
        if (ctx.livingZombieCount >= 16) return 0;
        return outdoors ? (ctx.nightFactor >= 0.45 ? 16 : 11) : 6;
      }
      case 'ev_noise_convergence': {
        if (ctx.insideShop || ctx.nearbyLivingZombies === 0) return 0;
        return ctx.noiseLevel >= 30 ? 15 : 8;
      }
      case 'ev_night_stalker': {
        if (ctx.insideShop) return 0;
        if (ctx.nightFactor < 0.5 && ctx.weather !== 'fog') return 0;
        if (ctx.livingZombieCount >= 16) return 0;
        return 14;
      }
      case 'ev_injured_traveler': {
        if (ctx.insideShop) return 0;
        let w = 13;
        if ((ctx.inventory.medical_supplies ?? 0) > 0 || (ctx.inventory.water_bottle ?? 0) > 0) {
          w += 7;
        }
        return w;
      }
      case 'ev_hiding_survivor': {
        if (ctx.insideShop) return 0;
        return ctx.unrecruitedSurvivorCount > 0 ? 15 : 10;
      }
      case 'ev_distrustful_scavenger': {
        if (ctx.insideShop) return 0;
        if (
          ctx.currentRegionId === 'commercial_district' ||
          ctx.currentRegionId === 'industrial_zone' ||
          ctx.currentRegionId === 'military_checkpoint'
        ) {
          return 15;
        }
        return 7;
      }
      case 'ev_shop_wandering_trader': {
        if (!nearShop) return 0;
        if (ctx.day === 1 && ctx.totalSalesCount === 0 && ctx.money < 25) return 5;
        return 18;
      }
      case 'ev_shop_shelter_seeker': {
        if (!nearShop) return 0;
        if (ctx.nightFactor >= 0.35 || ctx.weather !== 'clear') return 18;
        return 9;
      }
      case 'ev_shop_perimeter_scare': {
        if (!nearShop) return 0;
        if (ctx.livingZombieCount >= 16) return 0;
        return ctx.activeGuardCount > 0 ? 14 : 9;
      }
      case 'ev_atmo_radio_static': {
        return ctx.nightFactor >= 0.25 || ctx.isIndoors ? 10 : 5;
      }
      case 'ev_atmo_power_flicker': {
        return ctx.nightFactor >= 0.35 || ctx.weather === 'rain' ? 11 : 4;
      }
      case 'ev_atmo_fresh_tracks': {
        return outdoors && !ctx.insideShop ? 10 : 0;
      }
      case 'ev_atmo_distant_silhouette': {
        if (ctx.insideShop || !outdoors) return 0;
        if (ctx.nightFactor < 0.28 && ctx.weather === 'clear') return 0;
        return ctx.weather === 'fog' || ctx.nightFactor >= 0.65 ? 14 : 10;
      }
      case 'ev_atmo_radio_cutoff': {
        if (ctx.insideShop && ctx.nightFactor < 0.35) return 0;
        return ctx.isIndoors || ctx.nightFactor >= 0.4 || ctx.dangerTier === 'high' ? 12 : 6;
      }
      case 'ev_atmo_building_sound': {
        if (ctx.insideShop || !ctx.isIndoors) return 0;
        return ctx.dangerTier === 'high' ? 16 : 12;
      }
      case 'ev_atmo_uncanny_silence': {
        if (ctx.insideShop || ctx.inActiveCombat) return 0;
        return ctx.dangerTier === 'high' || ctx.dangerTier === 'moderate' || ctx.nightFactor >= 0.4
          ? 11
          : 0;
      }
      default:
        return 0;
    }
  }

  private pickBestAnchorForEvent(def: WorldEventDef, ctx: WorldEventEvalContext): EventAnchorDef | null {
    if (!def.anchorIds || def.anchorIds.length === 0) return null;
    const pool = def.anchorIds
      .map((id) => ANCHOR_BY_ID[id])
      .filter((a): a is EventAnchorDef => Boolean(a));
    if (pool.length === 0) return null;

    // Prefer nearby/contextual anchors (10m-42m away, or shop porch when shop event; silhouette prefers 14m-38m)
    const scored = pool.map((a) => {
      const dist = Math.hypot(a.x - ctx.playerX, a.z - ctx.playerZ);
      let score = 10;
      if (def.visualKind === 'silhouette') {
        if (dist >= 14 && dist <= 38) score += 20;
        else if (dist < 10) score = 2;
      } else {
        if (a.regionId === ctx.currentRegionId) score += 16;
        if (dist >= 8 && dist <= 34) score += 12;
        else if (dist < 8 && def.category === 'shop') score += 14;
      }
      return { anchor: a, weight: score };
    });

    let sum = 0;
    for (const s of scored) sum += s.weight;
    let r = this.rand() * sum;
    for (const s of scored) {
      r -= s.weight;
      if (r <= 0) return s.anchor;
    }
    return scored[scored.length - 1].anchor;
  }

  public canAffordChoice(
    choice: WorldEventChoiceDef,
    ctx: Pick<WorldEventEvalContext, 'money' | 'inventory' | 'packCapacity'>
  ): { ok: boolean; disabledReason?: string } {
    const ui = getTranslations().worldEvents.ui;
    if (choice.costMoney && ctx.money < choice.costMoney) {
      return {
        ok: false,
        disabledReason: formatTpl(ui.needMoneyDisabled, {
          amount: formatMoney(choice.costMoney),
        }),
      };
    }
    if (choice.costResources) {
      for (const id of RESOURCE_ORDER) {
        const req = choice.costResources[id] ?? 0;
        if (req > 0 && (ctx.inventory[id] ?? 0) < req) {
          return {
            ok: false,
            disabledReason: formatTpl(ui.needItemDisabled, {
              qty: req,
              item: tResourceName(id, req),
            }),
          };
        }
      }
    }
    if (choice.rewardResources) {
      let netGain = 0;
      for (const id of RESOURCE_ORDER) {
        netGain += choice.rewardResources[id] ?? 0;
        netGain -= choice.costResources?.[id] ?? 0;
      }
      if (netGain > 0 && getTotalInventoryItems(ctx.inventory) >= ctx.packCapacity) {
        return {
          ok: false,
          disabledReason: ui.packFullDisabled,
        };
      }
    }
    return { ok: true };
  }

  public resolveChoice(
    choiceId: string,
    ctx: Pick<WorldEventEvalContext, 'money' | 'inventory' | 'packCapacity'>
  ): WorldEventChoiceOutcome | null {
    if (!this.activeEvent) return null;
    const def = WORLD_EVENT_BY_ID[this.activeEvent.eventId];
    if (!def) return null;
    const choice = def.choices.find((c) => c.id === choiceId);
    if (!choice) return null;

    const check = this.canAffordChoice(choice, ctx);
    if (!check.ok) {
      return {
        ok: false,
        nextInventory: ctx.inventory,
        moneyDelta: 0,
        healDelta: 0,
        goodwillDelta: 0,
        toast: {
          text: check.disabledReason || getTranslations().worldEvents.ui.packFullDisabled,
          tone: 'warning',
        },
      };
    }

    let nextInventory = { ...ctx.inventory };
    if (choice.costResources) {
      for (const id of RESOURCE_ORDER) {
        const qty = choice.costResources[id] ?? 0;
        if (qty > 0) {
          nextInventory = consumeInventoryResource(nextInventory, id, qty);
        }
      }
    }

    let overflowed = false;
    if (choice.rewardResources) {
      for (const id of RESOURCE_ORDER) {
        const qty = choice.rewardResources[id] ?? 0;
        if (qty > 0) {
          const added = addInventoryResourceCapped(nextInventory, id, qty, ctx.packCapacity);
          nextInventory = added.nextInventory;
          if (added.overflow > 0) overflowed = true;
        }
      }
    }

    const moneyDelta = (choice.rewardMoney ?? 0) - (choice.costMoney ?? 0);
    const goodwillDelta = choice.goodwillDelta ?? 0;
    if (goodwillDelta > 0) {
      this.survivorGoodwill += goodwillDelta;
    }

    if (def.importantOneTime && choice.tone !== 'neutral') {
      this.completedImportantIds.add(def.id);
    }
    this.resolvedCount += 1;

    const eventX = this.activeEvent.x;
    const eventZ = this.activeEvent.z;
    this.clearActiveEvent();

    const t = getTranslations();
    const evTrans = t.worldEvents.events[def.id];
    const choiceTrans = evTrans?.choices?.[choice.id];
    let toastText = choiceTrans?.outcomeToast ?? evTrans?.title ?? def.id;
    if (overflowed) {
      toastText = `${toastText} · ${t.worldEvents.toasts.packFullPartialEvent}`;
    }

    const tone: 'resource' | 'world' | 'warning' =
      choice.tone === 'risk'
        ? 'warning'
        : choice.rewardMoney || choice.rewardResources || goodwillDelta > 0
          ? 'resource'
          : 'world';

    return {
      ok: true,
      nextInventory,
      moneyDelta,
      healDelta: choice.healDelta ?? 0,
      goodwillDelta,
      noiseEvent: choice.noiseRadius
        ? { x: eventX, z: eventZ, radius: choice.noiseRadius }
        : undefined,
      alertZombiesRadius: choice.alertNearbyZombiesRadius,
      soundCue: choice.soundCue,
      toast: { text: toastText, tone },
    };
  }

  public getHudBannerSummary(
    ctx: Pick<
      WorldEventEvalContext,
      'playerX' | 'playerZ' | 'money' | 'inventory' | 'packCapacity'
    >
  ): WorldEventBannerSummary | null {
    if (!this.activeEvent || this.isActiveBannerDismissed()) return null;
    const def = WORLD_EVENT_BY_ID[this.activeEvent.eventId];
    if (!def || def.visualKind === 'silhouette') return null;

    const t = getTranslations();
    const evTrans = t.worldEvents.events[def.id];
    const hasWorldTarget = def.visualKind !== 'none' || Boolean(def.anchorIds?.length);
    const dx = this.activeEvent.x - ctx.playerX;
    const dz = this.activeEvent.z - ctx.playerZ;
    const dist = Math.round(Math.hypot(dx, dz));
    const playerInRange = !hasWorldTarget || dist <= PROXIMITY_DECIDE_RANGE;

    const choices: WorldEventChoiceSummary[] = def.choices.map((c) => {
      const cTrans = evTrans?.choices?.[c.id];
      const afford = this.canAffordChoice(c, ctx);
      return {
        id: c.id,
        label: cTrans?.label ?? c.id,
        hint: cTrans?.hint,
        affordable: afford.ok,
        disabledReason: afford.disabledReason,
        tone: c.tone ?? 'neutral',
      };
    });

    return {
      instanceId: this.activeEvent.instanceId,
      eventId: def.id,
      category: def.category,
      title: evTrans?.title ?? def.id,
      description: evTrans?.description ?? '',
      locationLabel:
        t.worldEvents.anchors[this.activeEvent.anchorId] ??
        t.gameMessages.locationsFallback.districtDefault,
      visualKind: def.visualKind,
      hasWorldTarget,
      targetX: hasWorldTarget ? this.activeEvent.x : undefined,
      targetZ: hasWorldTarget ? this.activeEvent.z : undefined,
      distanceMeters: hasWorldTarget ? dist : undefined,
      bearingLabel: hasWorldTarget ? getLocalizedBearingLabel(dx, dz) : undefined,
      secondsRemaining:
        this.activeEvent.remainingSec !== null
          ? Math.ceil(this.activeEvent.remainingSec)
          : null,
      requiresProximityToDecide: def.requiresProximityToDecide,
      playerInRange,
      choices,
    };
  }

  public getMapPin(): ActiveWorldEventPin | null {
    if (!this.activeEvent) return null;
    const def = WORLD_EVENT_BY_ID[this.activeEvent.eventId];
    if (!def || def.choices.length === 0) return null;
    const evTrans = getTranslations().worldEvents.events[def.id];
    return {
      id: this.activeEvent.eventId,
      title: evTrans?.title ?? def.id,
      category: def.category,
      x: this.activeEvent.x,
      z: this.activeEvent.z,
      secondsRemaining:
        this.activeEvent.remainingSec !== null
          ? Math.ceil(this.activeEvent.remainingSec)
          : null,
    };
  }
}
