import { SIDEWALK_HEIGHT } from '../assets/maps/neighborhoodMap';
import { WorldColliders } from '../engine/WorldBuilder';
import {
  clamp,
  resolveCircleAABB,
  resolveCircleCircle,
  resolveCircleOBB,
  resolveCircleSegment,
} from './collision';
import { SHOP_ITEM_PRICES, ShopItemPriceDefinition } from './economy';
import { RESOURCE_ORDER } from './resources';
import { ActiveCustomerSummary, CustomerAIState, InventoryState, ResourceId } from './types';

export interface CustomerSystemConfig {
  maxActiveCustomers: number;
  initialSpawnDelaySec: number;
  spawnIntervalMinSec: number;
  spawnIntervalMaxSec: number;
  openHour: number;
  closeHour: number;
  walkSpeed: number;
  radius: number;
  maxStuckSec: number;
}

export const DEFAULT_CUSTOMER_CONFIG: CustomerSystemConfig = {
  maxActiveCustomers: 2,
  initialSpawnDelaySec: 5.5,
  spawnIntervalMinSec: 12,
  spawnIntervalMaxSec: 20,
  openHour: 6.0,
  closeHour: 19.5,
  walkSpeed: 1.85,
  radius: 0.36,
  maxStuckSec: 3.6,
};

export interface CustomerProfile {
  id: string;
  name: string;
  variant: number;
  minBudget: number;
  maxBudget: number;
  maxDesiredQty: number;
  preferences: Record<ResourceId, number>;
}

export const CUSTOMER_PROFILES: CustomerProfile[] = [
  {
    id: 'mara',
    name: 'Mara',
    variant: 0,
    minBudget: 24,
    maxBudget: 52,
    maxDesiredQty: 2,
    preferences: {
      canned_food: 1.55,
      water_bottle: 1.4,
      medical_supplies: 0.9,
      wood: 0.55,
      scrap_metal: 0.65,
    },
  },
  {
    id: 'cole',
    name: 'Cole',
    variant: 1,
    minBudget: 18,
    maxBudget: 44,
    maxDesiredQty: 2,
    preferences: {
      scrap_metal: 1.55,
      wood: 1.45,
      water_bottle: 1.0,
      canned_food: 0.85,
      medical_supplies: 0.6,
    },
  },
  {
    id: 'elena',
    name: 'Elena',
    variant: 2,
    minBudget: 30,
    maxBudget: 66,
    maxDesiredQty: 2,
    preferences: {
      medical_supplies: 1.7,
      water_bottle: 1.35,
      canned_food: 1.15,
      scrap_metal: 0.5,
      wood: 0.45,
    },
  },
  {
    id: 'jax',
    name: 'Jax',
    variant: 3,
    minBudget: 15,
    maxBudget: 36,
    maxDesiredQty: 2,
    preferences: {
      water_bottle: 1.6,
      canned_food: 1.4,
      wood: 0.95,
      scrap_metal: 0.8,
      medical_supplies: 0.5,
    },
  },
  {
    id: 'nora',
    name: 'Nora',
    variant: 4,
    minBudget: 26,
    maxBudget: 58,
    maxDesiredQty: 2,
    preferences: {
      canned_food: 1.35,
      medical_supplies: 1.35,
      scrap_metal: 1.15,
      water_bottle: 1.1,
      wood: 0.7,
    },
  },
];

export const LAST_SHOP_WAYPOINTS = {
  // Street sidewalk spawn / despawn endpoints (east & west of The Last Shop)
  spawns: [
    { x: -28.2, z: -8.1 },
    { x: -3.2, z: -8.1 },
  ],
  entranceOutside: { x: -15.5, z: -8.35 },
  entranceThreshold: { x: -15.5, z: -9.62 },
  entranceInside: { x: -15.5, z: -10.85 },
  browsingSpots: [
    { x: -13.1, z: -10.95, lookYaw: 0 }, // South of display shelf, looking North
    { x: -14.45, z: -12.0, lookYaw: -Math.PI * 0.5 }, // West of display shelf, looking East
    { x: -15.3, z: -13.05, lookYaw: 0.2 }, // Front shop center aisle
    { x: -12.9, z: -13.1, lookYaw: Math.PI }, // North of display shelf, looking South
  ],
  checkoutSlots: [
    { x: -18.85, z: -11.05, lookYaw: 0 },
    { x: -17.75, z: -11.05, lookYaw: 0.16 },
    { x: -16.65, z: -10.85, lookYaw: 0.42 },
  ],
  interiorMinX: -20.8,
  interiorMaxX: -10.2,
  interiorMinZ: -14.2,
  interiorMaxZ: -9.62,
};

export interface CustomerSelectedPurchase {
  resourceId: ResourceId;
  quantity: number;
  unitPrice: number;
}

export interface CustomerAgent {
  id: string;
  profile: CustomerProfile;
  state: CustomerAIState;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  budget: number;
  walkCycle: number;
  seed: number;
  avoidDir: number;
  targetX: number;
  targetZ: number;
  targetLookYaw: number | null;
  exitX: number;
  exitZ: number;
  leavePhase: 'to_inside' | 'to_outside' | 'to_street';
  browseSpotIndex: number;
  browseStopsRemaining: number;
  browsePauseTimer: number;
  checkoutSlotIndex: number;
  checkoutWaitTimer: number;
  doorWaitTimer: number;
  stateTimer: number;
  stuckTimer: number;
  lastProgressDist: number;
  selectedPurchase: CustomerSelectedPurchase | null;
  purchaseCompleted: boolean;
  statusLabel: string;
}

export interface CustomerSpawnScheduleState {
  timer: number;
  nextCustomerSeq: number;
  lastSpawnSide: number;
}

export interface CustomerStepContext {
  dt: number;
  hoursFloat: number;
  shopManualOpen: boolean;
  frontDoorOpen: boolean;
  allowCustomerDoorOpen: boolean;
  playerX: number;
  playerZ: number;
  shopStock: InventoryState;
  colliders: WorldColliders;
  prices?: Record<ResourceId, ShopItemPriceDefinition>;
  config?: CustomerSystemConfig;
  activeShopkeepers?: number;
}

export interface CustomerPurchaseRequest {
  customerId: string;
  customerName: string;
  resourceId: ResourceId;
  quantity: number;
}

export interface CustomerStepResult {
  requestOpenFrontDoor: boolean;
  purchaseRequests: CustomerPurchaseRequest[];
  despawnedIds: string[];
  shopAcceptingCustomers: boolean;
  shopStatusReason: string;
}

export function isShopWithinVisitingHours(
  hoursFloat: number,
  config: CustomerSystemConfig = DEFAULT_CUSTOMER_CONFIG
): boolean {
  return hoursFloat >= config.openHour && hoursFloat < config.closeHour;
}

export function evaluateShopOpenStatus(
  hoursFloat: number,
  shopManualOpen: boolean,
  config: CustomerSystemConfig = DEFAULT_CUSTOMER_CONFIG
): { accepting: boolean; reason: string } {
  if (!shopManualOpen) {
    return { accepting: false, reason: 'Closed by owner' };
  }
  if (!isShopWithinVisitingHours(hoursFloat, config)) {
    return { accepting: false, reason: 'Closed for night (06:00 - 19:30)' };
  }
  return { accepting: true, reason: 'Open for survivors (06:00 - 19:30)' };
}

function nextPseudoRandom(seed: number): { value: number; nextSeed: number } {
  const nextSeed = (seed * 9301 + 49297) % 233280;
  return { value: nextSeed / 233280, nextSeed };
}

function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function lerpAngle(current: number, target: number, t: number): number {
  const diff = normalizeAngle(target - current);
  return normalizeAngle(current + diff * clamp(t, 0, 1));
}

export function isCustomerInsideShop(x: number, z: number): boolean {
  return (
    x >= LAST_SHOP_WAYPOINTS.interiorMinX &&
    x <= LAST_SHOP_WAYPOINTS.interiorMaxX &&
    z >= LAST_SHOP_WAYPOINTS.interiorMinZ &&
    z <= LAST_SHOP_WAYPOINTS.interiorMaxZ
  );
}

export function getCustomerSurfaceHeight(x: number, z: number, colliders: WorldColliders): number {
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

/**
 * Selects an available, affordable product weighted by the customer's survivor profile.
 * Guarantees stock > 0, unitPrice <= budget, and quantity <= min(stock, floor(budget/unitPrice)).
 */
export function selectCustomerPurchase(
  customer: Pick<CustomerAgent, 'profile' | 'budget' | 'seed'>,
  shopStock: InventoryState,
  prices: Record<ResourceId, ShopItemPriceDefinition> = SHOP_ITEM_PRICES
): { selection: CustomerSelectedPurchase | null; reason: 'ok' | 'empty_stock' | 'too_expensive'; nextSeed: number } {
  let seed = customer.seed;
  let totalStock = 0;
  let bestId: ResourceId | null = null;
  let bestScore = -Infinity;

  for (const id of RESOURCE_ORDER) {
    const qtyInStock = Math.max(0, Math.floor(shopStock[id] ?? 0));
    if (qtyInStock <= 0) continue;
    totalStock += qtyInStock;

    const priceDef = prices[id];
    if (!priceDef || priceDef.sellPrice <= 0) continue;
    if (priceDef.sellPrice > customer.budget) continue;

    const pref = customer.profile.preferences[id] ?? 1.0;
    const rng = nextPseudoRandom(seed);
    seed = rng.nextSeed;
    const stockBonus = Math.min(qtyInStock, 4) * 0.45;
    const score = pref * 10 + stockBonus + rng.value * 2.4;

    if (score > bestScore) {
      bestScore = score;
      bestId = id;
    }
  }

  if (totalStock <= 0) {
    return { selection: null, reason: 'empty_stock', nextSeed: seed };
  }

  if (!bestId) {
    return { selection: null, reason: 'too_expensive', nextSeed: seed };
  }

  const chosenPrice = prices[bestId].sellPrice;
  const available = Math.max(0, Math.floor(shopStock[bestId] ?? 0));
  const affordableQty = Math.floor(customer.budget / chosenPrice);
  const maxDesired = Math.max(1, Math.min(customer.profile.maxDesiredQty, available, affordableQty));

  const rngQty = nextPseudoRandom(seed);
  seed = rngQty.nextSeed;
  const desiredQty = maxDesired > 1 && rngQty.value > 0.58 ? 2 : 1;
  const finalQty = Math.max(1, Math.min(desiredQty, maxDesired));

  return {
    selection: {
      resourceId: bestId,
      quantity: finalQty,
      unitPrice: chosenPrice,
    },
    reason: 'ok',
    nextSeed: seed,
  };
}

export function createCustomerAgent(
  id: string,
  seqIndex: number,
  spawnSide: number,
  colliders: WorldColliders,
  overrideProfile?: CustomerProfile,
  overrideBudget?: number
): CustomerAgent {
  const profile = overrideProfile ?? CUSTOMER_PROFILES[seqIndex % CUSTOMER_PROFILES.length];
  const spawnPt = LAST_SHOP_WAYPOINTS.spawns[spawnSide % LAST_SHOP_WAYPOINTS.spawns.length];
  const exitPt = LAST_SHOP_WAYPOINTS.spawns[(spawnSide + 1) % LAST_SHOP_WAYPOINTS.spawns.length];

  let seed = (seqIndex + 1) * 7919 + 131;
  const rBudget = nextPseudoRandom(seed);
  seed = rBudget.nextSeed;
  const budget =
    overrideBudget ??
    Math.round(profile.minBudget + rBudget.value * (profile.maxBudget - profile.minBudget));

  const rBrowse = nextPseudoRandom(seed);
  seed = rBrowse.nextSeed;
  const browseSpotIndex = Math.floor(rBrowse.value * LAST_SHOP_WAYPOINTS.browsingSpots.length);

  const rStops = nextPseudoRandom(seed);
  seed = rStops.nextSeed;
  const browseStopsRemaining = rStops.value > 0.45 ? 2 : 1;

  const target = LAST_SHOP_WAYPOINTS.entranceOutside;
  const yaw = Math.atan2(-(target.x - spawnPt.x), -(target.z - spawnPt.z));

  return {
    id,
    profile,
    state: 'approaching',
    x: spawnPt.x,
    y: getCustomerSurfaceHeight(spawnPt.x, spawnPt.z, colliders),
    z: spawnPt.z,
    yaw,
    vx: 0,
    vz: 0,
    budget,
    walkCycle: seqIndex * 1.4,
    seed,
    avoidDir: seqIndex % 2 === 0 ? 1 : -1,
    targetX: target.x,
    targetZ: target.z,
    targetLookYaw: null,
    exitX: exitPt.x,
    exitZ: exitPt.z,
    leavePhase: 'to_street',
    browseSpotIndex,
    browseStopsRemaining,
    browsePauseTimer: 0,
    checkoutSlotIndex: 0,
    checkoutWaitTimer: 0,
    doorWaitTimer: 0,
    stateTimer: 0,
    stuckTimer: 0,
    lastProgressDist: Math.hypot(target.x - spawnPt.x, target.z - spawnPt.z),
    selectedPurchase: null,
    purchaseCompleted: false,
    statusLabel: 'Heading to shop',
  };
}

export function isCustomerPointBlocked(
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

  return false;
}

function resolveCustomerCollisions(
  c: CustomerAgent,
  radius: number,
  colliders: WorldColliders,
  allCustomers: CustomerAgent[],
  playerX: number,
  playerZ: number
): void {
  for (let pass = 0; pass < 2; pass++) {
    c.x = clamp(c.x, colliders.bounds.minX + radius, colliders.bounds.maxX - radius);
    c.z = clamp(c.z, colliders.bounds.minZ + radius, colliders.bounds.maxZ - radius);

    for (const b of colliders.boxes) {
      if (b.active === false) continue;
      const res =
        Math.abs(b.rotationY) < 0.001
          ? resolveCircleAABB(c.x, c.z, radius, b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d)
          : resolveCircleOBB(c.x, c.z, radius, b.x, b.z, b.w, b.d, -b.rotationY);
      c.x = res.x;
      c.z = res.y;
    }

    for (const seg of colliders.segments) {
      if (seg.active === false) continue;
      const res = resolveCircleSegment(
        c.x,
        c.z,
        radius,
        seg.x1,
        seg.z1,
        seg.x2,
        seg.z2,
        seg.halfThickness
      );
      c.x = res.x;
      c.z = res.y;
    }

    for (const cyl of colliders.circles) {
      const res = resolveCircleCircle(c.x, c.z, radius, cyl.x, cyl.z, cyl.radius);
      c.x = res.x;
      c.z = res.y;
    }

    for (const other of allCustomers) {
      if (other.id === c.id || other.state === 'despawned') continue;
      const res = resolveCircleCircle(c.x, c.z, radius, other.x, other.z, radius);
      c.x = res.x;
      c.z = res.y;
    }

    // Soft personal-space separation from the player
    const pRes = resolveCircleCircle(c.x, c.z, radius, playerX, playerZ, 0.42);
    c.x = pRes.x;
    c.z = pRes.y;
  }
}

export function transitionCustomerToLeaving(c: CustomerAgent, reasonLabel: string): void {
  if (c.state === 'leaving' || c.state === 'despawned') return;
  c.state = 'leaving';
  c.stateTimer = 0;
  c.stuckTimer = 0;
  c.targetLookYaw = null;
  c.statusLabel = reasonLabel;

  if (isCustomerInsideShop(c.x, c.z) || c.z < LAST_SHOP_WAYPOINTS.entranceThreshold.z + 0.15) {
    c.leavePhase = 'to_inside';
    c.targetX = LAST_SHOP_WAYPOINTS.entranceInside.x;
    c.targetZ = LAST_SHOP_WAYPOINTS.entranceInside.z;
  } else {
    c.leavePhase = 'to_street';
    c.targetX = c.exitX;
    c.targetZ = c.exitZ;
  }
  c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
}

function moveCustomerTowardTarget(
  c: CustomerAgent,
  speed: number,
  dt: number,
  radius: number,
  colliders: WorldColliders,
  allCustomers: CustomerAgent[],
  playerX: number,
  playerZ: number
): number {
  const dx = c.targetX - c.x;
  const dz = c.targetZ - c.z;
  const dist = Math.hypot(dx, dz);

  if (dist < 0.08) {
    c.vx = 0;
    c.vz = 0;
    return dist;
  }

  let dirX = dx / dist;
  let dirZ = dz / dist;

  // Lightweight obstacle avoidance feeler
  const probeDist = 0.85;
  if (isCustomerPointBlocked(c.x + dirX * probeDist, c.z + dirZ * probeDist, radius * 0.9, colliders)) {
    const angBase = Math.atan2(dirZ, dirX);
    const sideA = angBase + c.avoidDir * 0.78;
    const sideB = angBase - c.avoidDir * 0.78;
    const wideA = angBase + c.avoidDir * 1.35;

    if (!isCustomerPointBlocked(c.x + Math.cos(sideA) * probeDist, c.z + Math.sin(sideA) * probeDist, radius * 0.85, colliders)) {
      dirX = Math.cos(sideA);
      dirZ = Math.sin(sideA);
    } else if (!isCustomerPointBlocked(c.x + Math.cos(sideB) * probeDist, c.z + Math.sin(sideB) * probeDist, radius * 0.85, colliders)) {
      c.avoidDir *= -1;
      dirX = Math.cos(sideB);
      dirZ = Math.sin(sideB);
    } else {
      dirX = Math.cos(wideA);
      dirZ = Math.sin(wideA);
    }
  }

  const prevX = c.x;
  const prevZ = c.z;
  c.vx = dirX * speed;
  c.vz = dirZ * speed;
  c.x += c.vx * dt;
  c.z += c.vz * dt;

  resolveCustomerCollisions(c, radius, colliders, allCustomers, playerX, playerZ);
  c.y = getCustomerSurfaceHeight(c.x, c.z, colliders);

  const moved = Math.hypot(c.x - prevX, c.z - prevZ);
  if (moved > 0.002) {
    const moveYaw = Math.atan2(-dirX, -dirZ);
    c.yaw = lerpAngle(c.yaw, moveYaw, clamp(10 * dt, 0, 1));
    c.walkCycle += speed * 3.4 * dt;
  } else {
    c.walkCycle += 1.2 * dt;
  }

  const remaining = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
  if (c.lastProgressDist - remaining < 0.16 * dt) {
    c.stuckTimer += dt;
  } else {
    c.stuckTimer = Math.max(0, c.stuckTimer - dt * 1.4);
  }
  c.lastProgressDist = remaining;

  return remaining;
}

function pickCheckoutSlot(
  customers: CustomerAgent[],
  selfId: string,
  playerX: number,
  playerZ: number
): number {
  const occupied = new Set<number>();
  for (const other of customers) {
    if (other.id === selfId) continue;
    if (other.state === 'going_to_checkout' || other.state === 'purchasing') {
      occupied.add(other.checkoutSlotIndex);
    }
  }
  for (let i = 0; i < LAST_SHOP_WAYPOINTS.checkoutSlots.length; i++) {
    if (occupied.has(i)) continue;
    const slot = LAST_SHOP_WAYPOINTS.checkoutSlots[i];
    if (Math.hypot(slot.x - playerX, slot.z - playerZ) < 0.85) continue;
    return i;
  }
  for (let i = 0; i < LAST_SHOP_WAYPOINTS.checkoutSlots.length; i++) {
    if (!occupied.has(i)) return i;
  }
  return 0;
}

export function stepCustomerSpawnSchedule(
  schedule: CustomerSpawnScheduleState,
  activeCount: number,
  dt: number,
  hoursFloat: number,
  shopManualOpen: boolean,
  colliders: WorldColliders,
  config: CustomerSystemConfig = DEFAULT_CUSTOMER_CONFIG,
  trafficMultiplier = 1
): CustomerAgent | null {
  const status = evaluateShopOpenStatus(hoursFloat, shopManualOpen, config);
  if (!status.accepting) {
    schedule.timer = Math.min(schedule.timer, 3.0);
    return null;
  }

  if (activeCount >= config.maxActiveCustomers) {
    return null;
  }

  schedule.timer -= dt;
  if (schedule.timer > 0) return null;

  const seq = schedule.nextCustomerSeq++;
  const spawnSide = (schedule.lastSpawnSide + 1) % LAST_SHOP_WAYPOINTS.spawns.length;
  schedule.lastSpawnSide = spawnSide;

  const span = Math.max(1, config.spawnIntervalMaxSec - config.spawnIntervalMinSec);
  const rng = nextPseudoRandom((seq + 3) * 4099);
  const mult = Math.max(1, Math.min(1.8, trafficMultiplier));
  schedule.timer = (config.spawnIntervalMinSec + rng.value * span) / mult;

  return createCustomerAgent(`cust_${seq}`, seq, spawnSide, colliders);
}

export function stepCustomersAI(
  customers: CustomerAgent[],
  ctx: CustomerStepContext
): CustomerStepResult {
  const cfg = ctx.config ?? DEFAULT_CUSTOMER_CONFIG;
  const prices = ctx.prices ?? SHOP_ITEM_PRICES;
  const status = evaluateShopOpenStatus(ctx.hoursFloat, ctx.shopManualOpen, cfg);

  const result: CustomerStepResult = {
    requestOpenFrontDoor: false,
    purchaseRequests: [],
    despawnedIds: [],
    shopAcceptingCustomers: status.accepting,
    shopStatusReason: status.reason,
  };

  for (const c of customers) {
    if (c.state === 'despawned') {
      result.despawnedIds.push(c.id);
      continue;
    }

    c.stateTimer += ctx.dt;

    // Handle shop closing gracefully
    if (!status.accepting) {
      if (c.state === 'approaching' || c.state === 'entering' || c.state === 'browsing') {
        transitionCustomerToLeaving(c, 'Shop closed');
      }
    }

    if (c.state === 'approaching') {
      c.statusLabel = 'Walking to shop';
      const dist = moveCustomerTowardTarget(
        c,
        cfg.walkSpeed,
        ctx.dt,
        cfg.radius,
        ctx.colliders,
        customers,
        ctx.playerX,
        ctx.playerZ
      );

      if (dist <= 0.42) {
        c.state = 'entering';
        c.stateTimer = 0;
        c.stuckTimer = 0;
        c.doorWaitTimer = 0;
        c.targetX = LAST_SHOP_WAYPOINTS.entranceInside.x;
        c.targetZ = LAST_SHOP_WAYPOINTS.entranceInside.z;
        c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
      } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 20) {
        transitionCustomerToLeaving(c, 'Entrance unreachable');
      }
      continue;
    }

    if (c.state === 'entering') {
      c.statusLabel = ctx.frontDoorOpen ? 'Entering shop' : 'At front door';
      if (!ctx.frontDoorOpen) {
        if (ctx.allowCustomerDoorOpen && status.accepting) {
          result.requestOpenFrontDoor = true;
        }
        c.doorWaitTimer += ctx.dt;
        // Face doorway while waiting for door to swing open
        const doorYaw = Math.atan2(
          -(LAST_SHOP_WAYPOINTS.entranceThreshold.x - c.x),
          -(LAST_SHOP_WAYPOINTS.entranceThreshold.z - c.z)
        );
        c.yaw = lerpAngle(c.yaw, doorYaw, clamp(8 * ctx.dt, 0, 1));
        if (c.doorWaitTimer > 4.0) {
          transitionCustomerToLeaving(c, 'Door blocked');
        }
        continue;
      }

      const dist = moveCustomerTowardTarget(
        c,
        cfg.walkSpeed * 0.92,
        ctx.dt,
        cfg.radius,
        ctx.colliders,
        customers,
        ctx.playerX,
        ctx.playerZ
      );

      if (dist <= 0.42 || isCustomerInsideShop(c.x, c.z)) {
        // Quick stock pre-check before browsing or browse first then decide
        const spot =
          LAST_SHOP_WAYPOINTS.browsingSpots[
            c.browseSpotIndex % LAST_SHOP_WAYPOINTS.browsingSpots.length
          ];
        c.state = 'browsing';
        c.stateTimer = 0;
        c.stuckTimer = 0;
        c.browsePauseTimer = 0;
        c.targetX = spot.x;
        c.targetZ = spot.z;
        c.targetLookYaw = spot.lookYaw;
        c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
        c.statusLabel = 'Browsing shelves';
      } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 8) {
        transitionCustomerToLeaving(c, 'Entrance blocked');
      }
      continue;
    }

    if (c.state === 'browsing') {
      if (c.browsePauseTimer > 0) {
        c.browsePauseTimer -= ctx.dt;
        c.vx = 0;
        c.vz = 0;
        c.walkCycle += 1.1 * ctx.dt;
        if (c.targetLookYaw !== null) {
          c.yaw = lerpAngle(c.yaw, c.targetLookYaw, clamp(6 * ctx.dt, 0, 1));
        }
        if (c.browsePauseTimer <= 0) {
          c.browseStopsRemaining -= 1;
          if (c.browseStopsRemaining > 0) {
            c.browseSpotIndex =
              (c.browseSpotIndex + 1) % LAST_SHOP_WAYPOINTS.browsingSpots.length;
            const nextSpot = LAST_SHOP_WAYPOINTS.browsingSpots[c.browseSpotIndex];
            c.targetX = nextSpot.x;
            c.targetZ = nextSpot.z;
            c.targetLookYaw = nextSpot.lookYaw;
            c.stuckTimer = 0;
            c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
          } else {
            // Finished browsing: pick an available & affordable product
            const picked = selectCustomerPurchase(c, ctx.shopStock, prices);
            c.seed = picked.nextSeed;
            if (!picked.selection) {
              transitionCustomerToLeaving(
                c,
                picked.reason === 'empty_stock' ? 'Nothing in stock' : 'Nothing in budget'
              );
            } else {
              c.selectedPurchase = picked.selection;
              const slotIdx = pickCheckoutSlot(customers, c.id, ctx.playerX, ctx.playerZ);
              const slot = LAST_SHOP_WAYPOINTS.checkoutSlots[slotIdx];
              c.checkoutSlotIndex = slotIdx;
              c.state = 'going_to_checkout';
              c.stateTimer = 0;
              c.stuckTimer = 0;
              c.targetX = slot.x;
              c.targetZ = slot.z;
              c.targetLookYaw = slot.lookYaw;
              c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
              const def = prices[picked.selection.resourceId];
              c.statusLabel = `Buying ${picked.selection.quantity} ${def.displayName}`;
            }
          }
        }
        continue;
      }

      const dist = moveCustomerTowardTarget(
        c,
        cfg.walkSpeed * 0.85,
        ctx.dt,
        cfg.radius,
        ctx.colliders,
        customers,
        ctx.playerX,
        ctx.playerZ
      );

      if (dist <= 0.36) {
        c.browsePauseTimer = 2.0;
        c.statusLabel = 'Inspecting shelf';
      } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 12) {
        // Fallback: evaluate stock from current spot rather than hanging forever
        const picked = selectCustomerPurchase(c, ctx.shopStock, prices);
        c.seed = picked.nextSeed;
        if (!picked.selection) {
          transitionCustomerToLeaving(
            c,
            picked.reason === 'empty_stock' ? 'Nothing in stock' : 'Nothing in budget'
          );
        } else {
          c.selectedPurchase = picked.selection;
          const slotIdx = pickCheckoutSlot(customers, c.id, ctx.playerX, ctx.playerZ);
          const slot = LAST_SHOP_WAYPOINTS.checkoutSlots[slotIdx];
          c.checkoutSlotIndex = slotIdx;
          c.state = 'going_to_checkout';
          c.stateTimer = 0;
          c.stuckTimer = 0;
          c.targetX = slot.x;
          c.targetZ = slot.z;
          c.targetLookYaw = slot.lookYaw;
          c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
        }
      }
      continue;
    }

    if (c.state === 'going_to_checkout') {
      // If selected product was removed/bought by someone else, re-select before arriving
      if (
        !c.selectedPurchase ||
        (ctx.shopStock[c.selectedPurchase.resourceId] ?? 0) < 1
      ) {
        const rePicked = selectCustomerPurchase(c, ctx.shopStock, prices);
        c.seed = rePicked.nextSeed;
        if (!rePicked.selection) {
          c.selectedPurchase = null;
          transitionCustomerToLeaving(c, 'Item sold out');
          continue;
        }
        c.selectedPurchase = rePicked.selection;
      }

      const dist = moveCustomerTowardTarget(
        c,
        cfg.walkSpeed * 0.9,
        ctx.dt,
        cfg.radius,
        ctx.colliders,
        customers,
        ctx.playerX,
        ctx.playerZ
      );

      if (dist <= 0.4) {
        c.state = 'purchasing';
        c.stateTimer = 0;
        c.checkoutWaitTimer = 1.05;
        c.vx = 0;
        c.vz = 0;
        c.statusLabel = 'At checkout';
      } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 11) {
        transitionCustomerToLeaving(c, 'Counter unreachable');
      }
      continue;
    }

    if (c.state === 'purchasing') {
      const shopkeepers = Math.max(0, ctx.activeShopkeepers ?? 0);
      const speedMult = shopkeepers > 0 ? Math.min(2.6, 1 + shopkeepers * 0.9) : 1.0;
      c.vx = 0;
      c.vz = 0;
      c.walkCycle += 1.3 * ctx.dt * speedMult;
      if (c.targetLookYaw !== null) {
        c.yaw = lerpAngle(c.yaw, c.targetLookYaw, clamp(8 * ctx.dt, 0, 1));
      }
      if (shopkeepers > 0) {
        c.statusLabel = 'Assisted by shopkeeper';
      }

      c.checkoutWaitTimer -= ctx.dt * speedMult;
      if (c.checkoutWaitTimer <= 0) {
        if (!c.purchaseCompleted && c.selectedPurchase) {
          c.purchaseCompleted = true;
          result.purchaseRequests.push({
            customerId: c.id,
            customerName: c.profile.name,
            resourceId: c.selectedPurchase.resourceId,
            quantity: c.selectedPurchase.quantity,
          });
        } else {
          transitionCustomerToLeaving(c, 'Leaving shop');
        }
      }
      continue;
    }

    if (c.state === 'leaving') {
      if (c.leavePhase === 'to_inside') {
        const dist = moveCustomerTowardTarget(
          c,
          cfg.walkSpeed,
          ctx.dt,
          cfg.radius,
          ctx.colliders,
          customers,
          ctx.playerX,
          ctx.playerZ
        );
        if (dist <= 0.45) {
          c.leavePhase = 'to_outside';
          c.targetX = LAST_SHOP_WAYPOINTS.entranceOutside.x;
          c.targetZ = LAST_SHOP_WAYPOINTS.entranceOutside.z;
          c.stuckTimer = 0;
          c.doorWaitTimer = 0;
          c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
        } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 10) {
          c.state = 'despawned';
          result.despawnedIds.push(c.id);
        }
        continue;
      }

      if (c.leavePhase === 'to_outside') {
        if (!ctx.frontDoorOpen) {
          if (ctx.allowCustomerDoorOpen) {
            result.requestOpenFrontDoor = true;
          }
          c.doorWaitTimer += ctx.dt;
          if (c.doorWaitTimer > 3.5) {
            c.state = 'despawned';
            result.despawnedIds.push(c.id);
          }
          continue;
        }
        const dist = moveCustomerTowardTarget(
          c,
          cfg.walkSpeed,
          ctx.dt,
          cfg.radius,
          ctx.colliders,
          customers,
          ctx.playerX,
          ctx.playerZ
        );
        if (dist <= 0.48 || c.z >= LAST_SHOP_WAYPOINTS.entranceOutside.z - 0.1) {
          c.leavePhase = 'to_street';
          c.targetX = c.exitX;
          c.targetZ = c.exitZ;
          c.stuckTimer = 0;
          c.lastProgressDist = Math.hypot(c.targetX - c.x, c.targetZ - c.z);
        } else if (c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 12) {
          c.state = 'despawned';
          result.despawnedIds.push(c.id);
        }
        continue;
      }

      // to_street
      const dist = moveCustomerTowardTarget(
        c,
        cfg.walkSpeed,
        ctx.dt,
        cfg.radius,
        ctx.colliders,
        customers,
        ctx.playerX,
        ctx.playerZ
      );
      if (dist <= 0.55 || c.stuckTimer > cfg.maxStuckSec || c.stateTimer > 18) {
        c.state = 'despawned';
        result.despawnedIds.push(c.id);
      }
    }
  }

  return result;
}

export function applyCustomerPurchaseOutcome(
  c: CustomerAgent,
  sold: boolean,
  itemName: string,
  qty: number,
  earned: number,
  shopStock: InventoryState,
  prices: Record<ResourceId, ShopItemPriceDefinition> = SHOP_ITEM_PRICES
): void {
  if (sold) {
    c.budget = Math.max(0, c.budget - earned);
    transitionCustomerToLeaving(c, `Bought ${qty} ${itemName}`);
    return;
  }

  // Stock changed before checkout completed (e.g., player pulled item or another customer bought last one)
  const available = Math.max(0, Math.floor(shopStock[c.selectedPurchase?.resourceId ?? 'canned_food'] ?? 0));
  if (c.selectedPurchase && available > 0 && available * c.selectedPurchase.unitPrice <= c.budget) {
    c.selectedPurchase = {
      ...c.selectedPurchase,
      quantity: available,
    };
    c.purchaseCompleted = false;
    c.checkoutWaitTimer = 0.25;
    return;
  }

  const fallback = selectCustomerPurchase(c, shopStock, prices);
  c.seed = fallback.nextSeed;
  if (fallback.selection) {
    c.selectedPurchase = fallback.selection;
    c.purchaseCompleted = false;
    c.checkoutWaitTimer = 0.4;
    const def = prices[fallback.selection.resourceId];
    c.statusLabel = `Switching to ${def.displayName}`;
  } else {
    c.selectedPurchase = null;
    transitionCustomerToLeaving(c, 'Sold out');
  }
}

export function buildActiveCustomerSummaries(
  customers: CustomerAgent[],
  prices: Record<ResourceId, ShopItemPriceDefinition> = SHOP_ITEM_PRICES
): ActiveCustomerSummary[] {
  const summaries: ActiveCustomerSummary[] = [];
  for (const c of customers) {
    if (c.state === 'despawned') continue;
    summaries.push({
      id: c.id,
      name: c.profile.name,
      state: c.state,
      statusLabel: c.statusLabel,
      desiredItemName: c.selectedPurchase ? prices[c.selectedPurchase.resourceId].displayName : null,
      desiredQuantity: c.selectedPurchase ? c.selectedPurchase.quantity : 0,
      budget: c.budget,
    });
  }
  return summaries;
}
