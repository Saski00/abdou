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

const EYE_HEIGHT = 1.68;
const PLAYER_RADIUS = 0.42;
const WALK_SPEED = 4.5;
const SPRINT_SPEED = 7.4;
const ACCEL = 14.0;
const FRICTION = 11.0;
const GRAVITY = 21.0;
const JUMP_VELOCITY = 6.6;

export class FirstPersonController {
  public position = new THREE.Vector3(0, 0, 0);
  public velocity = new THREE.Vector3(0, 0, 0);

  public yaw = 0;
  public pitch = 0;
  private targetYaw = 0;
  private targetPitch = 0;

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
    pitch = -0.04
  ): void {
    const floorY = this.getGroundHeightAt(x, z, colliders);
    this.position.set(x, floorY, z);
    this.velocity.set(0, 0, 0);
    this.yaw = yaw;
    this.targetYaw = yaw;
    this.pitch = pitch;
    this.targetPitch = pitch;
    this.health = 100;
    this.stamina = 100;
    this.isExhausted = false;
    this.isSprinting = false;
    this.isGrounded = true;
    this.walkCycle = 0;
    this.stepAccum = 0;
    this.bobOffset = 0;
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
    this.syncCamera(0.016, true);
  }

  public triggerDamageFlinch(strength = 1.0): void {
    if (this.prefersReducedMotion) return;
    const s = clamp(strength, 0.3, 1.4);
    const sign = Math.random() > 0.5 ? 1 : -1;
    this.flinchRoll = sign * 0.042 * s;
    this.flinchPitch = 0.022 * s;
  }

  public addRecoilKick(pitchKick = 0.035): void {
    if (this.prefersReducedMotion) return;
    this.flinchPitch = clamp(this.flinchPitch + pitchKick, -0.08, 0.09);
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
    this.targetPitch = clamp(
      this.targetPitch - clamped.dy * touchRate,
      -Math.PI * 0.45,
      Math.PI * 0.45
    );
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
    this.targetPitch = clamp(
      this.targetPitch - dy * baseRate,
      -Math.PI * 0.45,
      Math.PI * 0.45
    );
  };

  public handlePointerLockEvent = (): void => {
    this.onPointerLockChange(this.isPointerLocked());
  };

  public update(
    dt: number,
    colliders: WorldColliders,
    options: { canSprint?: boolean; isResting?: boolean } = {}
  ): void {
    // 1. Smooth camera look interpolation
    this.yaw = THREE.MathUtils.damp(this.yaw, this.targetYaw, 26, dt);
    this.pitch = THREE.MathUtils.damp(this.pitch, this.targetPitch, 26, dt);

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

    // Forward direction in Three.js (-sin(yaw), -cos(yaw)), Right is (cos(yaw), -sin(yaw))
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

    this.velocity.y -= GRAVITY * dt;
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;
    this.position.y += this.velocity.y * dt;

    // 4. Horizontal XZ Collision Resolution (2 passes for crisp corner sliding)
    this.resolveHorizontalCollisions(colliders);

    // 5. Vertical ground & sidewalk curb step-up
    const groundY = this.getGroundHeightAt(this.position.x, this.position.z, colliders);
    if (this.position.y <= groundY) {
      if (!this.isGrounded && this.velocity.y < -3.5) {
        this.sound.playLand();
      }
      this.position.y = groundY;
      this.velocity.y = 0;
      this.isGrounded = true;
    } else if (this.isGrounded && this.position.y - groundY <= 0.22 && this.velocity.y <= 0) {
      // Smoothly step down sidewalk curbs without momentary falling
      this.position.y = THREE.MathUtils.damp(this.position.y, groundY, 24, dt);
    } else {
      this.isGrounded = false;
    }

    // 6. Head-bob & Footsteps
    const actualSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.isGrounded && actualSpeed > 0.6) {
      const cycleRate = wantsSprint ? 13.5 : 9.2;
      this.walkCycle += cycleRate * dt;
      this.stepAccum += actualSpeed * dt;

      const strideDist = wantsSprint ? 1.85 : 1.55;
      if (this.stepAccum >= strideDist) {
        this.stepAccum = 0;
        const onRoad = groundY < 0.05;
        this.sound.playFootstep(wantsSprint, onRoad);
      }

      const targetBob = this.prefersReducedMotion
        ? 0
        : Math.sin(this.walkCycle) * (wantsSprint ? 0.055 : 0.032);
      this.bobOffset = THREE.MathUtils.damp(this.bobOffset, targetBob, 16, dt);
    } else {
      this.bobOffset = THREE.MathUtils.damp(this.bobOffset, 0, 12, dt);
    }

    const targetRestOffset = options.isResting && !hasInput ? -0.42 : 0;
    this.restEyeOffset = THREE.MathUtils.damp(this.restEyeOffset, targetRestOffset, 10, dt);

    this.flinchRoll = THREE.MathUtils.damp(this.flinchRoll, 0, 14, dt);
    this.flinchPitch = THREE.MathUtils.damp(this.flinchPitch, 0, 14, dt);
    if (!this.prefersReducedMotion && this.health <= 32) {
      this.lowHpPhase += dt * 3.4;
    } else {
      this.lowHpPhase = 0;
    }

    this.syncCamera(dt, false);
  }

  private syncCamera(_dt: number, _instant: boolean): void {
    this.camera.position.set(
      this.position.x,
      this.position.y + EYE_HEIGHT + this.bobOffset + this.restEyeOffset,
      this.position.z
    );
    const lowHpSway =
      !this.prefersReducedMotion && this.health <= 32
        ? Math.sin(this.lowHpPhase) * 0.0065 * (1 - this.health / 36)
        : 0;
    this._euler.set(
      clamp(this.pitch + this.flinchPitch, -Math.PI * 0.48, Math.PI * 0.48),
      this.yaw,
      this.flinchRoll + lowHpSway,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(this._euler);
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
