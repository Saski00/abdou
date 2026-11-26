import { WorldColliders } from '../engine/WorldBuilder';
import {
  formatTemplate,
  getTranslations,
  tProfession,
  tResourceName,
  tSurvivor,
} from '../i18n';
import {
  clamp,
  resolveCircleAABB,
  resolveCircleCircle,
  resolveCircleOBB,
  resolveCircleSegment,
} from './collision';
import { getCustomerSurfaceHeight, isCustomerPointBlocked } from './customerAI';
import { ShopEconomySystem, formatMoney } from './economy';
import { getSurvivorStoryRemark } from './missionSystem';
import { RESOURCE_ORDER, consumeInventoryResource } from './resources';
import { SavedStaffState } from './saveSystem';
import {
  EmployeeProfession,
  EmployeeStatus,
  EmployeeSummary,
  InventoryState,
  ResourceId,
  StaffSnapshot,
  WorldSurvivorSummary,
} from './types';
import { ZombieAgent } from './zombieAI';

export interface ProfessionConfig {
  id: EmployeeProfession;
  label: string;
  shortLabel: string;
  salary: number;
  coatColorHex: number;
  hatColorHex: number;
  description: string;
  defaultTaskLabel: string;
}

export const PROFESSION_ORDER: EmployeeProfession[] = [
  'shopkeeper',
  'guard',
  'storage_worker',
  'resource_collector',
];

export const PROFESSION_CONFIGS: Record<EmployeeProfession, ProfessionConfig> = {
  shopkeeper: {
    id: 'shopkeeper',
    label: 'Shopkeeper',
    shortLabel: 'Shopkeeper',
    salary: 14,
    coatColorHex: 0xd97706,
    hatColorHex: 0x451a03,
    description: 'Tends the counter and assists visiting customers for faster checkouts.',
    defaultTaskLabel: 'Assisting customers at counter',
  },
  guard: {
    id: 'guard',
    label: 'Guard',
    shortLabel: 'Guard',
    salary: 18,
    coatColorHex: 0x1d4ed8,
    hatColorHex: 0x0f172a,
    description: 'Patrols the shop entrance and fights off nearby infected.',
    defaultTaskLabel: 'Patrolling shop perimeter',
  },
  storage_worker: {
    id: 'storage_worker',
    label: 'Storage Worker',
    shortLabel: 'Storage',
    salary: 12,
    coatColorHex: 0x0f766e,
    hatColorHex: 0x134e4a,
    description: 'Organizes backroom storage and keeps retail shelves stocked.',
    defaultTaskLabel: 'Organizing shelves and storage',
  },
  resource_collector: {
    id: 'resource_collector',
    label: 'Resource Collector',
    shortLabel: 'Collector',
    salary: 16,
    coatColorHex: 0x4d7c0f,
    hatColorHex: 0x365314,
    description: 'Runs timed neighborhood supply sweeps into shop storage.',
    defaultTaskLabel: 'Scavenging supplies for storage',
  },
};

export interface StaffSystemConfig {
  maxGuards: number;
  salaryIntervalSeconds: number;
  storageSyncIntervalSeconds: number;
  collectIntervalSeconds: number;
  guardDetectRadius: number;
  guardMaxChaseFromShop: number;
  guardAttackRange: number;
  guardAttackDamage: number;
  guardAttackCooldownSec: number;
  guardMaxHealth: number;
  walkSpeed: number;
  guardRunSpeed: number;
  radius: number;
}

export const DEFAULT_STAFF_CONFIG: StaffSystemConfig = {
  maxGuards: 2,
  salaryIntervalSeconds: 90,
  storageSyncIntervalSeconds: 12,
  collectIntervalSeconds: 26,
  guardDetectRadius: 12.0,
  guardMaxChaseFromShop: 18.5,
  guardAttackRange: 1.75,
  guardAttackDamage: 22,
  guardAttackCooldownSec: 1.05,
  guardMaxHealth: 100,
  walkSpeed: 2.05,
  guardRunSpeed: 2.95,
  radius: 0.35,
};

export const STAFF_WAYPOINTS = {
  shopAnchor: { x: -15.5, z: -10.5 },
  shopkeeperCounter: { x: -18.7, z: -13.35, lookYaw: 0 },
  frontEntranceInside: { x: -15.5, z: -10.85 },
  frontEntranceOutside: { x: -15.5, z: -8.3 },
  frontDoorThreshold: { x: -15.5, z: -9.62 },
  backDoorThreshold: { x: -12.78, z: -14.3 },
  frontShelfSpot: { x: -13.5, z: -11.35, lookYaw: 0 },
  storageLockerSpot: { x: -12.85, z: -15.8, lookYaw: 0 },
  guardPatrol: [
    { x: -15.5, z: -7.9 },
    { x: -19.2, z: -7.5 },
    { x: -15.5, z: -10.7 },
    { x: -11.8, z: -8.1 },
  ],
  collectorRoute: [
    { x: -15.5, z: -8.3 },
    { x: -23.0, z: -7.9 },
    { x: -27.5, z: -8.1 },
    { x: -27.5, z: -11.5 },
    { x: -22.5, z: -8.1 },
    { x: -15.5, z: -8.3 },
    { x: -15.5, z: -11.0 },
  ],
};

export interface WorldSurvivorEntity {
  id: string;
  name: string;
  variant: number;
  locationLabel: string;
  dialogue: string;
  needDescription: string;
  preferredProfession: EmployeeProfession;
  costMoney: number;
  costResources: Partial<InventoryState>;
  x: number;
  y: number;
  z: number;
  yaw: number;
  yawRate: number;
  recruited: boolean;
  animPhase: number;
}

export const WORLD_SURVIVOR_SPAWNS: Omit<WorldSurvivorEntity, 'y' | 'yawRate' | 'recruited' | 'animPhase'>[] = [
  {
    id: 'surv_maya',
    name: 'Maya',
    variant: 0,
    locationLabel: 'Abandoned House (SW Block)',
    dialogue: 'I ran a corner market before the blackout. Help me out with clean water and I will run your counter.',
    needDescription: 'Needs clean water and travel pay',
    preferredProfession: 'shopkeeper',
    costMoney: 15,
    costResources: { water_bottle: 1 },
    x: -27.9,
    z: 16.2,
    yaw: 2.5,
  },
  {
    id: 'surv_soren',
    name: 'Soren',
    variant: 1,
    locationLabel: 'Vale Corner Store (NE Block)',
    dialogue: 'Took a nasty scrape clearing the street. Patch me up and I will keep infected away from your shop.',
    needDescription: 'Needs medical supplies and hazard pay',
    preferredProfession: 'guard',
    costMoney: 20,
    costResources: { medical_supplies: 1 },
    x: 15.1,
    z: -12.1,
    yaw: 0.35,
  },
  {
    id: 'surv_dante',
    name: 'Dante',
    variant: 2,
    locationLabel: 'Depot 04 Storage (NE Yard)',
    dialogue: 'I used to manage warehouse freight. Give me a decent meal and I will keep your backroom and shelves sorted.',
    needDescription: 'Needs rations and a starter advance',
    preferredProfession: 'storage_worker',
    costMoney: 15,
    costResources: { canned_food: 1 },
    x: 30.1,
    z: -14.9,
    yaw: -0.35,
  },
  {
    id: 'surv_kira',
    name: 'Kira',
    variant: 3,
    locationLabel: 'Starlight Diner Porch (Main Blvd)',
    dialogue: 'I know every alley and supply drop on this block. Spare some food and water and I will scavenge for your store.',
    needDescription: 'Needs food and water for scouting',
    preferredProfession: 'resource_collector',
    costMoney: 0,
    costResources: { canned_food: 1, water_bottle: 1 },
    x: -17.8,
    z: 8.6,
    yaw: 3.1,
  },
  {
    id: 'surv_toby',
    name: 'Toby',
    variant: 4,
    locationLabel: 'Vacant Lot (Beside Last Shop)',
    dialogue: 'Looking for steady shelter and fair pay. Put me on watch or send me out gathering—either works for me.',
    needDescription: 'Needs upfront contract pay',
    preferredProfession: 'guard',
    costMoney: 25,
    costResources: {},
    x: -28.5,
    z: -9.5,
    yaw: 0.15,
  },
];

export type EmployeeTaskKey =
  | 'default'
  | 'recovering'
  | 'engaging'
  | 'unpaid'
  | 'storage_full'
  | 'scavenging'
  | 'stocked_shelf'
  | 'stored_excess'
  | 'collector_stored';

export interface EmployeeAgent {
  id: string;
  survivorId: string;
  name: string;
  variant: number;
  profession: EmployeeProfession;
  status: EmployeeStatus;
  statusLabel: string;
  taskLabel: string;
  taskKey?: EmployeeTaskKey;
  taskResourceId?: ResourceId;
  taskQty?: number;
  taskSec?: number;
  unpaidAmount?: number;
  health: number;
  maxHealth: number;
  salary: number;
  recruitedDay: number;
  unpaidReason: string | null;
  x: number;
  y: number;
  z: number;
  yaw: number;
  vx: number;
  vz: number;
  actualSpeed: number;
  yawRate: number;
  walkCycle: number;
  avoidDir: number;
  waypointIndex: number;
  workTimer: number;
  attackCooldown: number;
  swingTimer: number;
  swingMaxTimer: number;
  hitFlashTimer: number;
  targetZombieId: string | null;
  recovering: boolean;
  seed: number;
}

export interface StaffUpdateResult {
  requestOpenFrontDoor: boolean;
  requestOpenBackDoor: boolean;
  stockChanged: boolean;
  storageChanged: boolean;
  zombiesKilledByGuards: number;
  killedSurgeIds: string[];
  guardSwingCount: number;
  guardHitCount: number;
  toastNotices: { text: string; tone: 'resource' | 'world' | 'warning' }[];
}

export interface RecruitValidationResult {
  ok: boolean;
  reason?: string;
}

const COLLECTIBLE_LOOT_TABLE: { resourceId: ResourceId; weight: number; qty: number }[] = [
  { resourceId: 'wood', weight: 30, qty: 2 },
  { resourceId: 'scrap_metal', weight: 26, qty: 1 },
  { resourceId: 'water_bottle', weight: 22, qty: 1 },
  { resourceId: 'canned_food', weight: 16, qty: 1 },
  { resourceId: 'medical_supplies', weight: 6, qty: 1 },
];

function nextRng(seed: number): { value: number; nextSeed: number } {
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

export function formatRecruitmentCostSummary(survivor: Pick<WorldSurvivorSummary, 'costMoney' | 'costResources'>): string {
  const parts: string[] = [];
  if (survivor.costMoney > 0) {
    parts.push(formatMoney(survivor.costMoney));
  }
  for (const id of RESOURCE_ORDER) {
    const qty = survivor.costResources[id] ?? 0;
    if (qty > 0) {
      parts.push(`${qty} ${tResourceName(id, qty)}`);
    }
  }
  return parts.length > 0 ? parts.join(' + ') : getTranslations().common.free;
}

export function canRecruitSurvivor(
  survivor: Pick<WorldSurvivorSummary, 'recruited' | 'costMoney' | 'costResources'>,
  profession: EmployeeProfession,
  money: number,
  inventory: InventoryState,
  currentEmployeeCount: number,
  employeeCapacity: number,
  activeGuardCount: number,
  maxGuards: number
): RecruitValidationResult {
  const staffMsg = getTranslations().gameMessages.staff;
  if (survivor.recruited) {
    return { ok: false, reason: staffMsg.alreadyRecruited };
  }
  if (currentEmployeeCount >= employeeCapacity) {
    return {
      ok: false,
      reason: formatTemplate(staffMsg.staffLimitReached, {
        count: currentEmployeeCount,
        cap: employeeCapacity,
      }),
    };
  }
  if (profession === 'guard' && activeGuardCount >= maxGuards) {
    return {
      ok: false,
      reason: formatTemplate(staffMsg.guardLimitReached, {
        count: activeGuardCount,
        max: maxGuards,
      }),
    };
  }
  if (money < survivor.costMoney) {
    return {
      ok: false,
      reason: formatTemplate(staffMsg.needMoneyToRecruit, {
        need: formatMoney(survivor.costMoney),
        have: formatMoney(money),
      }),
    };
  }
  for (const id of RESOURCE_ORDER) {
    const req = survivor.costResources[id] ?? 0;
    if (req <= 0) continue;
    const have = inventory[id] ?? 0;
    if (have < req) {
      return {
        ok: false,
        reason: formatTemplate(staffMsg.needResourceToRecruit, {
          qty: req,
          item: tResourceName(id, req),
          have,
        }),
      };
    }
  }
  return { ok: true };
}

function resolveEmployeeCollisions(
  emp: EmployeeAgent,
  radius: number,
  colliders: WorldColliders,
  allEmployees: EmployeeAgent[],
  playerX: number,
  playerZ: number
): void {
  for (let pass = 0; pass < 2; pass++) {
    emp.x = clamp(emp.x, colliders.bounds.minX + radius, colliders.bounds.maxX - radius);
    emp.z = clamp(emp.z, colliders.bounds.minZ + radius, colliders.bounds.maxZ - radius);

    for (const b of colliders.boxes) {
      if (b.active === false) continue;
      const res =
        Math.abs(b.rotationY) < 0.001
          ? resolveCircleAABB(emp.x, emp.z, radius, b.x - b.w * 0.5, b.z - b.d * 0.5, b.w, b.d)
          : resolveCircleOBB(emp.x, emp.z, radius, b.x, b.z, b.w, b.d, -b.rotationY);
      emp.x = res.x;
      emp.z = res.y;
    }

    for (const seg of colliders.segments) {
      if (seg.active === false) continue;
      const res = resolveCircleSegment(
        emp.x,
        emp.z,
        radius,
        seg.x1,
        seg.z1,
        seg.x2,
        seg.z2,
        seg.halfThickness
      );
      emp.x = res.x;
      emp.z = res.y;
    }

    for (const c of colliders.circles) {
      const res = resolveCircleCircle(emp.x, emp.z, radius, c.x, c.z, c.radius);
      emp.x = res.x;
      emp.z = res.y;
    }

    for (const other of allEmployees) {
      if (other.id === emp.id) continue;
      const res = resolveCircleCircle(emp.x, emp.z, radius, other.x, other.z, radius);
      emp.x = res.x;
      emp.z = res.y;
    }

    const pRes = resolveCircleCircle(emp.x, emp.z, radius, playerX, playerZ, 0.42);
    emp.x = pRes.x;
    emp.z = pRes.y;
  }
}

function moveEmployeeToward(
  emp: EmployeeAgent,
  tx: number,
  tz: number,
  speed: number,
  dt: number,
  radius: number,
  colliders: WorldColliders,
  allEmployees: EmployeeAgent[],
  playerX: number,
  playerZ: number
): number {
  const dx = tx - emp.x;
  const dz = tz - emp.z;
  const dist = Math.hypot(dx, dz);
  const safeDt = Math.max(0.001, dt);
  if (dist < 0.14) {
    const decel = 1 - Math.exp(-14 * dt);
    emp.vx += (0 - emp.vx) * decel;
    emp.vz += (0 - emp.vz) * decel;
    emp.actualSpeed = Math.hypot(emp.vx, emp.vz);
    emp.yawRate += (0 - emp.yawRate) * decel;
    return dist;
  }

  let dirX = dx / dist;
  let dirZ = dz / dist;

  const probe = 0.82;
  if (isCustomerPointBlocked(emp.x + dirX * probe, emp.z + dirZ * probe, radius * 0.9, colliders)) {
    const base = Math.atan2(dirZ, dirX);
    const sideA = base + emp.avoidDir * 0.8;
    const sideB = base - emp.avoidDir * 0.8;
    if (
      !isCustomerPointBlocked(
        emp.x + Math.cos(sideA) * probe,
        emp.z + Math.sin(sideA) * probe,
        radius * 0.85,
        colliders
      )
    ) {
      dirX = Math.cos(sideA);
      dirZ = Math.sin(sideA);
    } else if (
      !isCustomerPointBlocked(
        emp.x + Math.cos(sideB) * probe,
        emp.z + Math.sin(sideB) * probe,
        radius * 0.85,
        colliders
      )
    ) {
      emp.avoidDir *= -1;
      dirX = Math.cos(sideB);
      dirZ = Math.sin(sideB);
    } else {
      const wide = base + emp.avoidDir * 1.4;
      dirX = Math.cos(wide);
      dirZ = Math.sin(wide);
    }
  }

  const prevX = emp.x;
  const prevZ = emp.z;
  const prevYaw = emp.yaw;
  const desiredSpeed = dist < 0.55 ? speed * clamp(dist / 0.55, 0.35, 1) : speed;
  const accelBlend = 1 - Math.exp(-11 * dt);
  emp.vx += (dirX * desiredSpeed - emp.vx) * accelBlend;
  emp.vz += (dirZ * desiredSpeed - emp.vz) * accelBlend;
  emp.x += emp.vx * dt;
  emp.z += emp.vz * dt;

  resolveEmployeeCollisions(emp, radius, colliders, allEmployees, playerX, playerZ);
  emp.y = getCustomerSurfaceHeight(emp.x, emp.z, colliders);

  const actualMoved = Math.hypot(emp.x - prevX, emp.z - prevZ);
  const instSpeed = actualMoved / safeDt;
  emp.actualSpeed += (instSpeed - emp.actualSpeed) * (1 - Math.exp(-12 * dt));

  if (actualMoved > 0.002) {
    const moveYaw = Math.atan2(-dirX, -dirZ);
    emp.yaw = lerpAngle(emp.yaw, moveYaw, clamp(10 * dt, 0, 1));
    emp.walkCycle += actualMoved * 3.15;
  } else {
    emp.actualSpeed += (0 - emp.actualSpeed) * (1 - Math.exp(-14 * dt));
  }
  const yawDelta = normalizeAngle(emp.yaw - prevYaw) / safeDt;
  emp.yawRate += (clamp(yawDelta, -6, 6) - emp.yawRate) * (1 - Math.exp(-10 * dt));

  return Math.hypot(tx - emp.x, tz - emp.z);
}

export class StaffSystem {
  public readonly config: StaffSystemConfig;
  public worldSurvivors: WorldSurvivorEntity[] = [];
  public employees: EmployeeAgent[] = [];
  public nextSalaryInSeconds: number;
  public lastSalaryNotice: string | null = null;
  public goodwillLevel = 0;

  private nextEmployeeSeq = 1;
  private storageWarningCooldown = 0;
  private lastSalaryNoticeMeta:
    | { kind: 'paidUnpaidCount' | 'stillUnpaidCount'; count: number }
    | { kind: 'unpaidWagesNotice'; unpaid: number; paid: number }
    | { kind: 'payrollPaidNotice'; amount: number; count: number }
    | null = null;

  constructor(config: Partial<StaffSystemConfig> = {}) {
    this.config = { ...DEFAULT_STAFF_CONFIG, ...config };
    this.nextSalaryInSeconds = this.config.salaryIntervalSeconds;
  }

  public reset(colliders?: WorldColliders): void {
    this.employees = [];
    this.nextEmployeeSeq = 1;
    this.nextSalaryInSeconds = this.config.salaryIntervalSeconds;
    this.lastSalaryNotice = null;
    this.lastSalaryNoticeMeta = null;
    this.storageWarningCooldown = 0;
    this.goodwillLevel = 0;

    this.worldSurvivors = WORLD_SURVIVOR_SPAWNS.map((s, idx) => ({
      ...s,
      costResources: { ...s.costResources },
      y: colliders ? getCustomerSurfaceHeight(s.x, s.z, colliders) : 0.16,
      yawRate: 0,
      recruited: false,
      animPhase: idx * 1.35,
    }));
  }

  public setGoodwillLevel(level: number): void {
    const clean = Math.max(0, Math.floor(level));
    this.goodwillLevel = clean;
    const discount = Math.min(10, clean * 5);
    for (const s of this.worldSurvivors) {
      const baseDef = WORLD_SURVIVOR_SPAWNS.find((b) => b.id === s.id);
      if (!baseDef) continue;
      if (baseDef.costMoney <= 0) {
        s.costMoney = 0;
      } else {
        s.costMoney = Math.max(5, baseDef.costMoney - discount);
      }
    }
  }

  public getActiveGuardCount(): number {
    return this.employees.filter((e) => e.profession === 'guard' && e.status !== 'unpaid').length;
  }

  public getTotalGuardCount(): number {
    return this.employees.filter((e) => e.profession === 'guard').length;
  }

  public getActiveShopkeeperCount(): number {
    return this.employees.filter(
      (e) => e.profession === 'shopkeeper' && e.status !== 'unpaid'
    ).length;
  }

  public getUpcomingSalaryTotal(): number {
    return this.employees.reduce((sum, e) => sum + e.salary, 0);
  }

  public getSurvivorById(id: string): WorldSurvivorEntity | null {
    return this.worldSurvivors.find((s) => s.id === id) ?? null;
  }

  public recruitSurvivor(
    survivorId: string,
    profession: EmployeeProfession,
    currentDay: number,
    timeLabel: string,
    inventory: InventoryState,
    economy: ShopEconomySystem,
    colliders: WorldColliders
  ): { ok: boolean; nextInventory: InventoryState; message: string; employee?: EmployeeAgent } {
    const tr = getTranslations();
    const staffMsg = tr.gameMessages.staff;
    const econMsg = tr.gameMessages.economy;
    const surv = this.getSurvivorById(survivorId);
    if (!surv) {
      return { ok: false, nextInventory: inventory, message: staffMsg.survivorNotFound };
    }

    const check = canRecruitSurvivor(
      surv,
      profession,
      economy.getMoney(),
      inventory,
      this.employees.length,
      economy.getEmployeeCapacity(),
      this.getTotalGuardCount(),
      this.config.maxGuards
    );
    if (!check.ok) {
      return {
        ok: false,
        nextInventory: inventory,
        message: check.reason || staffMsg.cannotRecruit,
      };
    }

    const survName = tSurvivor(surv.id)?.name ?? surv.name;
    const profLoc = tProfession(profession);

    if (surv.costMoney > 0) {
      const feeRes = economy.payRecruitmentFee(survName, surv.costMoney, timeLabel);
      if (!feeRes.ok) {
        return { ok: false, nextInventory: inventory, message: feeRes.record.message };
      }
    } else {
      economy.recordStaffNotice(
        formatTemplate(econMsg.recruitedAsLog, { name: survName, role: profLoc.label }),
        timeLabel
      );
    }

    let nextInv = inventory;
    for (const id of RESOURCE_ORDER) {
      const req = surv.costResources[id] ?? 0;
      if (req > 0) {
        nextInv = consumeInventoryResource(nextInv, id, req);
      }
    }

    surv.recruited = true;

    const profCfg = PROFESSION_CONFIGS[profession];
    const spawnPt = this.getInitialWorkstation(profession, this.employees.length);
    const status: EmployeeStatus =
      profession === 'guard'
        ? 'patrolling'
        : profession === 'resource_collector'
          ? 'gathering'
          : 'working';

    const emp: EmployeeAgent = {
      id: `emp_${this.nextEmployeeSeq++}`,
      survivorId: surv.id,
      name: surv.name,
      variant: surv.variant,
      profession,
      status,
      statusLabel: staffMsg.statusLabels[status],
      taskLabel: profLoc.defaultTaskLabel,
      taskKey: 'default',
      health: this.config.guardMaxHealth,
      maxHealth: this.config.guardMaxHealth,
      salary: profCfg.salary,
      recruitedDay: currentDay,
      unpaidReason: null,
      x: spawnPt.x,
      y: getCustomerSurfaceHeight(spawnPt.x, spawnPt.z, colliders),
      z: spawnPt.z,
      yaw: 0,
      vx: 0,
      vz: 0,
      actualSpeed: 0,
      yawRate: 0,
      walkCycle: 0,
      avoidDir: this.employees.length % 2 === 0 ? 1 : -1,
      waypointIndex: 0,
      workTimer:
        profession === 'storage_worker'
          ? 4.0
          : profession === 'resource_collector'
            ? this.config.collectIntervalSeconds
            : 0,
      attackCooldown: 0,
      swingTimer: 0,
      swingMaxTimer: 0.3,
      hitFlashTimer: 0,
      targetZombieId: null,
      recovering: false,
      seed: surv.variant * 313 + 77,
    };

    this.employees.push(emp);
    return {
      ok: true,
      nextInventory: nextInv,
      message: formatTemplate(staffMsg.joinedShopMsg, {
        name: survName,
        role: profLoc.label,
        salary: formatMoney(emp.salary),
      }),
      employee: emp,
    };
  }

  public setEmployeeProfession(
    employeeId: string,
    nextProfession: EmployeeProfession,
    economy: ShopEconomySystem,
    timeLabel: string
  ): { ok: boolean; message: string } {
    const staffMsg = getTranslations().gameMessages.staff;
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) {
      return { ok: false, message: staffMsg.employeeNotFound };
    }
    const empName = tSurvivor(emp.survivorId)?.name ?? emp.name;
    const nextProfLoc = tProfession(nextProfession);
    if (emp.profession === nextProfession) {
      return {
        ok: true,
        message: formatTemplate(staffMsg.alreadyAssigned, {
          name: empName,
          role: nextProfLoc.label,
        }),
      };
    }
    if (nextProfession === 'guard' && this.getTotalGuardCount() >= this.config.maxGuards) {
      return {
        ok: false,
        message: formatTemplate(staffMsg.guardLimitReached, {
          count: this.getTotalGuardCount(),
          max: this.config.maxGuards,
        }),
      };
    }

    const profCfg = PROFESSION_CONFIGS[nextProfession];
    emp.profession = nextProfession;
    emp.salary = profCfg.salary;
    emp.waypointIndex = 0;
    emp.targetZombieId = null;
    emp.recovering = false;
    emp.workTimer =
      nextProfession === 'storage_worker'
        ? 4.0
        : nextProfession === 'resource_collector'
          ? this.config.collectIntervalSeconds
          : 0;

    if (emp.status !== 'unpaid') {
      const nextStatus: EmployeeStatus =
        nextProfession === 'guard'
          ? 'patrolling'
          : nextProfession === 'resource_collector'
            ? 'gathering'
            : 'working';
      emp.status = nextStatus;
      emp.statusLabel = staffMsg.statusLabels[nextStatus];
      emp.taskKey = 'default';
      emp.taskLabel = nextProfLoc.defaultTaskLabel;
    }

    const msg = formatTemplate(staffMsg.reassignedMsg, {
      name: empName,
      role: nextProfLoc.label,
      salary: formatMoney(profCfg.salary),
    });
    economy.recordStaffNotice(msg, timeLabel);
    return { ok: true, message: msg };
  }

  public dismissEmployee(
    employeeId: string,
    economy: ShopEconomySystem,
    timeLabel: string
  ): { ok: boolean; message: string } {
    const staffMsg = getTranslations().gameMessages.staff;
    const idx = this.employees.findIndex((e) => e.id === employeeId);
    if (idx === -1) {
      return { ok: false, message: staffMsg.employeeNotFound };
    }
    const [removed] = this.employees.splice(idx, 1);
    const empName = tSurvivor(removed.survivorId)?.name ?? removed.name;
    const msg = formatTemplate(staffMsg.dismissedMsg, { name: empName });
    economy.recordStaffNotice(msg, timeLabel);
    return { ok: true, message: msg };
  }

  public payUnpaidSalariesNow(
    economy: ShopEconomySystem,
    timeLabel: string
  ): { paidCount: number; remainingUnpaid: number; message: string } {
    const staffMsg = getTranslations().gameMessages.staff;
    const unpaid = this.employees.filter((e) => e.status === 'unpaid');
    if (unpaid.length === 0) {
      return { paidCount: 0, remainingUnpaid: 0, message: staffMsg.allWagesPaid };
    }

    let paidCount = 0;
    for (const emp of unpaid) {
      const empName = tSurvivor(emp.survivorId)?.name ?? emp.name;
      const res = economy.payEmployeeSalary(empName, emp.salary, timeLabel);
      if (res.ok) {
        paidCount += 1;
        this.restoreActiveStatus(emp);
      }
    }

    const remainingUnpaid = this.employees.filter((e) => e.status === 'unpaid').length;
    if (paidCount > 0 && remainingUnpaid === 0) {
      this.lastSalaryNoticeMeta = { kind: 'paidUnpaidCount', count: paidCount };
      this.lastSalaryNotice = formatTemplate(staffMsg.paidUnpaidCount, { count: paidCount });
    } else if (remainingUnpaid > 0) {
      this.lastSalaryNoticeMeta = { kind: 'stillUnpaidCount', count: remainingUnpaid };
      this.lastSalaryNotice = formatTemplate(staffMsg.stillUnpaidCount, { count: remainingUnpaid });
    }
    return {
      paidCount,
      remainingUnpaid,
      message: this.lastSalaryNotice || staffMsg.wagesChecked,
    };
  }

  private restoreActiveStatus(emp: EmployeeAgent): void {
    const staffMsg = getTranslations().gameMessages.staff;
    const profLoc = tProfession(emp.profession);
    emp.unpaidReason = null;
    emp.unpaidAmount = undefined;
    emp.status =
      emp.profession === 'guard'
        ? 'patrolling'
        : emp.profession === 'resource_collector'
          ? 'gathering'
          : 'working';
    emp.statusLabel = staffMsg.statusLabels[emp.status];
    emp.taskKey = 'default';
    emp.taskLabel = profLoc.defaultTaskLabel;
  }

  private getInitialWorkstation(profession: EmployeeProfession, offsetIdx: number): { x: number; z: number } {
    const nudge = ((offsetIdx % 3) - 1) * 0.55;
    if (profession === 'shopkeeper') {
      return { x: STAFF_WAYPOINTS.shopkeeperCounter.x + nudge * 0.6, z: STAFF_WAYPOINTS.shopkeeperCounter.z };
    }
    if (profession === 'guard') {
      return { x: STAFF_WAYPOINTS.guardPatrol[0].x + nudge, z: STAFF_WAYPOINTS.guardPatrol[0].z };
    }
    if (profession === 'storage_worker') {
      return { x: STAFF_WAYPOINTS.frontShelfSpot.x, z: STAFF_WAYPOINTS.frontShelfSpot.z + nudge * 0.4 };
    }
    return { x: STAFF_WAYPOINTS.frontEntranceInside.x + nudge, z: STAFF_WAYPOINTS.frontEntranceInside.z };
  }

  public step(params: {
    dt: number;
    timeLabel: string;
    playerX: number;
    playerZ: number;
    frontDoorOpen: boolean;
    backDoorOpen: boolean;
    zombies: ZombieAgent[];
    economy: ShopEconomySystem;
    colliders: WorldColliders;
  }): StaffUpdateResult {
    const { dt, timeLabel, playerX, playerZ, frontDoorOpen, backDoorOpen, zombies, economy, colliders } = params;
    const result: StaffUpdateResult = {
      requestOpenFrontDoor: false,
      requestOpenBackDoor: false,
      stockChanged: false,
      storageChanged: false,
      zombiesKilledByGuards: 0,
      killedSurgeIds: [],
      guardSwingCount: 0,
      guardHitCount: 0,
      toastNotices: [],
    };

    this.storageWarningCooldown = Math.max(0, this.storageWarningCooldown - dt);

    // Subtle idle breathing phase for wild world survivors
    for (const surv of this.worldSurvivors) {
      if (!surv.recruited) {
        surv.animPhase += dt * 1.8;
      }
    }

    if (this.employees.length === 0) {
      this.nextSalaryInSeconds = this.config.salaryIntervalSeconds;
      return result;
    }

    // 1. Salary payroll timer
    this.nextSalaryInSeconds -= dt;
    if (this.nextSalaryInSeconds <= 0) {
      this.nextSalaryInSeconds = this.config.salaryIntervalSeconds;
      let paidCount = 0;
      let totalPaid = 0;
      let unpaidCount = 0;

      const tr = getTranslations();
      const staffMsg = tr.gameMessages.staff;
      const toastsMsg = tr.gameMessages.toasts;
      for (const emp of this.employees) {
        const empName = tSurvivor(emp.survivorId)?.name ?? emp.name;
        const payRes = economy.payEmployeeSalary(empName, emp.salary, timeLabel);
        if (payRes.ok) {
          paidCount += 1;
          totalPaid += emp.salary;
          if (emp.status === 'unpaid') {
            this.restoreActiveStatus(emp);
          }
        } else {
          unpaidCount += 1;
          emp.status = 'unpaid';
          emp.statusLabel = staffMsg.statusLabels.unpaid;
          emp.unpaidAmount = emp.salary;
          emp.unpaidReason = formatTemplate(staffMsg.unpaidReasonNeeds, {
            amount: formatMoney(emp.salary),
          });
          emp.taskKey = 'unpaid';
          emp.taskLabel = staffMsg.taskUnpaid;
          emp.vx = 0;
          emp.vz = 0;
          emp.actualSpeed = 0;
          emp.yawRate = 0;
        }
      }

      if (unpaidCount > 0) {
        const notice = formatTemplate(toastsMsg.unpaidWagesNotice, {
          unpaid: unpaidCount,
          paid: paidCount,
        });
        this.lastSalaryNoticeMeta = { kind: 'unpaidWagesNotice', unpaid: unpaidCount, paid: paidCount };
        this.lastSalaryNotice = notice;
        result.toastNotices.push({ text: notice, tone: 'warning' });
      } else if (paidCount > 0) {
        const notice = formatTemplate(toastsMsg.payrollPaidNotice, {
          amount: formatMoney(totalPaid),
          count: paidCount,
        });
        this.lastSalaryNoticeMeta = { kind: 'payrollPaidNotice', amount: totalPaid, count: paidCount };
        this.lastSalaryNotice = notice;
        result.toastNotices.push({ text: notice, tone: 'world' });
      }
    }

    // 2. Update each employee by profession
    for (let idx = 0; idx < this.employees.length; idx++) {
      const emp = this.employees[idx];
      if (emp.swingTimer > 0) emp.swingTimer = Math.max(0, emp.swingTimer - dt);
      if (emp.hitFlashTimer > 0) emp.hitFlashTimer = Math.max(0, emp.hitFlashTimer - dt);
      if (emp.attackCooldown > 0) emp.attackCooldown = Math.max(0, emp.attackCooldown - dt);

      if (emp.status === 'unpaid') {
        emp.vx = 0;
        emp.vz = 0;
        emp.actualSpeed = 0;
        emp.yawRate = 0;
        emp.walkCycle += dt * 0.9;
        continue;
      }

      if (emp.profession === 'shopkeeper') {
        this.stepShopkeeper(emp, idx, dt, colliders, playerX, playerZ, result, frontDoorOpen);
      } else if (emp.profession === 'guard') {
        this.stepGuard(emp, dt, colliders, zombies, playerX, playerZ, result, frontDoorOpen);
      } else if (emp.profession === 'storage_worker') {
        this.stepStorageWorker(
          emp,
          dt,
          timeLabel,
          colliders,
          economy,
          playerX,
          playerZ,
          backDoorOpen,
          result
        );
      } else if (emp.profession === 'resource_collector') {
        this.stepResourceCollector(
          emp,
          dt,
          timeLabel,
          colliders,
          economy,
          playerX,
          playerZ,
          frontDoorOpen,
          backDoorOpen,
          result
        );
      }
    }

    return result;
  }

  private checkFrontDoorNeeded(emp: EmployeeAgent, frontDoorOpen: boolean, result: StaffUpdateResult): void {
    if (frontDoorOpen) return;
    const dDoor = Math.hypot(
      emp.x - STAFF_WAYPOINTS.frontDoorThreshold.x,
      emp.z - STAFF_WAYPOINTS.frontDoorThreshold.z
    );
    if (dDoor < 1.55) {
      result.requestOpenFrontDoor = true;
    }
  }

  private checkBackDoorNeeded(emp: EmployeeAgent, backDoorOpen: boolean, result: StaffUpdateResult): void {
    if (backDoorOpen) return;
    const dDoor = Math.hypot(
      emp.x - STAFF_WAYPOINTS.backDoorThreshold.x,
      emp.z - STAFF_WAYPOINTS.backDoorThreshold.z
    );
    if (dDoor < 1.55) {
      result.requestOpenBackDoor = true;
    }
  }

  private stepShopkeeper(
    emp: EmployeeAgent,
    idx: number,
    dt: number,
    colliders: WorldColliders,
    playerX: number,
    playerZ: number,
    result: StaffUpdateResult,
    frontDoorOpen: boolean
  ): void {
    const staffMsg = getTranslations().gameMessages.staff;
    emp.status = 'working';
    emp.statusLabel = staffMsg.statusLabels.working;
    emp.taskKey = 'default';
    emp.taskLabel = tProfession('shopkeeper').defaultTaskLabel;

    const slotOffset = (idx % 2 === 0 ? 0 : 0.85);
    const tx = STAFF_WAYPOINTS.shopkeeperCounter.x + slotOffset;
    const tz = STAFF_WAYPOINTS.shopkeeperCounter.z;

    this.checkFrontDoorNeeded(emp, frontDoorOpen, result);
    const dist = moveEmployeeToward(
      emp,
      tx,
      tz,
      this.config.walkSpeed,
      dt,
      this.config.radius,
      colliders,
      this.employees,
      playerX,
      playerZ
    );

    if (dist <= 0.25) {
      emp.vx = 0;
      emp.vz = 0;
      emp.actualSpeed += (0 - emp.actualSpeed) * (1 - Math.exp(-14 * dt));
      const prevYaw = emp.yaw;
      emp.yaw = lerpAngle(emp.yaw, STAFF_WAYPOINTS.shopkeeperCounter.lookYaw, clamp(6 * dt, 0, 1));
      const yawDelta = normalizeAngle(emp.yaw - prevYaw) / Math.max(0.001, dt);
      emp.yawRate += (clamp(yawDelta, -6, 6) - emp.yawRate) * (1 - Math.exp(-10 * dt));
      emp.walkCycle += dt * 1.4;
    }
  }

  private stepGuard(
    emp: EmployeeAgent,
    dt: number,
    colliders: WorldColliders,
    zombies: ZombieAgent[],
    playerX: number,
    playerZ: number,
    result: StaffUpdateResult,
    frontDoorOpen: boolean
  ): void {
    const tr = getTranslations();
    const staffMsg = tr.gameMessages.staff;
    const empName = tSurvivor(emp.survivorId)?.name ?? emp.name;
    // Recover softly if knocked low in a fight
    if (emp.recovering) {
      emp.health = Math.min(emp.maxHealth, emp.health + 4.5 * dt);
      emp.status = 'idle';
      emp.statusLabel = staffMsg.statusLabels.idle;
      emp.taskKey = 'recovering';
      emp.taskLabel = staffMsg.taskRecovering;
      this.checkFrontDoorNeeded(emp, frontDoorOpen, result);
      moveEmployeeToward(
        emp,
        STAFF_WAYPOINTS.frontEntranceInside.x,
        STAFF_WAYPOINTS.frontEntranceInside.z,
        this.config.walkSpeed,
        dt,
        this.config.radius,
        colliders,
        this.employees,
        playerX,
        playerZ
      );
      if (emp.health >= 45) {
        emp.recovering = false;
      }
      return;
    }

    // Find closest living hostile zombie near guard or shop anchor (never targets survivors or customers!)
    let targetZombie: ZombieAgent | null = null;
    let bestDist = Infinity;
    for (const z of zombies) {
      if (z.state === 'dead') continue;
      const distFromGuard = Math.hypot(z.x - emp.x, z.z - emp.z);
      const distFromShop = Math.hypot(
        z.x - STAFF_WAYPOINTS.shopAnchor.x,
        z.z - STAFF_WAYPOINTS.shopAnchor.z
      );
      if (distFromGuard <= this.config.guardDetectRadius || distFromShop <= this.config.guardDetectRadius) {
        if (distFromShop <= this.config.guardMaxChaseFromShop && distFromGuard < bestDist) {
          bestDist = distFromGuard;
          targetZombie = z;
        }
      }
    }

    if (targetZombie) {
      emp.status = 'engaging';
      emp.statusLabel = staffMsg.statusLabels.engaging;
      emp.taskKey = 'engaging';
      emp.taskLabel = staffMsg.taskEngaging;
      emp.targetZombieId = targetZombie.id;
      this.checkFrontDoorNeeded(emp, frontDoorOpen, result);

      const dZombie = Math.hypot(targetZombie.x - emp.x, targetZombie.z - emp.z);
      if (dZombie > this.config.guardAttackRange - 0.15) {
        moveEmployeeToward(
          emp,
          targetZombie.x,
          targetZombie.z,
          this.config.guardRunSpeed,
          dt,
          this.config.radius,
          colliders,
          this.employees,
          playerX,
          playerZ
        );
      } else {
        emp.vx = 0;
        emp.vz = 0;
        emp.actualSpeed += (0 - emp.actualSpeed) * (1 - Math.exp(-14 * dt));
        const prevYaw = emp.yaw;
        const faceYaw = Math.atan2(-(targetZombie.x - emp.x), -(targetZombie.z - emp.z));
        emp.yaw = lerpAngle(emp.yaw, faceYaw, clamp(12 * dt, 0, 1));
        const yawDelta = normalizeAngle(emp.yaw - prevYaw) / Math.max(0.001, dt);
        emp.yawRate += (clamp(yawDelta, -6, 6) - emp.yawRate) * (1 - Math.exp(-10 * dt));
        emp.walkCycle += dt * 1.8;

        if (emp.attackCooldown <= 0) {
          emp.attackCooldown = this.config.guardAttackCooldownSec;
          emp.swingTimer = 0.30;
          emp.swingMaxTimer = 0.30;
          result.guardSwingCount += 1;

          targetZombie.health = Math.max(0, targetZombie.health - this.config.guardAttackDamage);
          targetZombie.hitFlashTimer = 0.18;
          result.guardHitCount += 1;

          // Knockback nudge
          const kx = targetZombie.x - emp.x;
          const kz = targetZombie.z - emp.z;
          const klen = Math.hypot(kx, kz) || 1;
          targetZombie.x += (kx / klen) * 0.25;
          targetZombie.z += (kz / klen) * 0.25;

          if (targetZombie.health <= 0) {
            targetZombie.state = 'dead';
            targetZombie.deathTimer = 0;
            result.zombiesKilledByGuards += 1;
            if (targetZombie.surgeId) {
              result.killedSurgeIds.push(targetZombie.surgeId);
            }
            result.toastNotices.push({
              text: formatTemplate(tr.gameMessages.toasts.guardDefeatedInfected, { name: empName }),
              tone: 'resource',
            });
          } else {
            if (targetZombie.state !== 'chasing' && targetZombie.state !== 'attacking') {
              targetZombie.lastKnownX = emp.x;
              targetZombie.lastKnownZ = emp.z;
            }
            targetZombie.state = 'stunned';
            targetZombie.stunTimer = Math.min(0.26, targetZombie.config.stunDurationSec);
            targetZombie.attackWindup = 0;
            targetZombie.targetX = emp.x;
            targetZombie.targetZ = emp.z;
            if (emp.health > 0) {
              // Infected strikes back occasionally during close melee
              emp.health = Math.max(0, emp.health - 5);
              emp.hitFlashTimer = 0.15;
              if (emp.health <= 0) {
                emp.recovering = true;
                result.toastNotices.push({
                  text: formatTemplate(tr.gameMessages.toasts.guardRetreated, { name: empName }),
                  tone: 'warning',
                });
              }
            }
          }
        }
      }
      return;
    }

    // Safe patrol route around shop entrance
    emp.targetZombieId = null;
    emp.status = 'patrolling';
    emp.statusLabel = staffMsg.statusLabels.patrolling;
    emp.taskKey = 'default';
    emp.taskLabel = tProfession('guard').defaultTaskLabel;
    emp.health = Math.min(emp.maxHealth, emp.health + 2.5 * dt);

    const wp = STAFF_WAYPOINTS.guardPatrol[emp.waypointIndex % STAFF_WAYPOINTS.guardPatrol.length];
    this.checkFrontDoorNeeded(emp, frontDoorOpen, result);
    const dist = moveEmployeeToward(
      emp,
      wp.x,
      wp.z,
      this.config.walkSpeed,
      dt,
      this.config.radius,
      colliders,
      this.employees,
      playerX,
      playerZ
    );
    if (dist <= 0.35) {
      emp.waypointIndex = (emp.waypointIndex + 1) % STAFF_WAYPOINTS.guardPatrol.length;
    }
  }

  private stepStorageWorker(
    emp: EmployeeAgent,
    dt: number,
    timeLabel: string,
    colliders: WorldColliders,
    economy: ShopEconomySystem,
    playerX: number,
    playerZ: number,
    backDoorOpen: boolean,
    result: StaffUpdateResult
  ): void {
    const staffMsg = getTranslations().gameMessages.staff;
    emp.status = 'working';
    emp.statusLabel = staffMsg.statusLabels.working;
    if (!emp.taskKey || emp.taskKey === 'recovering' || emp.taskKey === 'engaging' || emp.taskKey === 'unpaid') {
      emp.taskKey = 'default';
      emp.taskLabel = tProfession('storage_worker').defaultTaskLabel;
    }

    const route = [
      STAFF_WAYPOINTS.frontShelfSpot,
      STAFF_WAYPOINTS.backDoorThreshold,
      STAFF_WAYPOINTS.storageLockerSpot,
      STAFF_WAYPOINTS.backDoorThreshold,
    ];
    const wp = route[emp.waypointIndex % route.length];
    this.checkBackDoorNeeded(emp, backDoorOpen, result);

    const dist = moveEmployeeToward(
      emp,
      wp.x,
      wp.z,
      this.config.walkSpeed * 0.95,
      dt,
      this.config.radius,
      colliders,
      this.employees,
      playerX,
      playerZ
    );
    if (dist <= 0.32) {
      emp.waypointIndex = (emp.waypointIndex + 1) % route.length;
    }

    // Periodic shelf <-> storage organization using real quantities only
    emp.workTimer -= dt;
    if (emp.workTimer <= 0) {
      emp.workTimer = this.config.storageSyncIntervalSeconds;
      const storage = economy.getShopStorage();
      const stock = economy.getShopStock();

      // Priority 1: Keep display shelves stocked from backroom storage
      let organized = false;
      for (const id of RESOURCE_ORDER) {
        const storedQty = storage[id] ?? 0;
        const shelfQty = stock[id] ?? 0;
        if (storedQty > 0 && shelfQty < 4) {
          const moveQty = Math.min(2, storedQty, 4 - shelfQty);
          const res = economy.transferStorageToStock(id, moveQty, timeLabel);
          if (res.ok) {
            result.stockChanged = true;
            result.storageChanged = true;
            emp.taskKey = 'stocked_shelf';
            emp.taskResourceId = id;
            emp.taskQty = moveQty;
            emp.taskLabel = formatTemplate(staffMsg.taskStockedShelf, {
              qty: moveQty,
              item: tResourceName(id, moveQty),
            });
            organized = true;
            break;
          }
        }
      }

      // Priority 2: Move excess shelf stock back to storage if storage has space
      if (!organized) {
        for (const id of RESOURCE_ORDER) {
          const shelfQty = stock[id] ?? 0;
          if (shelfQty > 8) {
            const res = economy.transferStockToStorage(id, 1, timeLabel);
            if (res.ok) {
              result.stockChanged = true;
              result.storageChanged = true;
              emp.taskKey = 'stored_excess';
              emp.taskResourceId = id;
              emp.taskQty = 1;
              emp.taskLabel = formatTemplate(staffMsg.taskStoredExcess, {
                item: tResourceName(id, 1),
              });
              break;
            }
          }
        }
      }
    }
  }

  private stepResourceCollector(
    emp: EmployeeAgent,
    dt: number,
    timeLabel: string,
    colliders: WorldColliders,
    economy: ShopEconomySystem,
    playerX: number,
    playerZ: number,
    frontDoorOpen: boolean,
    backDoorOpen: boolean,
    result: StaffUpdateResult
  ): void {
    const staffMsg = getTranslations().gameMessages.staff;
    const empName = tSurvivor(emp.survivorId)?.name ?? emp.name;
    emp.status = 'gathering';
    emp.statusLabel = staffMsg.statusLabels.gathering;

    const route = STAFF_WAYPOINTS.collectorRoute;
    const wp = route[emp.waypointIndex % route.length];
    this.checkFrontDoorNeeded(emp, frontDoorOpen, result);
    this.checkBackDoorNeeded(emp, backDoorOpen, result);

    const dist = moveEmployeeToward(
      emp,
      wp.x,
      wp.z,
      this.config.walkSpeed * 1.05,
      dt,
      this.config.radius,
      colliders,
      this.employees,
      playerX,
      playerZ
    );
    if (dist <= 0.36) {
      emp.waypointIndex = (emp.waypointIndex + 1) % route.length;
    }

    emp.workTimer -= dt;
    if (emp.workTimer <= 0) {
      emp.workTimer = this.config.collectIntervalSeconds;

      // Deterministic weighted roll for gathered resource
      const r = nextRng(emp.seed);
      emp.seed = r.nextSeed;
      let roll = r.value * 100;
      let picked = COLLECTIBLE_LOOT_TABLE[0];
      for (const entry of COLLECTIBLE_LOOT_TABLE) {
        roll -= entry.weight;
        if (roll <= 0) {
          picked = entry;
          break;
        }
      }

      const depositRes = economy.depositCollectedToStorage(
        picked.resourceId,
        picked.qty,
        empName,
        timeLabel
      );
      if (depositRes.ok) {
        result.storageChanged = true;
        emp.taskKey = 'collector_stored';
        emp.taskResourceId = picked.resourceId;
        emp.taskQty = depositRes.deposited;
        emp.taskLabel = formatTemplate(staffMsg.taskCollectorStored, {
          qty: depositRes.deposited,
          item: tResourceName(picked.resourceId, depositRes.deposited),
        });
        result.toastNotices.push({
          text: depositRes.record.message,
          tone: 'resource',
        });
      } else {
        emp.taskKey = 'storage_full';
        emp.taskLabel = staffMsg.taskStorageFull;
        if (this.storageWarningCooldown <= 0) {
          this.storageWarningCooldown = 20;
          result.toastNotices.push({
            text: depositRes.record.message,
            tone: 'warning',
          });
        }
      }
    } else {
      const sec = Math.ceil(emp.workTimer);
      emp.taskKey = 'scavenging';
      emp.taskSec = sec;
      emp.taskLabel = formatTemplate(staffMsg.taskScavengingCountdown, { sec });
    }
  }

  public exportState(): SavedStaffState {
    return {
      recruitedSurvivorIds: this.worldSurvivors
        .filter((s) => s.recruited)
        .map((s) => s.id),
      employees: this.employees.map((e) => ({
        id: e.id,
        survivorId: e.survivorId,
        name: e.name,
        variant: e.variant,
        profession: e.profession,
        status: e.status,
        health: e.health,
        recruitedDay: e.recruitedDay,
        unpaidReason: e.unpaidReason,
      })),
      nextSalaryInSeconds: this.nextSalaryInSeconds,
      nextEmployeeSeq: this.nextEmployeeSeq,
      lastSalaryNotice: this.lastSalaryNotice,
    };
  }

  public importState(raw: Partial<SavedStaffState> | undefined, colliders?: WorldColliders): void {
    this.reset(colliders);
    if (!raw || typeof raw !== 'object') return;

    const recruitedSet = new Set(
      Array.isArray(raw.recruitedSurvivorIds) ? raw.recruitedSurvivorIds : []
    );
    for (const s of this.worldSurvivors) {
      if (recruitedSet.has(s.id)) {
        s.recruited = true;
      }
    }

    if (typeof raw.nextSalaryInSeconds === 'number' && Number.isFinite(raw.nextSalaryInSeconds)) {
      this.nextSalaryInSeconds = Math.max(1, raw.nextSalaryInSeconds);
    }
    if (typeof raw.nextEmployeeSeq === 'number' && Number.isFinite(raw.nextEmployeeSeq)) {
      this.nextEmployeeSeq = Math.max(1, Math.floor(raw.nextEmployeeSeq));
    }
    this.lastSalaryNotice = typeof raw.lastSalaryNotice === 'string' ? raw.lastSalaryNotice : null;

    if (Array.isArray(raw.employees)) {
      const staffMsg = getTranslations().gameMessages.staff;
      this.employees = raw.employees.map((saved, idx) => {
        const profCfg = PROFESSION_CONFIGS[saved.profession] ?? PROFESSION_CONFIGS.shopkeeper;
        const profLoc = tProfession(profCfg.id);
        const spawnPt = this.getInitialWorkstation(profCfg.id, idx);
        const y = colliders ? getCustomerSurfaceHeight(spawnPt.x, spawnPt.z, colliders) : 0.16;
        const isUnpaid = saved.status === 'unpaid';
        const status: EmployeeStatus = isUnpaid
          ? 'unpaid'
          : profCfg.id === 'guard'
            ? 'patrolling'
            : profCfg.id === 'resource_collector'
              ? 'gathering'
              : 'working';
        const statusLabel = staffMsg.statusLabels[status];

        return {
          id: saved.id || `emp_${idx + 1}`,
          survivorId: saved.survivorId || 'surv_maya',
          name: saved.name || 'Staff',
          variant: typeof saved.variant === 'number' ? saved.variant : idx % 5,
          profession: profCfg.id,
          status,
          statusLabel,
          taskLabel: isUnpaid ? staffMsg.taskUnpaid : profLoc.defaultTaskLabel,
          taskKey: isUnpaid ? 'unpaid' : 'default',
          unpaidAmount: isUnpaid ? profCfg.salary : undefined,
          health: clamp(typeof saved.health === 'number' ? saved.health : this.config.guardMaxHealth, 10, this.config.guardMaxHealth),
          maxHealth: this.config.guardMaxHealth,
          salary: profCfg.salary,
          recruitedDay: Math.max(1, Math.floor(saved.recruitedDay || 1)),
          unpaidReason: saved.unpaidReason ?? null,
          x: spawnPt.x,
          y,
          z: spawnPt.z,
          yaw: 0,
          vx: 0,
          vz: 0,
          actualSpeed: 0,
          yawRate: 0,
          walkCycle: 0,
          avoidDir: idx % 2 === 0 ? 1 : -1,
          waypointIndex: 0,
          workTimer:
            profCfg.id === 'storage_worker'
              ? 4.0
              : profCfg.id === 'resource_collector'
                ? this.config.collectIntervalSeconds
                : 0,
          attackCooldown: 0,
          swingTimer: 0,
          swingMaxTimer: 0.3,
          hitFlashTimer: 0,
          targetZombieId: null,
          recovering: false,
          seed: (typeof saved.variant === 'number' ? saved.variant : idx) * 313 + 77,
        };
      });
    }
  }

  private resolveEmployeeTaskLabel(e: EmployeeAgent): string {
    const staffMsg = getTranslations().gameMessages.staff;
    const profLoc = tProfession(e.profession);
    switch (e.taskKey) {
      case 'recovering':
        return staffMsg.taskRecovering;
      case 'engaging':
        return staffMsg.taskEngaging;
      case 'unpaid':
        return staffMsg.taskUnpaid;
      case 'storage_full':
        return staffMsg.taskStorageFull;
      case 'scavenging':
        return formatTemplate(staffMsg.taskScavengingCountdown, { sec: e.taskSec ?? 1 });
      case 'stocked_shelf':
        if (e.taskResourceId) {
          const qty = e.taskQty ?? 1;
          return formatTemplate(staffMsg.taskStockedShelf, {
            qty,
            item: tResourceName(e.taskResourceId, qty),
          });
        }
        return profLoc.defaultTaskLabel;
      case 'stored_excess':
        if (e.taskResourceId) {
          return formatTemplate(staffMsg.taskStoredExcess, {
            item: tResourceName(e.taskResourceId, 1),
          });
        }
        return profLoc.defaultTaskLabel;
      case 'collector_stored':
        if (e.taskResourceId) {
          const qty = e.taskQty ?? 1;
          return formatTemplate(staffMsg.taskCollectorStored, {
            qty,
            item: tResourceName(e.taskResourceId, qty),
          });
        }
        return profLoc.defaultTaskLabel;
      case 'default':
        return profLoc.defaultTaskLabel;
      default:
        return e.taskLabel || profLoc.defaultTaskLabel;
    }
  }

  private resolveLastSalaryNotice(): string | null {
    const tr = getTranslations();
    const meta = this.lastSalaryNoticeMeta;
    if (!meta) return this.lastSalaryNotice;
    switch (meta.kind) {
      case 'paidUnpaidCount':
        return formatTemplate(tr.gameMessages.staff.paidUnpaidCount, {
          count: meta.count,
        });
      case 'stillUnpaidCount':
        return formatTemplate(tr.gameMessages.staff.stillUnpaidCount, {
          count: meta.count,
        });
      case 'unpaidWagesNotice':
        return formatTemplate(tr.gameMessages.toasts.unpaidWagesNotice, {
          unpaid: meta.unpaid,
          paid: meta.paid,
        });
      case 'payrollPaidNotice':
        return formatTemplate(tr.gameMessages.toasts.payrollPaidNotice, {
          amount: formatMoney(meta.amount),
          count: meta.count,
        });
    }
  }

  public getSnapshot(
    employeeCapacity: number,
    completedMissionIds: ReadonlySet<string> = new Set(),
    endingCompleted = false
  ): StaffSnapshot {
    const staffMsg = getTranslations().gameMessages.staff;
    const employeeSummaries: EmployeeSummary[] = this.employees.map((e) => {
      const survLoc = tSurvivor(e.survivorId);
      const profLoc = tProfession(e.profession);
      return {
        id: e.id,
        survivorId: e.survivorId,
        name: survLoc?.name || e.name,
        profession: e.profession,
        professionLabel: profLoc.label,
        status: e.status,
        statusLabel: staffMsg.statusLabels[e.status] ?? e.statusLabel,
        health: Math.round(e.health),
        maxHealth: e.maxHealth,
        salary: e.salary,
        taskLabel: this.resolveEmployeeTaskLabel(e),
        recruitedDay: e.recruitedDay,
        unpaidReason:
          e.status === 'unpaid'
            ? formatTemplate(staffMsg.unpaidReasonNeeds, {
                amount: formatMoney(e.unpaidAmount ?? e.salary),
              })
            : e.unpaidReason,
      };
    });

    const worldSurvivors: WorldSurvivorSummary[] = this.worldSurvivors.map((s) => {
      const survLoc = tSurvivor(s.id);
      return {
        id: s.id,
        name: survLoc?.name ?? s.name,
        locationLabel: survLoc?.locationLabel ?? s.locationLabel,
        dialogue: survLoc?.dialogue ?? s.dialogue,
        storyRemark: getSurvivorStoryRemark(s.id, completedMissionIds, endingCompleted),
        needDescription: survLoc?.needDescription ?? s.needDescription,
        preferredProfession: s.preferredProfession,
        costMoney: s.costMoney,
        costResources: { ...s.costResources },
        recruited: s.recruited,
      };
    });

    return {
      employees: employeeSummaries,
      worldSurvivors,
      employeeCapacity,
      activeGuardCount: this.getTotalGuardCount(),
      maxGuards: this.config.maxGuards,
      activeShopkeeperCount: this.getActiveShopkeeperCount(),
      upcomingSalaryTotal: this.getUpcomingSalaryTotal(),
      salaryIntervalSeconds: this.config.salaryIntervalSeconds,
      nextSalaryInSeconds: Math.max(0, Math.ceil(this.nextSalaryInSeconds)),
      unpaidCount: this.employees.filter((e) => e.status === 'unpaid').length,
      lastSalaryNotice: this.resolveLastSalaryNotice(),
    };
  }
}

export function createInitialStaffSnapshot(employeeCapacity = 1): StaffSnapshot {
  return {
    employees: [],
    worldSurvivors: WORLD_SURVIVOR_SPAWNS.map((s) => {
      const survLoc = tSurvivor(s.id);
      return {
        id: s.id,
        name: survLoc?.name ?? s.name,
        locationLabel: survLoc?.locationLabel ?? s.locationLabel,
        dialogue: survLoc?.dialogue ?? s.dialogue,
        needDescription: survLoc?.needDescription ?? s.needDescription,
        preferredProfession: s.preferredProfession,
        costMoney: s.costMoney,
        costResources: { ...s.costResources },
        recruited: false,
      };
    }),
    employeeCapacity,
    activeGuardCount: 0,
    maxGuards: DEFAULT_STAFF_CONFIG.maxGuards,
    activeShopkeeperCount: 0,
    upcomingSalaryTotal: 0,
    salaryIntervalSeconds: DEFAULT_STAFF_CONFIG.salaryIntervalSeconds,
    nextSalaryInSeconds: DEFAULT_STAFF_CONFIG.salaryIntervalSeconds,
    unpaidCount: 0,
    lastSalaryNotice: null,
  };
}
