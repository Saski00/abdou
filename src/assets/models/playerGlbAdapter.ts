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
  animationClipCount: number;
  heightMeters: number;
}

export interface PlayerGlbRig {
  root: THREE.Group;
  motionPivot: THREE.Group;
  facingPivot: THREE.Group;
  lod: THREE.LOD;
  highMesh: THREE.Mesh;
  lowMesh: THREE.Mesh;
  materials: THREE.MeshStandardMaterial[];
  weaponAnchor: THREE.Group;
  pipeProp: ReturnType<typeof buildFirstPersonMeleePipe>;
  bladeProp: ReturnType<typeof buildFirstPersonCombatBlade>;
  pistolProp: ReturnType<typeof buildFirstPersonServicePistol>;
  shadowDisc: THREE.Mesh;
  shadowMat: THREE.MeshBasicMaterial;
  info: GlbPlayerInfo;
  // Single-writer procedural locomotion channels
  curFacingYaw: number;
  curLeanX: number;
  curBankZ: number;
  curBobY: number;
  curSquashY: number;
  curHitFlash: number;
  curWeaponSwing: number;
  curRecoil: number;
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
    // 0: Skin (warm grounded survivor skin, matte organic roughness)
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
    // 1: Hair (natural dark chestnut brown)
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
    // 2: Survival Field Jacket (dark olive drab)
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
    // 3: Inner Henley Shirt (faded dirty beige-gray)
    new THREE.MeshStandardMaterial({
      name: 'player_shirt',
      color: 0x797468,
      map: tex.shirtMap,
      bumpMap: tex.jacketBump,
      bumpScale: 0.005,
      roughness: 0.90,
      metalness: 0.01,
      vertexColors: true,
      envMapIntensity: 0.26,
    }),
    // 4: Survival Backpack & Straps (muted rugged brown)
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
    // 5: Belt & Leather Gear Trim (dark oiled leather + matte buckle)
    new THREE.MeshStandardMaterial({
      name: 'player_belt',
      color: 0x2c241e,
      map: tex.leatherMap,
      roughness: 0.56,
      metalness: 0.16,
      vertexColors: true,
      envMapIntensity: 0.45,
    }),
    // 6: Cargo Trousers (charcoal slate navy)
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
    // 7: Combat Boots (scuffed dark brown-black leather)
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

function classifyCanonicalTriangle(cx: number, cy: number, cz: number): number {
  if (cy < -0.440) return MAT_BOOTS;

  const absX = Math.abs(cx);
  if (cy < -0.048) {
    if (absX > 0.122 && cy >= -0.130) {
      return MAT_SKIN;
    }
    return MAT_PANTS;
  }

  // Head & neck (including subtle collar transition)
  if (cy >= 0.342 || (cy >= 0.325 && absX < 0.056 && cz > -0.062)) {
    const backT = THREE.MathUtils.clamp((0.042 - cz) / 0.075, 0, 1);
    const templeT = THREE.MathUtils.clamp((absX - 0.036) / 0.025, 0, 1);
    const hairLineY = 0.444 - backT * 0.058 - templeT * 0.026;
    return cy > hairLineY ? MAT_HAIR : MAT_SKIN;
  }

  // Hands emerging below jacket cuffs
  if (absX > 0.124 && cy < -0.034) {
    return MAT_SKIN;
  }

  // Survival backpack body & front chest straps
  if (cy >= -0.025 && cy <= 0.295 && absX <= 0.088 && cz < -0.070) {
    return MAT_BACKPACK;
  }
  if (cy >= 0.085 && cy <= 0.315 && absX >= 0.044 && absX <= 0.068 && cz > 0.042) {
    return MAT_BACKPACK;
  }

  // Waist belt & buckle
  if (cy >= -0.052 && cy <= -0.022 && absX <= 0.124) {
    return MAT_BELT;
  }

  // Inner Henley shirt inside open jacket V-front
  if (cy >= -0.022 && cy <= 0.332 && cz > 0.015) {
    const vHalfWidth = 0.024 + Math.max(0, cy - 0.12) * 0.075;
    if (absX <= vHalfWidth) {
      return MAT_SHIRT;
    }
  }

  return MAT_JACKET;
}

/**
 * Generates a fast voxel-clustered LOD1 geometry (~20k–30k triangles) from the prepared
 * full-detail BufferGeometry, preserving normals, UVs, vertex colors, and all 8 material groups.
 */
function buildSimplifiedLodGeometry(srcGeo: THREE.BufferGeometry): THREE.BufferGeometry {
  const srcPos = srcGeo.attributes.position;
  const srcNor = srcGeo.attributes.normal;
  const srcUv = srcGeo.attributes.uv;
  const srcCol = srcGeo.attributes.color;
  const srcIdx = srcGeo.index;
  if (!srcPos || !srcIdx) return srcGeo;

  const gridInv = 88; // ~1.13 cm canonical cell -> ~2.0 cm world cell (~12k verts, ~25k tris)
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

  for (let i = 0; i < srcPos.count; i++) {
    const x = srcPos.getX(i);
    const y = srcPos.getY(i);
    const z = srcPos.getZ(i);
    const gx = Math.round((x + 0.5) * gridInv);
    const gy = Math.round((y + 0.6) * gridInv);
    const gz = Math.round((z + 0.5) * gridInv);
    const key = gx + gy * 256 + gz * 65536;

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

  for (let r = 0; r < vCount; r++) {
    const inv = 1 / accCnt[r];
    posArr[r * 3] = accX[r] * inv;
    posArr[r * 3 + 1] = accY[r] * inv;
    posArr[r * 3 + 2] = accZ[r] * inv;

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
  }

  const outIndices: number[] = [];
  const lowGeo = new THREE.BufferGeometry();
  lowGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  lowGeo.setAttribute('normal', new THREE.BufferAttribute(norArr, 3));
  lowGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  lowGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

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
  let hasSkeleton = false;

  rawScene.traverse((child) => {
    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      hasSkeleton = true;
    }
    if ((child as THREE.Mesh).isMesh) {
      meshCount += 1;
      if (!sourceMesh) {
        sourceMesh = child as THREE.Mesh;
      }
    }
  });

  if (!sourceMesh) return null;

  const srcGeo = (sourceMesh as THREE.Mesh).geometry;
  const pos = srcGeo.attributes.position;
  const srcIdx = srcGeo.index;
  if (!pos || !srcIdx) return null;

  const highGeo = srcGeo.clone();
  if (!highGeo.attributes.normal) {
    highGeo.computeVertexNormals();
  }
  const nor = highGeo.attributes.normal;

  // Compute exact canonical bounds before grounding/scaling
  highGeo.computeBoundingBox();
  const minY = highGeo.boundingBox?.min.y ?? -0.49934;
  const maxY = highGeo.boundingBox?.max.y ?? 0.49952;
  const canonicalHeight = Math.max(0.01, maxY - minY);

  // Generate seamless continuous UVs + anatomical survival-horror vertex AO/detail
  const uvArr = new Float32Array(pos.count * 2);
  const colArr = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ny = nor ? nor.getY(i) : 0;

    // Seamless projection across shared indexed vertices (zero UV seams)
    uvArr[i * 2] = (x * 0.85 + z * 0.52) * 3.2;
    uvArr[i * 2 + 1] = (y - minY) * 3.2;

    // Hemisphere bounce baseline so folds and face stay legible under night/indoor lights
    let r = 0.88 + 0.12 * THREE.MathUtils.clamp(ny * 0.5 + 0.5, 0, 1);
    let g = r;
    let b = r;

    const absX = Math.abs(x);

    if (y >= 0.342) {
      const backT = THREE.MathUtils.clamp((0.042 - z) / 0.075, 0, 1);
      const templeT = THREE.MathUtils.clamp((absX - 0.036) / 0.025, 0, 1);
      const hairLineY = 0.444 - backT * 0.058 - templeT * 0.026;

      if (y > hairLineY) {
        // Hair crown highlight + root nape depth
        const crown = THREE.MathUtils.clamp((y - 0.388) / 0.1, 0.72, 1.05);
        r *= crown;
        g *= crown;
        b *= crown;
      } else {
        // Realistic facial contour & subtle feature definition
        const eyeDistL = Math.hypot((x - 0.02) * 1.15, (y - 0.425) * 1.55);
        const eyeDistR = Math.hypot((x + 0.02) * 1.15, (y - 0.425) * 1.55);
        const eyeDist = Math.min(eyeDistL, eyeDistR);
        if (z > 0.058 && eyeDist < 0.015) {
          // Eye socket + subtle dark iris center
          const irisT = eyeDist < 0.0055 ? 0.38 : THREE.MathUtils.lerp(0.68, 0.96, eyeDist / 0.015);
          r *= irisT;
          g *= irisT * 0.96;
          b *= irisT * 0.96;
        }
        // Subtle eyebrow ridge
        if (z > 0.064 && absX > 0.009 && absX < 0.034 && y >= 0.436 && y <= 0.444) {
          r *= 0.62;
          g *= 0.58;
          b *= 0.55;
        }
        // Subtle lip & chin stubble shadow
        if (z > 0.064 && absX < 0.018 && y >= 0.387 && y <= 0.397) {
          r *= 0.84;
          g *= 0.76;
          b *= 0.74;
        }
        // Under-jaw & neck crease AO
        if (y < 0.372 && z < 0.05) {
          r *= 0.76;
          g *= 0.74;
          b *= 0.74;
        }
      }
    } else if (y < -0.440) {
      // Combat boots: dark rubber sole at bottom + worn heel/toe cap
      if (y < -0.478) {
        r *= 0.52;
        g *= 0.50;
        b *= 0.49;
      } else if (z > 0.075) {
        r *= 0.85;
        g *= 0.82;
        b *= 0.78;
      }
    } else if (y < -0.048) {
      if (absX > 0.122 && y >= -0.130) {
        // Hands: subtle palm/knuckle grime
        const tipT = THREE.MathUtils.clamp((-0.075 - y) / 0.05, 0, 1);
        r *= 0.94 - tipT * 0.1;
        g *= 0.91 - tipT * 0.12;
        b *= 0.89 - tipT * 0.13;
      } else {
        // Cargo trousers: waist shadow, pocket seams, knee wear, muddy lower hems
        if (y > -0.085) {
          r *= 0.82;
          g *= 0.81;
          b *= 0.80;
        }
        if (y >= -0.275 && y <= -0.215 && z > -0.01) {
          // Subtle faded knee wear
          r *= 1.07;
          g *= 1.04;
          b *= 0.98;
        }
        if (y <= -0.365) {
          // Street mud & dust around ankles
          const mud = THREE.MathUtils.clamp((-0.365 - y) / 0.075, 0, 1);
          r *= 0.92 - mud * 0.12;
          g *= 0.89 - mud * 0.15;
          b *= 0.84 - mud * 0.19;
        }
      }
    } else {
      // Upper body: backpack seam/pocket shadows, belt buckle, jacket hem/collar AO
      if (y >= -0.052 && y <= -0.022 && absX < 0.024 && z > 0.075) {
        // Brushed dark steel belt buckle
        r *= 1.18;
        g *= 1.16;
        b *= 1.14;
      } else if (y >= -0.025 && y <= 0.295 && absX <= 0.088 && czOrZ(z) < -0.070) {
        // Backpack horizontal zipper seams & side edge AO
        const edge = THREE.MathUtils.clamp((absX - 0.068) / 0.02, 0, 1);
        const zipSeam = Math.abs(y - 0.12) < 0.008 || Math.abs(y - 0.21) < 0.008 ? 0.72 : 1.0;
        r *= (0.98 - edge * 0.2) * zipSeam;
        g *= (0.96 - edge * 0.2) * zipSeam;
        b *= (0.94 - edge * 0.2) * zipSeam;
      } else {
        // Jacket folds, underarm & lower hem weathering
        if (y < -0.015) {
          r *= 0.84;
          g *= 0.82;
          b *= 0.79;
        }
        if (absX > 0.115 && absX < 0.145 && y > 0.08 && y < 0.24) {
          // Underarm crease AO
          r *= 0.80;
          g *= 0.79;
          b *= 0.78;
        }
      }
    }

    colArr[i * 3] = THREE.MathUtils.clamp(r, 0.35, 1.15);
    colArr[i * 3 + 1] = THREE.MathUtils.clamp(g, 0.35, 1.15);
    colArr[i * 3 + 2] = THREE.MathUtils.clamp(b, 0.35, 1.15);
  }

  highGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  highGeo.setAttribute('color', new THREE.BufferAttribute(colArr, 3));

  // Classify every triangle into its 8 material buckets and sort index buffer once
  const triCount = srcIdx.count / 3;
  const buckets: number[][] = Array.from({ length: 8 }, () => []);
  for (let t = 0; t < triCount; t++) {
    const a = srcIdx.getX(t * 3);
    const b = srcIdx.getX(t * 3 + 1);
    const c = srcIdx.getX(t * 3 + 2);
    const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3;
    const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
    const cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
    const matIdx = classifyCanonicalTriangle(cx, cy, cz);
    buckets[matIdx].push(a, b, c);
  }

  const sortedIndices = new Uint32Array(srcIdx.count);
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

  const lowGeo = buildSimplifiedLodGeometry(highGeo);

  cachedPreparedHighGeo = highGeo;
  cachedPreparedLowGeo = lowGeo;
  cachedInfo = {
    meshCount,
    vertexCount: pos.count,
    triangleCount: triCount,
    lod1TriangleCount: lowGeo.index ? lowGeo.index.count / 3 : triCount,
    materialGroups: [...PLAYER_GROUP_LABELS],
    hasSkeleton,
    animationClipCount: 0,
    heightMeters: canonicalHeight * 1.78,
  };

  return { highGeo, lowGeo, info: cachedInfo };
}

function czOrZ(z: number): number {
  return z;
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

  // Soft ground contact shadow disc (cheap grounding cue, zero shadow-map cost)
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

  const highMesh = new THREE.Mesh(highGeo, materials);
  highMesh.castShadow = true;
  highMesh.receiveShadow = true;

  const lowMesh = new THREE.Mesh(lowGeo, materials);
  lowMesh.castShadow = true;
  lowMesh.receiveShadow = true;

  const lod = new THREE.LOD();
  lod.addLevel(highMesh, 0);
  lod.addLevel(lowMesh, 8.5);
  modelHolder.add(lod);

  // Right-hand weapon mount (in facingPivot/motionPivot space so weapons move with survivor)
  // Character faces -Z in facingPivot space; GLB right hand (+X in GLB -> -X after 180° Y rot? Wait:
  // GLB +X after Math.PI Y-rotation becomes -X! GLB right hand (x=-0.165 in +Z-facing? Wait:
  // When facing +Z, character's RIGHT side is -X! After rotating Math.PI around Y, (-X, +Z) -> (+X, -Z)!)
  const weaponAnchor = new THREE.Group();
  weaponAnchor.position.set(0.28, (0.0 - minY - 0.068) * scale, -0.08);
  motionPivot.add(weaponAnchor);

  const pipeProp = buildFirstPersonMeleePipe();
  pipeProp.group.scale.setScalar(0.56);
  pipeProp.leftArmPivot.visible = false;
  pipeProp.group.position.set(0, 0.04, -0.04);
  pipeProp.group.rotation.set(-0.32, 0.06, 0.06);
  weaponAnchor.add(pipeProp.group);

  const bladeProp = buildFirstPersonCombatBlade();
  bladeProp.group.scale.setScalar(0.62);
  bladeProp.leftArmPivot.visible = false;
  bladeProp.group.position.set(0, 0.03, -0.04);
  bladeProp.group.rotation.set(-0.2, 0.04, 0.06);
  bladeProp.group.visible = false;
  weaponAnchor.add(bladeProp.group);

  const pistolProp = buildFirstPersonServicePistol();
  pistolProp.group.scale.setScalar(0.66);
  pistolProp.leftArmPivot.visible = false;
  pistolProp.muzzleFlash.visible = false;
  pistolProp.group.position.set(0, 0.04, -0.06);
  pistolProp.group.rotation.set(0.05, 0, 0);
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
    lod,
    highMesh,
    lowMesh,
    materials,
    weaponAnchor,
    pipeProp,
    bladeProp,
    pistolProp,
    shadowDisc,
    shadowMat,
    info: fullInfo,
    curFacingYaw: 0,
    curLeanX: 0,
    curBankZ: 0,
    curBobY: 0,
    curSquashY: 1,
    curHitFlash: 0,
    curWeaponSwing: 0,
    curRecoil: 0,
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
  // On low quality, swap LOD thresholds so lowMesh (~25k tris) is active at all distances
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

  // Sync active right-hand weapon prop
  if (combat.equippedWeaponId !== rig.lastEquippedWeapon) {
    rig.lastEquippedWeapon = combat.equippedWeaponId;
  }
  rig.pipeProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'steel_pipe';
  rig.bladeProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'scrap_blade';
  rig.pistolProp.group.visible = !combat.playerDead && combat.equippedWeaponId === 'service_pistol';
  rig.pistolProp.muzzleFlash.visible =
    combat.muzzleFlashVisible && combat.equippedWeaponId === 'service_pistol';

  if (combat.playerDead) {
    rig.curLeanX = damp(rig.curLeanX, -1.35, 8, dt);
    rig.curBobY = damp(rig.curBobY, 0.14, 8, dt);
    rig.curBankZ = damp(rig.curBankZ, 0.22, 8, dt);
    rig.motionPivot.rotation.set(rig.curLeanX, 0, rig.curBankZ);
    rig.motionPivot.position.y = rig.curBobY;
    rig.motionPivot.scale.set(1, 1, 1);
    return;
  }

  // Grounded locomotion motion (never sinks into terrain; stride peaks lift slightly from y=0)
  const moveBlend = THREE.MathUtils.clamp(anim.normalizedSpeed * 1.4, 0, 1);
  const sprintBlend = anim.isSprinting ? 1 : 0;

  let targetBobY = 0;
  let targetLeanX = 0;
  let targetBankZ = 0;
  let targetSquashY = 1;

  if (!anim.isGrounded) {
    targetBobY = 0.02;
    targetLeanX = -0.05;
    targetSquashY = 1.015;
  } else if (anim.isMoving) {
    const strideWave = Math.abs(Math.sin(anim.walkCycle * 0.5));
    const swayWave = Math.cos(anim.walkCycle * 0.5);
    const bobAmp = sprintBlend > 0.5 ? 0.045 : 0.026;
    targetBobY = strideWave * bobAmp * moveBlend;
    targetLeanX = -(0.045 + sprintBlend * 0.095) * moveBlend;
    targetBankZ = swayWave * (0.024 + sprintBlend * 0.018) * moveBlend - anim.strafeFactor * 0.025;
  } else if (anim.isResting) {
    targetBobY = 0;
    targetLeanX = -0.03;
    targetSquashY = 0.96 + Math.sin(anim.breathPhase) * 0.008;
  } else {
    // Subtle idle breathing
    targetBobY = 0;
    targetLeanX = Math.sin(anim.breathPhase * 0.5) * 0.008;
    targetSquashY = 1 + Math.sin(anim.breathPhase) * 0.006;
  }

  // Landing cushion
  targetBobY = Math.max(0, targetBobY - anim.landImpulse * 0.04);
  targetSquashY -= anim.landImpulse * 0.045;

  rig.curBobY = damp(rig.curBobY, targetBobY, 16, dt);
  rig.curLeanX = damp(rig.curLeanX, targetLeanX, 12, dt);
  rig.curBankZ = damp(rig.curBankZ, targetBankZ, 12, dt);
  rig.curSquashY = damp(rig.curSquashY, targetSquashY, 15, dt);

  rig.motionPivot.position.y = rig.curBobY;
  rig.motionPivot.rotation.set(rig.curLeanX, 0, rig.curBankZ);
  const invXZ = 1 / Math.sqrt(Math.max(0.85, rig.curSquashY));
  rig.motionPivot.scale.set(invXZ, rig.curSquashY, invXZ);

  // Subtle shadow disc response when jumping
  const shadowScale = THREE.MathUtils.clamp(1 - anim.landImpulse * 0.1, 0.72, 1.05);
  rig.shadowDisc.scale.setScalar(shadowScale);
  rig.shadowMat.opacity = anim.isGrounded ? 0.42 : 0.25;

  // Right-hand weapon animation (swing/slash/recoil/sprint carry)
  let targetSwing = 0;
  let targetRecoil = 0;
  if (combat.isAttacking) {
    if (combat.equippedWeaponId === 'service_pistol') {
      targetRecoil = Math.sin((1 - combat.attackProgress) * Math.PI);
    } else {
      targetSwing = Math.sin(combat.attackProgress * Math.PI);
    }
  }
  rig.curWeaponSwing = damp(rig.curWeaponSwing, targetSwing, 26, dt);
  rig.curRecoil = damp(rig.curRecoil, targetRecoil, 28, dt);

  const reloadDip = combat.isReloading ? Math.sin(Date.now() * 0.012) * 0.16 - 0.14 : 0;
  const carryBob = anim.isMoving ? Math.sin(anim.walkCycle) * 0.025 * moveBlend : 0;
  const pistolReadyLift = combat.equippedWeaponId === 'service_pistol' ? 0.06 : 0;
  rig.weaponAnchor.position.set(
    0.28 + rig.curWeaponSwing * 0.06,
    0.78 + pistolReadyLift + carryBob * 0.5 + rig.curWeaponSwing * 0.14 + reloadDip * 0.08,
    -0.08 - pistolReadyLift * 0.7 - rig.curWeaponSwing * 0.18 + rig.curRecoil * 0.05
  );
  rig.weaponAnchor.rotation.set(
    -rig.curWeaponSwing * 1.15 + rig.curRecoil * 0.35 + reloadDip * 0.4,
    rig.curWeaponSwing * 0.45,
    rig.curWeaponSwing * 0.38
  );

  // Subtle damage flash tint without making normal lighting washed out
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
