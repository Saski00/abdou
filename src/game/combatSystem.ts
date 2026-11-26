import { WorldColliders } from '../engine/WorldBuilder';
import { clamp } from './collision';
import { SavedCombatState } from './saveSystem';
import { WeaponId, WeaponKind } from './types';
import {
  MeleeHitResult,
  ZombieAgent,
  applyZombieDamage,
  hasLineOfSight2D,
  performPlayerMelee,
} from './zombieAI';

export interface WeaponDefinition {
  id: WeaponId;
  kind: WeaponKind;
  name: string;
  damage: number;
  critMultiplier: number;
  critMinDot: number;
  range: number;
  minDot: number;
  cooldownSec: number;
  animDurationSec: number;
  knockback: number;
  stunMultiplier: number;
  hitNoiseRadius: number;
  airNoiseRadius: number;
  staminaCost: number;
  magSize: number;
  maxReserveAmmo: number;
  reloadDurationSec: number;
}

export const WEAPON_ORDER: WeaponId[] = ['steel_pipe', 'scrap_blade', 'service_pistol'];

export const WEAPON_DEFINITIONS: Record<WeaponId, WeaponDefinition> = {
  steel_pipe: {
    id: 'steel_pipe',
    kind: 'melee',
    name: 'Steel Pipe',
    damage: 30,
    critMultiplier: 1.33,
    critMinDot: 0.88,
    range: 2.55,
    minDot: 0.42,
    cooldownSec: 0.54,
    animDurationSec: 0.28,
    knockback: 0.44,
    stunMultiplier: 1.2,
    hitNoiseRadius: 8.5,
    airNoiseRadius: 4.0,
    staminaCost: 4,
    magSize: 0,
    maxReserveAmmo: 0,
    reloadDurationSec: 0,
  },
  scrap_blade: {
    id: 'scrap_blade',
    kind: 'melee',
    name: 'Combat Knife',
    damage: 22,
    critMultiplier: 1.42,
    critMinDot: 0.85,
    range: 2.15,
    minDot: 0.48,
    cooldownSec: 0.32,
    animDurationSec: 0.2,
    knockback: 0.2,
    stunMultiplier: 0.75,
    hitNoiseRadius: 5.5,
    airNoiseRadius: 2.2,
    staminaCost: 2,
    magSize: 0,
    maxReserveAmmo: 0,
    reloadDurationSec: 0,
  },
  service_pistol: {
    id: 'service_pistol',
    kind: 'ranged',
    name: '9mm Service Pistol',
    damage: 44,
    critMultiplier: 1.55,
    critMinDot: 0.96,
    range: 26.0,
    minDot: 0.94,
    cooldownSec: 0.36,
    animDurationSec: 0.16,
    knockback: 0.32,
    stunMultiplier: 0.95,
    hitNoiseRadius: 24.0,
    airNoiseRadius: 24.0,
    staminaCost: 0,
    magSize: 7,
    maxReserveAmmo: 42,
    reloadDurationSec: 1.45,
  },
};

export interface PlayerRangedShotInput {
  playerX: number;
  playerEyeY: number;
  playerZ: number;
  playerYaw: number;
  playerPitch: number;
  spreadRadians?: number;
}

export function performPlayerRangedShot(
  zombies: ZombieAgent[],
  colliders: WorldColliders,
  weapon: WeaponDefinition,
  input: PlayerRangedShotInput
): MeleeHitResult {
  // Forward vector in Three.js YXZ order:
  // horizontal forward (-sin(yaw), -cos(yaw)), pitch tilts up(+)/down(-)
  const spread = Math.max(0, input.spreadRadians ?? 0);
  const yawOffset = spread > 0 ? (Math.random() * 2 - 1) * spread : 0;
  const pitchOffset = spread > 0 ? (Math.random() * 2 - 1) * spread * 0.75 : 0;
  const effYaw = input.playerYaw + yawOffset;
  const effPitch = clamp(input.playerPitch + pitchOffset, -Math.PI * 0.48, Math.PI * 0.48);

  const cosPitch = Math.cos(effPitch);
  const dirX = -Math.sin(effYaw) * cosPitch;
  const dirY = Math.sin(effPitch);
  const dirZ = -Math.cos(effYaw) * cosPitch;

  let bestTarget: ZombieAgent | null = null;
  let bestDist = Infinity;
  let bestCrit = false;

  for (const z of zombies) {
    if (z.state === 'dead') continue;

    // 3D ray vs vertical zombie cylinder approximation
    const toZx = z.x - input.playerX;
    const toZy = z.y - input.playerEyeY;
    const toZz = z.z - input.playerZ;

    const horizDirSq = dirX * dirX + dirZ * dirZ;
    let t: number;
    if (horizDirSq > 0.0001) {
      t = (toZx * dirX + toZy * dirY + toZz * dirZ);
    } else {
      continue;
    }

    if (t < 0.25 || t > weapon.range) continue;

    const hitX = input.playerX + dirX * t;
    const hitY = input.playerEyeY + dirY * t;
    const hitZ = input.playerZ + dirZ * t;

    const radialDist = Math.hypot(hitX - z.x, hitZ - z.z);
    const hitRadius = z.config.radius * 1.18;
    if (radialDist > hitRadius) continue;

    const zMinY = z.y;
    const zHeight = 1.72 * z.config.visualScale;
    const zMaxY = z.y + zHeight;
    if (hitY < zMinY || hitY > zMaxY) continue;

    // Ensure bullets do not pass through solid walls, closed doors, fences, or vehicles
    if (!hasLineOfSight2D(input.playerX, input.playerZ, z.x, z.z, colliders)) continue;

    if (t < bestDist) {
      bestDist = t;
      bestTarget = z;
      const relHeight = (hitY - zMinY) / zHeight;
      bestCrit = relHeight >= 0.72 || radialDist <= z.config.radius * 0.42;
    }
  }

  if (!bestTarget) {
    return {
      hit: false,
      killed: false,
      crit: false,
      targetId: null,
      damageDealt: 0,
      remainingHealth: 0,
    };
  }

  const dmg = bestCrit
    ? Math.round(weapon.damage * weapon.critMultiplier)
    : weapon.damage;

  return applyZombieDamage(bestTarget, zombies, input.playerX, input.playerZ, colliders, {
    damage: dmg,
    crit: bestCrit,
    knockback: weapon.knockback,
    stunMultiplier: weapon.stunMultiplier,
  });
}

export function performWeaponMelee(
  zombies: ZombieAgent[],
  playerX: number,
  playerZ: number,
  playerYaw: number,
  colliders: WorldColliders,
  weapon: WeaponDefinition,
  exhausted = false
): MeleeHitResult {
  const dmgScale = exhausted ? 0.85 : 1.0;
  return performPlayerMelee(zombies, playerX, playerZ, playerYaw, colliders, {
    range: weapon.range,
    minDot: weapon.minDot,
    damage: Math.round(weapon.damage * dmgScale),
    cooldownSec: weapon.cooldownSec,
    critMinDot: weapon.critMinDot,
    critMultiplier: weapon.critMultiplier,
    knockback: weapon.knockback,
    stunMultiplier: weapon.stunMultiplier,
  });
}

export interface CombatSnapshot {
  equippedWeaponId: WeaponId;
  unlockedWeaponIds: WeaponId[];
  magAmmo: number;
  magSize: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
}

export class CombatSystem {
  private equippedWeaponId: WeaponId = 'steel_pipe';
  private unlocked = new Set<WeaponId>(['steel_pipe']);
  private pistolMagAmmo = 0;
  private pistolReserveAmmo = 0;
  private isReloading = false;
  private reloadTimer = 0;

  public reset(): void {
    this.equippedWeaponId = 'steel_pipe';
    this.unlocked = new Set(['steel_pipe']);
    this.pistolMagAmmo = 0;
    this.pistolReserveAmmo = 0;
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public getEquippedWeapon(): WeaponDefinition {
    return WEAPON_DEFINITIONS[this.equippedWeaponId];
  }

  public getUnlockedWeaponIds(): WeaponId[] {
    return WEAPON_ORDER.filter((id) => this.unlocked.has(id));
  }

  public hasWeapon(id: WeaponId): boolean {
    return this.unlocked.has(id);
  }

  public unlockWeapon(id: WeaponId, autoEquip = false): boolean {
    const alreadyOwned = this.unlocked.has(id);
    this.unlocked.add(id);
    if (autoEquip) {
      this.equipWeapon(id);
    }
    return !alreadyOwned;
  }

  public equipWeapon(id: WeaponId): boolean {
    if (!this.unlocked.has(id) || this.equippedWeaponId === id) {
      return false;
    }
    this.cancelReload();
    this.equippedWeaponId = id;
    return true;
  }

  public cycleWeapon(direction: 1 | -1 = 1): WeaponId | null {
    const list = this.getUnlockedWeaponIds();
    if (list.length <= 1) return null;
    const idx = list.indexOf(this.equippedWeaponId);
    const nextIdx = (idx + direction + list.length) % list.length;
    const nextId = list[nextIdx];
    if (nextId === this.equippedWeaponId) return null;
    this.cancelReload();
    this.equippedWeaponId = nextId;
    return nextId;
  }

  public addPistolAmmo(amount: number, autoLoadIfEmpty = true): {
    addedToMag: number;
    addedToReserve: number;
    overflow: number;
  } {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { addedToMag: 0, addedToReserve: 0, overflow: 0 };
    }
    let remaining = Math.floor(amount);
    const pistolDef = WEAPON_DEFINITIONS.service_pistol;
    let addedToMag = 0;

    if (autoLoadIfEmpty && this.unlocked.has('service_pistol') && this.pistolMagAmmo === 0) {
      const toMag = Math.min(pistolDef.magSize, remaining);
      this.pistolMagAmmo += toMag;
      addedToMag = toMag;
      remaining -= toMag;
    }

    const spaceReserve = Math.max(0, pistolDef.maxReserveAmmo - this.pistolReserveAmmo);
    const addedToReserve = Math.min(spaceReserve, remaining);
    this.pistolReserveAmmo += addedToReserve;
    remaining -= addedToReserve;

    return {
      addedToMag,
      addedToReserve,
      overflow: remaining,
    };
  }

  public canAddReserveAmmo(): boolean {
    return this.pistolReserveAmmo < WEAPON_DEFINITIONS.service_pistol.maxReserveAmmo;
  }

  public startReload(): { started: boolean; reason: 'not_ranged' | 'already_reloading' | 'mag_full' | 'no_reserve' | null } {
    const weapon = this.getEquippedWeapon();
    if (weapon.kind !== 'ranged') {
      return { started: false, reason: 'not_ranged' };
    }
    if (this.isReloading) {
      return { started: false, reason: 'already_reloading' };
    }
    if (this.pistolMagAmmo >= weapon.magSize) {
      return { started: false, reason: 'mag_full' };
    }
    if (this.pistolReserveAmmo <= 0) {
      return { started: false, reason: 'no_reserve' };
    }
    this.isReloading = true;
    this.reloadTimer = weapon.reloadDurationSec;
    return { started: true, reason: null };
  }

  public cancelReload(): void {
    this.isReloading = false;
    this.reloadTimer = 0;
  }

  public consumeRoundOnFire(): boolean {
    const weapon = this.getEquippedWeapon();
    if (weapon.kind !== 'ranged') return true;
    if (this.isReloading || this.pistolMagAmmo <= 0) return false;
    this.pistolMagAmmo -= 1;
    return true;
  }

  public step(dt: number): { reloadCompleted: boolean } {
    if (!this.isReloading || dt <= 0) {
      return { reloadCompleted: false };
    }
    this.reloadTimer = Math.max(0, this.reloadTimer - dt);
    if (this.reloadTimer <= 0) {
      const pistolDef = WEAPON_DEFINITIONS.service_pistol;
      const needed = Math.max(0, pistolDef.magSize - this.pistolMagAmmo);
      const loadQty = Math.min(needed, this.pistolReserveAmmo);
      this.pistolMagAmmo += loadQty;
      this.pistolReserveAmmo -= loadQty;
      this.isReloading = false;
      this.reloadTimer = 0;
      return { reloadCompleted: true };
    }
    return { reloadCompleted: false };
  }

  public getSnapshot(): CombatSnapshot {
    const pistolDef = WEAPON_DEFINITIONS.service_pistol;
    const equipped = this.getEquippedWeapon();
    const progress =
      this.isReloading && pistolDef.reloadDurationSec > 0
        ? clamp(1 - this.reloadTimer / pistolDef.reloadDurationSec, 0, 1)
        : 0;

    return {
      equippedWeaponId: this.equippedWeaponId,
      unlockedWeaponIds: this.getUnlockedWeaponIds(),
      magAmmo: equipped.kind === 'ranged' ? this.pistolMagAmmo : 0,
      magSize: equipped.kind === 'ranged' ? pistolDef.magSize : 0,
      reserveAmmo: this.pistolReserveAmmo,
      maxReserveAmmo: pistolDef.maxReserveAmmo,
      isReloading: this.isReloading,
      reloadProgress: progress,
    };
  }

  public exportState(): SavedCombatState {
    return {
      equippedWeaponId: this.equippedWeaponId,
      unlockedWeaponIds: this.getUnlockedWeaponIds(),
      pistolMagAmmo: this.pistolMagAmmo,
      pistolReserveAmmo: this.pistolReserveAmmo,
    };
  }

  public importState(raw: Partial<SavedCombatState> | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;

    if (Array.isArray(raw.unlockedWeaponIds)) {
      for (const id of raw.unlockedWeaponIds) {
        if (id === 'steel_pipe' || id === 'scrap_blade' || id === 'service_pistol') {
          this.unlocked.add(id);
        }
      }
    }

    if (
      raw.equippedWeaponId &&
      (raw.equippedWeaponId === 'steel_pipe' ||
        raw.equippedWeaponId === 'scrap_blade' ||
        raw.equippedWeaponId === 'service_pistol') &&
      this.unlocked.has(raw.equippedWeaponId)
    ) {
      this.equippedWeaponId = raw.equippedWeaponId;
    }

    const pistolDef = WEAPON_DEFINITIONS.service_pistol;
    if (typeof raw.pistolMagAmmo === 'number' && Number.isFinite(raw.pistolMagAmmo)) {
      this.pistolMagAmmo = clamp(Math.floor(raw.pistolMagAmmo), 0, pistolDef.magSize);
    }
    if (typeof raw.pistolReserveAmmo === 'number' && Number.isFinite(raw.pistolReserveAmmo)) {
      this.pistolReserveAmmo = clamp(Math.floor(raw.pistolReserveAmmo), 0, pistolDef.maxReserveAmmo);
    }
  }
}
