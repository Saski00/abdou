import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  ZombieRig,
  ZombieSharedGeometries,
  animateZombieRig,
  buildFirstPersonMeleePipe,
  buildProceduralZombieModel,
  createZombieSharedGeometries,
} from '../assets/models/zombieModel';
import {
  DEFAULT_MELEE_CONFIG,
  INITIAL_ZOMBIE_SPAWNS,
  MeleeHitResult,
  NoiseEvent,
  ZombieAgent,
  ZombieSpawnConfig,
  createZombieAgent,
  dispatchNoiseToZombies,
  performPlayerMelee,
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
    { id: 'z_relay_1', surgeId: 'surge_relay', homeX: -1.6, homeZ: -20.5, yaw: -2.6 },
    { id: 'z_relay_2', surgeId: 'surge_relay', homeX: 3.4, homeZ: -27.6, yaw: 2.2 },
    { id: 'z_relay_3', surgeId: 'surge_relay', homeX: -10.8, homeZ: -25.4, yaw: 1.5 },
  ],
};

interface ZombieEntityView {
  agent: ZombieAgent;
  group: THREE.Group;
  rig: ZombieRig | null;
}

export class ZombieManager {
  private root = new THREE.Group();
  private sharedGeos: ZombieSharedGeometries;
  private entities: ZombieEntityView[] = [];
  private agentsCache: ZombieAgent[] = [];
  private meleeProp: ReturnType<typeof buildFirstPersonMeleePipe>;

  public zombiesDefeated = 0;
  private meleeCooldown = 0;
  private meleeSwingTimer = 0;
  private weaponBobTime = 0;
  private lastGroanTime = -99;
  private elapsedSec = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private assets: AssetManager,
    private colliders: WorldColliders,
    private sound: SoundEngine
  ) {
    this.sharedGeos = createZombieSharedGeometries();
    scene.add(this.root);

    this.meleeProp = buildFirstPersonMeleePipe();
    this.meleeProp.group.position.set(0.32, -0.31, -0.50);
    this.meleeProp.group.rotation.set(0.24, -0.35, 0.22);
    this.meleeProp.group.visible = false;
    camera.add(this.meleeProp.group);

    this.spawnInitialZombies();
  }

  private spawnZombieFromConfig(spawn: ZombieSpawnConfig, index: number): ZombieEntityView {
    const agent = createZombieAgent(spawn, index, this.colliders);
    let rig: ZombieRig | null = null;
    const group = this.assets.instantiateAsset(
      'enemy.zombie',
      () => {
        const built = buildProceduralZombieModel(this.sharedGeos, index);
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
    this.zombiesDefeated = 0;
    this.meleeCooldown = 0;
    this.meleeSwingTimer = 0;
    this.weaponBobTime = 0;
    this.lastGroanTime = -99;
    this.elapsedSec = 0;
    this.spawnInitialZombies();
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
      if (!sId) continue;
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

  public setFirstPersonWeaponVisible(visible: boolean): void {
    this.meleeProp.group.visible = visible;
  }

  public emitNoise(event: NoiseEvent, nightFactor = 0): void {
    dispatchNoiseToZombies(this.agentsCache, event, this.colliders, nightFactor);
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
      if (Math.hypot(playerX - a.homeX, playerZ - a.homeZ) < 20) continue;

      a.x = a.homeX;
      a.z = a.homeZ;
      a.health = a.maxHealth;
      a.state = 'idle';
      a.deathTimer = 0;
      a.hitFlashTimer = 0;
      a.attackCooldown = 0;
      a.attackWindup = 0;
      a.idleTimer = 1.2;
      a.loseSightTimer = 0;
      ent.group.position.set(a.x, a.y, a.z);
      ent.group.visible = true;
      revived += 1;
    }
    return revived;
  }

  public triggerPlayerAttack(
    playerX: number,
    playerZ: number,
    playerYaw: number,
    nightFactor = 0
  ): { triggered: boolean; result: MeleeHitResult | null; killedSurgeId?: string } {
    if (this.meleeCooldown > 0) {
      return { triggered: false, result: null };
    }

    this.meleeCooldown = DEFAULT_MELEE_CONFIG.cooldownSec;
    this.meleeSwingTimer = 0.28;
    this.sound.playMeleeSwing();

    const agents = this.agentsCache;
    this.emitNoise(
      {
        x: playerX,
        z: playerZ,
        radius: 10.5,
        source: 'combat',
      },
      nightFactor
    );

    const result = performPlayerMelee(
      agents,
      playerX,
      playerZ,
      playerYaw,
      this.colliders,
      DEFAULT_MELEE_CONFIG
    );

    let killedSurgeId: string | undefined;
    if (result.hit) {
      this.sound.playMeleeHit();
      if (result.killed) {
        this.zombiesDefeated += 1;
        this.sound.playZombieDeath();
        const killedAgent = agents.find((a) => a.id === result.targetId);
        if (killedAgent?.surgeId) {
          killedSurgeId = killedAgent.surgeId;
        }
      }
    }

    return { triggered: true, result, killedSurgeId };
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    playerDead: boolean,
    isMoving: boolean,
    isSprinting: boolean,
    nightFactor: number,
    flashlightOn = false
  ): { playerDamage: number } {
    this.elapsedSec += dt;

    if (this.meleeCooldown > 0) {
      this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    }
    if (this.meleeSwingTimer > 0) {
      this.meleeSwingTimer = Math.max(0, this.meleeSwingTimer - dt);
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
      flashlightOn
    );

    if (tickRes.zombieGroans > 0 && this.elapsedSec - this.lastGroanTime > 2.4) {
      this.lastGroanTime = this.elapsedSec;
      this.sound.playZombieGroan();
    }

    if (tickRes.playerDamage > 0) {
      this.sound.playPlayerHurt();
    }

    // Sync 3D transforms & distance-culled procedural rig animations
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

    return { playerDamage: tickRes.playerDamage };
  }

  private updateFirstPersonWeapon(dt: number, isMoving: boolean, isSprinting: boolean): void {
    const bobRate = isSprinting ? 12 : isMoving ? 8 : 2.2;
    this.weaponBobTime += dt * bobRate;
    const bobX = isMoving ? Math.cos(this.weaponBobTime * 0.5) * 0.012 : 0;
    const bobY = isMoving
      ? Math.abs(Math.sin(this.weaponBobTime)) * 0.014
      : Math.sin(this.weaponBobTime) * 0.003;

    if (this.meleeSwingTimer > 0) {
      const progress = 1 - this.meleeSwingTimer / 0.28;
      const arc = Math.sin(progress * Math.PI);
      this.meleeProp.group.position.set(
        0.32 - arc * 0.22,
        -0.31 + arc * 0.11,
        -0.50 - arc * 0.14
      );
      this.meleeProp.group.rotation.set(
        0.24 - arc * 1.15,
        -0.35 + arc * 0.85,
        0.22 + arc * 0.65
      );
    } else {
      this.meleeProp.group.position.set(0.32 + bobX, -0.31 + bobY, -0.50);
      this.meleeProp.group.rotation.set(0.24, -0.35, 0.22);
    }
  }

  public dispose(): void {
    this.clearEntities();
    this.sharedGeos.dispose();
    this.meleeProp.dispose();
  }
}
