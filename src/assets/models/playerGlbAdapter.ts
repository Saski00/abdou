import * as THREE from 'three';
import { WeaponId } from '../../game/types';
import { PlayerAnimContext } from '../../engine/FirstPersonController';
import { damp } from './characterGeometryKit';
import {
  buildFirstPersonCombatBlade,
  buildFirstPersonMeleePipe,
  buildFirstPersonServicePistol,
} from './zombieModel';

export interface GlbPlayerInfo {
  modelUrl: string;
  meshCount: number;
  vertexCount: number;
  triangleCount: number;
  lod1TriangleCount: number;
  materialGroups: string[];
  hasSkeleton: boolean;
  boneCount: number;
  animationClipCount: number;
  heightMeters: number;
}

export interface PlayerBoneRig {
  hips: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  upperArmL: THREE.Bone;
  forearmL: THREE.Bone;
  handL: THREE.Bone;
  upperArmR: THREE.Bone;
  forearmR: THREE.Bone;
  handR: THREE.Bone;
  thighL: THREE.Bone;
  shinL: THREE.Bone;
  footL: THREE.Bone;
  thighR: THREE.Bone;
  shinR: THREE.Bone;
  footR: THREE.Bone;
  skeleton: THREE.Skeleton;
  hipsRestY: number;
}

export interface PlayerGlbRig {
  root: THREE.Group;
  motionPivot: THREE.Group;
  facingPivot: THREE.Group;
  modelHolder: THREE.Group;
  lod: THREE.LOD;
  highMesh: THREE.SkinnedMesh;
  lowMesh: THREE.SkinnedMesh;
  bones: PlayerBoneRig;
  materials: THREE.MeshStandardMaterial[];
  weaponAnchor: THREE.Group;
  pipeProp: ReturnType<typeof buildFirstPersonMeleePipe>;
  bladeProp: ReturnType<typeof buildFirstPersonCombatBlade>;
  pistolProp: ReturnType<typeof buildFirstPersonServicePistol>;
  shadowDisc: THREE.Mesh;
  shadowMat: THREE.MeshBasicMaterial;
  info: GlbPlayerInfo;
  // Single-writer procedural locomotion & animation state channels
  curFacingYaw: number;
  walkWeight: number;
  runWeight: number;
  sprintWeight: number;
  airWeight: number;
  restWeight: number;
  aimWeight: number;
  combatReadyWeight: number;
  startAccelImpulse: number;
  stopDecelImpulse: number;
  hitReactionImpulse: number;
  hitSign: number;
  prevHurtFlash: boolean;
  prevWasMoving: boolean;
  prevSpeed: number;
  curWeaponSwing: number;
  curRecoil: number;
  curReloadBlend: number;
  curDeadBlend: number;
  curHitFlash: number;
  // Damped smoothed skeletal channels (ensures snap-free transitions)
  curHipDrop: number;
  curHipSwayX: number;
  curHipTwistY: number;
  curHipTiltZ: number;
  curSpineRx: number;
  curSpineRy: number;
  curSpineRz: number;
  curChestRx: number;
  curChestRy: number;
  curChestRz: number;
  curHeadRx: number;
  curHeadRy: number;
  curHeadRz: number;
  curThighLRx: number;
  curThighRRx: number;
  curThighLRz: number;
  curThighRRz: number;
  curShinLRx: number;
  curShinRRx: number;
  curFootLRx: number;
  curFootRRx: number;
  curArmLRx: number;
  curArmLRy: number;
  curArmLRz: number;
  curForeLRx: number;
  curArmRRx: number;
  curArmRRy: number;
  curArmRRz: number;
  curForeRRx: number;
  curHandRRx: number;
  curHandRRy: number;
  curHandRRz: number;
  lastEquippedWeapon: WeaponId;
  dispose: () => void;
}

const MAT_SKIN = 0;
const MAT_HAIR = 1;
const MAT_JACKET = 2;
const MAT_SHIRT = 3;
const MAT_BACKPACK = 4;
const MAT_BELT = 5;
const MAT_PANTS = 6;
const MAT_BOOTS = 7;

const PLAYER_GROUP_LABELS = [
  'skin',
  'hair',
  'jacket',
  'shirt',
  'backpack',
  'belt',
  'pants',
  'boots',
];

// 17-bone humanoid hierarchy indices matching bone array order
const BONE_HIPS = 0;
const BONE_SPINE = 1;
const BONE_CHEST = 2;
const BONE_NECK = 3;
const BONE_HEAD = 4;
const BONE_UPPER_ARM_L = 5;
const BONE_FOREARM_L = 6;
const BONE_HAND_L = 7;
const BONE_UPPER_ARM_R = 8;
const BONE_FOREARM_R = 9;
const BONE_HAND_R = 10;
const BONE_THIGH_L = 11;
const BONE_SHIN_L = 12;
const BONE_FOOT_L = 13;
const BONE_THIGH_R = 14;
const BONE_SHIN_R = 15;
const BONE_FOOT_R = 16;
const HUMANOID_BONE_COUNT = 17;

// Module-scope scratch math objects to keep per-frame heap allocations at zero
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const _AXIS_Y = new THREE.Vector3(0, 1, 0);
const _AXIS_Z = new THREE.Vector3(0, 0, 1);
const _qX = new THREE.Quaternion();
const _qY = new THREE.Quaternion();
const _qZ = new THREE.Quaternion();

interface PlayerPbrTextures {
  skinMap: THREE.CanvasTexture | null;
  skinBump: THREE.CanvasTexture | null;
  hairMap: THREE.CanvasTexture | null;
  hairBump: THREE.CanvasTexture | null;
  jacketMap: THREE.CanvasTexture | null;
  jacketBump: THREE.CanvasTexture | null;
  shirtMap: THREE.CanvasTexture | null;
  packMap: THREE.CanvasTexture | null;
  packBump: THREE.CanvasTexture | null;
  denimMap: THREE.CanvasTexture | null;
  denimBump: THREE.CanvasTexture | null;
  leatherMap: THREE.CanvasTexture | null;
}

let cachedPlayerTextures: PlayerPbrTextures | null = null;
let cachedPlayerMaterials: THREE.MeshStandardMaterial[] | null = null;
let cachedPreparedLowGeo: THREE.BufferGeometry | null = null;
let cachedPreparedHighGeo: THREE.BufferGeometry | null = null;
let cachedInfo: Omit<GlbPlayerInfo, 'modelUrl'> | null = null;

function seededRand(seed: number): () => number {
  let s = Math.floor(seed * 9973) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeCanvasTexture(
  size: number,
  colorSpace: THREE.ColorSpace,
  repeat: number,
  painter: (ctx: CanvasRenderingContext2D, s: number) => void
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) painter(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = colorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function getPlayerPbrTextures(): PlayerPbrTextures {
  if (cachedPlayerTextures) return cachedPlayerTextures;
  if (typeof document === 'undefined') {
    cachedPlayerTextures = {
      skinMap: null,
      skinBump: null,
      hairMap: null,
      hairBump: null,
      jacketMap: null,
      jacketBump: null,
      shirtMap: null,
      packMap: null,
      packBump: null,
      denimMap: null,
      denimBump: null,
      leatherMap: null,
    };
    return cachedPlayerTextures;
  }

  // 1. Natural human skin tone variation & subtle grit + pore micro-bump
  const skinMap = makeCanvasTexture(256, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(811);
    ctx.fillStyle = '#e7d5c8';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 48; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 12 + r() * 26;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      const tone = r() > 0.45 ? 'rgba(182, 128, 102, 0.12)' : 'rgba(232, 198, 174, 0.10)';
      g.addColorStop(0, tone);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,244,235,0.06)' : 'rgba(105,76,62,0.07)';
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  });

  const skinBump = makeCanvasTexture(128, THREE.NoColorSpace, 2, (ctx, s) => {
    const r = seededRand(823);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 520; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(r() * s, r() * s, 1.5, 1.5);
    }
  });

  // 2. Natural hair strands
  const hairMap = makeCanvasTexture(128, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(829);
    ctx.fillStyle = '#d4cbc3';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) {
      ctx.strokeStyle = r() > 0.45 ? 'rgba(42,30,24,0.34)' : 'rgba(218,205,192,0.22)';
      ctx.lineWidth = 1 + r() * 1.4;
      const x = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(
        x + (r() - 0.5) * 10,
        s * 0.35,
        x + (r() - 0.5) * 10,
        s * 0.7,
        x + (r() - 0.5) * 8,
        s
      );
      ctx.stroke();
    }
  });

  const hairBump = makeCanvasTexture(128, THREE.NoColorSpace, 2, (ctx, s) => {
    const r = seededRand(839);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(240,240,240,0.24)' : 'rgba(22,22,22,0.24)';
      ctx.lineWidth = 1.2;
      const x = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (r() - 0.5) * 8, s);
      ctx.stroke();
    }
  });

  // 3. Weathered field jacket canvas weave + grime patches
  const jacketMap = makeCanvasTexture(256, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(853);
    ctx.fillStyle = '#dcdad2';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, y, s, 1.5);
    }
    for (let x = 0; x < s; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, 0, 1.5, s);
    }
    for (let i = 0; i < 45; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 12 + r() * 34;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, r() > 0.45 ? 'rgba(54, 48, 38, 0.22)' : 'rgba(220, 215, 200, 0.11)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

  const jacketBump = makeCanvasTexture(128, THREE.NoColorSpace, 3, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)';
      ctx.fillRect(0, y, s, 1);
    }
    for (let x = 0; x < s; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)';
      ctx.fillRect(x, 0, 1, s);
    }
  });

  // 4. Inner worn cotton shirt knit
  const shirtMap = makeCanvasTexture(128, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(863);
    ctx.fillStyle = '#d9d5cc';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, y, s, 2);
    }
    for (let i = 0; i < 25; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 8 + r() * 20;
      const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
      g.addColorStop(0, 'rgba(72, 66, 56, 0.18)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

  // 5. Heavy ripstop backpack nylon/canvas
  const packMap = makeCanvasTexture(128, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(877);
    ctx.fillStyle = '#d2c9bc';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 8) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(42,35,28,0.22)' : 'rgba(220,210,196,0.10)';
      ctx.fillRect(r() * s, r() * s, 6 + r() * 14, 6 + r() * 12);
    }
  });

  const packBump = makeCanvasTexture(128, THREE.NoColorSpace, 3, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(245,245,245,0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < s; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, s);
      ctx.moveTo(0, i);
      ctx.lineTo(s, i);
      ctx.stroke();
    }
  });

  // 6. Cargo trousers diagonal twill + grime
  const denimMap = makeCanvasTexture(256, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(887);
    ctx.fillStyle = '#d4d5d8';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0,0,0,0.11)';
    ctx.lineWidth = 1.2;
    for (let i = -s; i < s * 2; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
    for (let i = 0; i < 40; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 14 + r() * 28;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, r() > 0.35 ? 'rgba(58,50,40,0.24)' : 'rgba(225,225,232,0.11)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

  const denimBump = makeCanvasTexture(128, THREE.NoColorSpace, 3, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
  });

  // 7. Scuffed leather belt & combat boots
  const leatherMap = makeCanvasTexture(128, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(907);
    ctx.fillStyle = '#bdb4aa';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(34,28,24,0.24)' : 'rgba(215,204,192,0.14)';
      ctx.fillRect(r() * s, r() * s, 4 + r() * 14, 1.5 + r() * 3);
    }
  });

  cachedPlayerTextures = {
    skinMap,
    skinBump,
    hairMap,
    hairBump,
    jacketMap,
    jacketBump,
    shirtMap,
    packMap,
    packBump,
    denimMap,
    denimBump,
    leatherMap,
  };
  return cachedPlayerTextures;
}

function getSharedPlayerMaterials(): THREE.MeshStandardMaterial[] {
  if (cachedPlayerMaterials) return cachedPlayerMaterials;
  const tex = getPlayerPbrTextures();

  cachedPlayerMaterials = [
    new THREE.MeshStandardMaterial({
      name: 'player_skin',
      color: 0xc99c80,
      map: tex.skinMap,
      bumpMap: tex.skinBump,
      bumpScale: 0.004,
      roughness: 0.72,
      metalness: 0.0,
      vertexColors: true,
      envMapIntensity: 0.35,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_hair',
      color: 0x33241c,
      map: tex.hairMap,
      bumpMap: tex.hairBump,
      bumpScale: 0.007,
      roughness: 0.86,
      metalness: 0.02,
      vertexColors: true,
      envMapIntensity: 0.25,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_jacket',
      color: 0x454f3c,
      map: tex.jacketMap,
      bumpMap: tex.jacketBump,
      bumpScale: 0.009,
      roughness: 0.88,
      metalness: 0.02,
      vertexColors: true,
      envMapIntensity: 0.3,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_shirt',
      color: 0x797468,
      map: tex.shirtMap,
      bumpMap: tex.jacketBump,
      bumpScale: 0.005,
      roughness: 0.9,
      metalness: 0.01,
      vertexColors: true,
      envMapIntensity: 0.26,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_backpack',
      color: 0x5c4936,
      map: tex.packMap,
      bumpMap: tex.packBump,
      bumpScale: 0.01,
      roughness: 0.86,
      metalness: 0.03,
      vertexColors: true,
      envMapIntensity: 0.32,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_belt',
      color: 0x2c241e,
      map: tex.leatherMap,
      roughness: 0.56,
      metalness: 0.16,
      vertexColors: true,
      envMapIntensity: 0.45,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_pants',
      color: 0x2d3640,
      map: tex.denimMap,
      bumpMap: tex.denimBump,
      bumpScale: 0.008,
      roughness: 0.89,
      metalness: 0.02,
      vertexColors: true,
      envMapIntensity: 0.28,
    }),
    new THREE.MeshStandardMaterial({
      name: 'player_boots',
      color: 0x241d18,
      map: tex.leatherMap,
      roughness: 0.66,
      metalness: 0.06,
      vertexColors: true,
      envMapIntensity: 0.38,
    }),
  ];

  return cachedPlayerMaterials;
}

function armSeamX(y: number): number {
  const t = THREE.MathUtils.clamp((y - 0.08) / 0.125, 0, 1);
  return 0.118 + 0.008 * t;
}

function classifyCanonicalTriangle(cx: number, cy: number, cz: number): number {
  if (cy < -0.44) return MAT_BOOTS;

  const absX = Math.abs(cx);
  if (cy < -0.048) {
    if (absX > 0.122 && cy >= -0.13) {
      return MAT_SKIN;
    }
    return MAT_PANTS;
  }

  if (cy >= 0.342 || (cy >= 0.325 && absX < 0.056 && cz > -0.062)) {
    const backT = THREE.MathUtils.clamp((0.042 - cz) / 0.075, 0, 1);
    const templeT = THREE.MathUtils.clamp((absX - 0.036) / 0.025, 0, 1);
    const hairLineY = 0.444 - backT * 0.058 - templeT * 0.026;
    return cy > hairLineY ? MAT_HAIR : MAT_SKIN;
  }

  if (absX > 0.124 && cy < -0.034) {
    return MAT_SKIN;
  }

  if (cy >= -0.025 && cy <= 0.295 && absX <= 0.088 && cz < -0.07) {
    return MAT_BACKPACK;
  }
  if (cy >= 0.085 && cy <= 0.315 && absX >= 0.044 && absX <= 0.068 && cz > 0.042) {
    return MAT_BACKPACK;
  }

  if (cy >= -0.052 && cy <= -0.022 && absX <= 0.124) {
    return MAT_BELT;
  }

  if (cy >= -0.022 && cy <= 0.332 && cz > 0.015) {
    const vHalfWidth = 0.024 + Math.max(0, cy - 0.12) * 0.075;
    if (absX <= vHalfWidth) {
      return MAT_SHIRT;
    }
  }

  return MAT_JACKET;
}

function smoothstep01(t: number): number {
  const c = THREE.MathUtils.clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/**
 * Computes normalized 4-influence humanoid skin indices & weights in canonical GLB coordinates.
 * region: 0 = main body/torso/head/legs, 1 = detached left arm (+X), 2 = detached right arm (-X),
 *         3 = left leg (LOD clustering guard), 4 = right leg (LOD clustering guard).
 */
function computeVertexSkinWeights(
  x: number,
  y: number,
  z: number,
  region: number,
  outIdx: Uint16Array,
  outW: Float32Array,
  vertIndex: number
): void {
  const base = vertIndex * 4;
  let b0 = BONE_HIPS;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let w0 = 1;
  let w1 = 0;
  let w2 = 0;
  let w3 = 0;

  if (region === 1 || region === 2) {
    // Arm chain (Chest armpit hinge -> UpperArm -> Forearm -> Hand)
    const isLeft = region === 1;
    const upper = isLeft ? BONE_UPPER_ARM_L : BONE_UPPER_ARM_R;
    const fore = isLeft ? BONE_FOREARM_L : BONE_FOREARM_R;
    const hand = isLeft ? BONE_HAND_L : BONE_HAND_R;

    if (y >= 0.19) {
      // Top of arm transitioning into Chest deltoid crease
      const chestT = smoothstep01((y - 0.195) / 0.032) * (1 - smoothstep01((Math.abs(x) - 0.12) / 0.035));
      b0 = upper;
      w0 = 1 - chestT * 0.45;
      b1 = BONE_CHEST;
      w1 = chestT * 0.45;
    } else if (y >= 0.08) {
      // Upper arm down to elbow blend (y=0.080)
      const elbowT = smoothstep01((0.112 - y) / 0.064);
      b0 = upper;
      w0 = 1 - elbowT * 0.5;
      b1 = fore;
      w1 = elbowT * 0.5;
    } else if (y >= -0.04) {
      // Elbow (y=0.080) through forearm down to wrist blend (y=-0.040)
      if (y > 0.048) {
        const elbowT = smoothstep01((0.112 - y) / 0.064);
        b0 = upper;
        w0 = 1 - elbowT;
        b1 = fore;
        w1 = elbowT;
      } else {
        const wristT = smoothstep01((-0.018 - y) / 0.044);
        b0 = fore;
        w0 = 1 - wristT * 0.5;
        b1 = hand;
        w1 = wristT * 0.5;
      }
    } else {
      // Wrist blend into Hand
      const wristT = smoothstep01((-0.018 - y) / 0.044);
      b0 = hand;
      w0 = wristT;
      b1 = fore;
      w1 = 1 - wristT;
    }
  } else if (y >= 0.325) {
    // Neck (y=0.345) & Head (y=0.415)
    if (y < 0.355) {
      const neckT = smoothstep01((y - 0.315) / 0.04);
      b0 = BONE_CHEST;
      w0 = 1 - neckT;
      b1 = BONE_NECK;
      w1 = neckT;
    } else if (y < 0.395) {
      const headT = smoothstep01((y - 0.355) / 0.04);
      b0 = BONE_NECK;
      w0 = 1 - headT;
      b1 = BONE_HEAD;
      w1 = headT;
    } else {
      b0 = BONE_HEAD;
      w0 = 1;
    }
  } else if (y >= 0.205 && Math.abs(x) > 0.115 && (z > -0.095 || Math.abs(x) > 0.13)) {
    // Deltoid shoulder cap above y=0.205 smoothly bridging Chest and UpperArm
    const upper = x >= 0 ? BONE_UPPER_ARM_L : BONE_UPPER_ARM_R;
    const armX = smoothstep01((Math.abs(x) - 0.112) / 0.048);
    const armY = 1 - smoothstep01((y - 0.285) / 0.045);
    const armW = THREE.MathUtils.clamp(armX * armY, 0, 1);
    b0 = upper;
    w0 = armW;
    b1 = BONE_CHEST;
    w1 = 1 - armW;
  } else if (y >= -0.05) {
    // Torso: Hips (y=-0.06) -> Spine (y=0.08) -> Chest (y=0.22)
    // Keep survival backpack (-Z) anchored cleanly across Spine & Chest
    if (y < 0.025) {
      const spT = smoothstep01((y + 0.045) / 0.095);
      b0 = BONE_HIPS;
      w0 = 1 - spT;
      b1 = BONE_SPINE;
      w1 = spT;
    } else if (y < 0.155) {
      const spT = smoothstep01((y + 0.045) / 0.095);
      const chT = smoothstep01((y - 0.095) / 0.11);
      if (y < 0.095) {
        b0 = BONE_HIPS;
        w0 = 1 - spT;
        b1 = BONE_SPINE;
        w1 = spT;
      } else {
        b0 = BONE_SPINE;
        w0 = 1 - chT;
        b1 = BONE_CHEST;
        w1 = chT;
      }
    } else {
      const chT = smoothstep01((y - 0.095) / 0.11);
      b0 = BONE_SPINE;
      w0 = 1 - chT;
      b1 = BONE_CHEST;
      w1 = chT;
    }
  } else {
    // Lower body: Pelvis & Legs
    const isLeft = region === 3 ? true : region === 4 ? false : x >= 0;
    const thigh = isLeft ? BONE_THIGH_L : BONE_THIGH_R;
    const shin = isLeft ? BONE_SHIN_L : BONE_SHIN_R;
    const foot = isLeft ? BONE_FOOT_L : BONE_FOOT_R;

    if (y >= -0.175) {
      // Smooth hip-to-thigh socket transition + groin midline anchor
      const legDrop = smoothstep01((-0.072 - y) / 0.095);
      const centerAnchor = y > -0.16 ? 1 - smoothstep01((Math.abs(x) - 0.008) / 0.032) : 0;
      const thighW = legDrop * (1 - centerAnchor * 0.72);
      b0 = BONE_HIPS;
      w0 = 1 - thighW;
      b1 = thigh;
      w1 = thighW;
    } else if (y >= -0.236) {
      b0 = thigh;
      w0 = 1;
    } else if (y >= -0.3) {
      // Knee joint (y=-0.268)
      const kneeT = smoothstep01((-0.236 - y) / 0.064);
      b0 = thigh;
      w0 = 1 - kneeT;
      b1 = shin;
      w1 = kneeT;
    } else if (y >= -0.404) {
      b0 = shin;
      w0 = 1;
    } else if (y >= -0.456) {
      // Ankle joint (y=-0.431)
      const ankleT = smoothstep01((-0.404 - y) / 0.052);
      b0 = shin;
      w0 = 1 - ankleT;
      b1 = foot;
      w1 = ankleT;
    } else {
      b0 = foot;
      w0 = 1;
    }
  }

  const sum = w0 + w1 + w2 + w3 || 1;
  outIdx[base] = b0;
  outIdx[base + 1] = b1;
  outIdx[base + 2] = b2;
  outIdx[base + 3] = b3;
  outW[base] = w0 / sum;
  outW[base + 1] = w1 / sum;
  outW[base + 2] = w2 / sum;
  outW[base + 3] = w3 / sum;
}

/**
 * Generates a fast voxel-clustered LOD1 geometry (~20k-30k triangles) preserving normals,
 * UVs, vertex colors, all 8 material groups, AND topological skinning weights.
 */
function buildSimplifiedLodGeometry(
  srcGeo: THREE.BufferGeometry,
  srcVertRegion: Uint8Array
): THREE.BufferGeometry {
  const srcPos = srcGeo.attributes.position;
  const srcNor = srcGeo.attributes.normal;
  const srcUv = srcGeo.attributes.uv;
  const srcCol = srcGeo.attributes.color;
  const srcIdx = srcGeo.index;
  if (!srcPos || !srcIdx) return srcGeo;

  const gridInv = 88;
  const cellToRep = new Map<number, number>();
  const vertToRep = new Int32Array(srcPos.count);

  const accX: number[] = [];
  const accY: number[] = [];
  const accZ: number[] = [];
  const accNx: number[] = [];
  const accNy: number[] = [];
  const accNz: number[] = [];
  const accU: number[] = [];
  const accV: number[] = [];
  const accR: number[] = [];
  const accG: number[] = [];
  const accB: number[] = [];
  const accCnt: number[] = [];
  const repGroup: number[] = [];

  for (let i = 0; i < srcPos.count; i++) {
    const x = srcPos.getX(i);
    const y = srcPos.getY(i);
    const z = srcPos.getZ(i);
    let grp = srcVertRegion[i];
    if (grp === 0 && y < -0.15) {
      grp = x >= 0 ? 3 : 4;
    }

    const gx = Math.round((x + 0.5) * gridInv);
    const gy = Math.round((y + 0.6) * gridInv);
    const gz = Math.round((z + 0.5) * gridInv);
    // Keep separate topological parts (torso vs left arm vs right arm vs legs) from merging across seams
    const key = gx + gy * 256 + gz * 65536 + grp * 16777216;

    let rep = cellToRep.get(key);
    if (rep === undefined) {
      rep = accCnt.length;
      cellToRep.set(key, rep);
      accX.push(0);
      accY.push(0);
      accZ.push(0);
      accNx.push(0);
      accNy.push(0);
      accNz.push(0);
      accU.push(0);
      accV.push(0);
      accR.push(0);
      accG.push(0);
      accB.push(0);
      accCnt.push(0);
      repGroup.push(grp);
    }
    vertToRep[i] = rep;
    accX[rep] += x;
    accY[rep] += y;
    accZ[rep] += z;
    accNx[rep] += srcNor ? srcNor.getX(i) : 0;
    accNy[rep] += srcNor ? srcNor.getY(i) : 1;
    accNz[rep] += srcNor ? srcNor.getZ(i) : 0;
    accU[rep] += srcUv ? srcUv.getX(i) : 0;
    accV[rep] += srcUv ? srcUv.getY(i) : 0;
    accR[rep] += srcCol ? srcCol.getX(i) : 1;
    accG[rep] += srcCol ? srcCol.getY(i) : 1;
    accB[rep] += srcCol ? srcCol.getZ(i) : 1;
    accCnt[rep] += 1;
  }

  const vCount = accCnt.length;
  const posArr = new Float32Array(vCount * 3);
  const norArr = new Float32Array(vCount * 3);
  const uvArr = new Float32Array(vCount * 2);
  const colArr = new Float32Array(vCount * 3);
  const skinIdxArr = new Uint16Array(vCount * 4);
  const skinWtArr = new Float32Array(vCount * 4);

  for (let r = 0; r < vCount; r++) {
    const inv = 1 / accCnt[r];
    const px = accX[r] * inv;
    const py = accY[r] * inv;
    const pz = accZ[r] * inv;
    posArr[r * 3] = px;
    posArr[r * 3 + 1] = py;
    posArr[r * 3 + 2] = pz;

    const nx = accNx[r];
    const ny = accNy[r];
    const nz = accNz[r];
    const nLen = Math.hypot(nx, ny, nz) || 1;
    norArr[r * 3] = nx / nLen;
    norArr[r * 3 + 1] = ny / nLen;
    norArr[r * 3 + 2] = nz / nLen;

    uvArr[r * 2] = accU[r] * inv;
    uvArr[r * 2 + 1] = accV[r] * inv;

    colArr[r * 3] = accR[r] * inv;
    colArr[r * 3 + 1] = accG[r] * inv;
    colArr[r * 3 + 2] = accB[r] * inv;

    computeVertexSkinWeights(px, py, pz, repGroup[r], skinIdxArr, skinWtArr, r);
  }

  const outIndices: number[] = [];
  const lowGeo = new THREE.BufferGeometry();
  lowGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  lowGeo.setAttribute('normal', new THREE.BufferAttribute(norArr, 3));
  lowGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  lowGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  lowGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdxArr, 4));
  lowGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWtArr, 4));

  for (const grp of srcGeo.groups) {
    const start = outIndices.length;
    const end = grp.start + grp.count;
    for (let t = grp.start; t < end; t += 3) {
      const ra = vertToRep[srcIdx.getX(t)];
      const rb = vertToRep[srcIdx.getX(t + 1)];
      const rc = vertToRep[srcIdx.getX(t + 2)];
      if (ra !== rb && rb !== rc && rc !== ra) {
        outIndices.push(ra, rb, rc);
      }
    }
    const cnt = outIndices.length - start;
    if (cnt > 0) {
      lowGeo.addGroup(start, cnt, grp.materialIndex ?? 0);
    }
  }

  lowGeo.setIndex(outIndices);
  lowGeo.computeBoundingBox();
  lowGeo.computeBoundingSphere();
  if (lowGeo.boundingSphere && lowGeo.boundingSphere.radius < 1.5) {
    lowGeo.boundingSphere.radius = 1.5;
  }
  return lowGeo;
}

function preparePlayerGeometries(rawScene: THREE.Object3D): {
  highGeo: THREE.BufferGeometry;
  lowGeo: THREE.BufferGeometry;
  info: Omit<GlbPlayerInfo, 'modelUrl'>;
} | null {
  if (cachedPreparedHighGeo && cachedPreparedLowGeo && cachedInfo) {
    return {
      highGeo: cachedPreparedHighGeo,
      lowGeo: cachedPreparedLowGeo,
      info: cachedInfo,
    };
  }

  let sourceMesh: THREE.Mesh | null = null;
  let meshCount = 0;

  rawScene.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      meshCount += 1;
      if (!sourceMesh) {
        sourceMesh = child as THREE.Mesh;
      }
    }
  });

  if (!sourceMesh) return null;

  const srcGeo = (sourceMesh as THREE.Mesh).geometry;
  const srcPos = srcGeo.attributes.position;
  const srcIdx = srcGeo.index;
  if (!srcPos || !srcIdx) return null;

  const workGeo = srcGeo.clone();
  if (!workGeo.attributes.normal) {
    workGeo.computeVertexNormals();
  }
  const srcNor = workGeo.attributes.normal;

  workGeo.computeBoundingBox();
  const minY = workGeo.boundingBox?.min.y ?? -0.49934;
  const maxY = workGeo.boundingBox?.max.y ?? 0.49952;
  const canonicalHeight = Math.max(0.01, maxY - minY);

  // 1. Surgical Arm-to-Torso Separation below armpit crease (y < 0.205) so arms articulate cleanly
  const origVertCount = srcPos.count;
  const triCount = srcIdx.count / 3;
  const triRegion = new Uint8Array(triCount); // 0=body, 1=leftArm(+X), 2=rightArm(-X)
  const usedByArm1 = new Uint8Array(origVertCount);
  const usedByArm2 = new Uint8Array(origVertCount);
  const usedByBodyBelow = new Uint8Array(origVertCount);
  const usedByBodyAbove = new Uint8Array(origVertCount);

  for (let t = 0; t < triCount; t++) {
    const a = srcIdx.getX(t * 3);
    const b = srcIdx.getX(t * 3 + 1);
    const c = srcIdx.getX(t * 3 + 2);
    const cx = (srcPos.getX(a) + srcPos.getX(b) + srcPos.getX(c)) / 3;
    const cy = (srcPos.getY(a) + srcPos.getY(b) + srcPos.getY(c)) / 3;

    let r = 0;
    if (cy >= -0.14 && cy < 0.205) {
      const sx = armSeamX(cy);
      if (cx > sx) r = 1;
      else if (cx < -sx) r = 2;
    }
    triRegion[t] = r;
    if (r === 1) {
      usedByArm1[a] = 1;
      usedByArm1[b] = 1;
      usedByArm1[c] = 1;
    } else if (r === 2) {
      usedByArm2[a] = 1;
      usedByArm2[b] = 1;
      usedByArm2[c] = 1;
    } else if (cy >= 0.205) {
      usedByBodyAbove[a] = 1;
      usedByBodyAbove[b] = 1;
      usedByBodyAbove[c] = 1;
    } else {
      usedByBodyBelow[a] = 1;
      usedByBodyBelow[b] = 1;
      usedByBodyBelow[c] = 1;
    }
  }

  // Duplicate vertices on vertical seam below y=0.205 so arms and torso ribcage separate cleanly
  const extraPos: number[] = [];
  const extraNor: number[] = [];
  const extraRegion: number[] = [];
  const arm1DupMap = new Int32Array(origVertCount).fill(-1);
  const arm2DupMap = new Int32Array(origVertCount).fill(-1);
  const isSeamBodyVert = new Uint8Array(origVertCount);
  const seamArmVertSet = new Set<number>();

  for (let i = 0; i < origVertCount; i++) {
    if (usedByArm1[i] && usedByBodyBelow[i] && !usedByBodyAbove[i]) {
      const ni = origVertCount + extraRegion.length;
      arm1DupMap[i] = ni;
      extraPos.push(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i));
      extraNor.push(srcNor.getX(i), srcNor.getY(i), srcNor.getZ(i));
      extraRegion.push(1);
      isSeamBodyVert[i] = 1;
      seamArmVertSet.add(ni);
    }
    if (usedByArm2[i] && usedByBodyBelow[i] && !usedByBodyAbove[i]) {
      const ni = origVertCount + extraRegion.length;
      arm2DupMap[i] = ni;
      extraPos.push(srcPos.getX(i), srcPos.getY(i), srcPos.getZ(i));
      extraNor.push(srcNor.getX(i), srcNor.getY(i), srcNor.getZ(i));
      extraRegion.push(2);
      isSeamBodyVert[i] = 1;
      seamArmVertSet.add(ni);
    }
  }

  // Reserve 4 inset centroid cap vertices (left/right inner sleeve + left/right ribcage wall)
  const capDefs = [
    { x: 0.146, y: 0.1, z: -0.015, nx: -1, reg: 1 }, // ArmL inner sleeve cap
    { x: 0.096, y: 0.1, z: -0.015, nx: 1, reg: 0 }, // BodyL ribcage wall cap
    { x: -0.146, y: 0.1, z: -0.015, nx: 1, reg: 2 }, // ArmR inner sleeve cap
    { x: -0.096, y: 0.1, z: -0.015, nx: -1, reg: 0 }, // BodyR ribcage wall cap
  ];
  const capVertIndices: number[] = [];
  for (const c of capDefs) {
    const idx = origVertCount + extraRegion.length;
    capVertIndices.push(idx);
    extraPos.push(c.x, c.y, c.z);
    extraNor.push(c.nx, 0, 0);
    extraRegion.push(c.reg);
  }

  const totalVerts = origVertCount + extraRegion.length;
  const posArr = new Float32Array(totalVerts * 3);
  const norArr = new Float32Array(totalVerts * 3);
  const vertRegion = new Uint8Array(totalVerts);

  for (let i = 0; i < origVertCount; i++) {
    posArr[i * 3] = srcPos.getX(i);
    posArr[i * 3 + 1] = srcPos.getY(i);
    posArr[i * 3 + 2] = srcPos.getZ(i);
    norArr[i * 3] = srcNor.getX(i);
    norArr[i * 3 + 1] = srcNor.getY(i);
    norArr[i * 3 + 2] = srcNor.getZ(i);
    if (usedByArm1[i] && !usedByBodyBelow[i] && !usedByBodyAbove[i]) {
      vertRegion[i] = 1;
    } else if (usedByArm2[i] && !usedByBodyBelow[i] && !usedByBodyAbove[i]) {
      vertRegion[i] = 2;
    } else {
      vertRegion[i] = 0;
    }
  }
  for (let k = 0; k < extraRegion.length; k++) {
    const idx = origVertCount + k;
    posArr[idx * 3] = extraPos[k * 3];
    posArr[idx * 3 + 1] = extraPos[k * 3 + 1];
    posArr[idx * 3 + 2] = extraPos[k * 3 + 2];
    norArr[idx * 3] = extraNor[k * 3];
    norArr[idx * 3 + 1] = extraNor[k * 3 + 1];
    norArr[idx * 3 + 2] = extraNor[k * 3 + 2];
    vertRegion[idx] = extraRegion[k];
  }

  // Remap triangles & build directed edge map for clean vertical seam sealing
  const buckets: number[][] = Array.from({ length: 8 }, () => []);
  const splitTris: [number, number, number][] = new Array(triCount);
  const halfEdges = new Set<string>();

  for (let t = 0; t < triCount; t++) {
    let a = srcIdx.getX(t * 3);
    let b = srcIdx.getX(t * 3 + 1);
    let c = srcIdx.getX(t * 3 + 2);
    const r = triRegion[t];
    if (r === 1) {
      if (arm1DupMap[a] !== -1) a = arm1DupMap[a];
      if (arm1DupMap[b] !== -1) b = arm1DupMap[b];
      if (arm1DupMap[c] !== -1) c = arm1DupMap[c];
    } else if (r === 2) {
      if (arm2DupMap[a] !== -1) a = arm2DupMap[a];
      if (arm2DupMap[b] !== -1) b = arm2DupMap[b];
      if (arm2DupMap[c] !== -1) c = arm2DupMap[c];
    }
    splitTris[t] = [a, b, c];
    halfEdges.add(`${a}_${b}`);
    halfEdges.add(`${b}_${c}`);
    halfEdges.add(`${c}_${a}`);

    const cx = (posArr[a * 3] + posArr[b * 3] + posArr[c * 3]) / 3;
    const cy = (posArr[a * 3 + 1] + posArr[b * 3 + 1] + posArr[c * 3 + 1]) / 3;
    const cz = (posArr[a * 3 + 2] + posArr[b * 3 + 2] + posArr[c * 3 + 2]) / 3;
    const matIdx = classifyCanonicalTriangle(cx, cy, cz);
    buckets[matIdx].push(a, b, c);
  }

  // Close the 4 newly cut vertical boundary loops watertight using MAT_JACKET
  let capTriCount = 0;
  for (let t = 0; t < triCount; t++) {
    const r = triRegion[t];
    const [a, b, c] = splitTris[t];
    const edges: [number, number][] = [
      [a, b],
      [b, c],
      [c, a],
    ];
    for (let e = 0; e < 3; e++) {
      const u = edges[e][0];
      const v = edges[e][1];
      if (halfEdges.has(`${v}_${u}`)) continue;

      const uY = posArr[u * 3 + 1];
      const vY = posArr[v * 3 + 1];
      if (uY >= 0.204 && vY >= 0.204) continue;

      if (r === 1 && (seamArmVertSet.has(u) || seamArmVertSet.has(v))) {
        const capIdx = capVertIndices[0];
        const e1x = posArr[u * 3] - posArr[v * 3];
        const e1y = posArr[u * 3 + 1] - posArr[v * 3 + 1];
        const e1z = posArr[u * 3 + 2] - posArr[v * 3 + 2];
        const e2x = posArr[capIdx * 3] - posArr[v * 3];
        const e2y = posArr[capIdx * 3 + 1] - posArr[v * 3 + 1];
        const e2z = posArr[capIdx * 3 + 2] - posArr[v * 3 + 2];
        const nx = e1y * e2z - e1z * e2y;
        if (nx <= 0) buckets[MAT_JACKET].push(v, u, capIdx);
        else buckets[MAT_JACKET].push(u, v, capIdx);
        capTriCount++;
      } else if (r === 2 && (seamArmVertSet.has(u) || seamArmVertSet.has(v))) {
        const capIdx = capVertIndices[2];
        const e1x = posArr[u * 3] - posArr[v * 3];
        const e1y = posArr[u * 3 + 1] - posArr[v * 3 + 1];
        const e1z = posArr[u * 3 + 2] - posArr[v * 3 + 2];
        const e2x = posArr[capIdx * 3] - posArr[v * 3];
        const e2y = posArr[capIdx * 3 + 1] - posArr[v * 3 + 1];
        const e2z = posArr[capIdx * 3 + 2] - posArr[v * 3 + 2];
        const nx = e1y * e2z - e1z * e2y;
        if (nx >= 0) buckets[MAT_JACKET].push(v, u, capIdx);
        else buckets[MAT_JACKET].push(u, v, capIdx);
        capTriCount++;
      } else if (r === 0 && (isSeamBodyVert[u] || isSeamBodyVert[v])) {
        const isLeft = posArr[u * 3] + posArr[v * 3] >= 0;
        const capIdx = isLeft ? capVertIndices[1] : capVertIndices[3];
        const e1x = posArr[u * 3] - posArr[v * 3];
        const e1y = posArr[u * 3 + 1] - posArr[v * 3 + 1];
        const e1z = posArr[u * 3 + 2] - posArr[v * 3 + 2];
        const e2x = posArr[capIdx * 3] - posArr[v * 3];
        const e2y = posArr[capIdx * 3 + 1] - posArr[v * 3 + 1];
        const e2z = posArr[capIdx * 3 + 2] - posArr[v * 3 + 2];
        const nx = e1y * e2z - e1z * e2y;
        if ((isLeft && nx >= 0) || (!isLeft && nx <= 0)) {
          buckets[MAT_JACKET].push(v, u, capIdx);
        } else {
          buckets[MAT_JACKET].push(u, v, capIdx);
        }
        capTriCount++;
      }
    }
  }

  // 2. Generate seamless UVs, anatomical AO vertex colors, and humanoid skin weights
  const uvArr = new Float32Array(totalVerts * 2);
  const colArr = new Float32Array(totalVerts * 3);
  const skinIdxArr = new Uint16Array(totalVerts * 4);
  const skinWtArr = new Float32Array(totalVerts * 4);

  const firstCapVert = capVertIndices[0];
  for (let i = 0; i < totalVerts; i++) {
    const x = posArr[i * 3];
    const y = posArr[i * 3 + 1];
    const z = posArr[i * 3 + 2];
    const ny = norArr[i * 3 + 1];

    uvArr[i * 2] = (x * 0.85 + z * 0.52) * 3.2;
    uvArr[i * 2 + 1] = (y - minY) * 3.2;

    computeVertexSkinWeights(x, y, z, vertRegion[i], skinIdxArr, skinWtArr, i);

    if (i >= firstCapVert) {
      // Deep inner underarm fabric AO on seam-closure centroids
      colArr[i * 3] = 0.46;
      colArr[i * 3 + 1] = 0.45;
      colArr[i * 3 + 2] = 0.44;
      continue;
    }

    let r = 0.88 + 0.12 * THREE.MathUtils.clamp(ny * 0.5 + 0.5, 0, 1);
    let g = r;
    let b = r;
    const absX = Math.abs(x);

    if (y >= 0.342) {
      const backT = THREE.MathUtils.clamp((0.042 - z) / 0.075, 0, 1);
      const templeT = THREE.MathUtils.clamp((absX - 0.036) / 0.025, 0, 1);
      const hairLineY = 0.444 - backT * 0.058 - templeT * 0.026;

      if (y > hairLineY) {
        const crown = THREE.MathUtils.clamp((y - 0.388) / 0.1, 0.72, 1.05);
        r *= crown;
        g *= crown;
        b *= crown;
      } else {
        const eyeDistL = Math.hypot((x - 0.02) * 1.15, (y - 0.425) * 1.55);
        const eyeDistR = Math.hypot((x + 0.02) * 1.15, (y - 0.425) * 1.55);
        const eyeDist = Math.min(eyeDistL, eyeDistR);
        if (z > 0.058 && eyeDist < 0.015) {
          const irisT = eyeDist < 0.0055 ? 0.38 : THREE.MathUtils.lerp(0.68, 0.96, eyeDist / 0.015);
          r *= irisT;
          g *= irisT * 0.96;
          b *= irisT * 0.96;
        }
        if (z > 0.064 && absX > 0.009 && absX < 0.034 && y >= 0.436 && y <= 0.444) {
          r *= 0.62;
          g *= 0.58;
          b *= 0.55;
        }
        if (z > 0.064 && absX < 0.018 && y >= 0.387 && y <= 0.397) {
          r *= 0.84;
          g *= 0.76;
          b *= 0.74;
        }
        if (y < 0.372 && z < 0.05) {
          r *= 0.76;
          g *= 0.74;
          b *= 0.74;
        }
      }
    } else if (y < -0.44) {
      if (y < -0.478) {
        r *= 0.52;
        g *= 0.5;
        b *= 0.49;
      } else if (z > 0.075) {
        r *= 0.85;
        g *= 0.82;
        b *= 0.78;
      }
    } else if (y < -0.048) {
      if (absX > 0.122 && y >= -0.13) {
        const tipT = THREE.MathUtils.clamp((-0.075 - y) / 0.05, 0, 1);
        r *= 0.94 - tipT * 0.1;
        g *= 0.91 - tipT * 0.12;
        b *= 0.89 - tipT * 0.13;
      } else {
        if (y > -0.085) {
          r *= 0.82;
          g *= 0.81;
          b *= 0.8;
        }
        if (y >= -0.275 && y <= -0.215 && z > -0.01) {
          r *= 1.07;
          g *= 1.04;
          b *= 0.98;
        }
        if (y <= -0.365) {
          const mud = THREE.MathUtils.clamp((-0.365 - y) / 0.075, 0, 1);
          r *= 0.92 - mud * 0.12;
          g *= 0.89 - mud * 0.15;
          b *= 0.84 - mud * 0.19;
        }
      }
    } else {
      if (y >= -0.052 && y <= -0.022 && absX < 0.024 && z > 0.075) {
        r *= 1.18;
        g *= 1.16;
        b *= 1.14;
      } else if (y >= -0.025 && y <= 0.295 && absX <= 0.088 && z < -0.07) {
        const edge = THREE.MathUtils.clamp((absX - 0.068) / 0.02, 0, 1);
        const zipSeam = Math.abs(y - 0.12) < 0.008 || Math.abs(y - 0.21) < 0.008 ? 0.72 : 1.0;
        r *= (0.98 - edge * 0.2) * zipSeam;
        g *= (0.96 - edge * 0.2) * zipSeam;
        b *= (0.94 - edge * 0.2) * zipSeam;
      } else {
        if (y < -0.015) {
          r *= 0.84;
          g *= 0.82;
          b *= 0.79;
        }
        if (absX > 0.115 && absX < 0.145 && y > 0.08 && y < 0.24) {
          r *= 0.8;
          g *= 0.79;
          b *= 0.78;
        }
      }
    }

    colArr[i * 3] = THREE.MathUtils.clamp(r, 0.35, 1.15);
    colArr[i * 3 + 1] = THREE.MathUtils.clamp(g, 0.35, 1.15);
    colArr[i * 3 + 2] = THREE.MathUtils.clamp(b, 0.35, 1.15);
  }

  const highGeo = new THREE.BufferGeometry();
  highGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  highGeo.setAttribute('normal', new THREE.BufferAttribute(norArr, 3));
  highGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  highGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
  highGeo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIdxArr, 4));
  highGeo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWtArr, 4));

  const totalIndices = (triCount + capTriCount) * 3;
  const sortedIndices = new Uint32Array(totalIndices);
  highGeo.clearGroups();
  let offset = 0;
  for (let m = 0; m < 8; m++) {
    const b = buckets[m];
    if (b.length === 0) continue;
    for (let k = 0; k < b.length; k++) {
      sortedIndices[offset + k] = b[k];
    }
    highGeo.addGroup(offset, b.length, m);
    offset += b.length;
  }
  highGeo.setIndex(new THREE.BufferAttribute(sortedIndices, 1));
  highGeo.computeBoundingBox();
  highGeo.computeBoundingSphere();
  if (highGeo.boundingSphere && highGeo.boundingSphere.radius < 1.5) {
    highGeo.boundingSphere.radius = 1.5;
  }

  const lowGeo = buildSimplifiedLodGeometry(highGeo, vertRegion);
  workGeo.dispose();

  cachedPreparedHighGeo = highGeo;
  cachedPreparedLowGeo = lowGeo;
  cachedInfo = {
    meshCount,
    vertexCount: totalVerts,
    triangleCount: totalIndices / 3,
    lod1TriangleCount: lowGeo.index ? lowGeo.index.count / 3 : totalIndices / 3,
    materialGroups: [...PLAYER_GROUP_LABELS],
    hasSkeleton: true,
    boneCount: HUMANOID_BONE_COUNT,
    animationClipCount: 0,
    heightMeters: canonicalHeight * 1.78,
  };

  return { highGeo, lowGeo, info: cachedInfo };
}

function buildHumanoidSkeleton(): PlayerBoneRig {
  const mkBone = (name: string, x: number, y: number, z: number): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    return b;
  };

  const hips = mkBone('Hips', 0.0, -0.06, 0.0);
  const spine = mkBone('Spine', 0.0, 0.14, 0.015);
  const chest = mkBone('Chest', 0.0, 0.14, 0.005);
  const neck = mkBone('Neck', 0.0, 0.125, -0.028);
  const head = mkBone('Head', 0.0, 0.07, 0.013);

  const upperArmL = mkBone('UpperArm.L', 0.144, 0.02, -0.052);
  const forearmL = mkBone('Forearm.L', 0.021, -0.16, 0.023);
  const handL = mkBone('Hand.L', -0.006, -0.12, 0.05);

  const upperArmR = mkBone('UpperArm.R', -0.144, 0.02, -0.052);
  const forearmR = mkBone('Forearm.R', -0.021, -0.16, 0.023);
  const handR = mkBone('Hand.R', 0.006, -0.12, 0.05);

  const thighL = mkBone('Thigh.L', 0.067, -0.045, 0.0);
  const shinL = mkBone('Shin.L', 0.004, -0.163, -0.018);
  const footL = mkBone('Foot.L', 0.014, -0.163, -0.005);

  const thighR = mkBone('Thigh.R', -0.068, -0.045, 0.0);
  const shinR = mkBone('Shin.R', -0.008, -0.163, -0.017);
  const footR = mkBone('Foot.R', -0.012, -0.163, -0.007);

  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  chest.add(upperArmL);
  upperArmL.add(forearmL);
  forearmL.add(handL);

  chest.add(upperArmR);
  upperArmR.add(forearmR);
  forearmR.add(handR);

  hips.add(thighL);
  thighL.add(shinL);
  shinL.add(footL);

  hips.add(thighR);
  thighR.add(shinR);
  shinR.add(footR);

  // Ordered array matching BONE_* constants 0..16
  const boneList: THREE.Bone[] = [
    hips,
    spine,
    chest,
    neck,
    head,
    upperArmL,
    forearmL,
    handL,
    upperArmR,
    forearmR,
    handR,
    thighL,
    shinL,
    footL,
    thighR,
    shinR,
    footR,
  ];
  const skeleton = new THREE.Skeleton(boneList);

  return {
    hips,
    spine,
    chest,
    neck,
    head,
    upperArmL,
    forearmL,
    handL,
    upperArmR,
    forearmR,
    handR,
    thighL,
    shinL,
    footL,
    thighR,
    shinR,
    footR,
    skeleton,
    hipsRestY: -0.06,
  };
}

/**
 * Strips the legacy first-person stub arm groups from weapon props so the rigged survivor's
 * own 3D hands hold the steel pipe, combat blade, and service pistol cleanly.
 */
function stripPropArmStubs(group: THREE.Group): void {
  for (const child of group.children) {
    if ((child as THREE.Group).isGroup) {
      child.visible = false;
    }
  }
}

function setBoneYXZ(bone: THREE.Bone, rx: number, ry: number, rz: number): void {
  _qY.setFromAxisAngle(_AXIS_Y, ry);
  _qX.setFromAxisAngle(_AXIS_X, rx);
  _qZ.setFromAxisAngle(_AXIS_Z, rz);
  bone.quaternion.copy(_qY).multiply(_qX).multiply(_qZ);
}

function setBoneXZY(bone: THREE.Bone, rx: number, ry: number, rz: number): void {
  _qX.setFromAxisAngle(_AXIS_X, rx);
  _qZ.setFromAxisAngle(_AXIS_Z, rz);
  _qY.setFromAxisAngle(_AXIS_Y, ry);
  bone.quaternion.copy(_qX).multiply(_qZ).multiply(_qY);
}

export function createGlbPlayerRig(
  rawScene: THREE.Object3D,
  animations: THREE.AnimationClip[],
  modelUrl: string,
  scale = 1.78
): PlayerGlbRig | null {
  const prepared = preparePlayerGeometries(rawScene);
  if (!prepared) return null;

  const { highGeo, lowGeo, info } = prepared;
  const materials = getSharedPlayerMaterials();

  const root = new THREE.Group();
  root.name = 'player.survivor';

  const shadowGeo = new THREE.CircleGeometry(0.42, 20);
  shadowGeo.rotateX(-Math.PI * 0.5);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.position.y = 0.015;
  root.add(shadowDisc);

  const facingPivot = new THREE.Group();
  root.add(facingPivot);

  const motionPivot = new THREE.Group();
  facingPivot.add(motionPivot);

  // Align GLB bottom strictly to y = 0 and orient +Z character forward to -Z Three.js forward
  const minY = highGeo.boundingBox?.min.y ?? -0.49934;
  const modelHolder = new THREE.Group();
  modelHolder.scale.setScalar(scale);
  modelHolder.position.y = -minY * scale;
  modelHolder.rotation.y = Math.PI;
  motionPivot.add(modelHolder);

  // Build 17-bone skeleton & bind both LOD0 and LOD1 SkinnedMeshes at rest pose
  const bones = buildHumanoidSkeleton();
  modelHolder.add(bones.hips);

  const highMesh = new THREE.SkinnedMesh(highGeo, materials);
  highMesh.castShadow = true;
  highMesh.receiveShadow = true;

  const lowMesh = new THREE.SkinnedMesh(lowGeo, materials);
  lowMesh.castShadow = true;
  lowMesh.receiveShadow = true;

  const lod = new THREE.LOD();
  lod.addLevel(highMesh, 0);
  lod.addLevel(lowMesh, 8.5);
  modelHolder.add(lod);

  root.updateMatrixWorld(true);
  bones.skeleton.calculateInverses();
  highMesh.bind(bones.skeleton, highMesh.matrixWorld);
  lowMesh.bind(bones.skeleton, lowMesh.matrixWorld);

  // Attach right-hand weapon mount directly to Hand.R bone (converted back to metric -Z forward)
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.008, -0.048, 0.004);
  weaponAnchor.rotation.y = Math.PI;
  weaponAnchor.scale.setScalar(1 / scale);
  bones.handR.add(weaponAnchor);

  const pipeProp = buildFirstPersonMeleePipe();
  pipeProp.group.scale.setScalar(0.56);
  stripPropArmStubs(pipeProp.group);
  pipeProp.group.position.set(0, 0.015, -0.02);
  pipeProp.group.rotation.set(-Math.PI * 0.42, 0.06, 0.04);
  weaponAnchor.add(pipeProp.group);

  const bladeProp = buildFirstPersonCombatBlade();
  bladeProp.group.scale.setScalar(0.62);
  stripPropArmStubs(bladeProp.group);
  bladeProp.group.position.set(0, 0.015, -0.015);
  bladeProp.group.rotation.set(-Math.PI * 0.44, 0.04, 0.04);
  bladeProp.group.visible = false;
  weaponAnchor.add(bladeProp.group);

  const pistolProp = buildFirstPersonServicePistol();
  pistolProp.group.scale.setScalar(0.64);
  stripPropArmStubs(pistolProp.group);
  pistolProp.muzzleFlash.visible = false;
  pistolProp.group.position.set(0, 0.01, -0.03);
  pistolProp.group.rotation.set(0, 0, 0);
  pistolProp.group.visible = false;
  weaponAnchor.add(pistolProp.group);

  const fullInfo: GlbPlayerInfo = {
    ...info,
    modelUrl,
    animationClipCount: animations.length,
  };

  return {
    root,
    motionPivot,
    facingPivot,
    modelHolder,
    lod,
    highMesh,
    lowMesh,
    bones,
    materials,
    weaponAnchor,
    pipeProp,
    bladeProp,
    pistolProp,
    shadowDisc,
    shadowMat,
    info: fullInfo,
    curFacingYaw: 0,
    walkWeight: 0,
    runWeight: 0,
    sprintWeight: 0,
    airWeight: 0,
    restWeight: 0,
    aimWeight: 0,
    combatReadyWeight: 0,
    startAccelImpulse: 0,
    stopDecelImpulse: 0,
    hitReactionImpulse: 0,
    hitSign: 1,
    prevHurtFlash: false,
    prevWasMoving: false,
    prevSpeed: 0,
    curWeaponSwing: 0,
    curRecoil: 0,
    curReloadBlend: 0,
    curDeadBlend: 0,
    curHitFlash: 0,
    curHipDrop: 0,
    curHipSwayX: 0,
    curHipTwistY: 0,
    curHipTiltZ: 0,
    curSpineRx: 0,
    curSpineRy: 0,
    curSpineRz: 0,
    curChestRx: 0,
    curChestRy: 0,
    curChestRz: 0,
    curHeadRx: 0,
    curHeadRy: 0,
    curHeadRz: 0,
    curThighLRx: -0.03,
    curThighRRx: -0.03,
    curThighLRz: 0,
    curThighRRz: 0,
    curShinLRx: 0.06,
    curShinRRx: 0.06,
    curFootLRx: -0.03,
    curFootRRx: -0.03,
    curArmLRx: -0.04,
    curArmLRy: 0,
    curArmLRz: 0.04,
    curForeLRx: -0.22,
    curArmRRx: -0.05,
    curArmRRy: 0,
    curArmRRz: -0.04,
    curForeRRx: -0.24,
    curHandRRx: 0,
    curHandRRy: 0,
    curHandRRz: 0,
    lastEquippedWeapon: 'steel_pipe',
    dispose: () => {
      shadowGeo.dispose();
      shadowMat.dispose();
      pipeProp.dispose();
      bladeProp.dispose();
      pistolProp.dispose();
    },
  };
}

export function setPlayerRigQuality(
  rig: PlayerGlbRig,
  quality: 'low' | 'medium' | 'high',
  shadowsEnabled: boolean
): void {
  const useLowAlways = quality === 'low';
  if (rig.lod.levels.length >= 2) {
    rig.lod.levels[0].distance = useLowAlways ? 9999 : 0;
    rig.lod.levels[1].distance = useLowAlways ? 0 : 8.5;
    rig.highMesh.visible = !useLowAlways;
    rig.lowMesh.visible = useLowAlways;
  }
  const cast = shadowsEnabled && quality !== 'low';
  rig.highMesh.castShadow = cast;
  rig.lowMesh.castShadow = cast;
}

/**
 * Bone sign convention in canonical modelHolder space (+Z forward, +Y up, +X left, -X right):
 *  - Lower-body limbs (Thigh, Shin, UpperArm, Forearm hang along -Y):
 *    rx < 0 swings FORWARD (+Z); rx > 0 swings BACKWARD (-Z) or bends KNEE backward (+X on Shin)
 *    For UpperArm.L (+X): rz > 0 lifts arm OUTWARD away from ribs; rz < 0 pulls inward across chest
 *    For UpperArm.R (-X): rz < 0 lifts arm OUTWARD away from ribs; rz > 0 pulls inward across chest
 *  - Upper-body spine/chest/head (extend along +Y):
 *    rx > 0 leans FORWARD (+Z); rx < 0 leans BACKWARD (-Z)
 *    ry > 0 turns LEFT (+X); ry < 0 turns RIGHT (-X)
 */
export function updatePlayerGlbRig(
  rig: PlayerGlbRig,
  dt: number,
  playerX: number,
  playerY: number,
  playerZ: number,
  characterYaw: number,
  anim: PlayerAnimContext,
  combat: {
    equippedWeaponId: WeaponId;
    attackProgress: number;
    isAttacking: boolean;
    isReloading: boolean;
    muzzleFlashVisible: boolean;
    playerDead: boolean;
    hurtFlash: boolean;
  }
): void {
  rig.root.position.set(playerX, playerY, playerZ);
  rig.curFacingYaw = characterYaw;
  rig.facingPivot.rotation.y = characterYaw;

  if (combat.equippedWeaponId !== rig.lastEquippedWeapon) {
    rig.lastEquippedWeapon = combat.equippedWeaponId;
  }
  rig.pipeProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'steel_pipe';
  rig.bladeProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'scrap_blade';
  rig.pistolProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'service_pistol';
  rig.pistolProp.muzzleFlash.visible =
    combat.muzzleFlashVisible && combat.equippedWeaponId === 'service_pistol';

  const b = rig.bones;

  // Death ragdoll-collapse blend via skeleton (never snaps)
  rig.curDeadBlend = damp(rig.curDeadBlend, combat.playerDead ? 1 : 0, 8, dt);
  if (combat.playerDead) {
    const d = rig.curDeadBlend;
    rig.curHipDrop = damp(rig.curHipDrop, 0.36, 8, dt);
    rig.motionPivot.rotation.set(-1.38 * d, 0, 0.18 * d);
    rig.motionPivot.position.y = 0.14 * d;
    rig.curThighLRx = damp(rig.curThighLRx, -0.25, 8, dt);
    rig.curThighRRx = damp(rig.curThighRRx, -0.08, 8, dt);
    rig.curShinLRx = damp(rig.curShinLRx, 0.72, 8, dt);
    rig.curShinRRx = damp(rig.curShinRRx, 0.45, 8, dt);
    rig.curArmLRx = damp(rig.curArmLRx, -0.35, 8, dt);
    rig.curArmRRx = damp(rig.curArmRRx, -0.22, 8, dt);
    rig.curArmLRz = damp(rig.curArmLRz, 0.42, 8, dt);
    rig.curArmRRz = damp(rig.curArmRRz, -0.38, 8, dt);

    b.hips.position.y = b.hipsRestY - rig.curHipDrop;
    setBoneYXZ(b.thighL, rig.curThighLRx, 0, 0.08);
    setBoneYXZ(b.thighR, rig.curThighRRx, 0, -0.08);
    setBoneYXZ(b.shinL, rig.curShinLRx, 0, 0);
    setBoneYXZ(b.shinR, rig.curShinRRx, 0, 0);
    setBoneXZY(b.upperArmL, rig.curArmLRx, 0, rig.curArmLRz);
    setBoneXZY(b.upperArmR, rig.curArmRRx, 0, rig.curArmRRz);
    setBoneYXZ(b.forearmL, -0.45, 0, 0);
    setBoneYXZ(b.forearmR, -0.35, 0, 0);
    rig.shadowMat.opacity = 0.22;
    return;
  }

  // Keep root motionPivot clean (no whole-body faking!)
  rig.motionPivot.position.set(0, 0, 0);
  rig.motionPivot.rotation.set(0, 0, 0);
  rig.motionPivot.scale.set(1, 1, 1);

  // 1. Update high-level state weights with smooth overlapping velocity crossfades
  const speed = anim.actualSpeed;
  const moveActive = anim.isGrounded && anim.isMoving;
  let targetWalk = 0;
  let targetRun = 0;
  let targetSprint = 0;
  if (moveActive) {
    const moveRamp = THREE.MathUtils.clamp((speed - 0.3) / 1.4, 0, 1);
    const runFadeIn = smoothstep01((speed - 1.9) / 1.8);
    const sprintFadeIn = anim.isSprinting ? smoothstep01((speed - 4.3) / 2.5) : 0;
    targetWalk = moveRamp * (1 - runFadeIn);
    targetRun = runFadeIn * (1 - sprintFadeIn);
    targetSprint = sprintFadeIn;
  }

  // Detect start-walking & stop-walking transitions cleanly
  if (anim.isMoving && !rig.prevWasMoving && anim.isGrounded) {
    rig.startAccelImpulse = 1.0;
  } else if (!anim.isMoving && rig.prevWasMoving && anim.isGrounded) {
    rig.stopDecelImpulse = 1.0;
  }
  if (anim.speedDelta > 3.2 && anim.isGrounded) {
    rig.startAccelImpulse = Math.max(rig.startAccelImpulse, THREE.MathUtils.clamp(anim.speedDelta / 8, 0.3, 0.85));
  } else if (anim.speedDelta < -3.6 && anim.isGrounded) {
    rig.stopDecelImpulse = Math.max(rig.stopDecelImpulse, THREE.MathUtils.clamp(-anim.speedDelta / 8, 0.3, 0.85));
  }
  rig.prevWasMoving = anim.isMoving;
  rig.prevSpeed = speed;

  rig.startAccelImpulse = damp(rig.startAccelImpulse, 0, 6.5, dt);
  rig.stopDecelImpulse = damp(rig.stopDecelImpulse, 0, 7.5, dt);

  // Detect fresh hit reaction pulse
  if (combat.hurtFlash && !rig.prevHurtFlash) {
    rig.hitReactionImpulse = 1.0;
    rig.hitSign = -rig.hitSign;
  }
  rig.prevHurtFlash = combat.hurtFlash;
  rig.hitReactionImpulse = damp(rig.hitReactionImpulse, 0, 8.5, dt);

  rig.walkWeight = damp(rig.walkWeight, targetWalk, 11, dt);
  rig.runWeight = damp(rig.runWeight, targetRun, 11, dt);
  rig.sprintWeight = damp(rig.sprintWeight, targetSprint, 10, dt);
  rig.airWeight = damp(rig.airWeight, anim.isGrounded ? 0 : 1, 14, dt);
  rig.restWeight = damp(rig.restWeight, anim.isResting ? 1 : 0, 8, dt);

  const isPistol = combat.equippedWeaponId === 'service_pistol';
  const wantsAim = isPistol && (anim.isAiming || combat.isAttacking);
  const wantsCombatReady = anim.isAiming || isPistol || combat.isAttacking;
  rig.aimWeight = damp(rig.aimWeight, wantsAim ? 1 : 0, 14, dt);
  rig.combatReadyWeight = damp(rig.combatReadyWeight, wantsCombatReady ? 1 : 0, 10, dt);
  rig.curReloadBlend = damp(rig.curReloadBlend, combat.isReloading ? 1 : 0, 14, dt);

  const locoWeight = THREE.MathUtils.clamp(rig.walkWeight + rig.runWeight + rig.sprintWeight, 0, 1);
  const idleWeight = THREE.MathUtils.clamp(1 - locoWeight, 0, 1) * (1 - rig.airWeight);

  // 2. Idle breathing & subtle alert weight shift
  const breathAmp = anim.isExhausted ? 1.85 : 1.0;
  const breathSin = Math.sin(anim.breathPhase);
  const breathSlow = Math.sin(anim.breathPhase * 0.43);

  // 3. Velocity-coupled Gait Synthesis (Walk / Run / Sprint)
  const phase = anim.walkCycle;
  const sinP = Math.sin(phase);
  const cosP = Math.cos(phase);
  const sinP_R = Math.sin(phase + Math.PI);
  const cosP_R = Math.cos(phase + Math.PI);

  // Blend gait amplitudes smoothly by walk/run/sprint weights
  const thighAmp =
    rig.walkWeight * 0.36 +
    rig.runWeight * 0.56 +
    rig.sprintWeight * 0.78 +
    rig.startAccelImpulse * 0.08 * locoWeight;
  const kneeSwingAmp =
    rig.walkWeight * 0.62 +
    rig.runWeight * 0.96 +
    rig.sprintWeight * 1.24;
  const kneeStanceAmp =
    rig.walkWeight * 0.14 +
    rig.runWeight * 0.24 +
    rig.sprintWeight * 0.30;
  const armSwingAmp =
    rig.walkWeight * 0.34 +
    rig.runWeight * 0.62 +
    rig.sprintWeight * 0.92;
  const elbowBendBase =
    rig.walkWeight * 0.32 +
    rig.runWeight * 0.76 +
    rig.sprintWeight * 1.15;

  // Left & Right thigh swing (negative rx = leg forward)
  const locoThighL = -thighAmp * sinP + rig.startAccelImpulse * 0.14 * locoWeight * (1 - sinP);
  const locoThighR = -thighAmp * sinP_R;

  // Knee bends high during forward swing-through (cos > 0), cushions softly on stance (cos < 0)
  const swingKneeL = Math.max(0, cosP) * kneeSwingAmp;
  const stanceKneeL = Math.max(0, -cosP) * kneeStanceAmp + Math.max(0, -sinP) * kneeStanceAmp * 0.85;
  const locoShinL = Math.max(0.06, swingKneeL + stanceKneeL);

  const swingKneeR = Math.max(0, cosP_R) * kneeSwingAmp;
  const stanceKneeR = Math.max(0, -cosP_R) * kneeStanceAmp + Math.max(0, -sinP_R) * kneeStanceAmp * 0.85;
  const locoShinR = Math.max(0.06, swingKneeR + stanceKneeR);

  // Ankle: toes lift on heel strike (sin > 0 -> rx < 0), point slightly on push-off (sin < 0 -> rx > 0)
  const locoFootL = -sinP * (0.24 * locoWeight) - Math.max(0, cosP) * 0.18 * locoWeight;
  const locoFootR = -sinP_R * (0.24 * locoWeight) - Math.max(0, cosP_R) * 0.18 * locoWeight;

  // Lateral stride abduction when strafing/changing direction
  const strafeStep = anim.localStrafe * 0.16 * locoWeight;
  const locoThighLRz = 0.02 + Math.max(0, strafeStep) * Math.abs(sinP) * 0.75;
  const locoThighRRz = -0.02 + Math.min(0, strafeStep) * Math.abs(sinP_R) * 0.75;

  // Blend locomotion legs with idle & crouch/rest & airborne jump pose
  const idleKnee = 0.06 + rig.restWeight * 0.48 + rig.stopDecelImpulse * 0.12;
  const idleThigh = -0.03 - rig.restWeight * 0.28 - rig.stopDecelImpulse * 0.06;
  const airThighL = -0.34;
  const airThighR = 0.18;
  const airShinL = 0.68;
  const airShinR = 0.34;

  const tThighLRx =
    (idleThigh * idleWeight + locoThighL * locoWeight) * (1 - rig.airWeight) +
    airThighL * rig.airWeight;
  const tThighRRx =
    (idleThigh * idleWeight + locoThighR * locoWeight) * (1 - rig.airWeight) +
    airThighR * rig.airWeight;
  const tShinLRx =
    (idleKnee * idleWeight + locoShinL * locoWeight) * (1 - rig.airWeight) +
    airShinL * rig.airWeight;
  const tShinRRx =
    (idleKnee * idleWeight + locoShinR * locoWeight) * (1 - rig.airWeight) +
    airShinR * rig.airWeight;
  const tFootLRx =
    ((-idleThigh - idleKnee * 0.4) * idleWeight + locoFootL * locoWeight) * (1 - rig.airWeight) +
    0.22 * rig.airWeight;
  const tFootRRx =
    ((-idleThigh - idleKnee * 0.4) * idleWeight + locoFootR * locoWeight) * (1 - rig.airWeight) +
    0.28 * rig.airWeight;

  // Physically coupled hip drop so boots kiss ground cleanly without sinking or floating
  const effectiveLegLen = 0.37;
  const splayL = 1 - Math.cos(tThighLRx * 0.85);
  const splayR = 1 - Math.cos(tThighRRx * 0.85);
  const strideDrop = Math.max(splayL, splayR) * effectiveLegLen * 0.65;
  const kneeDrop =
    ((1 - Math.cos(Math.min(tShinLRx, tShinRRx) * 0.6)) * 0.18) *
    (1 - rig.airWeight);
  const landCushion = anim.landImpulse * 0.042;
  const restDrop = rig.restWeight * 0.075;
  const airLift = -rig.airWeight * 0.035;
  const tHipDrop = Math.max(-0.04, strideDrop + kneeDrop + landCushion + restDrop + airLift);

  // 4. Pelvis, Spine & Chest (forward lean, counter-twist, turn banking, start/stop momentum, hit reaction)
  const turnBank = THREE.MathUtils.clamp(anim.characterTurnRate * 0.045, -0.14, 0.14) * locoWeight;
  const strafeLean = -anim.localStrafe * 0.06 * locoWeight;
  const forwardLean =
    rig.walkWeight * 0.055 +
    rig.runWeight * 0.145 +
    rig.sprintWeight * 0.255 +
    rig.startAccelImpulse * 0.095 -
    rig.stopDecelImpulse * 0.045 +
    rig.restWeight * 0.18 +
    anim.landImpulse * 0.12;

  const hipTwist = sinP * (0.05 * rig.walkWeight + 0.08 * rig.runWeight + 0.115 * rig.sprintWeight);
  const torsoCounterTwist =
    -sinP * (0.065 * rig.walkWeight + 0.11 * rig.runWeight + 0.16 * rig.sprintWeight);

  // Hit reaction impulse (layered chest/spine stagger)
  const hitBack = -rig.hitReactionImpulse * 0.26;
  const hitTwist = rig.hitReactionImpulse * 0.24 * rig.hitSign;
  const hitTilt = rig.hitReactionImpulse * 0.18 * rig.hitSign;

  // Combat melee torso snap / pistol bladed stance
  let meleeWind = 0;
  let meleeStrike = 0;
  if (combat.isAttacking && !isPistol) {
    const p = combat.attackProgress;
    if (p < 0.28) {
      const k = p / 0.28;
      meleeWind = k * k;
    } else if (p < 0.56) {
      const k = (p - 0.28) / 0.28;
      meleeWind = 1 - k;
      meleeStrike = 1 - Math.pow(1 - k, 2.2);
    } else {
      const k = (p - 0.56) / 0.44;
      meleeStrike = 1 - k * k * (3 - 2 * k);
    }
  }
  const meleeChestYaw = -meleeWind * 0.34 + meleeStrike * 0.44;
  const meleeChestPitch = -meleeWind * 0.08 + meleeStrike * 0.22;

  const tHipSwayX = breathSlow * 0.004 * idleWeight + cosP * 0.008 * locoWeight;
  const tHipTiltZ =
    breathSlow * 0.014 * idleWeight +
    cosP * (0.028 * rig.walkWeight + 0.04 * rig.runWeight + 0.05 * rig.sprintWeight) +
    turnBank +
    strafeLean;

  const tSpineRx = forwardLean * 0.42 + breathSin * 0.012 * breathAmp * idleWeight + hitBack * 0.4;
  const tSpineRy = torsoCounterTwist * 0.4 + meleeChestYaw * 0.35 + hitTwist * 0.35;
  const tSpineRz = -tHipTiltZ * 0.45 + hitTilt * 0.35;

  const pistolStanceYaw = rig.aimWeight * 0.16;
  const aimPitchAssist = THREE.MathUtils.clamp(anim.aimPitch, -0.55, 0.48);

  const tChestRx =
    forwardLean * 0.58 +
    breathSin * 0.022 * breathAmp * idleWeight +
    meleeChestPitch +
    hitBack * 0.6 -
    rig.curRecoil * 0.08 -
    rig.aimWeight * aimPitchAssist * 0.22;
  const tChestRy =
    torsoCounterTwist * 0.6 +
    meleeChestYaw * 0.65 +
    pistolStanceYaw +
    hitTwist * 0.65 +
    THREE.MathUtils.clamp(anim.characterTurnRate * 0.05, -0.2, 0.2);
  const tChestRz = -tHipTiltZ * 0.55 + hitTilt * 0.65;

  // Head & Neck keep eyes stabilized toward travel / aim target
  const lookLeadYaw =
    THREE.MathUtils.clamp(anim.characterTurnRate * 0.12 + anim.yawRate * 0.06 * idleWeight, -0.36, 0.36) -
    pistolStanceYaw * 0.85 +
    breathSlow * 0.045 * idleWeight;
  const tHeadRx =
    -(tSpineRx + tChestRx) * 0.72 -
    aimPitchAssist * (0.45 * rig.aimWeight + 0.22 * idleWeight) +
    hitBack * 0.85 +
    rig.curReloadBlend * 0.22;
  const tHeadRy = lookLeadYaw - torsoCounterTwist * 0.45;
  const tHeadRz = hitTilt * 0.7 - turnBank * 0.4;

  // 5. Arms & Hands (Locomotion swing + Combat Stance + Pistol Two-Handed Aim + Melee + Reload + Hit Flinch)
  // Left Arm (swings forward when Right leg goes forward: sinP_R = -sinP -> negative rx swings arm forward)
  const locoArmLRx = armSwingAmp * sinP + 0.02;
  const locoForeLRx = -elbowBendBase - Math.max(0, -locoArmLRx) * 0.48 - 0.12;
  const locoArmLRz = 0.05 + rig.sprintWeight * 0.06;

  // Right Arm (swings forward when Left leg goes forward: -armSwingAmp * sinP)
  const locoArmRRx = -armSwingAmp * sinP + 0.02;
  const locoForeRRx = -elbowBendBase - Math.max(0, -locoArmRRx) * 0.48 - 0.12;
  const locoArmRRz = -0.05 - rig.sprintWeight * 0.06;

  // Idle relaxed arm stance (slightly forward & clear of jacket pockets)
  const idleArmLRx = -0.04 + breathSin * 0.014;
  const idleArmLRz = 0.045 + breathSin * 0.012 * breathAmp;
  const idleForeLRx = -0.22 - rig.restWeight * 0.25;

  const idleArmRRx = -0.05 + breathSin * 0.014;
  const idleArmRRz = -0.045 - breathSin * 0.012 * breathAmp;
  const idleForeRRx = -0.24 - rig.restWeight * 0.25;

  let tArmLRx = idleArmLRx * idleWeight + locoArmLRx * locoWeight;
  let tArmLRy = 0;
  let tArmLRz = idleArmLRz * idleWeight + locoArmLRz * locoWeight;
  let tForeLRx = idleForeLRx * idleWeight + locoForeLRx * locoWeight;

  let tArmRRx = idleArmRRx * idleWeight + locoArmRRx * locoWeight;
  let tArmRRy = 0;
  let tArmRRz = idleArmRRz * idleWeight + locoArmRRz * locoWeight;
  let tForeRRx = idleForeRRx * idleWeight + locoForeRRx * locoWeight;

  let tHandRRx = 0;
  let tHandRRy = 0;
  let tHandRRz = 0;

  // Recoil curve
  const targetRecoil =
    combat.isAttacking && isPistol ? Math.sin((1 - combat.attackProgress) * Math.PI) : 0;
  rig.curRecoil = damp(rig.curRecoil, targetRecoil, 28, dt);

  if (isPistol) {
    // Low-ready tactical pistol carry when walking/idle, rising smoothly to full 2-handed aim when firing/aiming
    const lowReadyR_rx = -0.38 - locoArmRRx * 0.22;
    const lowReadyR_fore = -0.85;
    const lowReadyR_rz = -0.06;

    const aimArmR_rx = -1.36 - aimPitchAssist * 0.72 + rig.curRecoil * 0.26;
    const aimArmR_ry = 0.14;
    const aimArmR_rz = 0.14;
    const aimForeR_rx = -0.18 - rig.curRecoil * 0.22;
    const aimHandR_rx = 0.06 + rig.curRecoil * 0.16;

    const aimArmL_rx = -1.16 - aimPitchAssist * 0.65 + rig.curRecoil * 0.14;
    const aimArmL_ry = -0.36;
    const aimArmL_rz = -0.34;
    const aimForeL_rx = -0.68;

    const readyBlend = THREE.MathUtils.clamp(0.45 + rig.combatReadyWeight * 0.35 - rig.sprintWeight * 0.25, 0.2, 0.8);
    const baseR_rx = THREE.MathUtils.lerp(tArmRRx, lowReadyR_rx, readyBlend);
    const baseR_fore = THREE.MathUtils.lerp(tForeRRx, lowReadyR_fore, readyBlend);
    const baseR_rz = THREE.MathUtils.lerp(tArmRRz, lowReadyR_rz, readyBlend);

    tArmRRx = THREE.MathUtils.lerp(baseR_rx, aimArmR_rx, rig.aimWeight);
    tArmRRy = THREE.MathUtils.lerp(0, aimArmR_ry, rig.aimWeight);
    tArmRRz = THREE.MathUtils.lerp(baseR_rz, aimArmR_rz, rig.aimWeight);
    tForeRRx = THREE.MathUtils.lerp(baseR_fore, aimForeR_rx, rig.aimWeight);
    tHandRRx = THREE.MathUtils.lerp(0.55 * readyBlend, aimHandR_rx, rig.aimWeight);

    tArmLRx = THREE.MathUtils.lerp(tArmLRx, aimArmL_rx, rig.aimWeight);
    tArmLRy = THREE.MathUtils.lerp(0, aimArmL_ry, rig.aimWeight);
    tArmLRz = THREE.MathUtils.lerp(tArmLRz, aimArmL_rz, rig.aimWeight);
    tForeLRx = THREE.MathUtils.lerp(tForeLRx, aimForeL_rx, rig.aimWeight);

    if (rig.curReloadBlend > 0.02) {
      const rl = rig.curReloadBlend;
      const magPulse = combat.isReloading ? Math.sin(Date.now() * 0.011) * 0.14 : 0;
      tArmRRx = THREE.MathUtils.lerp(tArmRRx, -0.72 + magPulse * 0.4, rl);
      tArmRRz = THREE.MathUtils.lerp(tArmRRz, 0.18, rl);
      tForeRRx = THREE.MathUtils.lerp(tForeRRx, -1.08, rl);
      tHandRRz = THREE.MathUtils.lerp(tHandRRz, -0.45, rl);
      tArmLRx = THREE.MathUtils.lerp(tArmLRx, -0.78 - magPulse, rl);
      tArmLRz = THREE.MathUtils.lerp(tArmLRz, -0.32, rl);
      tForeLRx = THREE.MathUtils.lerp(tForeLRx, -1.02 - magPulse * 0.8, rl);
    }
  } else {
    // Melee weapon hold & 3-phase swing (windup -> strike -> recovery)
    const guardBlend = THREE.MathUtils.clamp(rig.combatReadyWeight * 0.55 * (1 - rig.sprintWeight * 0.6), 0, 0.65);
    tArmRRx = THREE.MathUtils.lerp(tArmRRx, -0.26, guardBlend);
    tForeRRx = THREE.MathUtils.lerp(tForeRRx, -0.72, guardBlend);
    tArmLRx = THREE.MathUtils.lerp(tArmLRx, -0.18, guardBlend * 0.7);
    tForeLRx = THREE.MathUtils.lerp(tForeLRx, -0.48, guardBlend * 0.7);

    const activeSwing = meleeWind + meleeStrike;
    if (activeSwing > 0.005) {
      const swingArmRx = meleeWind * 0.42 - meleeStrike * 1.48;
      const swingArmRz = -meleeWind * 0.52 + meleeStrike * 0.36;
      const swingForeRx = -meleeWind * 1.08 - meleeStrike * 0.24;
      const swingHandRx = meleeWind * 0.22 - meleeStrike * 0.48;
      const swingW = THREE.MathUtils.clamp(activeSwing * 1.25, 0, 1);

      tArmRRx = THREE.MathUtils.lerp(tArmRRx, swingArmRx, swingW);
      tArmRRy = THREE.MathUtils.lerp(tArmRRy, meleeStrike * 0.28, swingW);
      tArmRRz = THREE.MathUtils.lerp(tArmRRz, swingArmRz, swingW);
      tForeRRx = THREE.MathUtils.lerp(tForeRRx, swingForeRx, swingW);
      tHandRRx = THREE.MathUtils.lerp(tHandRRx, swingHandRx, swingW);
      // Left arm balances body during swing
      tArmLRx = THREE.MathUtils.lerp(tArmLRx, -0.35 + meleeStrike * 0.55, swingW * 0.75);
      tArmLRz = THREE.MathUtils.lerp(tArmLRz, 0.26, swingW * 0.75);
      tForeLRx = THREE.MathUtils.lerp(tForeLRx, -0.72, swingW * 0.75);
    }
  }

  // Layer subtle airborne & hit-flinch arm reactions
  if (rig.airWeight > 0.02) {
    tArmLRz += rig.airWeight * 0.22;
    tArmRRz -= rig.airWeight * 0.22;
  }
  if (rig.hitReactionImpulse > 0.02) {
    tArmLRz += rig.hitReactionImpulse * 0.24;
    tArmRRz -= rig.hitReactionImpulse * 0.24;
    tArmLRx -= rig.hitReactionImpulse * 0.16;
    tArmRRx -= rig.hitReactionImpulse * 0.16;
  }

  // 6. Smoothly damp every bone channel for snap-free blending across all transitions
  const legRate = 18;
  const torsoRate = 15;
  const armRate = combat.isAttacking ? 30 : 16;

  rig.curHipDrop = damp(rig.curHipDrop, tHipDrop, 18, dt);
  rig.curHipSwayX = damp(rig.curHipSwayX, tHipSwayX, 14, dt);
  rig.curHipTwistY = damp(rig.curHipTwistY, hipTwist, 16, dt);
  rig.curHipTiltZ = damp(rig.curHipTiltZ, tHipTiltZ, 15, dt);

  rig.curSpineRx = damp(rig.curSpineRx, tSpineRx, torsoRate, dt);
  rig.curSpineRy = damp(rig.curSpineRy, tSpineRy, torsoRate, dt);
  rig.curSpineRz = damp(rig.curSpineRz, tSpineRz, torsoRate, dt);

  rig.curChestRx = damp(rig.curChestRx, tChestRx, torsoRate, dt);
  rig.curChestRy = damp(rig.curChestRy, tChestRy, torsoRate, dt);
  rig.curChestRz = damp(rig.curChestRz, tChestRz, torsoRate, dt);

  rig.curHeadRx = damp(rig.curHeadRx, tHeadRx, 16, dt);
  rig.curHeadRy = damp(rig.curHeadRy, tHeadRy, 15, dt);
  rig.curHeadRz = damp(rig.curHeadRz, tHeadRz, 15, dt);

  rig.curThighLRx = damp(rig.curThighLRx, tThighLRx, legRate, dt);
  rig.curThighRRx = damp(rig.curThighRRx, tThighRRx, legRate, dt);
  rig.curThighLRz = damp(rig.curThighLRz, locoThighLRz, legRate, dt);
  rig.curThighRRz = damp(rig.curThighRRz, locoThighRRz, legRate, dt);
  rig.curShinLRx = damp(rig.curShinLRx, tShinLRx, legRate, dt);
  rig.curShinRRx = damp(rig.curShinRRx, tShinRRx, legRate, dt);
  rig.curFootLRx = damp(rig.curFootLRx, tFootLRx, legRate, dt);
  rig.curFootRRx = damp(rig.curFootRRx, tFootRRx, legRate, dt);

  rig.curArmLRx = damp(rig.curArmLRx, tArmLRx, armRate, dt);
  rig.curArmLRy = damp(rig.curArmLRy, tArmLRy, armRate, dt);
  rig.curArmLRz = damp(rig.curArmLRz, tArmLRz, armRate, dt);
  rig.curForeLRx = damp(rig.curForeLRx, tForeLRx, armRate, dt);

  rig.curArmRRx = damp(rig.curArmRRx, tArmRRx, armRate, dt);
  rig.curArmRRy = damp(rig.curArmRRy, tArmRRy, armRate, dt);
  rig.curArmRRz = damp(rig.curArmRRz, tArmRRz, armRate, dt);
  rig.curForeRRx = damp(rig.curForeRRx, tForeRRx, armRate, dt);
  rig.curHandRRx = damp(rig.curHandRRx, tHandRRx, armRate, dt);
  rig.curHandRRy = damp(rig.curHandRRy, tHandRRy, armRate, dt);
  rig.curHandRRz = damp(rig.curHandRRz, tHandRRz, armRate, dt);

  // 7. Apply posed transforms directly to skeleton bones (zero allocations)
  b.hips.position.set(rig.curHipSwayX, b.hipsRestY - rig.curHipDrop, 0);
  setBoneYXZ(b.hips, 0, rig.curHipTwistY, rig.curHipTiltZ);
  setBoneYXZ(b.spine, rig.curSpineRx, rig.curSpineRy, rig.curSpineRz);
  setBoneYXZ(b.chest, rig.curChestRx, rig.curChestRy, rig.curChestRz);
  setBoneYXZ(b.neck, rig.curHeadRx * 0.35, rig.curHeadRy * 0.35, rig.curHeadRz * 0.35);
  setBoneYXZ(b.head, rig.curHeadRx * 0.65, rig.curHeadRy * 0.65, rig.curHeadRz * 0.65);

  setBoneYXZ(b.thighL, rig.curThighLRx, 0, rig.curThighLRz);
  setBoneYXZ(b.thighR, rig.curThighRRx, 0, rig.curThighRRz);
  setBoneYXZ(b.shinL, rig.curShinLRx, 0, 0);
  setBoneYXZ(b.shinR, rig.curShinRRx, 0, 0);
  setBoneYXZ(b.footL, rig.curFootLRx, 0, -rig.curThighLRz * 0.5);
  setBoneYXZ(b.footR, rig.curFootRRx, 0, -rig.curThighRRz * 0.5);

  setBoneXZY(b.upperArmL, rig.curArmLRx, rig.curArmLRy, rig.curArmLRz);
  setBoneYXZ(b.forearmL, rig.curForeLRx, 0, 0);
  setBoneYXZ(b.handL, 0, 0, 0);

  setBoneXZY(b.upperArmR, rig.curArmRRx, rig.curArmRRy, rig.curArmRRz);
  setBoneYXZ(b.forearmR, rig.curForeRRx, 0, 0);
  setBoneYXZ(b.handR, rig.curHandRRx, rig.curHandRRy, rig.curHandRRz);

  // Align pistol barrel cleanly with aim direction when two-handed aiming
  if (isPistol) {
    rig.pistolProp.group.rotation.set(
      THREE.MathUtils.lerp(0.28, 0.05, rig.aimWeight),
      THREE.MathUtils.lerp(0.0, -0.12, rig.aimWeight),
      0
    );
  }

  // Subtle shadow disc response when jumping
  const shadowScale = THREE.MathUtils.clamp(1 - anim.landImpulse * 0.1 - rig.airWeight * 0.18, 0.72, 1.05);
  rig.shadowDisc.scale.setScalar(shadowScale);
  rig.shadowMat.opacity = anim.isGrounded ? 0.42 : 0.25;

  // Damage flash tint
  rig.curHitFlash = damp(rig.curHitFlash, combat.hurtFlash ? 1 : 0, 14, dt);
  if (rig.curHitFlash > 0.02) {
    for (const mat of rig.materials) {
      mat.emissive.setRGB(rig.curHitFlash * 0.36, 0, 0);
    }
  } else {
    for (const mat of rig.materials) {
      mat.emissive.setRGB(0, 0, 0);
    }
  }
}
