import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import { SIDEWALK_HEIGHT } from '../assets/maps/neighborhoodMap';
import {
  clamp,
  resolveCircleAABB,
  resolveCircleCircle,
  resolveCircleOBB,
  resolveCircleSegment,
} from '../game/collision';
import {
  clampTouchLookDelta,
  computeTouchLookRadiansPerPx,
} from '../game/responsiveLayout';
import { WorldColliders } from './WorldBuilder';

const SHOULDER_ANCHOR_HEIGHT = 1.46;
const THIRD_PERSON_DIST_OUTDOOR = 2.45;
const THIRD_PERSON_DIST_INDOOR = 1.95;
const THIRD_PERSON_RIGHT_OFFSET = 0.28;
const THIRD_PERSON_MIN_DIST = 0.56;
const THIRD_PERSON_WALL_PAD = 0.20;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 7.4;
const ACCEL = 14.0;
const FRICTION = 11.0;
const GRAVITY = 21.0;
const JUMP_VELOCITY = 6.6;

export interface PlayerAnimContext {
  actualSpeed: number;
  normalizedSpeed: number;
  isMoving: boolean;
  isSprinting: boolean;
  isGrounded: boolean;
  isExhausted: boolean;
  isResting: boolean;
  verticalVelocity: number;
  landImpulse: number;
  yawRate: number;
  strafeFactor: number;
  walkCycle: number;
  breathPhase: number;
}

function wrapAngleRad(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function dampAngleRad(current: number, target: number, lambda: number, dt: number): number {
  const diff = wrapAngleRad(target - current);
  return wrapAngleRad(current + diff * (1 - Math.exp(-lambda * Math.max(0, dt))));
}

function intersectRayBox3D(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
  maxDist: number
): number | null {
  let tMin = 0;
  let tMax = maxDist;

  if (Math.abs(dx) < 1e-6) {
    if (ox < minX || ox > maxX) return null;
  } else {
    const inv = 1 / dx;
    let t1 = (minX - ox) * inv;
    let t2 = (maxX - ox) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (Math.abs(dy) < 1e-6) {
    if (oy < minY || oy > maxY) return null;
  } else {
    const inv = 1 / dy;
    let t1 = (minY - oy) * inv;
    let t2 = (maxY - oy) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  if (Math.abs(dz) < 1e-6) {
    if (oz < minZ || oz > maxZ) return null;
  } else {
    const inv = 1 / dz;
    let t1 = (minZ - oz) * inv;
    let t2 = (maxZ - oz) * inv;
    if (t1 > t2) {
      const tmp = t1;
      t1 = t2;
      t2 = tmp;
    }
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return null;
  }

  return tMin <= tMax && tMax >= 0 ? tMin : null;
}

function intersectRayCylinder3D(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  cx: number,
  cz: number,
  radius: number,
  minY: number,
  maxY: number,
  maxDist: number
): number | null {
  const rx = ox - cx;
  const rz = oz - cz;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) {
    if (rx * rx + rz * rz <= radius * radius && oy >= minY && oy <= maxY) {
      return 0;
    }
    return null;
  }
  const b = 2 * (rx * dx + rz * dz);
  const c = rx * rx + rz * rz - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtD = Math.sqrt(disc);
  const inv2a = 0.5 / a;
  const t1 = (-b - sqrtD) * inv2a;
  const t2 = (-b + sqrtD) * inv2a;

  if (t1 >= 0 && t1 <= maxDist) {
    const hitY = oy + dy * t1;
    if (hitY >= minY && hitY <= maxY) return t1;
  }
  if (t2 >= 0 && t2 <= maxDist && t1 < 0) {
    const hitY = oy + dy * t2;
    if (hitY >= minY && hitY <= maxY) return t2;
  }
  return null;
}

function raycastThirdPersonColliders(
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
  pad: number,
  colliders: WorldColliders
): number {
  let closest = maxDist;

  // World outer bounds containment
  if (dx < -1e-5) {
    const t = (colliders.bounds.minX + pad - ox) / dx;
    if (t >= 0 && t < closest) closest = t;
  } else if (dx > 1e-5) {
    const t = (colliders.bounds.maxX - pad - ox) / dx;
    if (t >= 0 && t < closest) closest = t;
  }
  if (dz < -1e-5) {
    const t = (colliders.bounds.minZ + pad - oz) / dz;
    if (t >= 0 && t < closest) closest = t;
  } else if (dz > 1e-5) {
    const t = (colliders.bounds.maxZ - pad - oz) / dz;
    if (t >= 0 && t < closest) closest = t;
  }

  // Boxes (buildings, walls, vehicles, furniture, crates)
  for (let i = 0; i < colliders.boxes.length; i++) {
    const b = colliders.boxes[i];
    if (b.active === false || b.ignoreCamera) continue;
    const minY = (b.minY ?? -2) - pad * 0.5;
    const maxY = (b.maxY ?? 12) + pad * 0.5;
    if (Math.abs(b.rotationY) < 0.001) {
      const hw = b.w * 0.5 + pad;
      const hd = b.d * 0.5 + pad;
      const t = intersectRayBox3D(
        ox,
        oy,
        oz,
        dx,
        dy,
        dz,
        b.x - hw,
        b.x + hw,
        minY,
        maxY,
        b.z - hd,
        b.z + hd,
        closest
      );
      if (t !== null && t < closest) closest = t;
    } else {
      const cos = Math.cos(b.rotationY);
      const sin = Math.sin(b.rotationY);
      const rx = ox - b.x;
      const rz = oz - b.z;
      const lox = rx * cos - rz * sin;
      const loz = rx * sin + rz * cos;
      const ldx = dx * cos - dz * sin;
      const ldz = dx * sin + dz * cos;
      const hw = b.w * 0.5 + pad;
      const hd = b.d * 0.5 + pad;
      const t = intersectRayBox3D(
        lox,
        oy,
        loz,
        ldx,
        dy,
        ldz,
        -hw,
        hw,
        minY,
        maxY,
        -hd,
        hd,
        closest
      );
      if (t !== null && t < closest) closest = t;
    }
  }

  // Vertical fence/door segments
  for (let i = 0; i < colliders.segments.length; i++) {
    const s = colliders.segments[i];
    if (s.active === false || s.ignoreCamera) continue;
    const vx = s.x2 - s.x1;
    const vz = s.z2 - s.z1;
    const len = Math.hypot(vx, vz);
    if (len < 0.01) continue;
    const ux = vx / len;
    const uz = vz / len;
    const cx = (s.x1 + s.x2) * 0.5;
    const cz = (s.z1 + s.z2) * 0.5;
    const rx = ox - cx;
    const rz = oz - cz;
    const lox = rx * ux + rz * uz;
    const loz = -rx * uz + rz * ux;
    const ldx = dx * ux + dz * uz;
    const ldz = -dx * uz + dz * ux;
    const hw = len * 0.5 + pad;
    const hd = s.halfThickness + pad;
    const minY = (s.minY ?? -2) - pad * 0.5;
    const maxY = (s.maxY ?? 12) + pad * 0.5;
    const t = intersectRayBox3D(lox, oy, loz, ldx, dy, ldz, -hw, hw, minY, maxY, -hd, hd, closest);
    if (t !== null && t < closest) closest = t;
  }

  // Cylindrical props (trees, boulders, street lamps)
  for (let i = 0; i < colliders.circles.length; i++) {
    const c = colliders.circles[i];
    if (c.ignoreCamera) continue;
    const minY = (c.minY ?? -2) - pad * 0.5;
    const maxY = (c.maxY ?? 12) + pad * 0.5;
    const t = intersectRayCylinder3D(
      ox,
      oy,
      oz,
      dx,
      dy,
      dz,
      c.x,
      c.z,
      c.radius + pad * 0.85,
      minY,
      maxY,
      closest
    );
    if (t !== null && t < closest) closest = t;
  }

  return closest;
}

export class FirstPersonController {
  public position = new THREE.Vector3(0, 0, 0);
  public velocity = new THREE.Vector3(0, 0, 0);

  public yaw = 0;
  public pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;
  private characterYaw = 0;
  private aimLockTimer = 0;

  // Third-person camera smoothing state
  private camAnchor = new THREE.Vector3(0, SHOULDER_ANCHOR_HEIGHT, 0);
  private currentCameraDist = THIRD_PERSON_DIST_OUTDOOR;
  private currentRightOffset = THIRD_PERSON_RIGHT_OFFSET;
  private lastCameraDist = THIRD_PERSON_DIST_OUTDOOR;

  public health = 100;
  public maxHealth = 100;
  public stamina = 100;
  public maxStamina = 100;
  public isExhausted = false;
  public isSprinting = false;
  public isGrounded = true;

  private walkCycle = 0;
  private stepAccum = 0;
  private bobOffset = 0;
  private bobSwayX = 0;
  private breathPhase = 0;
  private landImpulse = 0;
  private landBobOffset = 0;
  private strafeRoll = 0;
  private yawRate = 0;
  private actualMoveSpeed = 0;
  private strafeFactor = 0;
  private isRestingPose = false;
  private sensitivity = 1.0;
  private prefersReducedMotion = false;

  private heldKeys = new Set<string>();
  private jumpRequested = false;
  private isDraggingLook = false;
  private lastPointerX = 0;
  private lastPointerY = 0;

  private touchMoveX = 0;
  private touchMoveY = 0;
  private touchSprint = false;
  private jumpCountSincePoll = 0;
  private restEyeOffset = 0;
  private flinchRoll = 0;
  private flinchPitch = 0;
  private lowHpPhase = 0;

  private readonly _euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private readonly _aimDir = new THREE.Vector3(0, 0, -1);
  private readonly _animContext: PlayerAnimContext = {
    actualSpeed: 0,
    normalizedSpeed: 0,
    isMoving: false,
    isSprinting: false,
    isGrounded: true,
    isExhausted: false,
    isResting: false,
    verticalVelocity: 0,
    landImpulse: 0,
    yawRate: 0,
    strafeFactor: 0,
    walkCycle: 0,
    breathPhase: 0,
  };

  constructor(
    private camera: THREE.PerspectiveCamera,
    private domElement: HTMLElement,
    private sound: SoundEngine,
    private onPointerLockChange: (locked: boolean) => void
  ) {
    if (typeof window !== 'undefined' && window.matchMedia) {
      this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    this.camera.rotation.order = 'YXZ';
  }

  public spawnAt(
    x: number,
    z: number,
    yaw: number,
    colliders: WorldColliders,
    pitch = -0.14
  ): void {
    const floorY = this.getGroundHeightAt(x, z, colliders);
    this.position.set(x, floorY, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.targetYaw = yaw;
    this.characterYaw = yaw;
    this.aimLockTimer = 0;
    this.pitch = clamp(pitch, -0.68, 0.56);
    this.targetPitch = this.pitch;
    this.camAnchor.set(x, floorY + SHOULDER_ANCHOR_HEIGHT, z);
    this.currentCameraDist = THIRD_PERSON_DIST_OUTDOOR;
    this.currentRightOffset = THIRD_PERSON_RIGHT_OFFSET;
    this.lastCameraDist = THIRD_PERSON_DIST_OUTDOOR;
    this.health = 100;
    this.stamina = 100;
    this.isExhausted = false;
    this.isSprinting = false;
    this.isGrounded = true;
    this.walkCycle = 0;
    this.stepAccum = 0;
    this.bobOffset = 0;
    this.bobSwayX = 0;
    this.breathPhase = 0;
    this.landImpulse = 0;
    this.landBobOffset = 0;
    this.strafeRoll = 0;
    this.yawRate = 0;
    this.actualMoveSpeed = 0;
    this.strafeFactor = 0;
    this.isRestingPose = false;
    this.heldKeys.clear();
    this.jumpRequested = false;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprint = false;
    this.jumpCountSincePoll = 0;
    this.restEyeOffset = 0;
    this.flinchRoll = 0;
    this.flinchPitch = 0;
    this.lowHpPhase = 0;
    this.syncThirdPersonCamera(0.016, true, colliders);
  }

  public getCharacterYaw(): number {
    return this.characterYaw;
  }

  public notifyAimAction(durationSec = 1.25): void {
    this.aimLockTimer = Math.max(this.aimLockTimer, durationSec);
  }

  public getCameraDistance(): number {
    return this.lastCameraDist;
  }

  public getAimDirection(out = this._aimDir): THREE.Vector3 {
    const cosPitch = Math.cos(this.pitch);
    out.set(
      -Math.sin(this.yaw) * cosPitch,
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * cosPitch
    );
    return out;
  }

  public getAnimContext(): PlayerAnimContext {
    this._animContext.actualSpeed = this.actualMoveSpeed;
    this._animContext.normalizedSpeed = clamp(this.actualMoveSpeed / SPRINT_SPEED, 0, 1);
    this._animContext.isMoving = this.actualMoveSpeed > 0.35;
    this._animContext.isSprinting = this.isSprinting && this.actualMoveSpeed > WALK_SPEED * 0.85;
    this._animContext.isGrounded = this.isGrounded;
    this._animContext.isExhausted = this.isExhausted;
    this._animContext.isResting = this.isRestingPose;
    this._animContext.verticalVelocity = this.velocity.y;
    this._animContext.landImpulse = this.landImpulse;
    this._animContext.yawRate = this.yawRate;
    this._animContext.strafeFactor = this.strafeFactor;
    this._animContext.walkCycle = this.walkCycle;
    this._animContext.breathPhase = this.breathPhase;
    return this._animContext;
  }

  public triggerDamageFlinch(strength = 1.0): void {
    if (this.prefersReducedMotion) return;
    const s = clamp(strength, 0.3, 1.4);
    const sign = Math.random() > 0.5 ? 1 : -1;
    this.flinchRoll = sign * 0.035 * s;
    this.flinchPitch = 0.018 * s;
  }

  public addRecoilKick(pitchKick = 0.035): void {
    if (this.prefersReducedMotion) return;
    this.flinchPitch = clamp(this.flinchPitch + pitchKick * 0.72, -0.07, 0.08);
  }

  public spendStamina(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.stamina = Math.max(0, this.stamina - amount);
    if (this.stamina <= 0.5) {
      this.isExhausted = true;
    }
  }

  public restoreStamina(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    if (this.isExhausted && this.stamina >= 25) {
      this.isExhausted = false;
    }
  }

  public setSensitivity(sens: number): void {
    this.sensitivity = clamp(sens, 0.3, 2.5);
  }

  public setTouchMove(x: number, y: number, sprint: boolean): void {
    this.touchMoveX = clamp(x, -1, 1);
    this.touchMoveY = clamp(y, -1, 1);
    this.touchSprint = sprint;
  }

  public addTouchLookDelta(dx: number, dy: number): void {
    const clamped = clampTouchLookDelta(dx, dy);
    if (clamped.dx === 0 && clamped.dy === 0) return;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 390;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 844;
    const touchRate = computeTouchLookRadiansPerPx(vw, vh, this.sensitivity);
    this.targetYaw -= clamped.dx * touchRate;
    this.targetPitch = clamp(this.targetPitch - clamped.dy * touchRate, -0.68, 0.56);
  }

  public triggerJump(): void {
    this.jumpRequested = true;
  }

  public clearInputs(): void {
    this.heldKeys.clear();
    this.jumpRequested = false;
    this.isDraggingLook = false;
    this.touchMoveX = 0;
    this.touchMoveY = 0;
    this.touchSprint = false;
  }

  public consumeJumpCount(): number {
    const count = this.jumpCountSincePoll;
    this.jumpCountSincePoll = 0;
    return count;
  }

  public hasMovementIntent(): boolean {
    if (this.jumpRequested) return true;
    if (Math.hypot(this.touchMoveX, this.touchMoveY) > 0.08) return true;
    return (
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('KeyS') ||
      this.heldKeys.has('KeyA') ||
      this.heldKeys.has('KeyD') ||
      this.heldKeys.has('ArrowUp') ||
      this.heldKeys.has('ArrowDown') ||
      this.heldKeys.has('ArrowLeft') ||
      this.heldKeys.has('ArrowRight')
    );
  }

  public isActivelyMoving(): boolean {
    return Math.hypot(this.velocity.x, this.velocity.z) > 0.4;
  }

  public requestPointerLock(): void {
    try {
      if (document.pointerLockElement !== this.domElement && this.domElement.requestPointerLock) {
        const res = this.domElement.requestPointerLock() as unknown as Promise<void> | undefined;
        if (res && typeof res.catch === 'function') {
          res.catch(() => {
            // Pointer lock may be blocked in embedded previews; drag-to-look remains active
          });
        }
      }
    } catch {
      // Fallback drag-to-look remains active
    }
  }

  public exitPointerLock(): void {
    try {
      if (document.pointerLockElement === this.domElement && document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch {
      // Ignore
    }
  }

  public isPointerLocked(): boolean {
    return document.pointerLockElement === this.domElement;
  }

  public handleKeyDown(e: KeyboardEvent, isPlaying: boolean): void {
    if (!isPlaying) return;
    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }

    if (e.code === 'Space' && !e.repeat) {
      this.jumpRequested = true;
    }

    this.heldKeys.add(e.code);
  }

  public handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.code);
  }

  public handleMouseDown = (e: MouseEvent, isPlaying: boolean): void => {
    if (!isPlaying) return;
    const cap = (e as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities;
    if (cap?.firesTouchEvents) return;
    if (e.button === 0) {
      this.sound.unlock();
      this.sound.startAmbience();
      this.requestPointerLock();
      this.isDraggingLook = true;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }
  };

  public handleMouseUp = (): void => {
    this.isDraggingLook = false;
  };

  public handleMouseMove = (e: MouseEvent, isPlaying: boolean): void => {
    if (!isPlaying) return;
    const locked = this.isPointerLocked();
    if (!locked && !this.isDraggingLook) return;

    let dx = 0;
    let dy = 0;
    if (locked) {
      dx = e.movementX || 0;
      dy = e.movementY || 0;
    } else {
      dx = e.clientX - this.lastPointerX;
      dy = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    }

    const baseRate = 0.0022 * this.sensitivity;
    this.targetYaw -= dx * baseRate;
    this.targetPitch = clamp(this.targetPitch - dy * baseRate, -0.68, 0.56);
  };

  public handlePointerLockEvent = (): void => {
    this.onPointerLockChange(this.isPointerLocked());
  };

  public update(
    dt: number,
    colliders: WorldColliders,
    options: { canSprint?: boolean; isResting?: boolean } = {}
  ): void {
    const safeDt = Math.max(0.0001, dt);
    const prevYaw = this.yaw;

    // 1. Smooth camera orbit look interpolation & angular velocity tracking
    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 26, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 26, dt);
    const rawYawRate = clamp((this.yaw - prevYaw) / safeDt, -6.5, 6.5);
    this.yawRate = THREE.MathUtils.damp(this.yawRate, rawYawRate, 14, dt);
    if (this.aimLockTimer > 0) {
      this.aimLockTimer = Math.max(0, this.aimLockTimer - dt);
    }

    // 2. Movement input in horizontal camera plane (WASD/Arrows + analog touch joystick)
    let forwardInput = this.touchMoveY;
    let rightInput = this.touchMoveX;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) forwardInput += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) forwardInput -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) rightInput += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) rightInput -= 1;

    const inputMag = Math.hypot(forwardInput, rightInput);
    const hasInput = inputMag > 0.06;
    const fDir = hasInput ? forwardInput / inputMag : 0;
    const rDir = hasInput ? rightInput / inputMag : 0;
    const speedScale = hasInput ? Math.min(1, inputMag) : 0;

    // Stamina & Sprint
    const keySprint = this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight');
    const canSprint = options.canSprint !== false;
    const wantsSprint =
      canSprint &&
      hasInput &&
      (keySprint || this.touchSprint) &&
      !this.isExhausted &&
      this.stamina > 1;

    this.isSprinting = wantsSprint;
    if (wantsSprint) {
      this.stamina = Math.max(0, this.stamina - 22 * dt);
      if (this.stamina <= 0.5) {
        this.isExhausted = true;
      }
    } else {
      const regen = hasInput ? 12 : 20;
      this.stamina = Math.min(this.maxStamina, this.stamina + regen * dt);
      if (this.isExhausted && this.stamina >= 25) {
        this.isExhausted = false;
      }
    }

    const speed = (wantsSprint ? SPRINT_SPEED : WALK_SPEED) * speedScale;
    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);

    // Camera-relative horizontal forward (-sin(yaw), -cos(yaw)), right (cos(yaw), -sin(yaw))
    const moveDirX = -sinY * fDir + cosY * rDir;
    const moveDirZ = -cosY * fDir - sinY * rDir;

    const targetVx = moveDirX * speed;
    const targetVz = moveDirZ * speed;

    const accelFactor = hasInput ? 1 - Math.exp(-ACCEL * dt) : 1 - Math.exp(-FRICTION * dt);
    this.velocity.x += (targetVx - this.velocity.x) * accelFactor;
    this.velocity.z += (targetVz - this.velocity.z) * accelFactor;

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (!hasInput && horizSpeed < 0.08) {
      this.velocity.x = 0;
      this.velocity.z = 0;
    }

    // 3. Jump & Gravity
    if (this.jumpRequested) {
      this.jumpRequested = false;
      if (this.isGrounded) {
        this.velocity.y = JUMP_VELOCITY;
        this.isGrounded = false;
        this.jumpCountSincePoll += 1;
        this.sound.playJump();
      }
    }

    const prevX = this.position.x;
    const prevZ = this.position.z;

    this.velocity.y -= GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // 4. Horizontal XZ Collision Resolution (2 passes for crisp corner sliding)
    this.resolveHorizontalCollisions(colliders);

    const actualMoved = Math.hypot(this.position.x - prevX, this.position.z - prevZ);
    const rawActualSpeed = actualMoved / safeDt;
    this.actualMoveSpeed = THREE.MathUtils.damp(this.actualMoveSpeed, rawActualSpeed, 18, dt);
    if (this.actualMoveSpeed < 0.04 && !hasInput) {
      this.actualMoveSpeed = 0;
    }

    // Smooth character body facing:
    // - Align to camera aim when actively firing/interacting/reloading (aimLockTimer > 0)
    // - Otherwise smoothly turn toward camera-relative travel direction while moving
    if (this.aimLockTimer > 0) {
      this.characterYaw = dampAngleRad(this.characterYaw, this.yaw, 16, dt);
    } else if (hasInput && Math.hypot(moveDirX, moveDirZ) > 0.1) {
      const moveYaw = Math.atan2(-moveDirX, -moveDirZ);
      this.characterYaw = dampAngleRad(this.characterYaw, moveYaw, 11, dt);
    }

    // Lateral velocity projection onto camera right vector for subtle turn/strafe banking
    const rightVel = this.velocity.x * cosY - this.velocity.z * sinY;
    const targetStrafe = clamp(rightVel / WALK_SPEED, -1, 1);
    this.strafeFactor = THREE.MathUtils.damp(this.strafeFactor, targetStrafe, 12, dt);

    // 5. Vertical ground & sidewalk curb step-up
    const groundY = this.getGroundHeightAt(this.position.x, this.position.z, colliders);
    if (this.position.y <= groundY) {
      if (!this.isGrounded && this.velocity.y < -2.2) {
        const impactStrength = clamp((-this.velocity.y - 2.0) / 7.5, 0.2, 1.0);
        this.landImpulse = Math.max(this.landImpulse, impactStrength);
        if (this.velocity.y < -3.5) {
          this.sound.playLand();
        }
      }
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else if (this.isGrounded && this.position.y - groundY <= 0.22 && this.velocity.y <= 0) {
      this.position.y = THREE.MathUtils.damp(this.position.y, groundY, 24, dt);
    } else {
      this.isGrounded = false;
    }

    // 6. Breathing, Velocity-Coupled Step Cycle, Landing Cushion & Footsteps
    const isRestingIdle = Boolean(options.isResting) && !hasInput;
    this.isRestingPose = isRestingIdle;
    const breathRate = isRestingIdle ? 1.5 : this.isExhausted ? 3.8 : 2.1;
    this.breathPhase += dt * breathRate;

    this.landImpulse = THREE.MathUtils.damp(this.landImpulse, 0, 10, dt);
    const targetLandDip = this.prefersReducedMotion ? 0 : -this.landImpulse * 0.115;
    this.landBobOffset = THREE.MathUtils.damp(this.landBobOffset, targetLandDip, 18, dt);

    const speedRatio = clamp(this.actualMoveSpeed / SPRINT_SPEED, 0, 1);
    if (this.isGrounded && this.actualMoveSpeed > 0.45) {
      const radsPerMeter = wantsSprint ? 1.88 : 2.15;
      this.walkCycle += actualMoved * radsPerMeter;
      this.stepAccum += actualMoved;

      const strideDist = wantsSprint ? 1.85 : 1.55;
      if (this.stepAccum >= strideDist) {
        this.stepAccum = 0;
        const onRoad = groundY < 0.05;
        this.sound.playFootstep(wantsSprint, onRoad);
      }

      const amp = wantsSprint ? 0.056 : 0.032 * clamp(this.actualMoveSpeed / WALK_SPEED, 0.25, 1);
      const targetBob = this.prefersReducedMotion ? 0 : Math.sin(this.walkCycle) * amp;
      const targetSwayX = this.prefersReducedMotion ? 0 : Math.cos(this.walkCycle * 0.5) * amp * 0.42;
      this.bobOffset = THREE.MathUtils.damp(this.bobOffset, targetBob, 16, dt);
      this.bobSwayX = THREE.MathUtils.damp(this.bobSwayX, targetSwayX, 14, dt);
    } else {
      const idleBreathY = this.prefersReducedMotion
        ? 0
        : Math.sin(this.breathPhase) * (this.isExhausted ? 0.011 : 0.0045);
      this.bobOffset = THREE.MathUtils.damp(this.bobOffset, idleBreathY, 10, dt);
      this.bobSwayX = THREE.MathUtils.damp(this.bobSwayX, 0, 12, dt);
    }

    const targetStrafeRoll = this.prefersReducedMotion
      ? 0
      : -this.strafeFactor * (0.008 + speedRatio * 0.006) - clamp(this.yawRate * 0.0025, -0.01, 0.01);
    this.strafeRoll = THREE.MathUtils.damp(this.strafeRoll, targetStrafeRoll, 12, dt);

    const targetRestOffset = isRestingIdle ? -0.34 : 0;
    this.restEyeOffset = THREE.MathUtils.damp(this.restEyeOffset, targetRestOffset, 10, dt);

    this.flinchRoll = THREE.MathUtils.damp(this.flinchRoll, 0, 14, dt);
    this.flinchPitch = THREE.MathUtils.damp(this.flinchPitch, 0, 14, dt);
    if (!this.prefersReducedMotion && this.health <= 32) {
      this.lowHpPhase += dt * 3.4;
    } else {
      this.lowHpPhase = 0;
    }

    this.syncThirdPersonCamera(dt, false, colliders);
  }

  public syncThirdPersonCamera(
    dt: number,
    instant: boolean,
    colliders: WorldColliders
  ): void {
    const targetAnchorY =
      this.position.y +
      SHOULDER_ANCHOR_HEIGHT +
      this.bobOffset * 0.4 +
      this.landBobOffset * 0.55 +
      this.restEyeOffset * 0.5;

    if (instant) {
      this.camAnchor.set(this.position.x, targetAnchorY, this.position.z);
    } else {
      this.camAnchor.x = THREE.MathUtils.damp(this.camAnchor.x, this.position.x, 20, dt);
      this.camAnchor.y = THREE.MathUtils.damp(this.camAnchor.y, targetAnchorY, 16, dt);
      this.camAnchor.z = THREE.MathUtils.damp(this.camAnchor.z, this.position.z, 20, dt);
    }

    const cosY = Math.cos(this.yaw);
    const sinY = Math.sin(this.yaw);
    const cosP = Math.cos(this.pitch);
    const sinP = Math.sin(this.pitch);

    // Aim direction vector from camera toward reticle
    const aimX = -sinY * cosP;
    const aimY = sinP;
    const aimZ = -cosY * cosP;

    // Right vector perpendicular to camera yaw
    const rightX = cosY;
    const rightZ = -sinY;

    // 1. Check horizontal shoulder clearance so camera never pushes right through an adjacent wall
    const shoulderClear = raycastThirdPersonColliders(
      this.camAnchor.x,
      this.camAnchor.y,
      this.camAnchor.z,
      rightX,
      0,
      rightZ,
      THIRD_PERSON_RIGHT_OFFSET + 0.16,
      0.06,
      colliders
    );
    const allowedRight = clamp(shoulderClear - 0.16, 0, THIRD_PERSON_RIGHT_OFFSET);
    if (instant) {
      this.currentRightOffset = allowedRight;
    } else {
      const rLambda = allowedRight < this.currentRightOffset ? 22 : 10;
      this.currentRightOffset = THREE.MathUtils.damp(
        this.currentRightOffset,
        allowedRight,
        rLambda,
        dt
      );
    }

    const sx = this.camAnchor.x + rightX * this.currentRightOffset;
    const sy = this.camAnchor.y;
    const sz = this.camAnchor.z + rightZ * this.currentRightOffset;

    // Tighter base follow distance when inside buildings for comfortable corridor navigation
    const isIndoors = this.isPointInsideBuilding(this.position.x, this.position.z, colliders);
    const desiredDist = isIndoors ? THIRD_PERSON_DIST_INDOOR : THIRD_PERSON_DIST_OUTDOOR;

    // 2. Raycast backward (-aimDir) from shoulder anchor against world geometry
    const backX = -aimX;
    const backY = -aimY;
    const backZ = -aimZ;

    const hitDist = raycastThirdPersonColliders(
      sx,
      sy,
      sz,
      backX,
      backY,
      backZ,
      desiredDist + THIRD_PERSON_WALL_PAD,
      0.06,
      colliders
    );

    let targetDist = clamp(hitDist - THIRD_PERSON_WALL_PAD, THIRD_PERSON_MIN_DIST, desiredDist);

    // 3. Respect ground/sidewalk floor and interior ceiling along the backward ray
    const candX = sx + backX * targetDist;
    const candZ = sz + backZ * targetDist;
    const groundAtCam = this.getGroundHeightAt(candX, candZ, colliders) + 0.28;
    const ceilAtCam = this.getCeilingHeightAt(candX, candZ, colliders);
    const candY = sy + backY * targetDist;

    if (candY < groundAtCam && backY < -1e-4) {
      const distGround = (groundAtCam - sy) / backY;
      targetDist = clamp(Math.min(targetDist, distGround), THIRD_PERSON_MIN_DIST, desiredDist);
    }
    if (ceilAtCam !== null && candY > ceilAtCam - 0.18 && backY > 1e-4) {
      const distCeil = (ceilAtCam - 0.18 - sy) / backY;
      targetDist = clamp(Math.min(targetDist, distCeil), THIRD_PERSON_MIN_DIST, desiredDist);
    }

    if (instant) {
      this.currentCameraDist = targetDist;
    } else {
      const dLambda = targetDist < this.currentCameraDist ? 28 : 8;
      this.currentCameraDist = THREE.MathUtils.damp(
        this.currentCameraDist,
        targetDist,
        dLambda,
        dt
      );
    }

    let camX = sx + backX * this.currentCameraDist;
    let camY = sy + backY * this.currentCameraDist;
    let camZ = sz + backZ * this.currentCameraDist;

    // Final hard floor/ceiling safety clamp at exact resolved camera coordinates
    const finalGroundY = this.getGroundHeightAt(camX, camZ, colliders) + 0.28;
    if (camY < finalGroundY) camY = finalGroundY;
    const finalCeilY = this.getCeilingHeightAt(camX, camZ, colliders);
    if (finalCeilY !== null && camY > finalCeilY - 0.18) {
      camY = finalCeilY - 0.18;
    }
    camX = clamp(camX, colliders.bounds.minX + 0.2, colliders.bounds.maxX - 0.2);
    camZ = clamp(camZ, colliders.bounds.minZ + 0.2, colliders.bounds.maxZ - 0.2);

    this.camera.position.set(camX, camY, camZ);
    this.lastCameraDist = Math.hypot(
      camX - this.position.x,
      camY - (this.position.y + SHOULDER_ANCHOR_HEIGHT),
      camZ - this.position.z
    );

    const lowHpSway =
      !this.prefersReducedMotion && this.health <= 32
        ? Math.sin(this.lowHpPhase) * 0.0055 * (1 - this.health / 36)
        : 0;
    this._euler.set(
      clamp(this.pitch + this.flinchPitch - this.landImpulse * 0.012, -0.72, 0.60),
      this.yaw,
      this.flinchRoll + this.strafeRoll * 0.45 + lowHpSway,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(this._euler);
  }

  private isPointInsideBuilding(x: number, z: number, colliders: WorldColliders): boolean {
    if (!colliders.floors) return false;
    for (let i = 0; i < colliders.floors.length; i++) {
      const fl = colliders.floors[i];
      if (fl.active === false) continue;
      if (x >= fl.minX && x <= fl.maxX && z >= fl.minZ && z <= fl.maxZ) {
        return true;
      }
    }
    return false;
  }

  private getCeilingHeightAt(x: number, z: number, colliders: WorldColliders): number | null {
    if (!colliders.ceilings) return null;
    for (let i = 0; i < colliders.ceilings.length; i++) {
      const cl = colliders.ceilings[i];
      if (cl.active === false) continue;
      if (x >= cl.minX && x <= cl.maxX && z >= cl.minZ && z <= cl.maxZ) {
        return cl.height;
      }
    }
    return null;
  }

  private getGroundHeightAt(x: number, z: number, colliders: WorldColliders): number {
    if (colliders.floors) {
      for (const fl of colliders.floors) {
        if (fl.active === false) continue;
        if (x >= fl.minX && x <= fl.maxX && z >= fl.minZ && z <= fl.maxZ) {
          return fl.height;
        }
      }
    }
    for (const sw of colliders.sidewalks) {
      if (x >= sw.minX && x <= sw.maxX && z >= sw.minZ && z <= sw.maxZ) {
        return SIDEWALK_HEIGHT;
      }
    }
    return 0;
  }

  private resolveHorizontalCollisions(colliders: WorldColliders): void {
    const r = PLAYER_RADIUS;

    for (let pass = 0; pass < 2; pass++) {
      this.position.x = clamp(
        this.position.x,
        colliders.bounds.minX + r,
        colliders.bounds.maxX - r
      );
      this.position.z = clamp(
        this.position.z,
        colliders.bounds.minZ + r,
        colliders.bounds.maxZ - r
      );

      // Boxes (buildings, rotated vehicles, dumpsters, crates, barriers)
      for (const b of colliders.boxes) {
        if (b.active === false) continue;
        if (Math.abs(b.rotationY) < 0.001) {
          const res = resolveCircleAABB(
            this.position.x,
            this.position.z,
            r,
            b.x - b.w * 0.5,
            b.z - b.d * 0.5,
            b.w,
            b.d
          );
          this.position.x = res.x;
          this.position.z = res.y;
        } else {
          // Three.js Y-rotation maps to negative 2D angle in XZ plane
          const res = resolveCircleOBB(
            this.position.x,
            this.position.z,
            r,
            b.x,
            b.z,
            b.w,
            b.d,
            -b.rotationY
          );
          this.position.x = res.x;
          this.position.z = res.y;
        }
      }

      // Fences & Closed Gates
      for (const f of colliders.segments) {
        if (f.active === false) continue;
        const res = resolveCircleSegment(
          this.position.x,
          this.position.z,
          r,
          f.x1,
          f.z1,
          f.x2,
          f.z2,
          f.halfThickness
        );
        this.position.x = res.x;
        this.position.z = res.y;
      }

      // Circles (lamp posts, hydrants, rubble, shrubs)
      for (const c of colliders.circles) {
        const res = resolveCircleCircle(this.position.x, this.position.z, r, c.x, c.z, c.radius);
        this.position.x = res.x;
        this.position.z = res.y;
      }
    }
  }
}
