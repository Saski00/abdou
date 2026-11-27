import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import { ASSET_REGISTRY } from '../assets/models/assetRegistry';
import {
  GlbZombieAnimInfo,
  GlbZombieRig,
  animateGlbZombieRig,
  createGlbZombieRig,
} from '../assets/models/zombieGlbAdapter';
import {
  ZombieSharedGeometries,
  buildFirstPersonCombatBlade,
  buildFirstPersonMeleePipe,
  buildFirstPersonServicePistol,
  createZombieSharedGeometries,
} from '../assets/models/zombieModel';
import { damp } from '../assets/models/characterGeometryKit';
import { PlayerAnimContext } from './FirstPersonController';
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
  tintVariant: number;
  glbRig: GlbZombieRig | null;
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

export type PlayerWeaponAnimState =
  | 'idle'
  | 'walk'
  | 'sprint'
  | 'airborne'
  | 'attack_windup'
  | 'attack_strike'
  | 'attack_recovery'
  | 'reload'
  | 'switch'
  | 'flinch'
  | 'dead';

export interface DeferredMeleeHit {
  weaponId: WeaponId;
  result: MeleeHitResult;
  killedSurgeId?: string;
  recoilKick: number;
}

export interface PlayerAttackAttemptResult {
  triggered: boolean;
  pendingMelee?: boolean;
  dryFire?: boolean;
  autoReloadStarted?: boolean;
  weaponId: WeaponId;
  staminaSpent: number;
  recoilKick: number;
  result: MeleeHitResult | null;
  killedSurgeId?: string;
}

interface PendingMeleeStrike {
  weaponId: WeaponId;
  exhausted: boolean;
  nightFactor: number;
  impactDelaySec: number;
  elapsed: number;
}

interface WeaponViewPose {
  moveBlend: number;
  sprintBlend: number;
  turnLagYaw: number;
  turnLagPitch: number;
  strafeRoll: number;
  airDip: number;
  landDip: number;
  restBlend: number;
  flinchImpulse: number;
  deadDrop: number;
  breathPhase: number;
  pipePosX: number;
  pipePosY: number;
  pipePosZ: number;
  pipeRotX: number;
  pipeRotY: number;
  pipeRotZ: number;
  pipeOffX: number;
  pipeOffY: number;
  bladePosX: number;
  bladePosY: number;
  bladePosZ: number;
  bladeRotX: number;
  bladeRotY: number;
  bladeRotZ: number;
  bladeOffX: number;
  bladeOffY: number;
  pistolPosX: number;
  pistolPosY: number;
  pistolPosZ: number;
  pistolRotX: number;
  pistolRotY: number;
  pistolRotZ: number;
  pistolLeftX: number;
  pistolLeftY: number;
  pistolLeftZ: number;
  pistolLeftRx: number;
  pistolLeftRy: number;
  pistolLeftRz: number;
  slideZ: number;
}

function createDefaultWeaponViewPose(): WeaponViewPose {
  return {
    moveBlend: 0,
    sprintBlend: 0,
    turnLagYaw: 0,
    turnLagPitch: 0,
    strafeRoll: 0,
    airDip: 0,
    landDip: 0,
    restBlend: 0,
    flinchImpulse: 0,
    deadDrop: 0,
    breathPhase: 0,
    pipePosX: 0.31,
    pipePosY: -0.3,
    pipePosZ: -0.49,
    pipeRotX: 0.24,
    pipeRotY: -0.35,
    pipeRotZ: 0.22,
    pipeOffX: -0.46,
    pipeOffY: -0.14,
    bladePosX: 0.29,
    bladePosY: -0.26,
    bladePosZ: -0.44,
    bladeRotX: 0.28,
    bladeRotY: -0.42,
    bladeRotZ: 0.34,
    bladeOffX: -0.46,
    bladeOffY: -0.14,
    pistolPosX: 0.25,
    pistolPosY: -0.23,
    pistolPosZ: -0.43,
    pistolRotX: 0.03,
    pistolRotY: -0.08,
    pistolRotZ: 0.02,
    pistolLeftX: -0.042,
    pistolLeftY: -0.105,
    pistolLeftZ: 0.048,
    pistolLeftRx: -1.08,
    pistolLeftRy: 0.28,
    pistolLeftRz: -0.44,
    slideZ: 0,
  };
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
  private thirdPersonMode = false;
  private weaponBobTime = 0;
  private lastGroanTime = -99;
  private elapsedSec = 0;
  private dynamicProwlerSeq = 1;
  private lodFrameCount = 0;
  private pendingMeleeStrike: PendingMeleeStrike | null = null;
  private weaponAnimState: PlayerWeaponAnimState = 'idle';
  private readonly viewPose: WeaponViewPose = createDefaultWeaponViewPose();
  private readonly zombieModelUrl: string;
  private zombieGlbError: string | null = null;
  private zombieAnimInfo: GlbZombieAnimInfo | null = null;
  private disposed = false;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private assets: AssetManager,
    private colliders: WorldColliders,
    private sound: SoundEngine
  ) {
    this.sharedGeos = createZombieSharedGeometries();
    scene.add(this.root);

    this.zombieModelUrl = ASSET_REGISTRY['enemy.zombie']?.gltfUrl ?? '/src/assets/models/zombie-glb.glb';

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
    void this.preloadZombieGlb();
  }

  private async preloadZombieGlb(): Promise<void> {
    const loaded = await this.assets.loadExternalGltfAsset(this.zombieModelUrl);
    if (this.disposed) return;

    if (!loaded) {
      this.zombieGlbError =
        this.assets.getLastLoadError(this.zombieModelUrl) ??
        `Unable to load zombie model at ${this.zombieModelUrl}`;
      console.error(
        `ZombieManager: Failed to load imported zombie GLB "${this.zombieModelUrl}": ${this.zombieGlbError}`
      );
      return;
    }

    this.zombieGlbError = null;
    for (const ent of this.entities) {
      if (!ent.glbRig) {
        this.attachGlbRigToEntity(ent);
      }
    }
  }

  private attachGlbRigToEntity(ent: ZombieEntityView): void {
    const entry = ASSET_REGISTRY['enemy.zombie'];
    const prepared = this.assets.clonePreparedAsset(this.zombieModelUrl, entry, true, true);
    if (!prepared) return;

    const built = createGlbZombieRig(
      prepared.root,
      prepared.animations,
      this.sharedGeos,
      ent.tintVariant,
      ent.agent.config.id,
      ent.agent.config.visualScale
    );
    ent.group.add(built.group);
    ent.glbRig = built.rig;
    this.zombieAnimInfo = built.rig.animInfo;

    // Immediately match pose if entity was restored dead or already active
    animateGlbZombieRig(
      built.rig,
      ent.agent.state,
      ent.agent.walkCycle,
      ent.agent.attackWindup,
      ent.agent.config.attackWindupSec,
      ent.agent.hitFlashTimer,
      ent.agent.deathTimer,
      0.016,
      0,
      {
        actualSpeed: ent.agent.actualSpeed,
        yawRate: ent.agent.yawRate,
        gaitStyle: ent.agent.gaitStyle,
        attackRecoveryTimer: ent.agent.attackRecoveryTimer,
        stunTimer: ent.agent.stunTimer,
        stunMaxTimer: ent.agent.stunMaxTimer,
        hitDirectionSign: ent.agent.hitDirectionSign,
      }
    );
  }

  public getZombieModelStatus(): {
    modelUrl: string;
    loaded: boolean;
    error: string | null;
    activeGlbCount: number;
    animInfo: GlbZombieAnimInfo | null;
  } {
    let activeGlbCount = 0;
    for (const ent of this.entities) {
      if (ent.glbRig) activeGlbCount += 1;
    }
    return {
      modelUrl: this.zombieModelUrl,
      loaded: Boolean(this.assets.getCachedAsset(this.zombieModelUrl)),
      error: this.zombieGlbError,
      activeGlbCount,
      animInfo: this.zombieAnimInfo,
    };
  }

  private spawnZombieFromConfig(spawn: ZombieSpawnConfig, index: number): ZombieEntityView {
    const agent = createZombieAgent(spawn, index, this.colliders);
    const group = new THREE.Group();
    group.name = 'enemy.zombie';
    group.position.set(agent.x, agent.y, agent.z);
    group.rotation.y = agent.yaw;
    this.root.add(group);

    const view: ZombieEntityView = {
      agent,
      group,
      tintVariant: index,
      glbRig: null,
    };
    if (this.assets.getCachedAsset(this.zombieModelUrl)) {
      this.attachGlbRigToEntity(view);
    }

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
      ent.glbRig?.dispose();
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
    this.lodFrameCount = 0;
    this.pendingMeleeStrike = null;
    this.weaponAnimState = 'idle';
    Object.assign(this.viewPose, createDefaultWeaponViewPose());
    this.syncActiveViewmodelVisibility();
    this.spawnInitialZombies();
  }

  public getWeaponAnimState(): PlayerWeaponAnimState {
    return this.weaponAnimState;
  }

  public triggerPlayerDamageFlinch(strength = 1.0): void {
    this.viewPose.flinchImpulse = Math.min(
      1.3,
      Math.max(this.viewPose.flinchImpulse, Math.max(0.2, strength))
    );
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
    const showFp = this.weaponVisible && !this.thirdPersonMode;
    const active = this.combat.getEquippedWeapon().id;
    this.pipeProp.group.visible = showFp && active === 'steel_pipe';
    this.bladeProp.group.visible = showFp && active === 'scrap_blade';
    this.pistolProp.group.visible = showFp && active === 'service_pistol';
  }

  public setFirstPersonWeaponVisible(visible: boolean): void {
    this.weaponVisible = visible;
    this.syncActiveViewmodelVisibility();
  }

  public setThirdPersonMode(enabled: boolean): void {
    this.thirdPersonMode = enabled;
    this.syncActiveViewmodelVisibility();
  }

  public getPlayerWeaponVisualState(): {
    equippedWeaponId: WeaponId;
    attackProgress: number;
    isAttacking: boolean;
    isReloading: boolean;
    muzzleFlashVisible: boolean;
  } {
    const snap = this.combat.getSnapshot();
    const dur = Math.max(0.06, this.attackAnimDuration);
    const attackProgress =
      this.attackAnimTimer > 0 ? Math.max(0, Math.min(1, 1 - this.attackAnimTimer / dur)) : 0;
    return {
      equippedWeaponId: snap.equippedWeaponId,
      attackProgress,
      isAttacking: this.attackAnimTimer > 0,
      isReloading: snap.isReloading,
      muzzleFlashVisible: this.muzzleFlashTimer > 0,
    };
  }

  public selectWeapon(id: WeaponId): boolean {
    const changed = this.combat.equipWeapon(id);
    if (!changed) return false;
    this.attackCooldown = Math.min(this.attackCooldown, 0.14);
    this.attackAnimTimer = 0;
    this.pendingMeleeStrike = null;
    this.muzzleFlashTimer = 0;
    this.pistolProp.muzzleFlash.visible = false;
    this.switchAnimTimer = 0.22;
    this.sound.playWeaponSwitch();
    this.syncActiveViewmodelVisibility();
    return true;
  }

  public cycleWeapon(direction: 1 | -1 = 1): WeaponId | null {
    const next = this.combat.cycleWeapon(direction);
    if (!next) return null;
    this.attackCooldown = Math.min(this.attackCooldown, 0.14);
    this.attackAnimTimer = 0;
    this.pendingMeleeStrike = null;
    this.muzzleFlashTimer = 0;
    this.pistolProp.muzzleFlash.visible = false;
    this.switchAnimTimer = 0.22;
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
      a.attackRecoveryTimer = 0;
      a.actualSpeed = 0;
      a.yawRate = 0;
      a.vx = 0;
      a.vz = 0;
      a.idleTimer = 1.2;
      a.suspiciousTimer = 0;
      a.alertTimer = 0;
      a.searchTimer = 0;
      a.stunTimer = 0;
      a.stunMaxTimer = 0;
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
    context?: {
      isMoving?: boolean;
      isSprinting?: boolean;
      exhausted?: boolean;
      immediateMelee?: boolean;
    }
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

    if (!context?.immediateMelee) {
      this.pendingMeleeStrike = {
        weaponId: weapon.id,
        exhausted: Boolean(context?.exhausted),
        nightFactor,
        impactDelaySec: weapon.id === 'scrap_blade' ? 0.062 : 0.088,
        elapsed: 0,
      };
      return {
        triggered: true,
        pendingMelee: true,
        weaponId: weapon.id,
        staminaSpent: weapon.staminaCost,
        recoilKick: 0,
        result: null,
      };
    }

    const hitPayload = this.executeMeleeHitEvaluation(
      playerX,
      playerZ,
      playerYaw,
      weapon.id,
      Boolean(context?.exhausted),
      nightFactor
    );

    return {
      triggered: true,
      weaponId: weapon.id,
      staminaSpent: weapon.staminaCost,
      recoilKick: hitPayload.recoilKick,
      result: hitPayload.result,
      killedSurgeId: hitPayload.killedSurgeId,
    };
  }

  private executeMeleeHitEvaluation(
    playerX: number,
    playerZ: number,
    playerYaw: number,
    weaponId: WeaponId,
    exhausted: boolean,
    nightFactor: number
  ): DeferredMeleeHit {
    const weapon = WEAPON_DEFINITIONS[weaponId];
    const result = performWeaponMelee(
      this.agentsCache,
      playerX,
      playerZ,
      playerYaw,
      this.colliders,
      weapon,
      exhausted
    );

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
      weaponId: weapon.id,
      result,
      killedSurgeId,
      recoilKick: result.hit ? 0.015 : 0,
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
    extraContext?: Omit<ZombieStepContext, 'isMoving' | 'isSprinting'>,
    playerAnim?: PlayerAnimContext,
    playerYaw = 0
  ): { playerDamage: number; reloadCompleted: boolean; deferredMeleeHit: DeferredMeleeHit | null } {
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

    let deferredMeleeHit: DeferredMeleeHit | null = null;
    if (playerDead) {
      this.pendingMeleeStrike = null;
    } else if (this.pendingMeleeStrike) {
      this.pendingMeleeStrike.elapsed += dt;
      if (this.pendingMeleeStrike.elapsed >= this.pendingMeleeStrike.impactDelaySec) {
        const strike = this.pendingMeleeStrike;
        this.pendingMeleeStrike = null;
        deferredMeleeHit = this.executeMeleeHitEvaluation(
          playerX,
          playerZ,
          playerYaw,
          strike.weaponId,
          strike.exhausted,
          strike.nightFactor
        );
      }
    }

    const combatStep = this.combat.step(dt);
    if (combatStep.reloadCompleted) {
      this.sound.playPistolReload(true);
    }

    this.updateFirstPersonWeapon(dt, isMoving, isSprinting, playerAnim, playerDead);

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

    this.lodFrameCount = (this.lodFrameCount + 1) & 0x3fffffff;
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      const a = ent.agent;
      ent.group.position.set(a.x, a.y, a.z);
      ent.group.rotation.y = a.yaw;

      if (a.state === 'dead' && a.deathTimer > 4.6) {
        ent.group.visible = false;
        continue;
      }

      if (ent.glbRig) {
        const dx = a.x - playerX;
        const dz = a.z - playerZ;
        const distSq = dx * dx + dz * dz;
        if (distSq <= 44 * 44) {
          const isMidFar = distSq > 22 * 22 && !(a.state === 'dead' && a.deathTimer < 0.7);
          if (isMidFar && ((this.lodFrameCount + i) & 1) !== 0) {
            continue;
          }
          const animDt = isMidFar ? dt * 2 : dt;
          animateGlbZombieRig(
            ent.glbRig,
            a.state,
            a.walkCycle,
            a.attackWindup,
            a.config.attackWindupSec,
            a.hitFlashTimer,
            a.deathTimer,
            animDt,
            distSq,
            {
              actualSpeed: a.actualSpeed,
              yawRate: a.yawRate,
              gaitStyle: a.gaitStyle,
              attackRecoveryTimer: a.attackRecoveryTimer,
              stunTimer: a.stunTimer,
              stunMaxTimer: a.stunMaxTimer,
              hitDirectionSign: a.hitDirectionSign,
            }
          );
        }
      }
    }

    return {
      playerDamage: tickRes.playerDamage,
      reloadCompleted: combatStep.reloadCompleted,
      deferredMeleeHit,
    };
  }

  private updateFirstPersonWeapon(
    dt: number,
    isMoving: boolean,
    isSprinting: boolean,
    playerAnim?: PlayerAnimContext,
    playerDead = false
  ): void {
    const vp = this.viewPose;
    const normSpeed = playerAnim ? playerAnim.normalizedSpeed : isSprinting ? 1 : isMoving ? 0.62 : 0;
    const grounded = playerAnim ? playerAnim.isGrounded : true;
    const sprinting = playerAnim ? playerAnim.isSprinting : isSprinting;
    const resting = playerAnim ? playerAnim.isResting : false;
    const exhausted = playerAnim ? playerAnim.isExhausted : false;
    const yawRate = playerAnim ? playerAnim.yawRate : 0;
    const strafeFactor = playerAnim ? playerAnim.strafeFactor : 0;
    const landImpulse = playerAnim ? playerAnim.landImpulse : 0;
    const walkPhase = playerAnim ? playerAnim.walkCycle : (this.weaponBobTime += dt * (sprinting ? 12 : isMoving ? 8 : 2.1));
    if (playerAnim) {
      this.weaponBobTime = walkPhase;
    }

    vp.breathPhase += dt * (exhausted ? 3.2 : 1.75);
    vp.moveBlend = damp(vp.moveBlend, Math.min(1, normSpeed), 12, dt);
    vp.sprintBlend = damp(vp.sprintBlend, sprinting && this.attackAnimTimer <= 0 ? 1 : 0, 10, dt);
    vp.turnLagYaw = damp(vp.turnLagYaw, Math.max(-0.045, Math.min(0.045, -yawRate * 0.011)), 14, dt);
    vp.turnLagPitch = damp(vp.turnLagPitch, Math.max(-0.025, Math.min(0.025, Math.abs(yawRate) * 0.005)), 14, dt);
    vp.strafeRoll = damp(vp.strafeRoll, -strafeFactor * 0.055, 11, dt);
    vp.airDip = damp(vp.airDip, grounded ? 0 : 1, 10, dt);
    vp.landDip = damp(vp.landDip, landImpulse * 0.065, 16, dt);
    vp.restBlend = damp(vp.restBlend, resting ? 1 : 0, 8, dt);
    vp.flinchImpulse = damp(vp.flinchImpulse, 0, 11, dt);
    vp.deadDrop = damp(vp.deadDrop, playerDead ? 1 : 0, 9, dt);

    const switchDrop = this.switchAnimTimer > 0 ? Math.sin((this.switchAnimTimer / 0.22) * Math.PI * 0.5) * 0.16 : 0;
    const combatSnap = this.combat.getSnapshot();
    const active = combatSnap.equippedWeaponId;
    const attackDur = Math.max(0.06, this.attackAnimDuration);
    const attackProgress = this.attackAnimTimer > 0 ? Math.max(0, Math.min(1, 1 - this.attackAnimTimer / attackDur)) : 0;

    if (playerDead) {
      this.weaponAnimState = 'dead';
    } else if (vp.flinchImpulse > 0.22) {
      this.weaponAnimState = 'flinch';
    } else if (this.switchAnimTimer > 0.02) {
      this.weaponAnimState = 'switch';
    } else if (combatSnap.isReloading) {
      this.weaponAnimState = 'reload';
    } else if (this.attackAnimTimer > 0) {
      if (active === 'service_pistol') {
        this.weaponAnimState = attackProgress < 0.45 ? 'attack_strike' : 'attack_recovery';
      } else {
        this.weaponAnimState =
          attackProgress < 0.28
            ? 'attack_windup'
            : attackProgress < 0.56
              ? 'attack_strike'
              : 'attack_recovery';
      }
    } else if (!grounded) {
      this.weaponAnimState = 'airborne';
    } else if (vp.sprintBlend > 0.35) {
      this.weaponAnimState = 'sprint';
    } else if (vp.moveBlend > 0.12) {
      this.weaponAnimState = 'walk';
    } else {
      this.weaponAnimState = 'idle';
    }

    const idleBreathX = Math.cos(vp.breathPhase * 0.5) * 0.0024 * (1 - vp.moveBlend * 0.6);
    const idleBreathY = Math.sin(vp.breathPhase) * (exhausted ? 0.0075 : 0.0038) * (1 - vp.moveBlend * 0.5);
    const moveBobX = Math.cos(walkPhase * 0.5) * 0.015 * vp.moveBlend;
    const moveBobY = -Math.abs(Math.sin(walkPhase)) * 0.016 * vp.moveBlend;
    const bobX = idleBreathX + moveBobX + vp.turnLagYaw;
    const bobY =
      idleBreathY +
      moveBobY +
      vp.airDip * 0.016 -
      vp.landDip -
      vp.restBlend * 0.095 -
      vp.deadDrop * 0.26 -
      switchDrop;
    const flinchX = -vp.flinchImpulse * 0.045;
    const flinchY = -vp.flinchImpulse * 0.055;
    const flinchRotZ = vp.flinchImpulse * 0.24;
    const flinchRotX = -vp.flinchImpulse * 0.18;

    if (active === 'service_pistol') {
      const reloadTilt = combatSnap.isReloading
        ? Math.sin(combatSnap.reloadProgress * Math.PI)
        : 0;
      const recoil =
        this.attackAnimTimer > 0
          ? Math.sin((1 - attackProgress) * Math.PI) * (attackProgress < 0.35 ? 1 : 0.72)
          : 0;

      const tSlideZ = recoil * 0.044;
      const tLeftX = -0.042 - reloadTilt * 0.062;
      const tLeftY = -0.105 - reloadTilt * 0.125;
      const tLeftZ = 0.048 + reloadTilt * 0.04;
      const tLeftRx = -1.08 + reloadTilt * 0.48;
      const tLeftRy = 0.28 - reloadTilt * 0.22;
      const tLeftRz = -0.44 - reloadTilt * 0.24;

      const tPosX = 0.25 + bobX * 0.65 + flinchX - reloadTilt * 0.04 - vp.sprintBlend * 0.042;
      const tPosY = -0.23 + bobY * 0.7 + flinchY - reloadTilt * 0.088 + recoil * 0.02 - vp.sprintBlend * 0.048;
      const tPosZ = -0.43 + recoil * 0.058 + vp.sprintBlend * 0.032 - vp.turnLagPitch;
      const tRotX = 0.03 + recoil * 0.26 + flinchRotX - reloadTilt * 0.36 - vp.sprintBlend * 0.28 - vp.restBlend * 0.24 - vp.deadDrop * 0.55;
      const tRotY = -0.08 + vp.turnLagYaw * 2.4 + reloadTilt * 0.32 + vp.sprintBlend * 0.34;
      const tRotZ = 0.02 + vp.strafeRoll + flinchRotZ - reloadTilt * 0.36 + vp.sprintBlend * 0.18;

      const rate = this.attackAnimTimer > 0 ? 28 : 16;
      vp.slideZ = damp(vp.slideZ, tSlideZ, 30, dt);
      vp.pistolLeftX = damp(vp.pistolLeftX, tLeftX, 16, dt);
      vp.pistolLeftY = damp(vp.pistolLeftY, tLeftY, 16, dt);
      vp.pistolLeftZ = damp(vp.pistolLeftZ, tLeftZ, 16, dt);
      vp.pistolLeftRx = damp(vp.pistolLeftRx, tLeftRx, 16, dt);
      vp.pistolLeftRy = damp(vp.pistolLeftRy, tLeftRy, 16, dt);
      vp.pistolLeftRz = damp(vp.pistolLeftRz, tLeftRz, 16, dt);

      vp.pistolPosX = damp(vp.pistolPosX, tPosX, rate, dt);
      vp.pistolPosY = damp(vp.pistolPosY, tPosY, rate, dt);
      vp.pistolPosZ = damp(vp.pistolPosZ, tPosZ, rate, dt);
      vp.pistolRotX = damp(vp.pistolRotX, tRotX, rate, dt);
      vp.pistolRotY = damp(vp.pistolRotY, tRotY, rate, dt);
      vp.pistolRotZ = damp(vp.pistolRotZ, tRotZ, rate, dt);

      this.pistolProp.slideMesh.position.z = vp.slideZ;
      this.pistolProp.leftArmPivot.position.set(vp.pistolLeftX, vp.pistolLeftY, vp.pistolLeftZ);
      this.pistolProp.leftArmPivot.rotation.set(vp.pistolLeftRx, vp.pistolLeftRy, vp.pistolLeftRz);
      this.pistolProp.group.position.set(vp.pistolPosX, vp.pistolPosY, vp.pistolPosZ);
      this.pistolProp.group.rotation.set(vp.pistolRotX, vp.pistolRotY, vp.pistolRotZ);
      return;
    }

    // 3-phase melee curve: 0..0.28 windup pullback, 0.28..0.56 sharp strike, 0.56..1.0 follow-through recovery
    let windup = 0;
    let strike = 0;
    if (this.attackAnimTimer > 0) {
      if (attackProgress < 0.28) {
        const t = attackProgress / 0.28;
        windup = t * t;
      } else if (attackProgress < 0.56) {
        const t = (attackProgress - 0.28) / 0.28;
        windup = 1 - t;
        strike = 1 - Math.pow(1 - t, 2.4);
      } else {
        const t = (attackProgress - 0.56) / 0.44;
        strike = 1 - t * t * (3 - 2 * t);
      }
    }

    if (active === 'scrap_blade') {
      const tPosX = 0.29 + bobX + flinchX + windup * 0.08 - strike * 0.29 - vp.sprintBlend * 0.04;
      const tPosY = -0.26 + bobY + flinchY + windup * 0.07 + strike * 0.05 - vp.sprintBlend * 0.04;
      const tPosZ = -0.44 + windup * 0.06 - strike * 0.16 - vp.turnLagPitch;
      const tRotX = 0.28 + flinchRotX + windup * 0.26 - strike * 1.05 - vp.sprintBlend * 0.26 - vp.restBlend * 0.22 - vp.deadDrop * 0.52;
      const tRotY = -0.42 + vp.turnLagYaw * 2.2 - windup * 0.24 + strike * 1.24 + vp.sprintBlend * 0.22;
      const tRotZ = 0.34 + vp.strafeRoll + flinchRotZ - windup * 0.22 + strike * 1.02 + vp.sprintBlend * 0.18;
      const tOffX = -0.46 - bobX * 0.8 + strike * 0.09 - windup * 0.04;
      const tOffY = -0.14 - bobY * 0.7 - strike * 0.05;

      const rate = this.attackAnimTimer > 0 ? 30 : 15;
      vp.bladePosX = damp(vp.bladePosX, tPosX, rate, dt);
      vp.bladePosY = damp(vp.bladePosY, tPosY, rate, dt);
      vp.bladePosZ = damp(vp.bladePosZ, tPosZ, rate, dt);
      vp.bladeRotX = damp(vp.bladeRotX, tRotX, rate, dt);
      vp.bladeRotY = damp(vp.bladeRotY, tRotY, rate, dt);
      vp.bladeRotZ = damp(vp.bladeRotZ, tRotZ, rate, dt);
      vp.bladeOffX = damp(vp.bladeOffX, tOffX, rate, dt);
      vp.bladeOffY = damp(vp.bladeOffY, tOffY, rate, dt);

      this.bladeProp.group.position.set(vp.bladePosX, vp.bladePosY, vp.bladePosZ);
      this.bladeProp.group.rotation.set(vp.bladeRotX, vp.bladeRotY, vp.bladeRotZ);
      this.bladeProp.leftArmPivot.position.set(vp.bladeOffX, vp.bladeOffY, 0.12);
      return;
    }

    // Steel Pipe default melee
    const tPosX = 0.31 + bobX + flinchX + windup * 0.09 - strike * 0.24 - vp.sprintBlend * 0.04;
    const tPosY = -0.3 + bobY + flinchY + windup * 0.12 + strike * 0.08 - vp.sprintBlend * 0.04;
    const tPosZ = -0.49 + windup * 0.07 - strike * 0.16 - vp.turnLagPitch;
    const tRotX = 0.24 + flinchRotX + windup * 0.34 - strike * 1.24 - vp.sprintBlend * 0.24 - vp.restBlend * 0.22 - vp.deadDrop * 0.52;
    const tRotY = -0.35 + vp.turnLagYaw * 2.2 - windup * 0.26 + strike * 0.94 + vp.sprintBlend * 0.25;
    const tRotZ = 0.22 + vp.strafeRoll + flinchRotZ - windup * 0.26 + strike * 0.72 + vp.sprintBlend * 0.16;
    const tOffX = -0.46 - bobX * 0.8 + strike * 0.08 - windup * 0.04;
    const tOffY = -0.14 - bobY * 0.7 - strike * 0.06;

    const rate = this.attackAnimTimer > 0 ? 28 : 14;
    vp.pipePosX = damp(vp.pipePosX, tPosX, rate, dt);
    vp.pipePosY = damp(vp.pipePosY, tPosY, rate, dt);
    vp.pipePosZ = damp(vp.pipePosZ, tPosZ, rate, dt);
    vp.pipeRotX = damp(vp.pipeRotX, tRotX, rate, dt);
    vp.pipeRotY = damp(vp.pipeRotY, tRotY, rate, dt);
    vp.pipeRotZ = damp(vp.pipeRotZ, tRotZ, rate, dt);
    vp.pipeOffX = damp(vp.pipeOffX, tOffX, rate, dt);
    vp.pipeOffY = damp(vp.pipeOffY, tOffY, rate, dt);

    this.pipeProp.group.position.set(vp.pipePosX, vp.pipePosY, vp.pipePosZ);
    this.pipeProp.group.rotation.set(vp.pipeRotX, vp.pipeRotY, vp.pipeRotZ);
    this.pipeProp.leftArmPivot.position.set(vp.pipeOffX, vp.pipeOffY, 0.12);
  }

  public dispose(): void {
    this.disposed = true;
    this.clearEntities();
    this.sharedGeos.dispose();
    this.pipeProp.dispose();
    this.bladeProp.dispose();
    this.pistolProp.dispose();
  }
}
