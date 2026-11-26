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
  | 'suspicious'
  | 'investigating'
  | 'alert'
  | 'chasing'
  | 'searching'
  | 'attacking'
  | 'stunned'
  | 'returning'
  | 'dead';

export type ZombieArchetypeId = 'walker' | 'runner' | 'brute';

export interface ZombieArchetypeConfig {
  id: ZombieArchetypeId;
  label: string;
  visualScale: number;
  maxHealth: number;
  radius: number;
  walkSpeed: number;
  investigateSpeed: number;
  searchSpeed: number;
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
  alertReactionSec: number;
  stunDurationSec: number;
  loseSightGraceSec: number;
  investigateTimeoutSec: number;
  searchDurationSec: number;
  maxChaseDistFromHome: number;
  sensorIntervalSec: number;
}

export const STANDARD_ZOMBIE_CONFIG: ZombieArchetypeConfig = {
  id: 'walker',
  label: 'Infected',
  visualScale: 1.0,
  maxHealth: 80,
  radius: 0.42,
  walkSpeed: 1.42,
  investigateSpeed: 2.05,
  searchSpeed: 1.85,
  chaseSpeed: 3.3,
  returnSpeed: 1.62,
  roamRadius: 7.4,
  visionRangeDay: 17.5,
  visionRangeNight: 10.5,
  visionFovCos: -0.12,
  closeSenseRange: 2.45,
  hearingMultiplier: 1.0,
  attackRange: 1.72,
  attackDamage: 16,
  attackCooldownSec: 1.35,
  attackWindupSec: 0.34,
  alertReactionSec: 0.38,
  stunDurationSec: 0.36,
  loseSightGraceSec: 4.2,
  investigateTimeoutSec: 6.2,
  searchDurationSec: 7.0,
  maxChaseDistFromHome: 34,
  sensorIntervalSec: 0.18,
};

export const RUNNER_ZOMBIE_CONFIG: ZombieArchetypeConfig = {
  id: 'runner',
  label: 'Feral Runner',
  visualScale: 0.94,
  maxHealth: 58,
  radius: 0.38,
  walkSpeed: 1.88,
  investigateSpeed: 2.65,
  searchSpeed: 2.45,
  chaseSpeed: 4.18,
  returnSpeed: 2.05,
  roamRadius: 9.2,
  visionRangeDay: 19.5,
  visionRangeNight: 12.0,
  visionFovCos: -0.05,
  closeSenseRange: 2.75,
  hearingMultiplier: 1.24,
  attackRange: 1.65,
  attackDamage: 12,
  attackCooldownSec: 1.05,
  attackWindupSec: 0.26,
  alertReactionSec: 0.22,
  stunDurationSec: 0.42,
  loseSightGraceSec: 3.6,
  investigateTimeoutSec: 6.8,
  searchDurationSec: 6.2,
  maxChaseDistFromHome: 38,
  sensorIntervalSec: 0.16,
};

export const BRUTE_ZOMBIE_CONFIG: ZombieArchetypeConfig = {
  id: 'brute',
  label: 'Heavy Infected',
  visualScale: 1.18,
  maxHealth: 135,
  radius: 0.48,
  walkSpeed: 1.14,
  investigateSpeed: 1.65,
  searchSpeed: 1.5,
  chaseSpeed: 2.68,
  returnSpeed: 1.35,
  roamRadius: 5.8,
  visionRangeDay: 15.5,
  visionRangeNight: 9.5,
  visionFovCos: -0.18,
  closeSenseRange: 2.4,
  hearingMultiplier: 0.88,
  attackRange: 1.9,
  attackDamage: 24,
  attackCooldownSec: 1.72,
  attackWindupSec: 0.46,
  alertReactionSec: 0.46,
  stunDurationSec: 0.22,
  loseSightGraceSec: 4.8,
  investigateTimeoutSec: 6.5,
  searchDurationSec: 7.8,
  maxChaseDistFromHome: 29,
  sensorIntervalSec: 0.22,
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
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_east_blvd',
    homeX: 21.5,
    homeZ: -4.2,
    yaw: 1.6,
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_south_diner',
    homeX: -19.0,
    homeZ: 5.0,
    yaw: 0.4,
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_north_ave',
    homeX: -4.6,
    homeZ: -16.8,
    yaw: 3.1,
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_vale_approach',
    homeX: 22.8,
    homeZ: -15.5,
    yaw: -1.1,
    archetype: RUNNER_ZOMBIE_CONFIG,
  },
  {
    id: 'z_depot_yard',
    homeX: 24.0,
    homeZ: -26.5,
    yaw: 0.9,
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_industrial_bay',
    homeX: 19.0,
    homeZ: 25.5,
    yaw: -1.4,
    archetype: BRUTE_ZOMBIE_CONFIG,
  },
  {
    id: 'z_police_lot',
    homeX: -31.5,
    homeZ: 39.2,
    yaw: 1.2,
    archetype: RUNNER_ZOMBIE_CONFIG,
  },
  {
    id: 'z_clinic_st',
    homeX: 16.5,
    homeZ: 35.5,
    yaw: -2.2,
    archetype: STANDARD_ZOMBIE_CONFIG,
  },
  {
    id: 'z_military_post',
    homeX: -0.9,
    homeZ: -34.6,
    yaw: 0.3,
    archetype: BRUTE_ZOMBIE_CONFIG,
  },
  {
    id: 'z_lab_gate',
    homeX: 27.0,
    homeZ: -33.5,
    yaw: -0.7,
    archetype: BRUTE_ZOMBIE_CONFIG,
  },
  {
    id: 'z_lab_courtyard',
    homeX: 22.2,
    homeZ: -45.5,
    yaw: 2.5,
    archetype: RUNNER_ZOMBIE_CONFIG,
  },
];

export interface NoiseEvent {
  x: number;
  z: number;
  radius: number;
  source: 'walk' | 'sprint' | 'jump' | 'interact' | 'combat' | 'disturbance';
}

export interface ZombieStepContext {
  isMoving?: boolean;
  isSprinting?: boolean;
  rainIntensity?: number;
  isFoggy?: boolean;
  playerSafe?: boolean;
  day?: number;
  completedMissions?: number;
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
  lastKnownX: number;
  lastKnownZ: number;
  awareness: number;
  idleTimer: number;
  suspiciousTimer: number;
  investigateTimer: number;
  alertTimer: number;
  searchTimer: number;
  searchStep: number;
  stunTimer: number;
  loseSightTimer: number;
  sensorTimer: number;
  steerTimer: number;
  steerDirX: number;
  steerDirZ: number;
  attackCooldown: number;
  attackWindup: number;
  attackDealtInSwing: boolean;
  hitFlashTimer: number;
  deathTimer: number;
  walkCycle: number;
  seed: number;
  avoidDir: number;
  stuckTimer: number;
  stuckRetries: number;
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

function nextSeedRand(z: ZombieAgent): number {
  z.seed = (z.seed * 9301 + 49297) % 233280;
  return z.seed / 233280;
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

export function isPointInSafeZone(
  px: number,
  pz: number,
  r: number,
  colliders: WorldColliders
): boolean {
  if (!colliders.safeZones) return false;
  for (const sz of colliders.safeZones) {
    if (sz.active === false) continue;
    if (
      px >= sz.minX - r &&
      px <= sz.maxX + r &&
      pz >= sz.minZ - r &&
      pz <= sz.maxZ + r
    ) {
      return true;
    }
  }
  return false;
}

export function isPointBlocked(
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

  if (isPointInSafeZone(px, pz, r + 0.2, colliders)) {
    return true;
  }

  return false;
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
    lastKnownX: spawn.homeX,
    lastKnownZ: spawn.homeZ,
    awareness: 0,
    idleTimer: 0.7 + (index % 3) * 0.85,
    suspiciousTimer: 0,
    investigateTimer: 0,
    alertTimer: 0,
    searchTimer: 0,
    searchStep: 0,
    stunTimer: 0,
    loseSightTimer: 0,
    // Stagger sensor ticks across zombies so ray/LOS checks never bunch up on 1 frame
    sensorTimer: (index * 0.05) % config.sensorIntervalSec,
    steerTimer: (index * 0.03) % 0.13,
    steerDirX: -Math.sin(spawn.yaw),
    steerDirZ: -Math.cos(spawn.yaw),
    attackCooldown: 0,
    attackWindup: 0,
    attackDealtInSwing: false,
    hitFlashTimer: 0,
    deathTimer: 0,
    walkCycle: index * 1.7,
    seed: index * 1.37 + 0.5,
    avoidDir: index % 2 === 0 ? 1 : -1,
    stuckTimer: 0,
    stuckRetries: 0,
    lastProgressDist: 0,
  };
}

export function computeZombieEffectiveVision(
  zombie: ZombieAgent,
  nightFactor: number,
  flashlightOn: boolean,
  context?: ZombieStepContext
): number {
  const cfg = zombie.config;
  const night = clamp(nightFactor, 0, 1);
  const effectiveNightVision = flashlightOn
    ? cfg.visionRangeNight + (cfg.visionRangeDay * 0.96 - cfg.visionRangeNight) * 0.85
    : cfg.visionRangeNight;
  let maxVision = cfg.visionRangeDay + (effectiveNightVision - cfg.visionRangeDay) * night;

  const rain = clamp(context?.rainIntensity ?? 0, 0, 1);
  if (rain > 0.05) {
    maxVision *= 1 - rain * 0.18;
  }
  if (context?.isFoggy) {
    maxVision *= 0.74;
  }

  if (context?.isSprinting) {
    maxVision *= 1.18;
  } else if (context && context.isMoving === false && !flashlightOn) {
    maxVision *= 0.84;
  }

  // Already alert/searching zombies keep sharper focus
  if (zombie.state === 'chasing' || zombie.state === 'searching' || zombie.state === 'alert') {
    maxVision *= 1.1;
  }

  return maxVision;
}

export function canZombieSeePlayer(
  zombie: ZombieAgent,
  playerX: number,
  playerZ: number,
  nightFactor: number,
  colliders: WorldColliders,
  flashlightOn = false,
  context?: ZombieStepContext
): boolean {
  if (zombie.state === 'dead') return false;
  if (context?.playerSafe || isPointInSafeZone(playerX, playerZ, 0.1, colliders)) {
    return false;
  }

  const dx = playerX - zombie.x;
  const dz = playerZ - zombie.z;
  const dist = Math.hypot(dx, dz);

  const cfg = zombie.config;
  const maxVision = computeZombieEffectiveVision(zombie, nightFactor, flashlightOn, context);
  if (dist > maxVision) return false;

  const effectiveCloseRange = context?.isSprinting
    ? cfg.closeSenseRange * 1.25
    : cfg.closeSenseRange;

  if (dist > effectiveCloseRange && dist > 0.001) {
    // Zombie faces (-sin(yaw), -cos(yaw)) in Three.js
    const fwdX = -Math.sin(zombie.yaw);
    const fwdZ = -Math.cos(zombie.yaw);
    const dot = (dx / dist) * fwdX + (dz / dist) * fwdZ;
    // Searching zombies scan wider laterally
    const fovLimit = zombie.state === 'searching' || zombie.state === 'suspicious'
      ? Math.min(cfg.visionFovCos, -0.35)
      : cfg.visionFovCos;
    if (dot < fovLimit) return false;
  }

  return hasLineOfSight2D(zombie.x, zombie.z, playerX, playerZ, colliders);
}

function getApproximateNoisePoint(
  z: ZombieAgent,
  event: NoiseEvent,
  dist: number,
  clear: boolean,
  colliders: WorldColliders
): { x: number; z: number } {
  // Loud combat / direct events or close clear sounds resolve accurately;
  // quiet footsteps / occluded thuds have slight spatial uncertainty.
  if (clear && (event.source === 'combat' || event.source === 'interact' || dist < 6.5)) {
    return { x: event.x, z: event.z };
  }
  const spread = clear ? Math.min(2.2, dist * 0.14) : Math.min(3.4, dist * 0.22);
  const ang = nextSeedRand(z) * Math.PI * 2;
  const mag = (0.35 + nextSeedRand(z) * 0.65) * spread;
  const cx = event.x + Math.cos(ang) * mag;
  const cz = event.z + Math.sin(ang) * mag;
  if (!isPointBlocked(cx, cz, z.config.radius, colliders)) {
    return { x: cx, z: cz };
  }
  return { x: event.x, z: event.z };
}

export function dispatchNoiseToZombies(
  zombies: ZombieAgent[],
  event: NoiseEvent,
  colliders: WorldColliders,
  nightFactor = 0,
  rainIntensity = 0
): number {
  let alerted = 0;
  const nightAudioBoost = 1 + clamp(nightFactor, 0, 1) * 0.35;
  const rainMuffle = 1 - clamp(rainIntensity, 0, 1) * 0.18;

  for (const z of zombies) {
    if (
      z.state === 'dead' ||
      z.state === 'chasing' ||
      z.state === 'attacking' ||
      z.state === 'stunned'
    ) {
      continue;
    }

    const dist = Math.hypot(event.x - z.x, event.z - z.z);
    const maxHear = event.radius * z.config.hearingMultiplier * nightAudioBoost * rainMuffle;
    if (dist > maxHear) continue;

    // Walls & closed doors dampen distant sounds
    const clear = hasLineOfSight2D(z.x, z.z, event.x, event.z, colliders);
    const effectiveMax = clear ? maxHear : maxHear * 0.58;
    if (dist > effectiveMax) continue;

    const pt = getApproximateNoisePoint(z, event, dist, clear, colliders);
    const isStrongNoise =
      event.source === 'combat' ||
      event.source === 'interact' ||
      event.source === 'jump' ||
      event.radius >= 12 ||
      dist <= effectiveMax * 0.52;

    if (z.state === 'searching') {
      z.lastKnownX = pt.x;
      z.lastKnownZ = pt.z;
      z.targetX = pt.x;
      z.targetZ = pt.z;
      z.searchTimer = Math.max(z.searchTimer, 4.5);
      z.searchStep = 0;
      z.stuckTimer = 0;
      alerted++;
      continue;
    }

    if (!isStrongNoise && (z.state === 'idle' || z.state === 'roaming' || z.state === 'returning')) {
      z.state = 'suspicious';
      z.targetX = pt.x;
      z.targetZ = pt.z;
      z.suspiciousTimer = 1.05;
      z.awareness = Math.max(z.awareness, 0.38);
      z.stuckTimer = 0;
      alerted++;
      continue;
    }

    z.state = 'investigating';
    z.targetX = pt.x;
    z.targetZ = pt.z;
    z.investigateTimer = z.config.investigateTimeoutSec;
    z.awareness = Math.max(z.awareness, 0.55);
    z.stuckTimer = 0;
    z.stuckRetries = 0;
    alerted++;
  }
  return alerted;
}

function propagatePackAlert(
  source: ZombieAgent,
  allZombies: ZombieAgent[],
  targetX: number,
  targetZ: number,
  colliders: WorldColliders
): void {
  let alertedCount = 0;
  for (const other of allZombies) {
    if (other.id === source.id || other.state === 'dead') continue;
    if (
      other.state !== 'idle' &&
      other.state !== 'roaming' &&
      other.state !== 'returning' &&
      other.state !== 'suspicious'
    ) {
      continue;
    }
    const dx = other.x - source.x;
    const dz = other.z - source.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 8.2 * 8.2) continue;
    if (distSq > 5.0 * 5.0 && !hasLineOfSight2D(source.x, source.z, other.x, other.z, colliders)) {
      continue;
    }
    other.state = 'investigating';
    other.targetX = targetX;
    other.targetZ = targetZ;
    other.investigateTimer = Math.min(other.config.investigateTimeoutSec, 5.2);
    other.awareness = Math.max(other.awareness, 0.5);
    other.stuckTimer = 0;
    alertedCount += 1;
    if (alertedCount >= 2) break;
  }
}

function pickValidOffsetWaypoint(
  z: ZombieAgent,
  centerX: number,
  centerZ: number,
  minRadius: number,
  maxRadius: number,
  colliders: WorldColliders
): { x: number; z: number } {
  const r = z.config.radius;
  for (let attempt = 0; attempt < 6; attempt++) {
    const r1 = nextSeedRand(z);
    const r2 = nextSeedRand(z);
    const angle = r1 * Math.PI * 2;
    const rad = minRadius + r2 * (maxRadius - minRadius);
    const tx = centerX + Math.cos(angle) * rad;
    const tz = centerZ + Math.sin(angle) * rad;
    if (!isPointBlocked(tx, tz, r + 0.08, colliders)) {
      return { x: tx, z: tz };
    }
  }
  return { x: centerX, z: centerZ };
}

function pickRoamWaypoint(z: ZombieAgent, colliders: WorldColliders): void {
  const wp = pickValidOffsetWaypoint(
    z,
    z.homeX,
    z.homeZ,
    z.config.roamRadius * 0.35,
    z.config.roamRadius,
    colliders
  );
  z.targetX = wp.x;
  z.targetZ = wp.z;
  z.stuckTimer = 0;
  z.stuckRetries = 0;
  z.lastProgressDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
}

function beginSearchingAt(z: ZombieAgent, sx: number, sz: number, colliders: WorldColliders): void {
  z.state = 'searching';
  z.searchTimer = z.config.searchDurationSec;
  z.searchStep = 0;
  z.attackWindup = 0;
  z.stuckTimer = 0;
  z.stuckRetries = 0;
  if (!isPointBlocked(sx, sz, z.config.radius, colliders)) {
    z.targetX = sx;
    z.targetZ = sz;
  } else {
    const wp = pickValidOffsetWaypoint(z, sx, sz, 1.0, 3.2, colliders);
    z.targetX = wp.x;
    z.targetZ = wp.z;
  }
  z.lastProgressDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
}

function resolveZombieCollisions(
  z: ZombieAgent,
  colliders: WorldColliders,
  allZombies: ZombieAgent[],
  playerX: number,
  playerZ: number,
  lightMode: boolean
): void {
  const r = z.config.radius;
  const passes = lightMode ? 1 : 2;

  for (let pass = 0; pass < passes; pass++) {
    z.x = clamp(z.x, colliders.bounds.minX + r, colliders.bounds.maxX - r);
    z.z = clamp(z.z, colliders.bounds.minZ + r, colliders.bounds.maxZ - r);

    if (!lightMode) {
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
    }

    if (colliders.safeZones) {
      for (const sz of colliders.safeZones) {
        if (sz.active === false) continue;
        const res = resolveCircleAABB(
          z.x,
          z.z,
          r + 0.14,
          sz.minX,
          sz.minZ,
          sz.maxX - sz.minX,
          sz.maxZ - sz.minZ
        );
        z.x = res.x;
        z.z = res.y;
      }
    }

    // Fast squared-distance zombie separation prevents stacking
    for (const other of allZombies) {
      if (other.id === z.id || other.state === 'dead') continue;
      const sumR = r + other.config.radius;
      const dx = z.x - other.x;
      const dz = z.z - other.z;
      if (dx * dx + dz * dz >= sumR * sumR) continue;
      const res = resolveCircleCircle(z.x, z.z, r, other.x, other.z, other.config.radius);
      z.x = res.x;
      z.z = res.y;
    }

    if (!lightMode) {
      const pRes = resolveCircleCircle(z.x, z.z, r, playerX, playerZ, 0.42);
      z.x = pRes.x;
      z.z = pRes.y;
    }
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
  flashlightOn = false,
  context?: ZombieStepContext
): ZombieTickResult {
  const result: ZombieTickResult = {
    playerDamage: 0,
    attackedById: null,
    zombieGroans: 0,
  };

  const dayScale = clamp(1 + Math.max(0, (context?.day ?? 1) - 1) * 0.025, 1, 1.15);
  const playerSafe =
    Boolean(context?.playerSafe) || isPointInSafeZone(playerX, playerZ, 0.05, colliders);

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
    const dxToPlayer = playerX - z.x;
    const dzToPlayer = playerZ - z.z;
    const distToPlayerSq = dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer;
    const distToPlayer = Math.sqrt(distToPlayerSq);
    const distFromHome = Math.hypot(z.x - z.homeX, z.z - z.homeZ);

    // Distance-based LOD for low-end PC / mobile budget
    const isCalmState = z.state === 'idle' || z.state === 'roaming' || z.state === 'returning';
    const veryFarCalm = distToPlayerSq > 54 * 54 && isCalmState;
    const farCalm = distToPlayerSq > 34 * 34 && isCalmState;

    // 1. Staggered Sensor & Awareness Update
    z.sensorTimer -= dt;
    if (z.sensorTimer <= 0) {
      const interval = veryFarCalm ? 0.95 : farCalm ? 0.65 : cfg.sensorIntervalSec;
      z.sensorTimer = interval;

      if (farCalm) {
        z.awareness = Math.max(0, z.awareness - interval * 0.25);
      } else if (z.state === 'stunned') {
        // Complete stun before resuming sensory chase
      } else if (playerDead || playerSafe) {
        z.awareness = Math.max(0, z.awareness - interval * 0.6);
        if (z.state === 'chasing' || z.state === 'attacking' || z.state === 'alert') {
          beginSearchingAt(z, z.lastKnownX, z.lastKnownZ, colliders);
        }
      } else {
        const seesPlayer = canZombieSeePlayer(
          z,
          playerX,
          playerZ,
          nightFactor,
          colliders,
          flashlightOn,
          context
        );

        if (seesPlayer && distFromHome <= cfg.maxChaseDistFromHome) {
          const maxVision = computeZombieEffectiveVision(z, nightFactor, flashlightOn, context);
          const closeness = clamp(1 - distToPlayer / Math.max(1, maxVision), 0.15, 1);
          const gainRate =
            (distToPlayer <= cfg.closeSenseRange * 1.6 || flashlightOn ? 3.4 : 1.75) *
            (context?.isSprinting ? 1.35 : 1.0) *
            dayScale;

          z.awareness = Math.min(1, z.awareness + closeness * gainRate * interval);
          z.lastKnownX = playerX;
          z.lastKnownZ = playerZ;
          z.loseSightTimer = cfg.loseSightGraceSec;

          if (
            z.state === 'chasing' ||
            z.state === 'attacking' ||
            z.awareness >= 0.92 ||
            distToPlayer <= cfg.closeSenseRange * 1.45
          ) {
            if (z.state !== 'chasing' && z.state !== 'attacking' && z.state !== 'alert') {
              z.state = 'alert';
              z.alertTimer = cfg.alertReactionSec;
              z.awareness = 1;
              z.targetX = playerX;
              z.targetZ = playerZ;
              result.zombieGroans += 1;
              propagatePackAlert(z, zombies, playerX, playerZ, colliders);
            } else if (z.state === 'chasing' || z.state === 'attacking') {
              z.targetX = playerX;
              z.targetZ = playerZ;
              if (distToPlayer <= cfg.attackRange) {
                if (z.state !== 'attacking') z.state = 'attacking';
              } else if (z.state !== 'attacking' || z.attackWindup <= 0) {
                z.state = 'chasing';
              }
            }
          } else if (z.awareness >= 0.35 && (z.state === 'idle' || z.state === 'roaming')) {
            z.state = 'suspicious';
            z.targetX = playerX;
            z.targetZ = playerZ;
            z.suspiciousTimer = 1.2;
          }
        } else {
          z.awareness = Math.max(0, z.awareness - interval * 0.38);
          if (z.state === 'chasing' || z.state === 'attacking') {
            z.loseSightTimer -= interval;
            if (z.loseSightTimer <= 0 || distFromHome > cfg.maxChaseDistFromHome) {
              beginSearchingAt(z, z.lastKnownX, z.lastKnownZ, colliders);
            }
          }
        }
      }
    }

    // 2. State Machine Execution
    let moveSpeed = 0;

    if (z.state === 'idle') {
      if (!veryFarCalm) {
        z.idleTimer -= dt;
        if (z.idleTimer <= 0) {
          z.state = 'roaming';
          pickRoamWaypoint(z, colliders);
        }
      }
    } else if (z.state === 'roaming') {
      moveSpeed = cfg.walkSpeed;
      const dTarget = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
      if (dTarget < 0.85) {
        z.state = 'idle';
        z.idleTimer = 1.6 + nextSeedRand(z) * 2.5;
      }
    } else if (z.state === 'suspicious') {
      const desiredYaw = Math.atan2(-(z.targetX - z.x), -(z.targetZ - z.z));
      z.yaw = lerpAngle(z.yaw, desiredYaw, clamp(5.5 * dt, 0, 1));
      z.suspiciousTimer -= dt;
      if (z.suspiciousTimer <= 0) {
        if (z.awareness >= 0.36) {
          z.state = 'investigating';
          z.investigateTimer = Math.min(cfg.investigateTimeoutSec, 4.5);
          z.stuckTimer = 0;
        } else {
          z.state = 'idle';
          z.idleTimer = 1.4;
        }
      }
    } else if (z.state === 'investigating') {
      moveSpeed = cfg.investigateSpeed;
      z.investigateTimer -= dt;
      const dTarget = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
      if (dTarget < 1.0) {
        beginSearchingAt(z, z.targetX, z.targetZ, colliders);
        z.searchTimer = Math.min(z.searchTimer, 4.4);
      } else if (z.investigateTimer <= 0) {
        z.state = 'returning';
        z.targetX = z.homeX;
        z.targetZ = z.homeZ;
        z.stuckTimer = 0;
      }
    } else if (z.state === 'alert') {
      const desiredYaw = Math.atan2(-(z.targetX - z.x), -(z.targetZ - z.z));
      z.yaw = lerpAngle(z.yaw, desiredYaw, clamp(12 * dt, 0, 1));
      z.alertTimer -= dt;
      if (z.alertTimer <= 0) {
        if (!playerDead && !playerSafe && distToPlayer <= cfg.attackRange) {
          z.state = 'attacking';
        } else {
          z.state = 'chasing';
          z.stuckTimer = 0;
          z.stuckRetries = 0;
          z.lastProgressDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
        }
      }
    } else if (z.state === 'chasing') {
      moveSpeed = cfg.chaseSpeed * (dayScale > 1.05 ? 1.04 : 1);
      if (
        !playerDead &&
        !playerSafe &&
        distToPlayer <= cfg.attackRange &&
        hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
      ) {
        z.state = 'attacking';
        moveSpeed = 0;
      }
    } else if (z.state === 'searching') {
      moveSpeed = cfg.searchSpeed;
      z.searchTimer -= dt;
      const dTarget = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
      if (dTarget < 0.95) {
        z.searchStep += 1;
        if (z.searchStep <= 2 && z.searchTimer > 1.2) {
          const wp = pickValidOffsetWaypoint(z, z.lastKnownX, z.lastKnownZ, 2.2, 5.2, colliders);
          z.targetX = wp.x;
          z.targetZ = wp.z;
          z.stuckTimer = 0;
          z.lastProgressDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
        } else {
          moveSpeed = 0;
        }
      }
      if (z.searchTimer <= 0) {
        z.state = 'returning';
        z.targetX = z.homeX;
        z.targetZ = z.homeZ;
        z.stuckTimer = 0;
        z.stuckRetries = 0;
      }
    } else if (z.state === 'attacking') {
      const desiredYaw = Math.atan2(-(playerX - z.x), -(playerZ - z.z));
      z.yaw = lerpAngle(z.yaw, desiredYaw, clamp(11 * dt, 0, 1));

      if (z.attackWindup > 0) {
        z.attackWindup -= dt;
        if (z.attackWindup <= 0 && !z.attackDealtInSwing) {
          z.attackDealtInSwing = true;
          if (
            !playerDead &&
            !playerSafe &&
            distToPlayer <= cfg.attackRange + 0.35 &&
            hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
          ) {
            result.playerDamage += cfg.attackDamage;
            result.attackedById = z.id;
          }
        }
      } else if (playerDead || playerSafe) {
        beginSearchingAt(z, z.lastKnownX, z.lastKnownZ, colliders);
      } else if (distToPlayer > cfg.attackRange + 0.28) {
        z.state = 'chasing';
        z.targetX = playerX;
        z.targetZ = playerZ;
      } else if (
        z.attackCooldown <= 0 &&
        hasLineOfSight2D(z.x, z.z, playerX, playerZ, colliders)
      ) {
        z.attackWindup = cfg.attackWindupSec;
        z.attackDealtInSwing = false;
        z.attackCooldown = cfg.attackCooldownSec;
      }
    } else if (z.state === 'stunned') {
      z.stunTimer -= dt;
      if (z.stunTimer <= 0) {
        if (!playerDead && !playerSafe) {
          z.state = 'chasing';
          z.targetX = z.lastKnownX;
          z.targetZ = z.lastKnownZ;
          z.sensorTimer = 0;
          z.loseSightTimer = cfg.loseSightGraceSec;
        } else {
          beginSearchingAt(z, z.lastKnownX, z.lastKnownZ, colliders);
        }
      }
    } else if (z.state === 'returning') {
      moveSpeed = cfg.returnSpeed;
      const dHome = Math.hypot(z.homeX - z.x, z.homeZ - z.z);
      if (dHome < 1.3) {
        z.state = 'idle';
        z.idleTimer = 1.4 + nextSeedRand(z) * 1.5;
      }
    }

    // 3. Throttled Obstacle Steering + Movement + Collision LOD
    if (moveSpeed > 0.01 && !veryFarCalm) {
      const dx = z.targetX - z.x;
      const dz = z.targetZ - z.z;
      const dist = Math.hypot(dx, dz) || 1;
      let dirX = dx / dist;
      let dirZ = dz / dist;

      if (!farCalm) {
        z.steerTimer -= dt;
        if (z.steerTimer <= 0) {
          z.steerTimer = 0.13;
          const probeDist = 1.08;
          if (
            isPointBlocked(
              z.x + dirX * probeDist,
              z.z + dirZ * probeDist,
              cfg.radius * 0.92,
              colliders
            )
          ) {
            const angBase = Math.atan2(dirZ, dirX);
            const sideA = angBase + z.avoidDir * 0.78;
            const wideA = angBase + z.avoidDir * 1.38;
            const sideB = angBase - z.avoidDir * 0.78;
            const wideB = angBase - z.avoidDir * 1.38;

            if (
              !isPointBlocked(
                z.x + Math.cos(sideA) * probeDist,
                z.z + Math.sin(sideA) * probeDist,
                cfg.radius * 0.9,
                colliders
              )
            ) {
              dirX = Math.cos(sideA);
              dirZ = Math.sin(sideA);
            } else if (
              !isPointBlocked(
                z.x + Math.cos(wideA) * probeDist,
                z.z + Math.sin(wideA) * probeDist,
                cfg.radius * 0.9,
                colliders
              )
            ) {
              dirX = Math.cos(wideA);
              dirZ = Math.sin(wideA);
            } else if (
              !isPointBlocked(
                z.x + Math.cos(sideB) * probeDist,
                z.z + Math.sin(sideB) * probeDist,
                cfg.radius * 0.9,
                colliders
              )
            ) {
              z.avoidDir *= -1;
              dirX = Math.cos(sideB);
              dirZ = Math.sin(sideB);
            } else {
              z.avoidDir *= -1;
              dirX = Math.cos(wideB);
              dirZ = Math.sin(wideB);
            }
          }
          z.steerDirX = dirX;
          z.steerDirZ = dirZ;
        } else {
          // Smoothly follow last steered direction when not re-probing
          dirX = z.steerDirX * 0.85 + dirX * 0.15;
          dirZ = z.steerDirZ * 0.85 + dirZ * 0.15;
          const len = Math.hypot(dirX, dirZ) || 1;
          dirX /= len;
          dirZ /= len;
        }
      }

      z.vx = dirX * moveSpeed;
      z.vz = dirZ * moveSpeed;
      z.x += z.vx * dt;
      z.z += z.vz * dt;

      resolveZombieCollisions(z, colliders, zombies, playerX, playerZ, farCalm);
      z.y = farCalm ? z.y : getSurfaceHeightAt(z.x, z.z, colliders);

      const moveYaw = Math.atan2(-dirX, -dirZ);
      z.yaw = lerpAngle(z.yaw, moveYaw, clamp(8.8 * dt, 0, 1));
      z.walkCycle += moveSpeed * 3.1 * dt;

      // Universal anti-stuck check across all moving states
      if (!farCalm) {
        const newDist = Math.hypot(z.targetX - z.x, z.targetZ - z.z);
        if (Math.abs(z.lastProgressDist - newDist) < 0.14 * dt) {
          z.stuckTimer += dt;
          if (z.stuckTimer > 1.2) {
            z.avoidDir *= -1;
            z.steerTimer = 0;
            z.stuckTimer = 0;
            z.stuckRetries += 1;

            if (z.stuckRetries >= 2) {
              z.stuckRetries = 0;
              if (z.state === 'roaming') {
                pickRoamWaypoint(z, colliders);
              } else if (z.state === 'chasing' || z.state === 'investigating') {
                beginSearchingAt(z, z.x, z.z, colliders);
                z.searchTimer = 4.2;
              } else if (z.state === 'searching') {
                z.state = 'returning';
                z.targetX = z.homeX;
                z.targetZ = z.homeZ;
              } else if (z.state === 'returning') {
                z.state = 'idle';
                z.idleTimer = 1.6;
              }
            }
          }
        } else {
          z.stuckTimer = Math.max(0, z.stuckTimer - dt * 1.5);
          if (z.lastProgressDist - newDist > 0.35) {
            z.stuckRetries = 0;
          }
        }
        z.lastProgressDist = newDist;
      }
    } else {
      z.vx = 0;
      z.vz = 0;
      if (!veryFarCalm) {
        z.walkCycle += (z.state === 'suspicious' || z.state === 'alert' ? 2.2 : 1.4) * dt;
      }
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

  // Knockback nudge away from player (clamped by walls/doors)
  const kdx = bestTarget.x - playerX;
  const kdz = bestTarget.z - playerZ;
  const klen = Math.hypot(kdx, kdz) || 1;
  const push = bestTarget.config.id === 'brute' ? 0.2 : 0.36;
  bestTarget.x += (kdx / klen) * push;
  bestTarget.z += (kdz / klen) * push;
  resolveZombieCollisions(bestTarget, colliders, zombies, playerX, playerZ, false);

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

  // Surviving zombie briefly staggers, interrupts any windup, then locks onto attacker
  bestTarget.state = 'stunned';
  bestTarget.stunTimer = bestTarget.config.stunDurationSec;
  bestTarget.attackWindup = 0;
  bestTarget.awareness = 1;
  bestTarget.lastKnownX = playerX;
  bestTarget.lastKnownZ = playerZ;
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
