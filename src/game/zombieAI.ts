import { SIDEWALK_HEIGHT } from '../assets/maps/neighborhoodMap';
import { WorldColliders } from '../engine/WorldBuilder';
import {
  clamp,
  resolveCircleAABB,
  resolveCircleCircle,
  resolveCircleOBB,
  resolveCircleSegment,
  segmentIntersectsAABB,
  segmentIntersectsOBB,
  segmentsIntersect2D,
} from './collision';

export type ZombieAIState =
  | 'idle'
  | 'roaming'
  | 'investigating'
  | 'chasing'
  | 'attacking'
  | 'returning'
  | 'dead';

export interface ZombieArchetypeConfig {
  id: string;
  label: string;
  maxHealth: number;
  radius: number;
  walkSpeed: number;
  investigateSpeed: number;
  chaseSpeed: number;
  returnSpeed: number;
  roamRadius: number;
  visionRangeDay: number;
  visionRangeNight: number;
  visionFovCos: number;
  closeSenseRange: number;
  hearingMultiplier: number;
  attackRange: number;
  attackDamage: number;
  attackCooldownSec: number;
  attackWindupSec: number;
  loseSightGraceSec: number;
  investigateTimeoutSec: number;
  maxChaseDistFromHome: number;
  sensorIntervalSec: number;
}

export const STANDARD_ZOMBIE_CONFIG: ZombieArchetypeConfig = {
  id: 'walker',
  label: 'Infected',
  maxHealth: 80,
  radius: 0.42,
  walkSpeed: 1.45,
  investigateSpeed: 2.05,
  chaseSpeed: 3.35,
  returnSpeed: 1.65,
  roamRadius: 7.2,
  visionRangeDay: 17.5,
  visionRangeNight: 10.5,
  visionFovCos: -0.15,
  closeSenseRange: 2.35,
  hearingMultiplier: 1.0,
  attackRange: 1.72,
  attackDamage: 16,
  attackCooldownSec: 1.35,
  attackWindupSec: 0.34,
  loseSightGraceSec: 4.5,
  investigateTimeoutSec: 5.5,
  maxChaseDistFromHome: 32,
  sensorIntervalSec: 0.2,
};

export interface ZombieSpawnConfig {
  id: string;
  homeX: number;
  homeZ: number;
  yaw: number;
  surgeId?: string;
  archetype?: ZombieArchetypeConfig;
}

export const INITIAL_ZOMBIE_SPAWNS: ZombieSpawnConfig[] = [
  {
    id: 'z_intersection',
    homeX: 6.2,
    homeZ: 2.8,
    yaw: -1.9,
  },
  {
    id: 'z_east_blvd',
    homeX: 21.5,
    homeZ: -4.2,
    yaw: 1.6,
  },
  {
    id: 'z_south_diner',
    homeX: -19.0,
    homeZ: 5.0,
    yaw: 0.4,
  },
  {
    id: 'z_north_ave',
    homeX: -4.6,
    homeZ: -16.8,
    yaw: 3.1,
  },
  {
    id: 'z_vale_approach',
    homeX: 21.0,
    homeZ: -13.5,
    yaw: -1.1,
  },
  {
    id: 'z_depot_yard',
    homeX: 24.0,
    homeZ: -26.5,
    yaw: 0.9,
  },
];

export interface NoiseEvent {
  x: number;
  z: number;
  radius: number;
  source: 'walk' | 'sprint' | 'jump' | 'interact' | 'combat';
}

export interface PlayerMeleeConfig {
  range: number;
  minDot: number;
  damage: number;
  cooldownSec: number;
}

export const DEFAULT_MELEE_CONFIG: PlayerMeleeConfig = {
  range: 2.55,
  minDot: 0.42,
  damage: 28,
  cooldownSec: 0.56,
};

export interface ZombieAgent {
  id: string;
  surgeId?: string;
  config: ZombieArchetypeConfig;
  state: ZombieAIState;
  homeX: number;
  homeZ: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  health: number;
  maxHealth: number;
  targetX: number;
  targetZ: number;
  idleTimer: number;
  investigateTimer: number;
  loseSightTimer: number;
  sensorTimer: number;
  attackCooldown: number;
  attackWindup: number;
  attackDealtInSwing: boolean;
  hitFlashTimer: number;
  deathTimer: number;
  walkCycle: number;
  seed: number;
  avoidDir: number;
  stuckTimer: number;
  lastProgressDist: number;
}

export interface ZombieTickResult {
  playerDamage: number;
  attackedById: string | null;
  zombieGroans: number;
}

export interface MeleeHitResult {
  hit: boolean;
  killed: boolean;
  targetId: string | null;
  damageDealt: number;
  remainingHealth: number;
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

export function lerpAngle(current: number, target: number, t: number): number {
  const diff = normalizeAngle(target - current);
  return normalizeAngle(current + diff * clamp(t, 0, 1));
}

/**
 * Fast 2D horizontal line-of-sight check against solid building walls,
 * vehicles, dumpsters, fences, and closed doors.
 */
export function hasLineOfSight2D(
  x1: number,
  z1: number,
  x2: number,
  z2: number,
  colliders: WorldColliders
): boolean {
  for (const b of colliders.boxes) {
    if (b.active === false) continue;
    if (Math.abs(b.rotationY) < 0.001) {
      if (segmentIntersectsAABB(x1, z1, x2, z2, b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d)) {
        return false;
      }
    } else if (segmentIntersectsOBB(x1, z1, x2, z2, b.x, b.z, b.w, b.d, -b.rotationY)) {
      return false;
    }
  }

  for (const seg of colliders.segments) {
    if (seg.active === false) continue;
    if (segmentsIntersect2D(x1, z1, x2, z2, seg.x1, seg.z1, seg.x2, seg.z2)) {
      return false;
    }
  }

  return true;
}

export function getSurfaceHeightAt(x: number, z: number, colliders: WorldColliders): number {
  for (const fl of colliders.floors) {
    if (fl.active === false) continue;
    if (x >= fl.minX && x <= fl.maxX && z >= fl.minZ && z <= fl.maxZ) {
      return fl.height;
    }
  }
  for (const sw of colliders.sidewalks) {
    if (x >= sw.minX && x <= sw.maxX && z >= sw.minZ && z <= sw.maxZ) {
      return SIDEWALK_HEIGHT;
    }
  }
  return 0;
}

export function createZombieAgent(
  spawn: ZombieSpawnConfig,
  index: number,
  colliders?: WorldColliders
): ZombieAgent {
  const config = spawn.archetype ?? STANDARD_ZOMBIE_CONFIG;
  const y = colliders ? getSurfaceHeightAt(spawn.homeX, spawn.homeZ, colliders) : 0;
  return {
    id: spawn.id,
    surgeId: spawn.surgeId,
    config,
    state: 'idle',
    homeX: spawn.homeX,
    homeZ: spawn.homeZ,
    x: spawn.homeX,
    y,
    z: spawn.homeZ,
    yaw: spawn.yaw,
    vx: 0,
    vz: 0,
    health: config.maxHealth,
    maxHealth: config.maxHealth,
    targetX: spawn.homeX,
    targetZ: spawn.homeZ,
    idleTimer: 0.8 + (index % 3) * 0.9,
    investigateTimer: 0,
    loseSightTimer: 0,
    // Stagger sensor ticks across zombies so ray/LOS checks never bunch up on 1 frame
    sensorTimer: (index * 0.06) % config.sensorIntervalSec,
    attackCooldown: 0,
    attackWindup: 0,
    attackDealtInSwing: false,
    hitFlashTimer: 0,
    deathTimer: 0,
    walkCycle: index * 1.7,
    seed: index * 1.37 + 0.5,
    avoidDir: index % 2 === 0 ? 1 : -1,
    stuckTimer: 0,
    lastProgressDist: 0,
  };
}

export function canZombieSeePlayer(
  zombie: ZombieAgent,
  playerX: number,
  playerZ: number,
  nightFactor: number,
  colliders: WorldColliders,
  flashlightOn = false
): boolean {
  if (zombie.state === 'dead') return false;
  const dx = playerX - zombie.x;
  const dz = playerZ - zombie.z;
  const dist = Math.hypot(dx, dz);

  const cfg = zombie.config;
  const night = clamp(nightFactor, 0, 1);
  // Base vision shrinks at night, unless the player's flashlight beam gives away their position
  const effectiveNightVision = flashlightOn
    ? cfg.visionRangeNight + (cfg.visionRangeDay * 0.96 - cfg.visionRangeNight) * 0.85
    : cfg.visionRangeNight;
  const maxVision =
    cfg.visionRangeDay + (effectiveNightVision - cfg.visionRangeDay) * night;

  if (dist > maxVision) return false;

  if (dist > cfg.closeSenseRange && dist > 0.001) {
    // Zombie faces (-sin(yaw), -cos(yaw)) in Three.js
    const fwdX = -Math.sin(zombie.yaw);
    const fwdZ = -Math.cos(zombie.yaw);
    const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
    if (dot < cfg.visionFovCos) return false;
  }

  return hasLineOfSight2D(zombie.x, zombie.z, playerX, playerZ, colliders);
}

export function dispatchNoiseToZombies(
  zombies: ZombieAgent[],
  event: NoiseEvent,
  colliders: WorldColliders,
  nightFactor = 0
): number {
  let alerted = 0;
  const nightAudioBoost = 1 + clamp(nightFactor, 0, 1) * 0.42;
  for (const z of zombies) {
    if (z.state === 'dead' || z.state === 'chasing' || z.state === 'attacking') continue;
    const dist = Math.hypot(event.x - z.x, event.z - z.z);
    const maxHear = event.radius * z.config.hearingMultiplier * nightAudioBoost;
    if (dist > maxHear) continue;

    // Walls / closed doors muffle distant footsteps & interactions
    const clear = hasLineOfSight2D(z.x, z.z, event.x, event.z, colliders);
    const effectiveMax = clear ? maxHear : maxHear * 0.62;
    if (dist > effectiveMax) continue;

    z.state = 'investigating';
    z.targetX = event.x;
    z.targetZ = event.z;
    z.investigateTimer = z.config.investigateTimeoutSec;
    z.stuckTimer = 0;
    alerted++;
  }
  return alerted;
}

function pickRoamWaypoint(z: ZombieAgent): void {
  z.seed = (z.seed * 9301 + 49297) % 233280;
  const r1 = z.seed / 233280;
  z.seed = (z.seed * 9301 + 49297) % 233280;
  const r2 = z.seed / 233280;

  const angle = r1 * Math.PI * 2;
  const radius = (0.35 + r2 * 0.65) * z.config.roamRadius;
  z.targetX = z.homeX + Math.cos(angle) * radius;
  z.targetZ = z.homeZ + Math.sin(angle) * radius;
  z.stuckTimer = 0;
  z.lastProgressDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
}

function isPointBlocked(
  px: number,
  pz: number,
  r: number,
  colliders: WorldColliders
): boolean {
  if (
    px < colliders.bounds.minX + r ||
    px > colliders.bounds.maxX - r ||
    pz < colliders.bounds.minZ + r ||
    pz > colliders.bounds.maxZ - r
  ) {
    return true;
  }

  for (const b of colliders.boxes) {
    if (b.active === false) continue;
    const res =
      Math.abs(b.rotationY) < 0.001
        ? resolveCircleAABB(px, pz, r, b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d)
        : resolveCircleOBB(px, pz, r, b.x, b.z, b.w, b.d, -b.rotationY);
    if (Math.abs(res.x - px) > 0.01 || Math.abs(res.y - pz) > 0.01) {
      return true;
    }
  }

  for (const seg of colliders.segments) {
    if (seg.active === false) continue;
    const res = resolveCircleSegment(px, pz, r, seg.x1, seg.z1, seg.x2, seg.z2, seg.halfThickness);
    if (Math.abs(res.x - px) > 0.01 || Math.abs(res.y - pz) > 0.01) {
      return true;
    }
  }

  for (const c of colliders.circles) {
    const res = resolveCircleCircle(px, pz, r, c.x, c.z, c.radius);
    if (Math.abs(res.x - px) > 0.01 || Math.abs(res.y - pz) > 0.01) {
      return true;
    }
  }

  if (colliders.safeZones) {
    for (const sz of colliders.safeZones) {
      if (sz.active === false) continue;
      const pad = 0.2;
      if (
        px >= sz.minX - r - pad &&
        px <= sz.maxX + r + pad &&
        pz >= sz.minZ - r - pad &&
        pz <= sz.maxZ + r + pad
      ) {
        return true;
      }
    }
  }

  return false;
}

function resolveZombieCollisions(
  z: ZombieAgent,
  colliders: WorldColliders,
  allZombies: ZombieAgent[],
  playerX: number,
  playerZ: number
): void {
  const r = z.config.radius;
  for (let pass = 0; pass < 2; pass++) {
    z.x = clamp(z.x, colliders.bounds.minX + r, colliders.bounds.maxX - r);
    z.z = clamp(z.z, colliders.bounds.minZ + r, colliders.bounds.maxZ - r);

    for (const b of colliders.boxes) {
      if (b.active === false) continue;
      const res =
        Math.abs(b.rotationY) < 0.001
          ? resolveCircleAABB(z.x, z.z, r, b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d)
          : resolveCircleOBB(z.x, z.z, r, b.x, b.z, b.w, b.d, -b.rotationY);
      z.x = res.x;
      z.z = res.y;
    }

    for (const seg of colliders.segments) {
      if (seg.active === false) continue;
      const res = resolveCircleSegment(
        z.x,
        z.z,
        r,
        seg.x1,
        seg.z1,
        seg.x2,
        seg.z2,
        seg.halfThickness
      );
      z.x = res.x;
      z.z = res.y;
    }

    for (const c of colliders.circles) {
      const res = resolveCircleCircle(z.x, z.z, r, c.x, c.z, c.radius);
      z.x = res.x;
      z.z = res.y;
    }

    if (colliders.safeZones) {
      for (const sz of colliders.safeZones) {
        if (sz.active === false) continue;
        const res = resolveCircleAABB(
          z.x,
          z.z,
          r + 0.12,
          sz.minX,
          sz.minZ,
          sz.maxX - sz.minX,
          sz.maxZ - sz.minZ
        );
        z.x = res.x;
        z.z = res.y;
      }
    }

    // Separate from other living zombies
    for (const other of allZombies) {
      if (other.id === z.id || other.state === 'dead') continue;
      const res = resolveCircleCircle(z.x, z.z, r, other.x, other.z, other.config.radius);
      z.x = res.x;
      z.z = res.y;
    }

    // Keep soft personal-space separation from player so zombie doesn't overlap camera
    const pRes = resolveCircleCircle(z.x, z.z, r, playerX, playerZ, 0.42);
    z.x = pRes.x;
    z.z = pRes.y;
  }
}

export function stepZombiesAI(
  zombies: ZombieAgent[],
  dt: number,
  playerX: number,
  playerZ: number,
  playerDead: boolean,
  nightFactor: number,
  colliders: WorldColliders,
  flashlightOn = false
): ZombieTickResult {
  const result: ZombieTickResult = {
    playerDamage: 0,
    attackedById: null,
    zombieGroans: 0,
  };

  for (const z of zombies) {
    if (z.hitFlashTimer > 0) {
      z.hitFlashTimer = Math.max(0, z.hitFlashTimer - dt);
    }

    if (z.state === 'dead') {
      z.deathTimer += dt;
      z.vx = 0;
      z.vz = 0;
      continue;
    }

    if (z.attackCooldown > 0) {
      z.attackCooldown = Math.max(0, z.attackCooldown - dt);
    }

    const cfg = z.config;
    const distToPlayer = Math.hypot(playerX - z.x, playerZ - z.z);
    const distFromHome = Math.hypot(z.x - z.homeX, z.z - z.homeZ);

    // 1. Staggered Sensor / AI Transition Update
    z.sensorTimer -= dt;
    if (z.sensorTimer <= 0) {
      z.sensorTimer = cfg.sensorIntervalSec;

      if (playerDead) {
        if (z.state === 'chasing' || z.state === 'attacking' || z.state === 'investigating') {
          z.state = 'returning';
          z.targetX = z.homeX;
          z.targetZ = z.homeZ;
        }
      } else {
        const seesPlayer = canZombieSeePlayer(
          z,
          playerX,
          playerZ,
          nightFactor,
          colliders,
          flashlightOn
        );

        if (seesPlayer && distFromHome <= cfg.maxChaseDistFromHome) {
          if (z.state !== 'chasing' && z.state !== 'attacking') {
            result.zombieGroans += 1;
          }
          z.targetX = playerX;
          z.targetZ = playerZ;
          z.loseSightTimer = cfg.loseSightGraceSec;

          if (distToPlayer <= cfg.attackRange) {
            if (z.state !== 'attacking') {
              z.state = 'attacking';
            }
          } else if (z.state !== 'attacking' || z.attackWindup <= 0) {
            z.state = 'chasing';
          }
        } else if (z.state === 'chasing' || z.state === 'attacking') {
          z.loseSightTimer -= cfg.sensorIntervalSec;
          if (z.loseSightTimer <= 0 || distFromHome > cfg.maxChaseDistFromHome) {
            z.state = 'returning';
            z.targetX = z.homeX;
            z.targetZ = z.homeZ;
            z.attackWindup = 0;
          }
        }
      }
    }

    // 2. State Behavior & Attack Timing
    let moveSpeed = 0;
    if (z.state === 'idle') {
      z.idleTimer -= dt;
      if (z.idleTimer <= 0) {
        z.state = 'roaming';
        pickRoamWaypoint(z);
      }
    } else if (z.state === 'roaming') {
      moveSpeed = cfg.walkSpeed;
      const dTarget = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
      if (dTarget < 0.75) {
        z.state = 'idle';
        z.idleTimer = 1.6 + (z.seed % 2.4);
      }
    } else if (z.state === 'investigating') {
      moveSpeed = cfg.investigateSpeed;
      z.investigateTimer -= dt;
      const dTarget = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
      if (dTarget < 0.9 || z.investigateTimer <= 0) {
        z.state = 'returning';
        z.targetX = z.homeX;
        z.targetZ = z.homeZ;
      }
    } else if (z.state === 'chasing') {
      moveSpeed = cfg.chaseSpeed;
      if (
        !playerDead &&
        distToPlayer <= cfg.attackRange &&
        hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
      ) {
        z.state = 'attacking';
        moveSpeed = 0;
      }
    } else if (z.state === 'attacking') {
      // Face player smoothly during attack
      const desiredYaw = Math.atan2(-(playerX - z.x), -(playerZ - z.z));
      z.yaw = lerpAngle(z.yaw, desiredYaw, clamp(10 * dt, 0, 1));

      if (z.attackWindup > 0) {
        z.attackWindup -= dt;
        if (z.attackWindup <= 0 && !z.attackDealtInSwing) {
          z.attackDealtInSwing = true;
          if (
            !playerDead &&
            distToPlayer <= cfg.attackRange + 0.35 &&
            hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
          ) {
            result.playerDamage += cfg.attackDamage;
            result.attackedById = z.id;
          }
        }
      } else if (distToPlayer > cfg.attackRange + 0.25) {
        z.state = 'chasing';
        z.targetX = playerX;
        z.targetZ = playerZ;
      } else if (
        z.attackCooldown <= 0 &&
        !playerDead &&
        hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
      ) {
        z.attackWindup = cfg.attackWindupSec;
        z.attackDealtInSwing = false;
        z.attackCooldown = cfg.attackCooldownSec;
      }
    } else if (z.state === 'returning') {
      moveSpeed = cfg.returnSpeed;
      const dHome = Math.hypot(z.homeX - z.x, z.homeZ - z.z);
      if (dHome < 1.2) {
        z.state = 'idle';
        z.idleTimer = 1.4;
      }
    }

    // 3. Smooth Movement + Lightweight Obstacle Avoidance
    if (moveSpeed > 0.01) {
      const dx = z.targetX - z.x;
      const dz = z.targetZ - z.z;
      const dist = Math.hypot(dx, dz) || 1;
      let dirX = dx / dist;
      let dirZ = dz / dist;

      // Forward obstacle feeler & left/right steering probe
      const probeDist = 1.05;
      if (
        isPointBlocked(z.x + dirX * probeDist, z.z + dirZ * probeDist, cfg.radius * 0.92, colliders)
      ) {
        const angBase = Math.atan2(dirZ, dirX);
        const sideA = angBase + z.avoidDir * 0.85;
        const sideB = angBase - z.avoidDir * 0.85;
        const wideA = angBase + z.avoidDir * 1.42;

        const aClear = !isPointBlocked(
          z.x + Math.cos(sideA) * probeDist,
          z.z + Math.sin(sideA) * probeDist,
          cfg.radius * 0.9,
          colliders
        );
        const bClear = !isPointBlocked(
          z.x + Math.cos(sideB) * probeDist,
          z.z + Math.sin(sideB) * probeDist,
          cfg.radius * 0.9,
          colliders
        );

        if (aClear) {
          dirX = Math.cos(sideA);
          dirZ = Math.sin(sideA);
        } else if (bClear) {
          z.avoidDir *= -1;
          dirX = Math.cos(sideB);
          dirZ = Math.sin(sideB);
        } else {
          dirX = Math.cos(wideA);
          dirZ = Math.sin(wideA);
        }
      }

      z.vx = dirX * moveSpeed;
      z.vz = dirZ * moveSpeed;
      z.x += z.vx * dt;
      z.z += z.vz * dt;

      resolveZombieCollisions(z, colliders, zombies, playerX, playerZ);
      z.y = getSurfaceHeightAt(z.x, z.z, colliders);

      const moveYaw = Math.atan2(-dirX, -dirZ);
      z.yaw = lerpAngle(z.yaw, moveYaw, clamp(8.5 * dt, 0, 1));
      z.walkCycle += moveSpeed * 3.1 * dt;

      // Anti-stuck check for roaming/investigating/returning
      if (z.state === 'roaming' || z.state === 'investigating' || z.state === 'returning') {
        const newDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
        if (Math.abs(z.lastProgressDist - newDist) < 0.12 * dt) {
          z.stuckTimer += dt;
          if (z.stuckTimer > 1.8) {
            z.avoidDir *= -1;
            z.stuckTimer = 0;
            if (z.state === 'roaming') {
              pickRoamWaypoint(z);
            } else if (z.state === 'investigating') {
              z.state = 'returning';
              z.targetX = z.homeX;
              z.targetZ = z.homeZ;
            }
          }
        } else {
          z.stuckTimer = Math.max(0, z.stuckTimer - dt);
        }
        z.lastProgressDist = newDist;
      }
    } else {
      z.vx = 0;
      z.vz = 0;
      z.walkCycle += 1.4 * dt;
    }
  }

  return result;
}

export function performPlayerMelee(
  zombies: ZombieAgent[],
  playerX: number,
  playerZ: number,
  playerYaw: number,
  colliders: WorldColliders,
  config: PlayerMeleeConfig = DEFAULT_MELEE_CONFIG
): MeleeHitResult {
  const fwdX = -Math.sin(playerYaw);
  const fwdZ = -Math.cos(playerYaw);

  let bestTarget: ZombieAgent | null = null;
  let bestScore = Infinity;

  for (const z of zombies) {
    if (z.state === 'dead') continue;
    const dx = z.x - playerX;
    const dz = z.z - playerZ;
    const dist = Math.hypot(dx, dz);
    if (dist > config.range + z.config.radius) continue;

    const len = dist || 1;
    const dot = (dx / len) * fwdX + (dz / len) * fwdZ;
    if (dist > 0.9 && dot < config.minDot) continue;

    if (!hasLineOfSight2D(playerX, playerZ, z.x, z.z, colliders)) continue;

    const score = dist - Math.max(0, dot) * 0.7;
    if (score < bestScore) {
      bestScore = score;
      bestTarget = z;
    }
  }

  if (!bestTarget) {
    return {
      hit: false,
      killed: false,
      targetId: null,
      damageDealt: 0,
      remainingHealth: 0,
    };
  }

  const dmg = config.damage;
  bestTarget.health = Math.max(0, bestTarget.health - dmg);
  bestTarget.hitFlashTimer = 0.18;

  // Knockback nudge away from player (kept valid against walls/doors)
  const kdx = bestTarget.x - playerX;
  const kdz = bestTarget.z - playerZ;
  const klen = Math.hypot(kdx, kdz) || 1;
  bestTarget.x += (kdx / klen) * 0.32;
  bestTarget.z += (kdz / klen) * 0.32;
  resolveZombieCollisions(bestTarget, colliders, zombies, playerX, playerZ);

  if (bestTarget.health <= 0) {
    bestTarget.state = 'dead';
    bestTarget.deathTimer = 0;
    return {
      hit: true,
      killed: true,
      targetId: bestTarget.id,
      damageDealt: dmg,
      remainingHealth: 0,
    };
  }

  // Surviving zombie immediately turns attention to the attacker
  bestTarget.state = 'chasing';
  bestTarget.targetX = playerX;
  bestTarget.targetZ = playerZ;
  bestTarget.loseSightTimer = bestTarget.config.loseSightGraceSec;

  return {
    hit: true,
    killed: false,
    targetId: bestTarget.id,
    damageDealt: dmg,
    remainingHealth: bestTarget.health,
  };
}
