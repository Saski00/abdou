import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  ZombieRig,
  ZombieSharedGeometries,
  animateZombieRig,
  buildFirstPersonCombatBlade,
  buildFirstPersonMeleePipe,
  buildFirstPersonServicePistol,
  buildProceduralZombieModel,
  createZombieSharedGeometries,
} from '../assets/models/zombieModel';
import {
  CombatSystem,
  WEAPON_DEFINITIONS,
  performPlayerRangedShot,
  performWeaponMelee,
} from '../game/combatSystem';
import { WeaponId } from '../game/types';
import {
  INITIAL_ZOMBIE_SPAWNS,
  MeleeHitResult,
  NoiseEvent,
  RUNNER_ZOMBIE_CONFIG,
  STANDARD_ZOMBIE_CONFIG,
  ZombieAgent,
  ZombieSpawnConfig,
  ZombieStepContext,
  createZombieAgent,
  dispatchNoiseToZombies,
  hasLineOfSight2D,
  isPointBlocked,
  stepZombiesAI,
} from '../game/zombieAI';
import { SavedZombieState } from '../game/saveSystem';
import { AssetManager } from './AssetManager';
import { WorldColliders } from './WorldBuilder';

export const STORY_SURGE_SPAWNS: Record<'surge_roadblock' | 'surge_relay', ZombieSpawnConfig[]> = {
  surge_roadblock: [
    { id: 'z_rb_1', surgeId: 'surge_roadblock', homeX: 4.5, homeZ: -21.5, yaw: -2.4 },
    { id: 'z_rb_2', surgeId: 'surge_roadblock', homeX: -4.8, homeZ: -27.5, yaw: 0.4 },
  ],
  surge_relay: [
    { id: 'z_relay_1', surgeId: 'surge_relay', homeX: 1.6, homeZ: -20.5, yaw: -2.6 },
    {
      id: 'z_relay_2',
      surgeId: 'surge_relay',
      homeX: 3.4,
      homeZ: -27.6,
      yaw: 2.2,
      archetype: RUNNER_ZOMBIE_CONFIG,
    },
    { id: 'z_relay_3', surgeId: 'surge_relay', homeX: -10.8, homeZ: -25.4, yaw: 1.5 },
  ],
};

interface ZombieEntityView {
  agent: ZombieAgent;
  group: THREE.Group;
  rig: ZombieRig | null;
}

const DYNAMIC_PROWLER_SPOTS: { x: number; z: number; yaw: number }[] = [
  { x: 10.5, z: -2.0, yaw: -1.6 },
  { x: 22.8, z: -19.2, yaw: -2.2 },
  { x: -13.0, z: 22.0, yaw: 3.1 },
  { x: -27.5, z: -27.8, yaw: 0.7 },
  { x: 5.6, z: -21.2, yaw: -2.5 },
  { x: 24.5, z: 18.0, yaw: -1.2 },
  { x: -28.0, z: 36.5, yaw: 1.1 },
  { x: 14.5, z: 36.0, yaw: -2.0 },
];

const MAX_DYNAMIC_PROWLERS = 2;
const MAX_LIVING_ZOMBIES = 16;

export interface PlayerAttackAttemptResult {
  triggered: boolean;
  dryFire?: boolean;
  autoReloadStarted?: boolean;
  weaponId: WeaponId;
  staminaSpent: number;
  recoilKick: number;
  result: MeleeHitResult | null;
  killedSurgeId?: string;
}

export class ZombieManager {
  private root = new THREE.Group();
  private sharedGeos: ZombieSharedGeometries;
  private entities: ZombieEntityView[] = [];
  private agentsCache: ZombieAgent[] = [];

  private pipeProp: ReturnType<typeof buildFirstPersonMeleePipe>;
  private bladeProp: ReturnType<typeof buildFirstPersonCombatBlade>;
  private pistolProp: ReturnType<typeof buildFirstPersonServicePistol>;

  public readonly combat = new CombatSystem();
  public zombiesDefeated = 0;

  private attackCooldown = 0;
  private attackMaxCooldown = 0.54;
  private attackAnimTimer = 0;
  private attackAnimDuration = 0.28;
  private muzzleFlashTimer = 0;
  private switchAnimTimer = 0;
  private weaponVisible = false;
  private weaponBobTime = 0;
  private lastGroanTime = -99;
  private elapsedSec = 0;
  private dynamicProwlerSeq = 1;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private assets: AssetManager,
    private colliders: WorldColliders,
    private sound: SoundEngine
  ) {
    this.sharedGeos = createZombieSharedGeometries();
    scene.add(this.root);

    this.pipeProp = buildFirstPersonMeleePipe();
    this.pipeProp.group.position.set(0.32, -0.31, -0.5);
    this.pipeProp.group.rotation.set(0.24, -0.35, 0.22);
    this.pipeProp.group.visible = false;
    camera.add(this.pipeProp.group);

    this.bladeProp = buildFirstPersonCombatBlade();
    this.bladeProp.group.position.set(0.29, -0.27, -0.45);
    this.bladeProp.group.rotation.set(0.28, -0.42, 0.34);
    this.bladeProp.group.visible = false;
    camera.add(this.bladeProp.group);

    this.pistolProp = buildFirstPersonServicePistol();
    this.pistolProp.group.position.set(0.27, -0.24, -0.44);
    this.pistolProp.group.rotation.set(0.03, -0.08, 0.02);
    this.pistolProp.group.visible = false;
    camera.add(this.pistolProp.group);

    this.spawnInitialZombies();
  }

  private spawnZombieFromConfig(spawn: ZombieSpawnConfig, index: number): ZombieEntityView {
    const agent = createZombieAgent(spawn, index, this.colliders);
    let rig: ZombieRig | null = null;
    const group = this.assets.instantiateAsset(
      'enemy.zombie',
      () => {
        const built = buildProceduralZombieModel(
          this.sharedGeos,
          index,
          agent.config.id,
          agent.config.visualScale
        );
        rig = built.rig;
        return built.group;
      },
      true,
      true
    );
    group.position.set(agent.x, agent.y, agent.z);
    group.rotation.y = agent.yaw;
    this.root.add(group);
    const view = { agent, group, rig };
    this.entities.push(view);
    this.agentsCache.push(agent);
    return view;
  }

  private spawnInitialZombies(): void {
    this.clearEntities();
    INITIAL_ZOMBIE_SPAWNS.forEach((spawn, index) => {
      this.spawnZombieFromConfig(spawn, index);
    });
  }

  public spawnStorySurge(surgeId: 'surge_roadblock' | 'surge_relay', alertX: number, alertZ: number): void {
    if (this.entities.some((e) => e.agent.surgeId === surgeId)) return;
    const spawns = STORY_SURGE_SPAWNS[surgeId] ?? [];
    spawns.forEach((spawn, idx) => {
      const view = this.spawnZombieFromConfig(spawn, INITIAL_ZOMBIE_SPAWNS.length + idx + 2);
      view.agent.state = 'investigating';
      view.agent.targetX = alertX;
      view.agent.targetZ = alertZ;
      view.agent.investigateTimer = 8.0;
    });
  }

  private clearEntities(): void {
    for (const ent of this.entities) {
      this.root.remove(ent.group);
      ent.rig?.dispose();
    }
    this.entities = [];
    this.agentsCache = [];
  }

  public reset(): void {
    this.combat.reset();
    this.zombiesDefeated = 0;
    this.attackCooldown = 0;
    this.attackMaxCooldown = WEAPON_DEFINITIONS.steel_pipe.cooldownSec;
    this.attackAnimTimer = 0;
    this.attackAnimDuration = WEAPON_DEFINITIONS.steel_pipe.animDurationSec;
    this.muzzleFlashTimer = 0;
    this.switchAnimTimer = 0;
    this.pistolProp.muzzleFlash.visible = false;
    this.weaponBobTime = 0;
    this.lastGroanTime = -99;
    this.elapsedSec = 0;
    this.dynamicProwlerSeq = 1;
    this.syncActiveViewmodelVisibility();
    this.spawnInitialZombies();
  }

  public getLivingCount(): number {
    let count = 0;
    for (const ent of this.entities) {
      if (ent.agent.state !== 'dead') count += 1;
    }
    return count;
  }

  public getAttackCooldownRatio(): number {
    if (this.attackCooldown <= 0 || this.attackMaxCooldown <= 0) return 0;
    return Math.max(0, Math.min(1, this.attackCooldown / this.attackMaxCooldown));
  }

  public redirectStreetZombies(
    targetX: number,
    targetZ: number,
    maxCount = 2,
    maxSearchRadius = 28
  ): number {
    const candidates = this.entities
      .filter((e) => {
        const a = e.agent;
        if (
          a.state === 'dead' ||
          a.state === 'chasing' ||
          a.state === 'attacking' ||
          a.state === 'stunned' ||
          a.state === 'alert'
        ) {
          return false;
        }
        return Math.hypot(a.x - targetX, a.z - targetZ) <= maxSearchRadius;
      })
      .sort(
        (a, b) =>
          Math.hypot(a.agent.x - targetX, a.agent.z - targetZ) -
          Math.hypot(b.agent.x - targetX, b.agent.z - targetZ)
      );

    let moved = 0;
    for (const ent of candidates) {
      if (moved >= maxCount) break;
      ent.agent.state = 'investigating';
      ent.agent.targetX = targetX;
      ent.agent.targetZ = targetZ;
      ent.agent.investigateTimer = Math.max(ent.agent.config.investigateTimeoutSec, 8.0);
      ent.agent.stuckTimer = 0;
      ent.agent.stuckRetries = 0;
      moved += 1;
    }
    return moved;
  }

  public spawnDynamicProwlers(
    count: number,
    targetX: number,
    targetZ: number,
    minDistanceFromPlayer: number,
    playerX: number,
    playerZ: number
  ): number {
    const livingTotal = this.getLivingCount();
    const livingProwlers = this.entities.filter(
      (e) => e.agent.surgeId === 'dynamic_prowler' && e.agent.state !== 'dead'
    ).length;

    const allowedByTotal = Math.max(0, MAX_LIVING_ZOMBIES - livingTotal);
    const allowedByProwlerCap = Math.max(0, MAX_DYNAMIC_PROWLERS - livingProwlers);
    const toSpawn = Math.min(count, allowedByTotal, allowedByProwlerCap);
    if (toSpawn <= 0) return 0;

    const validSpots = DYNAMIC_PROWLER_SPOTS.filter((spot) => {
      const distPlayer = Math.hypot(spot.x - playerX, spot.z - playerZ);
      if (distPlayer < minDistanceFromPlayer) return false;
      if (distPlayer < 24 && hasLineOfSight2D(playerX, playerZ, spot.x, spot.z, this.colliders)) {
        return false;
      }
      if (isPointBlocked(spot.x, spot.z, 0.55, this.colliders)) return false;
      const crowded = this.entities.some(
        (e) => e.agent.state !== 'dead' && Math.hypot(e.agent.x - spot.x, e.agent.z - spot.z) < 2.8
      );
      return !crowded;
    }).sort(
      (a, b) =>
        Math.hypot(a.x - targetX, a.z - targetZ) - Math.hypot(b.x - targetX, b.z - targetZ)
    );

    let spawned = 0;
    for (let i = 0; i < validSpots.length && spawned < toSpawn; i++) {
      const spot = validSpots[i];
      const seq = this.dynamicProwlerSeq++;
      const archetype =
        seq % 3 === 0 ? RUNNER_ZOMBIE_CONFIG : STANDARD_ZOMBIE_CONFIG;
      const view = this.spawnZombieFromConfig(
        {
          id: `z_prowl_${seq}`,
          surgeId: 'dynamic_prowler',
          homeX: spot.x,
          homeZ: spot.z,
          yaw: spot.yaw,
          archetype,
        },
        INITIAL_ZOMBIE_SPAWNS.length + seq
      );
      view.agent.state = 'investigating';
      view.agent.targetX = targetX;
      view.agent.targetZ = targetZ;
      view.agent.investigateTimer = 9.5;
      spawned += 1;
    }
    return spawned;
  }

  public exportState(): SavedZombieState {
    const deadZombieIds = this.entities
      .filter((e) => !e.agent.surgeId && e.agent.state === 'dead')
      .map((e) => e.agent.id);

    const surgeGroups = new Map<
      string,
      { id: string; x: number; z: number; health: number; dead: boolean }[]
    >();
    for (const ent of this.entities) {
      const sId = ent.agent.surgeId;
      if (!sId || sId === 'dynamic_prowler') continue;
      const list = surgeGroups.get(sId) ?? [];
      list.push({
        id: ent.agent.id,
        x: ent.agent.x,
        z: ent.agent.z,
        health: ent.agent.health,
        dead: ent.agent.state === 'dead',
      });
      surgeGroups.set(sId, list);
    }

    const spawnedSurges: SavedZombieState['spawnedSurges'] = [];
    for (const [surgeId, zombies] of surgeGroups.entries()) {
      spawnedSurges.push({ surgeId, zombies });
    }

    return {
      zombiesDefeated: this.zombiesDefeated,
      deadZombieIds,
      spawnedSurges,
    };
  }

  public importState(raw: Partial<SavedZombieState> | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;
    if (typeof raw.zombiesDefeated === 'number' && Number.isFinite(raw.zombiesDefeated)) {
      this.zombiesDefeated = Math.max(0, Math.floor(raw.zombiesDefeated));
    }

    const deadSet = new Set(Array.isArray(raw.deadZombieIds) ? raw.deadZombieIds : []);
    for (const ent of this.entities) {
      if (deadSet.has(ent.agent.id)) {
        ent.agent.state = 'dead';
        ent.agent.health = 0;
        ent.agent.deathTimer = 10;
        ent.group.visible = false;
      }
    }

    if (Array.isArray(raw.spawnedSurges)) {
      for (const surge of raw.spawnedSurges) {
        if (surge.surgeId !== 'surge_roadblock' && surge.surgeId !== 'surge_relay') continue;
        const spawns = STORY_SURGE_SPAWNS[surge.surgeId] ?? [];
        spawns.forEach((spawn, idx) => {
          const view = this.spawnZombieFromConfig(spawn, INITIAL_ZOMBIE_SPAWNS.length + idx + 2);
          const savedItem = surge.zombies?.find((z) => z.id === spawn.id);
          if (savedItem) {
            if (savedItem.dead) {
              view.agent.state = 'dead';
              view.agent.health = 0;
              view.agent.deathTimer = 10;
              view.group.visible = false;
            } else {
              view.agent.x = savedItem.x;
              view.agent.z = savedItem.z;
              view.agent.health = Math.max(1, savedItem.health);
              view.group.position.set(view.agent.x, view.agent.y, view.agent.z);
            }
          }
        });
      }
    }
  }

  private syncActiveViewmodelVisibility(): void {
    const active = this.combat.getEquippedWeapon().id;
    this.pipeProp.group.visible = this.weaponVisible && active === 'steel_pipe';
    this.bladeProp.group.visible = this.weaponVisible && active === 'scrap_blade';
    this.pistolProp.group.visible = this.weaponVisible && active === 'service_pistol';
  }

  public setFirstPersonWeaponVisible(visible: boolean): void {
    this.weaponVisible = visible;
    this.syncActiveViewmodelVisibility();
  }

  public selectWeapon(id: WeaponId): boolean {
    const changed = this.combat.equipWeapon(id);
    if (!changed) return false;
    this.attackCooldown = Math.min(this.attackCooldown, 0.14);
    this.attackAnimTimer = 0;
    this.muzzleFlashTimer = 0;
    this.pistolProp.muzzleFlash.visible = false;
    this.switchAnimTimer = 0.18;
    this.sound.playWeaponSwitch();
    this.syncActiveViewmodelVisibility();
    return true;
  }

  public cycleWeapon(direction: 1 | -1 = 1): WeaponId | null {
    const next = this.combat.cycleWeapon(direction);
    if (!next) return null;
    this.attackCooldown = Math.min(this.attackCooldown, 0.14);
    this.attackAnimTimer = 0;
    this.muzzleFlashTimer = 0;
    this.pistolProp.muzzleFlash.visible = false;
    this.switchAnimTimer = 0.18;
    this.sound.playWeaponSwitch();
    this.syncActiveViewmodelVisibility();
    return next;
  }

  public unlockAndMaybeEquipWeapon(id: WeaponId, autoEquip = false): boolean {
    const unlockedNew = this.combat.unlockWeapon(id, autoEquip);
    if (autoEquip) {
      this.switchAnimTimer = 0.2;
      this.sound.playWeaponSwitch();
    }
    this.syncActiveViewmodelVisibility();
    return unlockedNew;
  }

  public triggerReload(): {
    started: boolean;
    reason: 'not_ranged' | 'already_reloading' | 'mag_full' | 'no_reserve' | null;
  } {
    const res = this.combat.startReload();
    if (res.started) {
      this.sound.playPistolReload(false);
    }
    return res;
  }

  public emitNoise(event: NoiseEvent, nightFactor = 0, rainIntensity = 0): void {
    dispatchNoiseToZombies(this.agentsCache, event, this.colliders, nightFactor, rainIntensity);
  }

  public getAgents(): ZombieAgent[] {
    return this.agentsCache;
  }

  public replenishStreetZombiesOnNewDay(
    _day: number,
    playerX: number,
    playerZ: number
  ): number {
    const livingStreet = this.entities.filter(
      (e) => !e.agent.surgeId && e.agent.state !== 'dead'
    ).length;
    if (livingStreet >= 4) return 0;

    let revived = 0;
    const needed = Math.min(2, 4 - livingStreet);
    for (const ent of this.entities) {
      if (revived >= needed) break;
      const a = ent.agent;
      if (a.surgeId || a.state !== 'dead') continue;
      const distHome = Math.hypot(playerX - a.homeX, playerZ - a.homeZ);
      if (distHome < 22) continue;
      if (distHome < 32 && hasLineOfSight2D(playerX, playerZ, a.homeX, a.homeZ, this.colliders)) {
        continue;
      }

      a.x = a.homeX;
      a.z = a.homeZ;
      a.health = a.maxHealth;
      a.state = 'idle';
      a.awareness = 0;
      a.deathTimer = 0;
      a.hitFlashTimer = 0;
      a.attackCooldown = 0;
      a.attackWindup = 0;
      a.idleTimer = 1.2;
      a.suspiciousTimer = 0;
      a.alertTimer = 0;
      a.searchTimer = 0;
      a.stunTimer = 0;
      a.stuckTimer = 0;
      a.stuckRetries = 0;
      a.loseSightTimer = 0;
      ent.group.position.set(a.x, a.y, a.z);
      ent.group.visible = true;
      revived += 1;
    }
    return revived;
  }

  public triggerPlayerAttack(
    playerX: number,
    playerEyeY: number,
    playerZ: number,
    playerYaw: number,
    playerPitch: number,
    nightFactor = 0,
    context?: { isMoving?: boolean; isSprinting?: boolean; exhausted?: boolean }
  ): PlayerAttackAttemptResult {
    const weapon = this.combat.getEquippedWeapon();
    if (this.attackCooldown > 0) {
      return {
        triggered: false,
        weaponId: weapon.id,
        staminaSpent: 0,
        recoilKick: 0,
        result: null,
      };
    }

    if (weapon.kind === 'ranged') {
      const snap = this.combat.getSnapshot();
      if (snap.isReloading) {
        return {
          triggered: false,
          weaponId: weapon.id,
          staminaSpent: 0,
          recoilKick: 0,
          result: null,
        };
      }

      if (!this.combat.consumeRoundOnFire()) {
        this.attackCooldown = 0.24;
        this.attackMaxCooldown = 0.24;
        this.sound.playDryFire();
        const autoReload = this.combat.startReload();
        if (autoReload.started) {
          this.sound.playPistolReload(false);
        }
        return {
          triggered: false,
          dryFire: true,
          autoReloadStarted: autoReload.started,
          weaponId: weapon.id,
          staminaSpent: 0,
          recoilKick: 0,
          result: null,
        };
      }

      this.attackCooldown = weapon.cooldownSec;
      this.attackMaxCooldown = weapon.cooldownSec;
      this.attackAnimTimer = weapon.animDurationSec;
      this.attackAnimDuration = weapon.animDurationSec;
      this.muzzleFlashTimer = 0.055;
      this.pistolProp.muzzleFlash.visible = true;
      this.sound.playPistolShot();

      this.emitNoise(
        {
          x: playerX,
          z: playerZ,
          radius: weapon.airNoiseRadius,
          source: 'combat',
        },
        nightFactor
      );

      const spreadRadians = context?.isSprinting
        ? 0.032
        : context?.isMoving
          ? 0.015
          : 0.004;

      const result = performPlayerRangedShot(
        this.agentsCache,
        this.colliders,
        weapon,
        {
          playerX,
          playerEyeY,
          playerZ,
          playerYaw,
          playerPitch,
          spreadRadians,
        }
      );

      let killedSurgeId: string | undefined;
      if (result.hit) {
        if (result.crit) {
          this.sound.playCritHit();
        } else {
          this.sound.playMeleeHit();
        }
        if (result.killed) {
          this.zombiesDefeated += 1;
          this.sound.playZombieDeath();
          const killedAgent = this.agentsCache.find((a) => a.id === result.targetId);
          if (killedAgent?.surgeId) {
            killedSurgeId = killedAgent.surgeId;
          }
        }
      }

      return {
        triggered: true,
        weaponId: weapon.id,
        staminaSpent: 0,
        recoilKick: 0.034,
        result,
        killedSurgeId,
      };
    }

    // Melee weapon (Steel Pipe or Combat Knife)
    const cooldown = context?.exhausted ? weapon.cooldownSec * 1.18 : weapon.cooldownSec;
    this.attackCooldown = cooldown;
    this.attackMaxCooldown = cooldown;
    this.attackAnimTimer = weapon.animDurationSec;
    this.attackAnimDuration = weapon.animDurationSec;

    if (weapon.id === 'scrap_blade') {
      this.sound.playKnifeSwing();
    } else {
      this.sound.playMeleeSwing();
    }

    const result = performWeaponMelee(
      this.agentsCache,
      playerX,
      playerZ,
      playerYaw,
      this.colliders,
      weapon,
      Boolean(context?.exhausted)
    );

    // Subtle noise when swinging in empty air, louder metallic impact on solid hit
    this.emitNoise(
      {
        x: playerX,
        z: playerZ,
        radius: result.hit ? weapon.hitNoiseRadius : weapon.airNoiseRadius,
        source: 'combat',
      },
      nightFactor
    );

    let killedSurgeId: string | undefined;
    if (result.hit) {
      if (result.crit) {
        this.sound.playCritHit();
      } else if (weapon.id === 'scrap_blade') {
        this.sound.playKnifeHit();
      } else {
        this.sound.playMeleeHit();
      }
      if (result.killed) {
        this.zombiesDefeated += 1;
        this.sound.playZombieDeath();
        const killedAgent = this.agentsCache.find((a) => a.id === result.targetId);
        if (killedAgent?.surgeId) {
          killedSurgeId = killedAgent.surgeId;
        }
      }
    }

    return {
      triggered: true,
      weaponId: weapon.id,
      staminaSpent: weapon.staminaCost,
      recoilKick: result.hit ? 0.015 : 0,
      result,
      killedSurgeId,
    };
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerDead: boolean,
    isMoving: boolean,
    isSprinting: boolean,
    nightFactor: number,
    flashlightOn = false,
    extraContext?: Omit<ZombieStepContext, 'isMoving' | 'isSprinting'>
  ): { playerDamage: number; reloadCompleted: boolean } {
    this.elapsedSec += dt;

    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }
    if (this.attackAnimTimer > 0) {
      this.attackAnimTimer = Math.max(0, this.attackAnimTimer - dt);
    }
    if (this.switchAnimTimer > 0) {
      this.switchAnimTimer = Math.max(0, this.switchAnimTimer - dt);
    }
    if (this.muzzleFlashTimer > 0) {
      this.muzzleFlashTimer = Math.max(0, this.muzzleFlashTimer - dt);
      if (this.muzzleFlashTimer <= 0) {
        this.pistolProp.muzzleFlash.visible = false;
      }
    }

    const combatStep = this.combat.step(dt);
    if (combatStep.reloadCompleted) {
      this.sound.playPistolReload(true);
    }

    this.updateFirstPersonWeapon(dt, isMoving, isSprinting);

    const tickRes = stepZombiesAI(
      this.agentsCache,
      dt,
      playerX,
      playerZ,
      playerDead,
      nightFactor,
      this.colliders,
      flashlightOn,
      {
        isMoving,
        isSprinting,
        ...extraContext,
      }
    );

    if (tickRes.zombieGroans > 0 && this.elapsedSec - this.lastGroanTime > 2.4) {
      this.lastGroanTime = this.elapsedSec;
      this.sound.playZombieGroan();
    }

    if (tickRes.playerDamage > 0) {
      this.sound.playPlayerHurt();
    }

    for (const ent of this.entities) {
      const a = ent.agent;
      ent.group.position.set(a.x, a.y, a.z);
      ent.group.rotation.y = a.yaw;

      if (a.state === 'dead' && a.deathTimer > 4.6) {
        ent.group.visible = false;
        continue;
      }

      if (ent.rig) {
        const dx = a.x - playerX;
        const dz = a.z - playerZ;
        if (dx * dx + dz * dz <= 44 * 44) {
          animateZombieRig(
            ent.rig,
            a.state,
            a.walkCycle,
            a.attackWindup,
            a.config.attackWindupSec,
            a.hitFlashTimer,
            a.deathTimer
          );
        }
      }
    }

    return {
      playerDamage: tickRes.playerDamage,
      reloadCompleted: combatStep.reloadCompleted,
    };
  }

  private updateFirstPersonWeapon(dt: number, isMoving: boolean, isSprinting: boolean): void {
    const bobRate = isSprinting ? 12 : isMoving ? 8 : 2.2;
    this.weaponBobTime += dt * bobRate;
    const bobX = isMoving ? Math.cos(this.weaponBobTime * 0.5) * 0.011 : 0;
    const bobY = isMoving
      ? Math.abs(Math.sin(this.weaponBobTime)) * 0.013
      : Math.sin(this.weaponBobTime) * 0.0028;

    const switchDrop = this.switchAnimTimer > 0 ? (this.switchAnimTimer / 0.18) * 0.14 : 0;
    const combatSnap = this.combat.getSnapshot();
    const active = combatSnap.equippedWeaponId;

    if (active === 'service_pistol') {
      const reloadTilt = combatSnap.isReloading
        ? Math.sin(combatSnap.reloadProgress * Math.PI)
        : 0;
      const recoil =
        this.attackAnimTimer > 0
          ? Math.sin((this.attackAnimTimer / Math.max(0.05, this.attackAnimDuration)) * Math.PI)
          : 0;

      this.pistolProp.group.position.set(
        0.27 + bobX * 0.65 - reloadTilt * 0.05,
        -0.24 + bobY * 0.65 - switchDrop - reloadTilt * 0.12 + recoil * 0.018,
        -0.44 + recoil * 0.055
      );
      this.pistolProp.group.rotation.set(
        0.03 + recoil * 0.24 - reloadTilt * 0.45,
        -0.08 + reloadTilt * 0.35,
        0.02 - reloadTilt * 0.42
      );
      return;
    }

    if (active === 'scrap_blade') {
      if (this.attackAnimTimer > 0) {
        const progress = 1 - this.attackAnimTimer / Math.max(0.05, this.attackAnimDuration);
        const slash = Math.sin(progress * Math.PI);
        this.bladeProp.group.position.set(
          0.29 - slash * 0.26,
          -0.27 + slash * 0.06,
          -0.45 - slash * 0.14
        );
        this.bladeProp.group.rotation.set(
          0.28 - slash * 0.95,
          -0.42 + slash * 1.15,
          0.34 + slash * 0.95
        );
      } else {
        this.bladeProp.group.position.set(0.29 + bobX, -0.27 + bobY - switchDrop, -0.45);
        this.bladeProp.group.rotation.set(0.28, -0.42, 0.34);
      }
      return;
    }

    // Steel Pipe default melee
    if (this.attackAnimTimer > 0) {
      const progress = 1 - this.attackAnimTimer / Math.max(0.05, this.attackAnimDuration);
      const arc = Math.sin(progress * Math.PI);
      this.pipeProp.group.position.set(
        0.32 - arc * 0.22,
        -0.31 + arc * 0.11,
        -0.5 - arc * 0.14
      );
      this.pipeProp.group.rotation.set(
        0.24 - arc * 1.15,
        -0.35 + arc * 0.85,
        0.22 + arc * 0.65
      );
    } else {
      this.pipeProp.group.position.set(0.32 + bobX, -0.31 + bobY - switchDrop, -0.5);
      this.pipeProp.group.rotation.set(0.24, -0.35, 0.22);
    }
  }

  public dispose(): void {
    this.clearEntities();
    this.sharedGeos.dispose();
    this.pipeProp.dispose();
    this.bladeProp.dispose();
    this.pistolProp.dispose();
  }
}
