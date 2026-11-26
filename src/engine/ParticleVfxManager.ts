import * as THREE from 'three';

const POOL_SIZE = 112;

interface ParticleSlot {
  active: boolean;
  life: number;
  maxLife: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  baseR: number;
  baseG: number;
  baseB: number;
}

function createSoftParticleTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.45, 'rgba(255, 255, 255, 0.65)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Lightweight zero-allocation pooled particle VFX manager (single Points draw call)
 * supporting zombie combat impact bursts, pistol muzzle puffs, electrical sparks,
 * and subtle drifting indoor dust motes scaled by graphics quality preset.
 */
export class ParticleVfxManager {
  private positions: Float32Array;
  private colors: Float32Array;
  private slots: ParticleSlot[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private spriteTex: THREE.CanvasTexture;
  private points: THREE.Points;
  private cursor = 0;
  private sparkTimer = 0;
  private dustTimer = 0;

  constructor(private scene: THREE.Scene) {
    this.positions = new Float32Array(POOL_SIZE * 3);
    this.colors = new Float32Array(POOL_SIZE * 3);
    this.slots = new Array<ParticleSlot>(POOL_SIZE);

    for (let i = 0; i < POOL_SIZE; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = -100;
      this.positions[i * 3 + 2] = 0;
      this.slots[i] = {
        active: false,
        life: 0,
        maxLife: 1,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        baseR: 1,
        baseG: 1,
        baseB: 1,
      };
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    this.spriteTex = createSoftParticleTexture();
    this.material = new THREE.PointsMaterial({
      map: this.spriteTex,
      size: 0.22,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private emitOne(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    gravity: number,
    life: number,
    r: number,
    g: number,
    b: number
  ): void {
    const idx = this.cursor;
    this.cursor = (this.cursor + 1) % POOL_SIZE;
    const s = this.slots[idx];
    s.active = true;
    s.life = life;
    s.maxLife = life;
    s.vx = vx;
    s.vy = vy;
    s.vz = vz;
    s.gravity = gravity;
    s.baseR = r;
    s.baseG = g;
    s.baseB = b;

    const pIdx = idx * 3;
    this.positions[pIdx] = x;
    this.positions[pIdx + 1] = y;
    this.positions[pIdx + 2] = z;
    this.colors[pIdx] = r;
    this.colors[pIdx + 1] = g;
    this.colors[pIdx + 2] = b;
  }

  public spawnHitBurst(
    x: number,
    y: number,
    z: number,
    crit: boolean,
    quality: 'low' | 'medium' | 'high'
  ): void {
    const count = quality === 'low' ? 4 : quality === 'medium' ? 8 : 13;
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.1 + Math.random() * 2.5;
      const isBlood = i < Math.ceil(count * 0.72);
      this.emitOne(
        x + (Math.random() - 0.5) * 0.22,
        y + (Math.random() - 0.5) * 0.24,
        z + (Math.random() - 0.5) * 0.22,
        Math.cos(ang) * spd,
        0.6 + Math.random() * 1.9,
        Math.sin(ang) * spd,
        6.8,
        0.32 + Math.random() * 0.22,
        isBlood ? (crit ? 0.85 : 0.58) : 0.45,
        isBlood ? 0.08 : 0.43,
        isBlood ? 0.08 : 0.4
      );
    }
  }

  public spawnMuzzlePuff(
    playerX: number,
    playerEyeY: number,
    playerZ: number,
    yaw: number,
    pitch: number,
    quality: 'low' | 'medium' | 'high'
  ): void {
    if (quality === 'low') return;
    const fx = -Math.sin(yaw) * Math.cos(pitch);
    const fy = Math.sin(pitch);
    const fz = -Math.cos(yaw) * Math.cos(pitch);
    const rx = Math.cos(yaw);
    const rz = -Math.sin(yaw);

    const mx = playerX + fx * 0.72 + rx * 0.18;
    const my = playerEyeY + fy * 0.72 - 0.14;
    const mz = playerZ + fz * 0.72 + rz * 0.18;

    const count = quality === 'medium' ? 4 : 7;
    for (let i = 0; i < count; i++) {
      const spread = 0.9;
      this.emitOne(
        mx,
        my,
        mz,
        fx * (1.8 + Math.random() * 1.6) + (Math.random() - 0.5) * spread,
        fy * 1.5 + 0.35 + (Math.random() - 0.5) * 0.6,
        fz * (1.8 + Math.random() * 1.6) + (Math.random() - 0.5) * spread,
        -0.4,
        0.22 + Math.random() * 0.18,
        i < 2 ? 1.0 : 0.62,
        i < 2 ? 0.78 : 0.6,
        i < 2 ? 0.32 : 0.58
      );
    }
  }

  public spawnElectricalSpark(x: number, y: number, z: number): void {
    for (let i = 0; i < 6; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 0.7 + Math.random() * 1.6;
      this.emitOne(
        x,
        y,
        z,
        Math.cos(ang) * spd,
        0.4 + Math.random() * 1.1,
        Math.sin(ang) * spd,
        8.5,
        0.28 + Math.random() * 0.2,
        1.0,
        0.72 + Math.random() * 0.25,
        0.22
      );
    }
  }

  public update(
    dt: number,
    playerX: number,
    playerZ: number,
    indoors: boolean,
    quality: 'low' | 'medium' | 'high',
    sparkTargets: { x: number; y: number; z: number }[]
  ): void {
    // 1. Ambient indoor dust motes & occasional electrical sparks near damaged lights/relay
    if (quality !== 'low') {
      this.dustTimer += dt;
      const dustInterval = quality === 'high' ? 0.28 : 0.5;
      if (indoors && this.dustTimer >= dustInterval) {
        this.dustTimer = 0;
        this.emitOne(
          playerX + (Math.random() - 0.5) * 7.0,
          0.9 + Math.random() * 1.8,
          playerZ + (Math.random() - 0.5) * 7.0,
          (Math.random() - 0.5) * 0.14,
          0.05 + Math.random() * 0.08,
          (Math.random() - 0.5) * 0.14,
          0,
          1.9 + Math.random() * 1.2,
          0.78,
          0.72,
          0.62
        );
      }

      if (sparkTargets.length > 0) {
        this.sparkTimer += dt;
        const sparkPeriod = quality === 'high' ? 1.85 : 3.2;
        if (this.sparkTimer >= sparkPeriod) {
          this.sparkTimer = 0;
          const pick = sparkTargets[Math.floor(Math.random() * sparkTargets.length)];
          if (Math.hypot(pick.x - playerX, pick.z - playerZ) <= 22) {
            this.spawnElectricalSpark(pick.x, pick.y, pick.z);
          }
        }
      }
    }

    // 2. Step active particle slots
    let dirty = false;
    for (let i = 0; i < POOL_SIZE; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      dirty = true;
      s.life -= dt;
      const pIdx = i * 3;
      if (s.life <= 0) {
        s.active = false;
        this.positions[pIdx + 1] = -100;
        continue;
      }

      s.vy -= s.gravity * dt;
      this.positions[pIdx] += s.vx * dt;
      this.positions[pIdx + 1] += s.vy * dt;
      this.positions[pIdx + 2] += s.vz * dt;

      if (this.positions[pIdx + 1] < 0.03) {
        this.positions[pIdx + 1] = 0.03;
        s.vy = Math.abs(s.vy) * 0.25;
        s.vx *= 0.65;
        s.vz *= 0.65;
      }

      const fade = Math.max(0, s.life / s.maxLife);
      this.colors[pIdx] = s.baseR * fade;
      this.colors[pIdx + 1] = s.baseG * fade;
      this.colors[pIdx + 2] = s.baseB * fade;
    }

    if (dirty) {
      this.geometry.attributes.position.needsUpdate = true;
      this.geometry.attributes.color.needsUpdate = true;
    }
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.spriteTex.dispose();
  }
}
