import { clamp } from './collision';
import { consumeInventoryResource } from './resources';
import { SavedSurvivalState } from './saveSystem';
import { InventoryState, ResourceId } from './types';
import { formatTpl, getTranslations, tResourceName } from '../i18n';

export interface SurvivalConfig {
  maxHealth: number;
  maxHunger: number;
  maxThirst: number;
  maxEnergy: number;
  hungerDrainPerSec: number;
  thirstDrainPerSec: number;
  criticalThreshold: number;
  lowEnergySprintThreshold: number;
  starvationHealthDrainPerSec: number;
  dehydrationHealthDrainPerSec: number;
  energyWalkDrainPerSec: number;
  energySprintDrainPerSec: number;
  energyJumpCost: number;
  idleCalmDelaySec: number;
  energyIdleRecoveryPerSec: number;
  energyRestRecoveryOutdoorsPerSec: number;
  energyRestRecoveryIndoorsPerSec: number;
  energyRestRecoverySafeHavenPerSec: number;
  warningCooldownSec: number;
}

export const DEFAULT_SURVIVAL_CONFIG: SurvivalConfig = {
  maxHealth: 100,
  maxHunger: 100,
  maxThirst: 100,
  maxEnergy: 100,
  // ~15 real minutes full->empty for hunger, ~9.5 real minutes for thirst
  hungerDrainPerSec: 0.11,
  thirstDrainPerSec: 0.175,
  criticalThreshold: 25,
  lowEnergySprintThreshold: 12,
  starvationHealthDrainPerSec: 0.65,
  dehydrationHealthDrainPerSec: 0.95,
  // Energy drains moderately during movement/sprinting/jumping, never at the same rate standing still
  energyWalkDrainPerSec: 0.18,
  energySprintDrainPerSec: 0.58,
  energyJumpCost: 1.4,
  idleCalmDelaySec: 1.2,
  energyIdleRecoveryPerSec: 0.45,
  energyRestRecoveryOutdoorsPerSec: 3.8,
  energyRestRecoveryIndoorsPerSec: 5.0,
  energyRestRecoverySafeHavenPerSec: 7.5,
  warningCooldownSec: 22,
};

export interface ConsumableDefinition {
  resourceId: ResourceId;
  targetStat: 'hunger' | 'thirst' | 'health';
  restoreAmount: number;
  actionLabel: string;
  effectLabel: string;
  verbPast: string;
  soundKind: 'food' | 'water' | 'med';
}

export const CONSUMABLE_DEFINITIONS: Partial<Record<ResourceId, ConsumableDefinition>> = {
  canned_food: {
    resourceId: 'canned_food',
    targetStat: 'hunger',
    restoreAmount: 42,
    actionLabel: 'Eat',
    effectLabel: '+42 Hunger',
    verbPast: 'Ate',
    soundKind: 'food',
  },
  water_bottle: {
    resourceId: 'water_bottle',
    targetStat: 'thirst',
    restoreAmount: 45,
    actionLabel: 'Drink',
    effectLabel: '+45 Thirst',
    verbPast: 'Drank',
    soundKind: 'water',
  },
  medical_supplies: {
    resourceId: 'medical_supplies',
    targetStat: 'health',
    restoreAmount: 35,
    actionLabel: 'Use',
    effectLabel: '+35 Health',
    verbPast: 'Used',
    soundKind: 'med',
  },
};

export interface SurvivalUpdateInput {
  isMoving: boolean;
  isSprinting: boolean;
  jumpCount: number;
  isIndoors: boolean;
  moveInputActive: boolean;
  isSafeHaven?: boolean;
  nightFactor?: number;
  rainIntensity?: number;
}

export interface SurvivalNotification {
  text: string;
  tone: 'resource' | 'world' | 'warning';
}

export interface ConsumeResult {
  consumed: boolean;
  nextInventory: InventoryState;
  message: string;
  tone: 'resource' | 'world' | 'warning';
  soundKind?: 'food' | 'water' | 'med';
  staminaDelta?: number;
}

const HEAL_COOLDOWN_SEC = 1.4;
const FOOD_BONUS_HEALTH = 5;
const WATER_BONUS_STAMINA = 16;
const MEDKIT_STABILIZE_HEALTH = 10;
const MEDKIT_STABILIZE_RATE_PER_SEC = 2.5;

export class SurvivalSystem {
  public health: number;
  public hunger: number;
  public thirst: number;
  public energy: number;
  public isResting = false;
  public deathReason: string | null = null;

  private readonly cfg: SurvivalConfig;
  private elapsedSec = 0;
  private idleCalmTimer = 0;
  private healCooldown = 0;
  private healRegenRemaining = 0;

  private warnedHungerCrit = false;
  private warnedThirstCrit = false;
  private warnedEnergyLow = false;
  private warnedStarving = false;
  private warnedDehydrated = false;
  private lastWarningAt = -999;

  constructor(config: Partial<SurvivalConfig> = {}) {
    this.cfg = { ...DEFAULT_SURVIVAL_CONFIG, ...config };
    this.health = this.cfg.maxHealth;
    this.hunger = this.cfg.maxHunger;
    this.thirst = this.cfg.maxThirst;
    this.energy = this.cfg.maxEnergy;
  }

  public reset(): void {
    this.health = this.cfg.maxHealth;
    this.hunger = this.cfg.maxHunger;
    this.thirst = this.cfg.maxThirst;
    this.energy = this.cfg.maxEnergy;
    this.isResting = false;
    this.deathReason = null;
    this.elapsedSec = 0;
    this.idleCalmTimer = 0;
    this.healCooldown = 0;
    this.healRegenRemaining = 0;
    this.warnedHungerCrit = false;
    this.warnedThirstCrit = false;
    this.warnedEnergyLow = false;
    this.warnedStarving = false;
    this.warnedDehydrated = false;
    this.lastWarningAt = -999;
  }

  public exportState(): SavedSurvivalState {
    return {
      health: this.health,
      hunger: this.hunger,
      thirst: this.thirst,
      energy: this.energy,
      isResting: this.isResting,
    };
  }

  public importState(raw: Partial<SavedSurvivalState> | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.health === 'number' && Number.isFinite(raw.health)) {
      this.health = clamp(raw.health, 1, this.cfg.maxHealth);
    }
    if (typeof raw.hunger === 'number' && Number.isFinite(raw.hunger)) {
      this.hunger = clamp(raw.hunger, 0, this.cfg.maxHunger);
    }
    if (typeof raw.thirst === 'number' && Number.isFinite(raw.thirst)) {
      this.thirst = clamp(raw.thirst, 0, this.cfg.maxThirst);
    }
    if (typeof raw.energy === 'number' && Number.isFinite(raw.energy)) {
      this.energy = clamp(raw.energy, 0, this.cfg.maxEnergy);
    }
    this.isResting = Boolean(raw.isResting);
  }

  public isDead(): boolean {
    return this.health <= 0;
  }

  public takeDamage(amount: number, reason: string): number {
    if (this.health <= 0 || !Number.isFinite(amount) || amount <= 0) return 0;
    const prev = this.health;
    this.health = clamp(this.health - amount, 0, this.cfg.maxHealth);
    if (this.isResting) {
      this.isResting = false;
    }
    if (this.health <= 0 && !this.deathReason) {
      this.deathReason = reason;
    }
    return prev - this.health;
  }

  public canSprint(): boolean {
    return !this.isResting && this.energy > this.cfg.lowEnergySprintThreshold;
  }

  public toggleRest(): { isResting: boolean; message: string } {
    const t = getTranslations();
    this.isResting = !this.isResting;
    if (this.isResting) {
      this.idleCalmTimer = this.cfg.idleCalmDelaySec;
      return {
        isResting: true,
        message: t.gameMessages.toasts.restStarted,
      };
    }
    return {
      isResting: false,
      message: t.gameMessages.toasts.restStopped,
    };
  }

  public stopRest(): void {
    this.isResting = false;
  }

  public getHealCooldownRemaining(): number {
    return this.healCooldown;
  }

  public update(dt: number, input: SurvivalUpdateInput): SurvivalNotification | null {
    if (!Number.isFinite(dt) || dt <= 0) return null;
    this.elapsedSec += dt;
    if (this.healCooldown > 0) {
      this.healCooldown = Math.max(0, this.healCooldown - dt);
    }
    if (this.healRegenRemaining > 0 && this.health > 0) {
      const tickHeal = Math.min(this.healRegenRemaining, MEDKIT_STABILIZE_RATE_PER_SEC * dt);
      this.health = clamp(this.health + tickHeal, 0, this.cfg.maxHealth);
      this.healRegenRemaining = Math.max(0, this.healRegenRemaining - tickHeal);
      if (this.health >= this.cfg.maxHealth) {
        this.healRegenRemaining = 0;
      }
    }

    let notification: SurvivalNotification | null = null;

    // 1. Auto-cancel rest if player actively moves or jumps
    if (this.isResting && (input.moveInputActive || input.jumpCount > 0)) {
      this.isResting = false;
    }

    // 2. Gradual Hunger & Thirst depletion (mildly harsher outdoors in night/rain, sheltered in shop)
    const night = clamp(input.nightFactor ?? 0, 0, 1);
    const rain = clamp(input.rainIntensity ?? 0, 0, 1);
    const outdoorStrain = input.isIndoors ? 1 : 1 + night * 0.12 + rain * 0.1;

    this.hunger = clamp(
      this.hunger - this.cfg.hungerDrainPerSec * (input.isIndoors ? 1 : 1 + night * 0.08) * dt,
      0,
      this.cfg.maxHunger
    );
    this.thirst = clamp(
      this.thirst - this.cfg.thirstDrainPerSec * dt,
      0,
      this.cfg.maxThirst
    );

    // 3. Energy expenditure & recovery
    if (input.jumpCount > 0) {
      this.energy = clamp(
        this.energy - input.jumpCount * this.cfg.energyJumpCost,
        0,
        this.cfg.maxEnergy
      );
      this.idleCalmTimer = 0;
    }

    if (input.isSprinting) {
      this.energy = clamp(
        this.energy - this.cfg.energySprintDrainPerSec * outdoorStrain * dt,
        0,
        this.cfg.maxEnergy
      );
      this.idleCalmTimer = 0;
    } else if (input.isMoving) {
      this.energy = clamp(
        this.energy - this.cfg.energyWalkDrainPerSec * outdoorStrain * dt,
        0,
        this.cfg.maxEnergy
      );
      this.idleCalmTimer = 0;
    } else if (this.isResting) {
      this.idleCalmTimer += dt;
      const rate = input.isSafeHaven
        ? this.cfg.energyRestRecoverySafeHavenPerSec
        : input.isIndoors
          ? this.cfg.energyRestRecoveryIndoorsPerSec
          : this.cfg.energyRestRecoveryOutdoorsPerSec;
      this.energy = clamp(this.energy + rate * dt, 0, this.cfg.maxEnergy);
      // Warm shelter stabilization in The Last Shop when fed & hydrated (caps at 75 HP so medkits remain essential)
      if (
        input.isSafeHaven &&
        this.hunger > this.cfg.criticalThreshold &&
        this.thirst > this.cfg.criticalThreshold &&
        this.health > 0 &&
        this.health < 75
      ) {
        this.health = Math.min(75, this.health + 0.75 * dt);
      }
    } else {
      this.idleCalmTimer += dt;
      if (this.idleCalmTimer >= this.cfg.idleCalmDelaySec) {
        const idleRate = input.isSafeHaven
          ? this.cfg.energyIdleRecoveryPerSec * 1.4
          : this.cfg.energyIdleRecoveryPerSec;
        this.energy = clamp(
          this.energy + idleRate * dt,
          0,
          this.cfg.maxEnergy
        );
      }
    }

    // 4. Health penalties when Hunger or Thirst reach zero
    let healthDrain = 0;
    if (this.hunger <= 0) {
      healthDrain += this.cfg.starvationHealthDrainPerSec;
    }
    if (this.thirst <= 0) {
      healthDrain += this.cfg.dehydrationHealthDrainPerSec;
    }
    if (healthDrain > 0) {
      const surv = getTranslations().gameMessages.survival;
      const reason =
        this.thirst <= 0 ? surv.deathDehydration : surv.deathStarvation;
      this.takeDamage(healthDrain * dt, reason);
    }

    // 5. Non-spammy edge-triggered + cooldown-gated survival warnings
    notification = this.evaluateWarnings();
    return notification;
  }

  public consumeItem(resourceId: ResourceId, inventory: InventoryState): ConsumeResult {
    const t = getTranslations();
    const def = CONSUMABLE_DEFINITIONS[resourceId];
    const itemName = tResourceName(resourceId, 1);
    if (!def) {
      return {
        consumed: false,
        nextInventory: inventory,
        message: formatTpl(t.gameMessages.toasts.consumeCantUse, { name: itemName }),
        tone: 'world',
      };
    }

    const qty = Math.max(0, inventory[resourceId] ?? 0);
    if (qty <= 0) {
      return {
        consumed: false,
        nextInventory: inventory,
        message: formatTpl(t.gameMessages.toasts.consumeNothingLeft, { name: itemName }),
        tone: 'world',
      };
    }

    let message = '';
    let staminaDelta = 0;
    if (def.targetStat === 'hunger') {
      if (this.hunger >= this.cfg.maxHunger - 0.5 && this.health >= this.cfg.maxHealth - 0.5) {
        return {
          consumed: false,
          nextInventory: inventory,
          message: t.gameMessages.toasts.consumeAlreadyFull,
          tone: 'world',
        };
      }
      this.hunger = clamp(this.hunger + def.restoreAmount, 0, this.cfg.maxHunger);
      const prevHp = this.health;
      this.health = clamp(this.health + FOOD_BONUS_HEALTH, 0, this.cfg.maxHealth);
      const hpGained = Math.round(this.health - prevHp);
      if (this.hunger > 0) this.warnedStarving = false;
      if (this.hunger > this.cfg.criticalThreshold + 5) this.warnedHungerCrit = false;
      message = formatTpl(t.gameMessages.toasts.consumeAteFood, {
        name: itemName,
        hunger: def.restoreAmount,
        hp: hpGained,
      });
    } else if (def.targetStat === 'thirst') {
      if (this.thirst >= this.cfg.maxThirst - 0.5) {
        return {
          consumed: false,
          nextInventory: inventory,
          message: t.gameMessages.toasts.consumeAlreadyFull,
          tone: 'world',
        };
      }
      this.thirst = clamp(this.thirst + def.restoreAmount, 0, this.cfg.maxThirst);
      this.energy = clamp(this.energy + 6, 0, this.cfg.maxEnergy);
      staminaDelta = WATER_BONUS_STAMINA;
      if (this.thirst > 0) this.warnedDehydrated = false;
      if (this.thirst > this.cfg.criticalThreshold + 5) this.warnedThirstCrit = false;
      message = formatTpl(t.gameMessages.toasts.consumeDrankWater, {
        name: itemName,
        thirst: def.restoreAmount,
        stam: WATER_BONUS_STAMINA,
      });
    } else {
      if (this.health >= this.cfg.maxHealth - 0.5) {
        return {
          consumed: false,
          nextInventory: inventory,
          message: t.gameMessages.toasts.consumeAlreadyFull,
          tone: 'world',
        };
      }
      if (this.healCooldown > 0) {
        return {
          consumed: false,
          nextInventory: inventory,
          message: formatTpl(t.gameMessages.toasts.healOnCooldown, {
            sec: this.healCooldown.toFixed(1),
          }),
          tone: 'world',
        };
      }
      const prevHp = this.health;
      this.health = clamp(this.health + def.restoreAmount, 0, this.cfg.maxHealth);
      this.healRegenRemaining = Math.min(
        MEDKIT_STABILIZE_HEALTH,
        this.healRegenRemaining + MEDKIT_STABILIZE_HEALTH
      );
      this.healCooldown = HEAL_COOLDOWN_SEC;
      const gainedNow = Math.max(1, Math.round(this.health - prevHp));
      message = formatTpl(t.gameMessages.toasts.consumeUsedMed, {
        name: itemName,
        hp: gainedNow,
      });
    }

    const nextInventory = consumeInventoryResource(inventory, resourceId, 1);
    return {
      consumed: true,
      nextInventory,
      message,
      tone: 'resource',
      soundKind: def.soundKind,
      staminaDelta,
    };
  }

  private evaluateWarnings(): SurvivalNotification | null {
    const crit = this.cfg.criticalThreshold;
    const clearBuffer = crit + 5;
    const surv = getTranslations().gameMessages.survival;

    // Reset edge flags once recovered cleanly above hysteresis buffer
    if (this.hunger > 5) this.warnedStarving = false;
    if (this.thirst > 5) this.warnedDehydrated = false;
    if (this.hunger > clearBuffer) this.warnedHungerCrit = false;
    if (this.thirst > clearBuffer) this.warnedThirstCrit = false;
    if (this.energy > clearBuffer) this.warnedEnergyLow = false;

    const canEmit = (edgeNotTriggered: boolean): boolean => {
      if (edgeNotTriggered) return true;
      return this.elapsedSec - this.lastWarningAt >= this.cfg.warningCooldownSec;
    };

    if (this.thirst <= 0) {
      if (!this.warnedDehydrated || this.elapsedSec - this.lastWarningAt >= this.cfg.warningCooldownSec) {
        this.warnedDehydrated = true;
        this.warnedThirstCrit = true;
        this.lastWarningAt = this.elapsedSec;
        return { text: surv.thirstNoticeCritical, tone: 'warning' };
      }
      return null;
    }

    if (this.hunger <= 0) {
      if (!this.warnedStarving || this.elapsedSec - this.lastWarningAt >= this.cfg.warningCooldownSec) {
        this.warnedStarving = true;
        this.warnedHungerCrit = true;
        this.lastWarningAt = this.elapsedSec;
        return { text: surv.hungerNoticeCritical, tone: 'warning' };
      }
      return null;
    }

    if (this.thirst <= crit && canEmit(!this.warnedThirstCrit)) {
      this.warnedThirstCrit = true;
      this.lastWarningAt = this.elapsedSec;
      return { text: surv.thirstNoticeCritical, tone: 'warning' };
    }

    if (this.hunger <= crit && canEmit(!this.warnedHungerCrit)) {
      this.warnedHungerCrit = true;
      this.lastWarningAt = this.elapsedSec;
      return { text: surv.hungerNoticeCritical, tone: 'warning' };
    }

    if (this.energy <= crit && !this.isResting && canEmit(!this.warnedEnergyLow)) {
      this.warnedEnergyLow = true;
      this.lastWarningAt = this.elapsedSec;
      return { text: surv.exhaustedNotice, tone: 'warning' };
    }

    return null;
  }
}
