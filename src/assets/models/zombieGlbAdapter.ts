import * as THREE from 'three';
import { ZombieAIState, ZombieAnimState, ZombieArchetypeId, ZombieGaitStyle } from '../../game/zombieAI';
import { damp } from './characterGeometryKit';
import { ZombieAnimExtra, ZombieRigAnimData, ZombieSharedGeometries, resolveZombieAnimState } from './zombieModel';

export interface GlbZombieAnimInfo {
  clipName: string | null;
  clipDurationSec: number;
  keyframeCount: number;
  hasUsableLocomotionClips: boolean;
  usesProceduralSkeletonAnim: boolean;
}

export interface GlbZombieMaterialSummary {
  groupCount: number;
  triangleCount: number;
  hasVertexColors: boolean;
  hasTextures: boolean;
  groups: string[];
}

interface MixamoBoneRest {
  bone: THREE.Bone;
  restQ: THREE.Quaternion;
}

export interface GlbZombieRig {
  root: THREE.Group;
  modelRoot: THREE.Group;
  skinnedMeshes: THREE.SkinnedMesh[];
  materials: THREE.MeshStandardMaterial[];
  materialSummary: GlbZombieMaterialSummary;
  shadowMat: THREE.MeshBasicMaterial;
  archetypeId: ZombieArchetypeId;
  asymmetrySign: number;
  animState: ZombieRigAnimData;
  animInfo: GlbZombieAnimInfo;
  hips: MixamoBoneRest | null;
  hipsRestZ: number;
  spine: MixamoBoneRest | null;
  spine1: MixamoBoneRest | null;
  spine2: MixamoBoneRest | null;
  neck: MixamoBoneRest | null;
  head: MixamoBoneRest | null;
  leftShoulder: MixamoBoneRest | null;
  leftArm: MixamoBoneRest | null;
  leftForeArm: MixamoBoneRest | null;
  rightShoulder: MixamoBoneRest | null;
  rightArm: MixamoBoneRest | null;
  rightForeArm: MixamoBoneRest | null;
  leftUpLeg: MixamoBoneRest | null;
  leftLeg: MixamoBoneRest | null;
  leftFoot: MixamoBoneRest | null;
  rightUpLeg: MixamoBoneRest | null;
  rightLeg: MixamoBoneRest | null;
  rightFoot: MixamoBoneRest | null;
  // Current damped pose channels (single-writer state)
  curHipDrop: number;
  curHipsRx: number;
  curHipsRz: number;
  curSpineRx: number;
  curSpineRy: number;
  curHeadRx: number;
  curHeadRy: number;
  curHeadRz: number;
  curLegLx: number;
  curLegRx: number;
  curKneeLx: number;
  curKneeRx: number;
  curArmDownL: number;
  curArmDownR: number;
  curArmFwdL: number;
  curArmFwdR: number;
  curForeL: number;
  curForeR: number;
  dispose: () => void;
}

const MAT_SKIN = 0;
const MAT_HAIR = 1;
const MAT_EYE = 2;
const MAT_TEETH = 3;
const MAT_MOUTH = 4;
const MAT_SHIRT = 5;
const MAT_PANTS = 6;
const MAT_SHOES = 7;

const GROUP_LABELS = [
  'skin',
  'hair',
  'eyes',
  'teeth',
  'mouth',
  'shirt',
  'pants',
  'shoes',
];

// Module-scope scratch math objects to keep per-frame heap allocations at zero
const _AXIS_X = new THREE.Vector3(1, 0, 0);
const _AXIS_Y = new THREE.Vector3(0, 1, 0);
const _AXIS_Z = new THREE.Vector3(0, 0, 1);
const _qA = new THREE.Quaternion();
const _qB = new THREE.Quaternion();
const _qC = new THREE.Quaternion();

interface GlbZombiePbrTextures {
  skinMap: THREE.CanvasTexture | null;
  skinBump: THREE.CanvasTexture | null;
  hairMap: THREE.CanvasTexture | null;
  hairBump: THREE.CanvasTexture | null;
  eyeMap: THREE.CanvasTexture | null;
  teethMap: THREE.CanvasTexture | null;
  fabricMap: THREE.CanvasTexture | null;
  fabricBump: THREE.CanvasTexture | null;
  denimMap: THREE.CanvasTexture | null;
  denimBump: THREE.CanvasTexture | null;
  leatherMap: THREE.CanvasTexture | null;
}

let cachedGlbTextures: GlbZombiePbrTextures | null = null;

function seededRand(seed: number): () => number {
  let s = Math.floor(seed * 9973) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function makeProceduralTexture(
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

function getGlbZombiePbrTextures(): GlbZombiePbrTextures {
  if (cachedGlbTextures) return cachedGlbTextures;
  if (typeof document === 'undefined') {
    cachedGlbTextures = {
      skinMap: null,
      skinBump: null,
      hairMap: null,
      hairBump: null,
      eyeMap: null,
      teethMap: null,
      fabricMap: null,
      fabricBump: null,
      denimMap: null,
      denimBump: null,
      leatherMap: null,
    };
    return cachedGlbTextures;
  }

  // 1. Skin albedo (mottled pale cadaver skin, veins, grime) + linear pore bump
  const skinMap = makeProceduralTexture(256, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(101);
    ctx.fillStyle = '#dddad2';
    ctx.fillRect(0, 0, s, s);
    // Soft blotchy necrotic mottling
    for (let i = 0; i < 65; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 10 + r() * 28;
      const g = ctx.createRadialGradient(x, y, 1, x, y, rad);
      const tone = r() > 0.5 ? 'rgba(130, 145, 128, 0.14)' : 'rgba(155, 112, 108, 0.13)';
      g.addColorStop(0, tone);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    // Fine bruised capillary wisps
    ctx.lineWidth = 1;
    for (let i = 0; i < 42; i++) {
      ctx.strokeStyle = r() > 0.4 ? 'rgba(110, 82, 92, 0.22)' : 'rgba(95, 108, 92, 0.18)';
      ctx.beginPath();
      let px = r() * s;
      let py = r() * s;
      ctx.moveTo(px, py);
      for (let seg = 0; seg < 4; seg++) {
        px += (r() - 0.5) * 18;
        py += (r() - 0.5) * 18;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    // Fine skin pore noise
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(70,65,60,0.08)';
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  });

  const skinBump = makeProceduralTexture(128, THREE.NoColorSpace, 2, (ctx, s) => {
    const r = seededRand(103);
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 650; i++) {
      ctx.fillStyle = r() > 0.45 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)';
      ctx.fillRect(r() * s, r() * s, 2, 1.5);
    }
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = 'rgba(30,30,30,0.22)';
      ctx.beginPath();
      const x = r() * s;
      const y = r() * s;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 14);
      ctx.stroke();
    }
  });

  // 2. Hair strands (matted greasy hair)
  const hairMap = makeProceduralTexture(128, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(203);
    ctx.fillStyle = '#cfc9c2';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 160; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(55,48,42,0.34)' : 'rgba(220,212,202,0.22)';
      ctx.lineWidth = 1 + r() * 1.4;
      const x = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (r() - 0.5) * 12, s * 0.33, x + (r() - 0.5) * 12, s * 0.66, x + (r() - 0.5) * 8, s);
      ctx.stroke();
    }
  });

  const hairBump = makeProceduralTexture(128, THREE.NoColorSpace, 2, (ctx, s) => {
    const r = seededRand(209);
    ctx.fillStyle = '#7e7e7e';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 180; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(245,245,245,0.26)' : 'rgba(20,20,20,0.28)';
      ctx.lineWidth = 1.2;
      const x = r() * s;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (r() - 0.5) * 8, s);
      ctx.stroke();
    }
  });

  // 3. Eyeball texture aligned directly to GLB eyeball UV center (u = 0.304, v = 0.100)
  // Note: CanvasTexture flipY=true maps GLB v=0.100 to canvas y = (1 - 0.100) * s
  const eyeMap = makeProceduralTexture(256, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(307);
    ctx.fillStyle = '#c8c4b8';
    ctx.fillRect(0, 0, s, s);

    const cx = 0.304 * s;
    const cy = (1 - 0.1) * s;

    // Subtle bloodshot sclera veins radiating inward toward iris
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2 + (r() - 0.5) * 0.18;
      const r0 = 0.044 * s;
      const r1 = (0.068 + r() * 0.025) * s;
      ctx.strokeStyle = 'rgba(138, 38, 36, 0.55)';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(
        cx + Math.cos(ang + (r() - 0.5) * 0.18) * ((r0 + r1) * 0.5),
        cy + Math.sin(ang + (r() - 0.5) * 0.18) * ((r0 + r1) * 0.5)
      );
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }

    // Dark necrotic limbus ring
    const irisR = 0.042 * s;
    ctx.fillStyle = '#242b2d';
    ctx.beginPath();
    ctx.arc(cx, cy, irisR + 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Cloudy cataract dead gray-blue iris gradient
    const irisGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy, irisR);
    irisGrad.addColorStop(0, '#4f5d5e');
    irisGrad.addColorStop(0.55, '#6e7e7a');
    irisGrad.addColorStop(0.88, '#3d4a49');
    irisGrad.addColorStop(1, '#1d2426');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, irisR, 0, Math.PI * 2);
    ctx.fill();

    // Radial iris fibers
    for (let i = 0; i < 28; i++) {
      const ang = (i / 28) * Math.PI * 2;
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(180,196,190,0.28)' : 'rgba(20,26,28,0.28)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * (0.017 * s), cy + Math.sin(ang) * (0.017 * s));
      ctx.lineTo(cx + Math.cos(ang) * (irisR - 1), cy + Math.sin(ang) * (irisR - 1));
      ctx.stroke();
    }

    // Deep dilated pupil
    ctx.fillStyle = '#090b0c';
    ctx.beginPath();
    ctx.arc(cx, cy, 0.018 * s, 0, Math.PI * 2);
    ctx.fill();
  });

  // 4. Teeth (stained bone-ivory enamel with vertical tooth separations)
  const teethMap = makeProceduralTexture(128, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(401);
    ctx.fillStyle = '#cbc1a6';
    ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 10) {
      ctx.fillStyle = 'rgba(72, 48, 38, 0.32)';
      ctx.fillRect(x, 0, 2, s);
    }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(92, 44, 34, 0.16)' : 'rgba(245, 238, 220, 0.18)';
      ctx.fillRect(r() * s, r() * s, 4 + r() * 6, 4 + r() * 8);
    }
  });

  // 5. Shirt / tattered fabric albedo + bump
  const fabricMap = makeProceduralTexture(256, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(509);
    ctx.fillStyle = '#d8d6cf';
    ctx.fillRect(0, 0, s, s);
    // Cross-weave threads
    for (let y = 0; y < s; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(0, y, s, 2);
    }
    for (let x = 0; x < s; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, 0, 2, s);
    }
    // Grime & weathered wear patches
    for (let i = 0; i < 48; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 12 + r() * 34;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, r() > 0.3 ? 'rgba(55, 48, 42, 0.22)' : 'rgba(92, 28, 24, 0.24)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

  const fabricBump = makeProceduralTexture(128, THREE.NoColorSpace, 3, (ctx, s) => {
    const r = seededRand(521);
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
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(r() * s, r() * s, 2, 2);
    }
  });

  // 6. Denim / cargo pants diagonal twill + bump
  const denimMap = makeProceduralTexture(256, THREE.SRGBColorSpace, 2, (ctx, s) => {
    const r = seededRand(613);
    ctx.fillStyle = '#cfcfd4';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1.2;
    for (let i = -s; i < s * 2; i += 5) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
    for (let i = 0; i < 42; i++) {
      const x = r() * s;
      const y = r() * s;
      const rad = 14 + r() * 32;
      const g = ctx.createRadialGradient(x, y, 2, x, y, rad);
      g.addColorStop(0, r() > 0.4 ? 'rgba(60, 52, 42, 0.22)' : 'rgba(235, 235, 240, 0.12)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  });

  const denimBump = makeProceduralTexture(128, THREE.NoColorSpace, 3, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 4) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
  });

  // 7. Scuffed leather footwear
  const leatherMap = makeProceduralTexture(128, THREE.SRGBColorSpace, 1, (ctx, s) => {
    const r = seededRand(709);
    ctx.fillStyle = '#b9b2aa';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(40,34,30,0.22)' : 'rgba(220,210,198,0.14)';
      ctx.fillRect(r() * s, r() * s, 4 + r() * 14, 1.5 + r() * 3);
    }
  });

  cachedGlbTextures = {
    skinMap,
    skinBump,
    hairMap,
    hairBump,
    eyeMap,
    teethMap,
    fabricMap,
    fabricBump,
    denimMap,
    denimBump,
    leatherMap,
  };
  return cachedGlbTextures;
}

/**
 * Classifies all 6,472 triangles of the uploaded zombie-glb.glb into 8 anatomical PBR material groups
 * and bakes high-precision per-vertex ambient occlusion, facial depth, and grime onto the shared geometry
 * without altering any vertex positions, normals, UVs, or skeleton weights.
 */
function prepareGlbZombieGeometry(mesh: THREE.SkinnedMesh, sceneRoot: THREE.Object3D): void {
  const geo = mesh.geometry;
  if (!geo || (geo.userData as { glbPbrPrepared?: boolean }).glbPbrPrepared) return;

  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const nor = geo.attributes.normal;
  const idx = geo.index;
  if (!pos || !uv || !idx) return;

  sceneRoot.updateMatrixWorld(true);
  mesh.skeleton.update();

  // Compute vertices in canonical unscaled/unrotated GLB scene space so thresholds remain invariant
  const invScene = new THREE.Matrix4().copy(sceneRoot.matrixWorld).invert();
  const vCanon: THREE.Vector3[] = new Array(pos.count);
  const tmp = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    tmp.fromBufferAttribute(pos, i);
    mesh.applyBoneTransform(i, tmp);
    tmp.applyMatrix4(mesh.matrixWorld).applyMatrix4(invScene);
    vCanon[i] = tmp.clone();
  }

  // Reconstruct connected UV islands (identical to original Blender material UV shell layout)
  const uvKeyToVerts = new Map<string, number[]>();
  for (let i = 0; i < pos.count; i++) {
    const k = `${uv.getX(i).toFixed(4)},${uv.getY(i).toFixed(4)}`;
    let arr = uvKeyToVerts.get(k);
    if (!arr) {
      arr = [];
      uvKeyToVerts.set(k, arr);
    }
    arr.push(i);
  }
  const adj: number[][] = Array.from({ length: pos.count }, () => []);
  for (const vs of uvKeyToVerts.values()) {
    for (let a = 1; a < vs.length; a++) {
      adj[vs[0]].push(vs[a]);
      adj[vs[a]].push(vs[0]);
    }
  }
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t);
    const b = idx.getX(t + 1);
    const c = idx.getX(t + 2);
    adj[a].push(b, c);
    adj[b].push(a, c);
    adj[c].push(a, b);
  }

  const islandId = new Int32Array(pos.count).fill(-1);
  interface IslandStats {
    cnt: number;
    minY: number;
    maxY: number;
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
    minU: number;
    maxU: number;
    minV: number;
    maxV: number;
    kind:
      | 'torso'
      | 'arm'
      | 'pelvis'
      | 'head_back_neck'
      | 'leg_shin_foot'
      | 'face'
      | 'hand'
      | 'eyeball'
      | 'teeth'
      | 'mouth'
      | 'sole'
      | 'eyelid_rim';
  }
  const islands: IslandStats[] = [];
  for (let i = 0; i < pos.count; i++) {
    if (islandId[i] !== -1) continue;
    const id = islands.length;
    const q = [i];
    islandId[i] = id;
    const st: IslandStats = {
      cnt: 0,
      minY: 9,
      maxY: -9,
      minX: 9,
      maxX: -9,
      minZ: 9,
      maxZ: -9,
      minU: 9,
      maxU: -9,
      minV: 9,
      maxV: -9,
      kind: 'torso',
    };
    while (q.length > 0) {
      const cur = q.pop()!;
      st.cnt++;
      const p = vCanon[cur];
      const u = uv.getX(cur);
      const v = uv.getY(cur);
      if (p.y < st.minY) st.minY = p.y;
      if (p.y > st.maxY) st.maxY = p.y;
      if (p.x < st.minX) st.minX = p.x;
      if (p.x > st.maxX) st.maxX = p.x;
      if (p.z < st.minZ) st.minZ = p.z;
      if (p.z > st.maxZ) st.maxZ = p.z;
      if (u < st.minU) st.minU = u;
      if (u > st.maxU) st.maxU = u;
      if (v < st.minV) st.minV = v;
      if (v > st.maxV) st.maxV = v;
      for (const nb of adj[cur]) {
        if (islandId[nb] === -1) {
          islandId[nb] = id;
          q.push(nb);
        }
      }
    }

    // Identify each UV island semantically from its geometry & UV signature
    if (st.minY > 1.175 && st.maxY < 1.202 && st.minU > 0.2 && st.maxU < 0.4) {
      st.kind = 'eyeball';
    } else if (st.minY > 1.18 && st.maxY < 1.195 && st.cnt <= 40) {
      st.kind = 'eyelid_rim';
    } else if (st.minY > 1.125 && st.maxY < 1.168 && st.minV > 0.9) {
      st.kind = 'teeth';
    } else if (st.minY > 1.13 && st.maxY < 1.155 && st.maxZ < 0.098 && st.cnt <= 110) {
      st.kind = 'mouth';
    } else if (st.maxY < 0.015) {
      st.kind = 'sole';
    } else if (Math.abs(st.minX) > 0.5 || Math.abs(st.maxX) > 0.5) {
      // Check if whole island is past wrist (hand) vs forearm/sleeve
      if (Math.min(Math.abs(st.minX), Math.abs(st.maxX)) > 0.51) {
        st.kind = 'hand';
      } else {
        st.kind = 'arm';
      }
    } else if (st.minY > 1.105 && st.maxY > 1.25 && st.maxZ > 0.09) {
      st.kind = 'face';
    } else if (st.minY > 1.03 && st.maxY > 1.21 && st.maxZ < 0.065) {
      st.kind = 'head_back_neck';
    } else if (st.maxY < 0.5) {
      st.kind = 'leg_shin_foot';
    } else if (st.maxY < 0.81 && st.minY > 0.44) {
      st.kind = 'pelvis';
    } else {
      st.kind = 'torso';
    }
    islands.push(st);
  }

  // Curved natural hairline height threshold (forehead higher, temples/nape lower)
  const isHairVertex = (p: THREE.Vector3): boolean => {
    const backBlend = THREE.MathUtils.clamp((0.065 - p.z) / 0.11, 0, 1);
    const hairlineY = 1.238 - backBlend * 0.062 - Math.min(0.018, Math.abs(p.x) * 0.22);
    return p.y > hairlineY;
  };

  // Classify every triangle into material slots 0..7
  const triBuckets: number[][] = Array.from({ length: 8 }, () => []);
  const triCount = idx.count / 3;

  for (let t = 0; t < triCount; t++) {
    const a = idx.getX(t * 3);
    const b = idx.getX(t * 3 + 1);
    const c = idx.getX(t * 3 + 2);
    const isl = islands[islandId[a]];
    const pa = vCanon[a];
    const pb = vCanon[b];
    const pc = vCanon[c];
    const cx = (pa.x + pb.x + pc.x) / 3;
    const cy = (pa.y + pb.y + pc.y) / 3;
    const cz = (pa.z + pb.z + pc.z) / 3;

    let matIdx = MAT_SKIN;
    switch (isl.kind) {
      case 'eyeball':
        matIdx = MAT_EYE;
        break;
      case 'teeth':
        matIdx = MAT_TEETH;
        break;
      case 'mouth':
        matIdx = MAT_MOUTH;
        break;
      case 'hand':
      case 'eyelid_rim':
        matIdx = MAT_SKIN;
        break;
      case 'sole':
        matIdx = MAT_SHOES;
        break;
      case 'face':
      case 'head_back_neck': {
        const backBlend = THREE.MathUtils.clamp((0.065 - cz) / 0.11, 0, 1);
        const hairlineY = 1.238 - backBlend * 0.062 - Math.min(0.018, Math.abs(cx) * 0.22);
        matIdx = cy > hairlineY ? MAT_HAIR : MAT_SKIN;
        break;
      }
      case 'torso':
        matIdx = MAT_SHIRT;
        break;
      case 'arm':
        matIdx = Math.abs(cx) <= 0.382 ? MAT_SHIRT : MAT_SKIN;
        break;
      case 'pelvis':
        matIdx = MAT_PANTS;
        break;
      case 'leg_shin_foot':
        if (cy >= 0.228) matIdx = MAT_PANTS;
        else if (cy >= 0.076) matIdx = MAT_SKIN;
        else matIdx = MAT_SHOES;
        break;
    }

    triBuckets[matIdx].push(a, b, c);
  }

  // Rewrite index buffer grouped cleanly by material index
  const newIndices = new Uint16Array(idx.count);
  geo.clearGroups();
  let offset = 0;
  for (let m = 0; m < 8; m++) {
    const bucket = triBuckets[m];
    if (bucket.length === 0) continue;
    for (let k = 0; k < bucket.length; k++) {
      newIndices[offset + k] = bucket[k];
    }
    geo.addGroup(offset, bucket.length, m);
    offset += bucket.length;
  }
  geo.setIndex(new THREE.BufferAttribute(newIndices, 1));

  // Bake anatomical Vertex AO, facial hollows, blood smears, belt, and cloth fold shading
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const p = vCanon[i];
    const isl = islands[islandId[i]];
    const ny = nor ? nor.getY(i) : 0;

    // Gentle upward hemisphere bounce (keeps shadows readable at night)
    let r = 0.87 + 0.13 * THREE.MathUtils.clamp(ny * 0.5 + 0.5, 0, 1);
    let g = r;
    let b = r;

    if (isl.kind === 'eyelid_rim') {
      r *= 0.58;
      g *= 0.52;
      b *= 0.52;
    } else if (isl.kind === 'face' || isl.kind === 'head_back_neck') {
      if (isHairVertex(p)) {
        // Crown highlight vs nape root depth
        const crown = THREE.MathUtils.clamp((p.y - 1.18) / 0.1, 0.72, 1.04);
        r *= crown;
        g *= crown;
        b *= crown;
      } else {
        // Eye socket hollows
        const eyeDistL = Math.hypot((p.x - 0.023) * 1.15, (p.y - 1.188) * 1.45);
        const eyeDistR = Math.hypot((p.x + 0.023) * 1.15, (p.y - 1.188) * 1.45);
        const eyeDist = Math.min(eyeDistL, eyeDistR);
        if (p.z > 0.062 && eyeDist < 0.022) {
          const sock = THREE.MathUtils.lerp(0.62, 0.96, eyeDist / 0.022);
          r *= sock;
          g *= sock * 0.92;
          b *= sock * 0.92;
        }
        // Dark brow ridge shadow
        if (p.z > 0.07 && Math.abs(p.x) > 0.008 && Math.abs(p.x) < 0.042 && p.y > 1.198 && p.y < 1.211) {
          r *= 0.76;
          g *= 0.74;
          b *= 0.73;
        }
        // Nostril & cheek hollow shadows
        if (p.z > 0.085 && Math.abs(p.x) < 0.015 && p.y > 1.148 && p.y < 1.158) {
          r *= 0.74;
          g *= 0.72;
          b *= 0.72;
        }
        // Dried blood around jaw/mouth/chin
        const mouthDist = Math.hypot(p.x * 1.1, (p.y - 1.136) * 1.3);
        if (p.z > 0.065 && mouthDist < 0.036) {
          const stain = 1 - mouthDist / 0.036;
          r *= 1 - stain * 0.18;
          g *= 1 - stain * 0.56;
          b *= 1 - stain * 0.58;
        }
        // Under-jaw & neck crease
        if (p.y < 1.13 && p.z < 0.055) {
          r *= 0.78;
          g *= 0.76;
          b *= 0.76;
        }
      }
    } else if (isl.kind === 'hand') {
      // Blood-dipped fingertips & palm grime
      const tipT = THREE.MathUtils.clamp((Math.abs(p.x) - 0.59) / 0.08, 0, 1);
      r *= 0.92 - tipT * 0.14;
      g *= 0.9 - tipT * 0.42;
      b *= 0.89 - tipT * 0.44;
    } else if (isl.kind === 'torso') {
      // V-neck collar crease + lower hem grime + subtle chest blood smear
      if (p.y > 1.055 && Math.abs(p.x) < 0.085) {
        r *= 0.82;
        g *= 0.8;
        b *= 0.8;
      }
      const woundD = Math.hypot(p.x - 0.045, (p.y - 0.96) * 0.85);
      if (p.z > 0.03 && woundD < 0.09) {
        const st = (1 - woundD / 0.09) * 0.65;
        r *= 1 - st * 0.14;
        g *= 1 - st * 0.58;
        b *= 1 - st * 0.6;
      }
      if (p.y < 0.79) {
        r *= 0.84;
        g *= 0.82;
        b *= 0.8;
      }
    } else if (isl.kind === 'pelvis' || isl.kind === 'leg_shin_foot') {
      // Waistband / dark belt at y = 0.72..0.775
      if (p.y >= 0.72 && p.y <= 0.778) {
        r *= 0.54;
        g *= 0.48;
        b *= 0.44;
      }
      // Muddy lower pants cuff & dirty shins
      if (p.y >= 0.225 && p.y <= 0.31) {
        r *= 0.84;
        g *= 0.8;
        b *= 0.74;
      }
    }

    colors[i * 3] = THREE.MathUtils.clamp(r, 0.42, 1.06);
    colors[i * 3 + 1] = THREE.MathUtils.clamp(g, 0.36, 1.06);
    colors[i * 3 + 2] = THREE.MathUtils.clamp(b, 0.36, 1.06);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeBoundingSphere();
  if (geo.boundingSphere && geo.boundingSphere.radius < 2.4) {
    geo.boundingSphere.radius = 2.4;
  }
  (geo.userData as { glbPbrPrepared?: boolean }).glbPbrPrepared = true;
}

function captureBone(root: THREE.Object3D, name: string): MixamoBoneRest | null {
  const obj = root.getObjectByName(name);
  if (!obj || !(obj as THREE.Bone).isBone) return null;
  const bone = obj as THREE.Bone;
  return {
    bone,
    restQ: bone.quaternion.clone(),
  };
}

function applyBoneXYZ(rest: MixamoBoneRest | null, rx: number, ry: number, rz: number): void {
  if (!rest) return;
  _qA.setFromAxisAngle(_AXIS_X, rx);
  _qB.setFromAxisAngle(_AXIS_Y, ry);
  _qC.setFromAxisAngle(_AXIS_Z, rz);
  rest.bone.quaternion.copy(rest.restQ).multiply(_qB).multiply(_qC).multiply(_qA);
}

function applyArmPose(
  rest: MixamoBoneRest | null,
  armDownX: number,
  armReachZ: number
): void {
  if (!rest) return;
  _qA.setFromAxisAngle(_AXIS_X, armDownX);
  _qC.setFromAxisAngle(_AXIS_Z, armReachZ);
  // First rotate around local X to drop the T-pose arm down, then swing forward around local Z
  rest.bone.quaternion.copy(rest.restQ).multiply(_qC).multiply(_qA);
}

function applyAxisDelta(
  rest: MixamoBoneRest | null,
  axis: THREE.Vector3,
  angle: number
): void {
  if (!rest) return;
  _qA.setFromAxisAngle(axis, angle);
  rest.bone.quaternion.copy(rest.restQ).multiply(_qA);
}

export function inspectZombieGlbAnimations(animations: THREE.AnimationClip[]): GlbZombieAnimInfo {
  const first = animations[0] ?? null;
  let maxKeyframes = 0;
  if (first) {
    for (const track of first.tracks) {
      if (track.times.length > maxKeyframes) {
        maxKeyframes = track.times.length;
      }
    }
  }
  const hasUsableLocomotionClips = Boolean(
    first && first.duration > 0.2 && maxKeyframes > 4 && animations.length >= 2
  );
  return {
    clipName: first?.name ?? null,
    clipDurationSec: first ? Number(first.duration.toFixed(4)) : 0,
    keyframeCount: maxKeyframes,
    hasUsableLocomotionClips,
    usesProceduralSkeletonAnim: !hasUsableLocomotionClips,
  };
}

/**
 * Wraps a SkeletonUtils-cloned `zombie-glb.glb` scene into a high-fidelity multi-material PBR
 * horror rig without modifying geometry, AI, hitboxes, or combat rules.
 */
export function createGlbZombieRig(
  clonedScene: THREE.Group,
  animations: THREE.AnimationClip[],
  sharedGeos: ZombieSharedGeometries,
  tintVariant = 0,
  archetypeId: ZombieArchetypeId = 'walker',
  visualScale = 1.0
): { group: THREE.Group; rig: GlbZombieRig } {
  const root = new THREE.Group();
  root.scale.setScalar(visualScale);
  root.add(clonedScene);

  const pbrTex = getGlbZombiePbrTextures();
  const variant = Math.abs(tintVariant);

  // Calibrated sRGB-safe albedo palettes so skin, clothing, hair, eyes, and wounds read clearly in day & night
  const skinPalette =
    archetypeId === 'runner'
      ? [0xab9f8b, 0x9f9280, 0xb2a28f]
      : archetypeId === 'brute'
        ? [0x8d978e, 0x828c84, 0x969b91]
        : [0xa5ab9b, 0x9aa294, 0xaea596, 0x939c8f];
  const shirtPalette =
    archetypeId === 'runner'
      ? [0x6e413b, 0x5c4f44, 0x4b5649]
      : archetypeId === 'brute'
        ? [0x3d4652, 0x4c4440, 0x3b4a43]
        : [0x66403f, 0x4b5848, 0x4f5a67, 0x736954];
  const pantsPalette = [0x445264, 0x434952, 0x544d41, 0x3b444e];
  const hairPalette = [0x362d26, 0x45392e, 0x29282b, 0x5a544e];

  const skinColor = skinPalette[variant % skinPalette.length];
  const shirtColor = shirtPalette[variant % shirtPalette.length];
  const pantsColor = pantsPalette[variant % pantsPalette.length];
  const hairColor = hairPalette[variant % hairPalette.length];

  // 8 PBR Materials matching reconstructed geometry groups
  const matSkin = new THREE.MeshStandardMaterial({
    name: 'zombie_skin',
    color: skinColor,
    map: pbrTex.skinMap,
    bumpMap: pbrTex.skinBump ?? sharedGeos.textures.undeadBump,
    bumpScale: 0.008,
    roughness: 0.66,
    metalness: 0.03,
    envMapIntensity: 1.1,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matHair = new THREE.MeshStandardMaterial({
    name: 'zombie_hair',
    color: hairColor,
    map: pbrTex.hairMap,
    bumpMap: pbrTex.hairBump,
    bumpScale: 0.014,
    roughness: 0.8,
    metalness: 0.04,
    envMapIntensity: 0.88,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matEyes = new THREE.MeshStandardMaterial({
    name: 'zombie_eyes',
    color: 0xeef3ef,
    map: pbrTex.eyeMap,
    roughness: 0.14,
    metalness: 0.02,
    envMapIntensity: 1.45,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matTeeth = new THREE.MeshStandardMaterial({
    name: 'zombie_teeth',
    color: 0xd1c7ae,
    map: pbrTex.teethMap,
    roughness: 0.3,
    metalness: 0.03,
    envMapIntensity: 1.15,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matMouth = new THREE.MeshStandardMaterial({
    name: 'zombie_mouth',
    color: 0x622224,
    roughness: 0.24,
    metalness: 0.02,
    envMapIntensity: 1.1,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matShirt = new THREE.MeshStandardMaterial({
    name: 'zombie_shirt',
    color: shirtColor,
    map: pbrTex.fabricMap,
    bumpMap: pbrTex.fabricBump ?? sharedGeos.textures.fabricBump,
    bumpScale: 0.015,
    roughness: 0.9,
    metalness: 0.03,
    envMapIntensity: 0.92,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matPants = new THREE.MeshStandardMaterial({
    name: 'zombie_pants',
    color: pantsColor,
    map: pbrTex.denimMap,
    bumpMap: pbrTex.denimBump ?? sharedGeos.textures.fabricBump,
    bumpScale: 0.014,
    roughness: 0.91,
    metalness: 0.04,
    envMapIntensity: 0.9,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const matShoes = new THREE.MeshStandardMaterial({
    name: 'zombie_shoes',
    color: 0x3b3530,
    map: pbrTex.leatherMap,
    bumpMap: pbrTex.fabricBump ?? sharedGeos.textures.fabricBump,
    bumpScale: 0.008,
    roughness: 0.58,
    metalness: 0.08,
    envMapIntensity: 0.98,
    vertexColors: true,
    emissive: 0x000000,
    emissiveIntensity: 1,
  });

  const materials: THREE.MeshStandardMaterial[] = [
    matSkin,
    matHair,
    matEyes,
    matTeeth,
    matMouth,
    matShirt,
    matPants,
    matShoes,
  ];

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  let triangleCount = 0;
  let groupCount = 0;

  clonedScene.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
      const sm = child as THREE.SkinnedMesh;
      prepareGlbZombieGeometry(sm, clonedScene);
      sm.material = materials;
      skinnedMeshes.push(sm);
      triangleCount = sm.geometry.index ? sm.geometry.index.count / 3 : 0;
      groupCount = sm.geometry.groups.length;
    } else {
      mesh.material = matSkin;
    }
  });

  // Ground contact shadow disc for Android/low-end modes where directional shadows are off
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const shadowMesh = new THREE.Mesh(sharedGeos.shadowDisc, shadowMat);
  shadowMesh.rotation.x = -Math.PI * 0.5;
  shadowMesh.position.y = 0.015;
  root.add(shadowMesh);

  const hips = captureBone(clonedScene, 'mixamorigHips');
  const rig: GlbZombieRig = {
    root,
    modelRoot: clonedScene,
    skinnedMeshes,
    materials,
    materialSummary: {
      groupCount,
      triangleCount,
      hasVertexColors: Boolean(skinnedMeshes[0]?.geometry.attributes.color),
      hasTextures: Boolean(pbrTex.skinMap && pbrTex.eyeMap && pbrTex.fabricMap),
      groups: GROUP_LABELS.slice(0, groupCount),
    },
    shadowMat,
    archetypeId,
    asymmetrySign: tintVariant % 2 === 0 ? 1 : -1,
    animState: {
      currentState: 'idle',
      idlePhase: tintVariant * 1.15,
      smoothedSpeed: 0,
      smoothedYawRate: 0,
    },
    animInfo: inspectZombieGlbAnimations(animations),
    hips,
    hipsRestZ: hips ? hips.bone.position.z : -73.386,
    spine: captureBone(clonedScene, 'mixamorigSpine'),
    spine1: captureBone(clonedScene, 'mixamorigSpine1'),
    spine2: captureBone(clonedScene, 'mixamorigSpine2'),
    neck: captureBone(clonedScene, 'mixamorigNeck'),
    head: captureBone(clonedScene, 'mixamorigHead'),
    leftShoulder: captureBone(clonedScene, 'mixamorigLeftShoulder'),
    leftArm: captureBone(clonedScene, 'mixamorigLeftArm'),
    leftForeArm: captureBone(clonedScene, 'mixamorigLeftForeArm'),
    rightShoulder: captureBone(clonedScene, 'mixamorigRightShoulder'),
    rightArm: captureBone(clonedScene, 'mixamorigRightArm'),
    rightForeArm: captureBone(clonedScene, 'mixamorigRightForeArm'),
    leftUpLeg: captureBone(clonedScene, 'mixamorigLeftUpLeg'),
    leftLeg: captureBone(clonedScene, 'mixamorigLeftLeg'),
    leftFoot: captureBone(clonedScene, 'mixamorigLeftFoot'),
    rightUpLeg: captureBone(clonedScene, 'mixamorigRightUpLeg'),
    rightLeg: captureBone(clonedScene, 'mixamorigRightLeg'),
    rightFoot: captureBone(clonedScene, 'mixamorigRightFoot'),
    curHipDrop: 0,
    curHipsRx: 0.04,
    curHipsRz: 0,
    curSpineRx: 0.14,
    curSpineRy: 0,
    curHeadRx: 0.05,
    curHeadRy: 0,
    curHeadRz: 0,
    curLegLx: 0.05,
    curLegRx: -0.05,
    curKneeLx: -0.14,
    curKneeRx: -0.1,
    curArmDownL: 1.04,
    curArmDownR: 1.06,
    curArmFwdL: 0.56,
    curArmFwdR: -0.52,
    curForeL: 0.55,
    curForeR: -0.52,
    dispose: () => {
      for (const m of materials) m.dispose();
      shadowMat.dispose();
    },
  };

  // Immediately pose out of T-pose on frame 0
  applyGlbPoseToBones(rig);

  return { group: root, rig };
}

function applyGlbPoseToBones(rig: GlbZombieRig): void {
  if (rig.hips) {
    rig.hips.bone.position.z = rig.hipsRestZ + rig.curHipDrop * 100;
  }
  applyBoneXYZ(rig.hips, rig.curHipsRx, 0, rig.curHipsRz);
  applyBoneXYZ(rig.spine, rig.curSpineRx * 0.4, rig.curSpineRy * 0.45, 0);
  applyBoneXYZ(rig.spine1, rig.curSpineRx * 0.35, rig.curSpineRy * 0.35, 0);
  applyBoneXYZ(rig.spine2, rig.curSpineRx * 0.25, rig.curSpineRy * 0.2, 0);

  applyBoneXYZ(rig.neck, rig.curHeadRx * 0.35, rig.curHeadRy * 0.35, rig.curHeadRz * 0.3);
  applyBoneXYZ(rig.head, rig.curHeadRx * 0.65, rig.curHeadRy * 0.65, rig.curHeadRz * 0.7);

  // Legs (+X swings thigh forward, -X bends knee backward naturally)
  applyAxisDelta(rig.leftUpLeg, _AXIS_X, rig.curLegLx);
  applyAxisDelta(rig.rightUpLeg, _AXIS_X, rig.curLegRx);
  applyAxisDelta(rig.leftLeg, _AXIS_X, Math.min(-0.02, rig.curKneeLx));
  applyAxisDelta(rig.rightLeg, _AXIS_X, Math.min(-0.02, rig.curKneeRx));
  // Subtle ankle counter-pitch so feet stay grounded through stance
  applyAxisDelta(rig.leftFoot, _AXIS_X, -(rig.curLegLx + rig.curKneeLx * 0.5) * 0.35);
  applyAxisDelta(rig.rightFoot, _AXIS_X, -(rig.curLegRx + rig.curKneeRx * 0.5) * 0.35);

  // Shoulders & Arms (drop from T-pose via +X, reach forward via +Z on left / -Z on right)
  applyAxisDelta(rig.leftShoulder, _AXIS_X, 0.14);
  applyAxisDelta(rig.rightShoulder, _AXIS_X, 0.14);
  applyArmPose(rig.leftArm, rig.curArmDownL, rig.curArmFwdL);
  applyArmPose(rig.rightArm, rig.curArmDownR, rig.curArmFwdR);
  applyAxisDelta(rig.leftForeArm, _AXIS_Z, rig.curForeL);
  applyAxisDelta(rig.rightForeArm, _AXIS_Z, rig.curForeR);
}

/**
 * Drives the imported Mixamo GLB zombie skeleton smoothly across all gameplay
 * states (idle, roaming, alert, chasing, attack windup/strike, hit stun, and death).
 */
export function animateGlbZombieRig(
  rig: GlbZombieRig,
  state: ZombieAIState,
  walkCycle: number,
  attackWindup: number,
  attackWindupMax: number,
  hitFlashTimer: number,
  deathTimer: number,
  dt: number,
  distSq = 0,
  extra?: ZombieAnimExtra
): void {
  // Hit flash emissive feedback
  const flash = hitFlashTimer > 0 ? Math.min(1, hitFlashTimer / 0.16) : 0;
  for (let i = 0; i < rig.materials.length; i++) {
    const mat = rig.materials[i];
    if (flash > 0.01) {
      mat.emissive.setRGB(0.45 * flash, 0.06 * flash, 0.04 * flash);
    } else {
      mat.emissive.setRGB(0, 0, 0);
    }
  }

  const isFarLod = distSq > 22 * 22;
  const isBrute = rig.archetypeId === 'brute';
  const isRunner = rig.archetypeId === 'runner';
  const gait: ZombieGaitStyle =
    extra?.gaitStyle ?? (isRunner ? 'feral' : isBrute ? 'heavy' : 'shuffling');

  const rawSpeed = extra?.actualSpeed ?? (state === 'chasing' ? 3.2 : state === 'roaming' ? 1.4 : 0);
  const rawYawRate = extra?.yawRate ?? 0;
  rig.animState.smoothedSpeed = damp(rig.animState.smoothedSpeed, rawSpeed, 12, dt);
  rig.animState.smoothedYawRate = damp(rig.animState.smoothedYawRate, rawYawRate, 10, dt);
  rig.animState.idlePhase += dt * (state === 'alert' || state === 'chasing' ? 2.6 : 1.5);

  const recoveryTimer = extra?.attackRecoveryTimer ?? 0;
  const animState: ZombieAnimState = resolveZombieAnimState(
    state,
    attackWindup,
    recoveryTimer,
    rig.animState.smoothedSpeed
  );
  rig.animState.currentState = animState;

  if (animState === 'dead') {
    const fallT = Math.min(1, deathTimer / 0.56);
    const buckleT = Math.min(1, deathTimer / 0.28);
    const eased = 1 - Math.pow(1 - fallT, 2.1);
    const buckleEased = 1 - Math.pow(1 - buckleT, 2);

    rig.curHipDrop = eased * 0.62;
    rig.curHipsRx = eased * (Math.PI * 0.47);
    rig.curHipsRz = eased * 0.16 * rig.asymmetrySign;
    rig.curSpineRx = eased * 0.2;
    rig.curSpineRy = damp(rig.curSpineRy, 0.08 * rig.asymmetrySign, 10, dt);
    rig.curHeadRx = damp(rig.curHeadRx, 0.16, 10, dt);
    rig.curHeadRy = damp(rig.curHeadRy, 0.16 * rig.asymmetrySign, 10, dt);
    rig.curHeadRz = damp(rig.curHeadRz, 0.2 * rig.asymmetrySign, 10, dt);
    rig.curLegLx = -buckleEased * 0.35;
    rig.curLegRx = -buckleEased * 0.22;
    rig.curKneeLx = -buckleEased * 0.95;
    rig.curKneeRx = -buckleEased * 0.78;
    rig.curArmDownL = damp(rig.curArmDownL, 1.15, 10, dt);
    rig.curArmDownR = damp(rig.curArmDownR, 1.18, 10, dt);
    rig.curArmFwdL = damp(rig.curArmFwdL, 0.22, 10, dt);
    rig.curArmFwdR = damp(rig.curArmFwdR, -0.18, 10, dt);
    rig.curForeL = damp(rig.curForeL, 0.45, 10, dt);
    rig.curForeR = damp(rig.curForeR, -0.35, 10, dt);

    if (deathTimer > 3.2) {
      const sinkT = Math.min(1, (deathTimer - 3.2) / 1.4);
      rig.root.position.y = -sinkT * 0.34;
      rig.shadowMat.opacity = 0.42 * (1 - sinkT);
    } else {
      rig.root.position.y = 0;
      rig.shadowMat.opacity = 0.42;
    }

    applyGlbPoseToBones(rig);
    return;
  }

  let tHipDrop = 0.02;
  let tHipsRx = 0.05;
  let tHipsRz = 0;
  let tSpineRx = isRunner ? 0.22 : isBrute ? 0.12 : 0.16;
  let tSpineRy = 0;
  let tHeadRx = 0.02;
  let tHeadRy = 0;
  let tHeadRz = 0;
  let tLegLx = 0.05;
  let tLegRx = -0.05;
  let tKneeLx = -0.14;
  let tKneeRx = -0.12;
  let tArmDownL = 1.05;
  let tArmDownR = 1.08;
  let tArmFwdL = 0.56;
  let tArmFwdR = -0.52;
  let tForeL = 0.55;
  let tForeR = -0.52;
  let blend = isFarLod ? 16 : 12;

  const turnLean = Math.max(-0.2, Math.min(0.2, rig.animState.smoothedYawRate * 0.07));
  const turnHead = Math.max(-0.32, Math.min(0.32, rig.animState.smoothedYawRate * 0.1));

  if (animState === 'stunned') {
    const stunMax = Math.max(0.15, extra?.stunMaxTimer ?? 0.36);
    const stunRemaining = Math.max(0, extra?.stunTimer ?? 0.2);
    const stunImpulse = Math.min(1, stunRemaining / stunMax);
    const recoilCurve = Math.sin(Math.min(1, stunImpulse) * Math.PI * 0.5);
    const hitSign = extra?.hitDirectionSign ?? rig.asymmetrySign;

    tHipDrop = 0.02 + recoilCurve * 0.05;
    tHipsRx = -0.22 * recoilCurve + 0.04;
    tHipsRz = hitSign * 0.12 * recoilCurve;
    tSpineRx = -0.18 * recoilCurve + 0.1;
    tSpineRy = hitSign * 0.28 * recoilCurve;
    tHeadRx = -0.24 * recoilCurve;
    tHeadRy = hitSign * 0.24 * recoilCurve;
    tHeadRz = hitSign * 0.24 * recoilCurve;
    tLegLx = -0.2 * recoilCurve;
    tLegRx = 0.18 * recoilCurve;
    tKneeLx = -0.32 * recoilCurve - 0.12;
    tKneeRx = -0.24 * recoilCurve - 0.12;
    tArmDownL = 0.85 - recoilCurve * 0.25;
    tArmDownR = 0.88 - recoilCurve * 0.2;
    tArmFwdL = 0.35 - recoilCurve * 0.25;
    tArmFwdR = -0.3 - recoilCurve * 0.22;
    tForeL = 0.54;
    tForeR = -0.56;
    blend = 18;
  } else if (animState === 'attack_windup') {
    const ratio =
      attackWindupMax > 0 ? Math.max(0, Math.min(1, 1 - attackWindup / attackWindupMax)) : 0;
    if (ratio < 0.58) {
      const prep = ratio / 0.58;
      const e = prep * prep;
      tHipDrop = 0.02 + e * 0.03;
      tHipsRx = 0.05 - e * 0.12;
      tHipsRz = -0.08 * rig.asymmetrySign * e;
      tSpineRx = 0.12 - e * 0.22;
      tSpineRy = -0.22 * rig.asymmetrySign * e;
      tHeadRx = -0.1 * e;
      tArmDownL = 0.62 - e * 0.34;
      tArmDownR = 0.65 - e * 0.36;
      tArmFwdL = 0.32 - e * 0.28;
      tArmFwdR = -(0.32 - e * 0.28);
      tForeL = 0.68 + e * 0.28;
      tForeR = -(0.65 + e * 0.3);
      tLegLx = 0.16;
      tLegRx = -0.16;
      tKneeLx = -0.28;
      tKneeRx = -0.24;
    } else {
      const strike = (ratio - 0.58) / 0.42;
      const e = 1 - Math.pow(1 - strike, 2.2);
      tHipDrop = 0.05 + e * 0.04;
      tHipsRx = -0.07 + e * 0.36;
      tHipsRz = 0.1 * rig.asymmetrySign * e;
      tSpineRx = -0.08 + e * 0.42;
      tSpineRy = 0.26 * rig.asymmetrySign * e;
      tHeadRx = 0.08 * e;
      tArmDownL = 0.42 + e * 0.56;
      tArmDownR = 0.44 + e * 0.58;
      tArmFwdL = 0.35 + e * 0.72;
      tArmFwdR = -(0.35 + e * 0.74);
      tForeL = 0.9 - e * 0.55;
      tForeR = -(0.9 - e * 0.58);
      tLegLx = 0.24;
      tLegRx = -0.24;
      tKneeLx = -0.34;
      tKneeRx = -0.26;
    }
    blend = 22;
  } else if (animState === 'attack_recovery') {
    const recDuration = isBrute ? 0.46 : isRunner ? 0.3 : 0.38;
    const r = Math.max(0, Math.min(1, recoveryTimer / recDuration));
    const followT = Math.sin(r * Math.PI * 0.5);
    tHipDrop = 0.03 + followT * 0.03;
    tHipsRx = 0.12 + followT * 0.16;
    tHipsRz = 0.09 * rig.asymmetrySign * followT;
    tSpineRx = 0.18 + followT * 0.2;
    tSpineRy = 0.22 * rig.asymmetrySign * followT;
    tHeadRx = 0.06 * followT;
    tArmDownL = 0.92 + followT * 0.18;
    tArmDownR = 0.96 + followT * 0.18;
    tArmFwdL = 0.85 - followT * 0.38;
    tArmFwdR = -(0.8 - followT * 0.38);
    tForeL = 0.42;
    tForeR = -0.38;
    tLegLx = 0.16;
    tLegRx = -0.16;
    tKneeLx = -0.24;
    tKneeRx = -0.2;
    blend = 14;
  } else if (animState === 'idle' || animState === 'suspicious' || animState === 'alert') {
    const isSuspicious = animState === 'suspicious';
    const isAlert = animState === 'alert';
    const ph = rig.animState.idlePhase;
    const sway = isFarLod ? 0 : Math.sin(ph) * (isAlert ? 0.025 : 0.045);
    const breath = isFarLod ? 0 : Math.sin(ph * 1.35) * (isAlert ? 0.014 : 0.01);
    const neckTwitch = !isFarLod && gait === 'stiff' ? Math.sin(ph * 3.7) * 0.065 : 0;

    tHipDrop = 0.02 + Math.max(0, breath);
    tHipsRx = isAlert ? 0.14 : gait === 'heavy' ? 0.07 : 0.04;
    tHipsRz = sway + turnLean * 0.5;
    tSpineRx = (isRunner ? 0.22 : isBrute ? 0.14 : 0.16) + (isAlert ? 0.12 : 0);
    tSpineRy = Math.sin(ph * 0.65) * (isSuspicious ? 0.12 : 0.04);
    tHeadRx = isAlert ? -0.08 : 0.05;
    tHeadRz = (isSuspicious ? 0.22 : 0.09) * rig.asymmetrySign - sway + neckTwitch;
    tHeadRy = isAlert
      ? turnHead
      : Math.sin(ph * (isSuspicious ? 1.45 : 0.55)) * (isSuspicious ? 0.34 : 0.15) + turnHead;
    tLegLx = gait === 'heavy' ? 0.08 : 0.05;
    tLegRx = gait === 'heavy' ? -0.08 : -0.05;
    tKneeLx = isAlert ? -0.2 : -0.14;
    tKneeRx = isAlert ? -0.16 : -0.1;

    tArmDownL = isAlert ? 0.78 : isRunner ? 0.92 : 1.06;
    tArmDownR = isAlert ? 0.82 : isRunner ? 0.96 : 1.1;
    tArmFwdL = (isAlert ? 0.84 : isRunner ? 0.66 : 0.48) + sway * 1.2;
    tArmFwdR = -((isAlert ? 0.78 : isRunner ? 0.6 : 0.42) - sway * 1.2);
    tForeL = isAlert ? 0.42 : 0.55;
    tForeR = isAlert ? -0.46 : -0.58;
    blend = isAlert ? 14 : 9;
  } else {
    const isFast = animState === 'chasing';
    const isSearching = animState === 'searching';
    const speedRatio = Math.min(1.25, Math.max(0.2, rig.animState.smoothedSpeed / (isFast ? 3.3 : 1.6)));
    const s = Math.sin(walkCycle);
    const c = Math.cos(walkCycle);

    let strideAmp = (isFast ? (isRunner ? 0.68 : 0.52) : isSearching ? 0.4 : 0.34) * Math.min(1.1, speedRatio + 0.18);
    let limpBiasL = 1.0;
    let limpBiasR = 1.0;
    let hipDropScale = 1.0;
    let latRoll = isBrute ? 0.095 : isFast ? 0.06 : 0.05;
    let kneeLift = isFast ? 0.68 : 0.44;
    let torsoFwd = isFast ? (isRunner ? 0.25 : 0.16) : 0.07;
    let spineHunch = isRunner ? 0.23 : isBrute ? 0.14 : 0.16;
    let spineTwist = 0.08;

    if (gait === 'limping') {
      limpBiasL = rig.asymmetrySign > 0 ? 0.64 : 1.12;
      limpBiasR = rig.asymmetrySign > 0 ? 1.12 : 0.64;
      latRoll = 0.1;
      hipDropScale = 1.35;
      torsoFwd += Math.max(0, s * rig.asymmetrySign) * 0.08;
    } else if (gait === 'shuffling') {
      strideAmp *= 0.84;
      kneeLift *= 0.76;
      latRoll = 0.065;
      spineTwist = 0.11;
    } else if (gait === 'stiff') {
      strideAmp *= 0.92;
      kneeLift *= 0.62;
      spineHunch += 0.04;
      tHeadRz = (0.17 + Math.sin(walkCycle * 1.8) * 0.05) * rig.asymmetrySign;
    } else if (gait === 'feral') {
      strideAmp *= 1.08;
      kneeLift = 0.78;
      torsoFwd = isFast ? 0.28 : 0.18;
      spineTwist = 0.12;
    } else if (gait === 'heavy') {
      strideAmp *= 0.94;
      hipDropScale = 1.45;
      latRoll = 0.115;
      kneeLift = 0.5;
      spineTwist = 0.09;
    }

    tHipDrop = 0.02 + Math.abs(s) * (isFast ? 0.032 : 0.022) * hipDropScale;
    tHipsRx = torsoFwd;
    tHipsRz = c * latRoll + turnLean;
    tSpineRx = spineHunch;
    tSpineRy = -s * spineTwist + turnHead * 0.25;

    tLegLx = s * strideAmp * limpBiasL;
    tLegRx = -s * strideAmp * limpBiasR;
    tKneeLx = -Math.max(0.08, -c * kneeLift * limpBiasL + 0.16);
    tKneeRx = -Math.max(0.08, c * kneeLift * limpBiasR + 0.16);

    if (gait !== 'stiff') {
      tHeadRz = (isFast ? -0.1 : 0.1) * rig.asymmetrySign - turnLean * 0.4;
    }
    tHeadRx = isFast ? -0.12 : 0.04;
    tHeadRy =
      (isSearching ? Math.sin(walkCycle * 0.9) * 0.38 : Math.sin(walkCycle * 0.5) * 0.12) +
      turnHead;

    tArmDownL = isFast ? (isRunner ? 0.68 : 0.76) : isSearching ? 0.84 : 0.94;
    tArmDownR = tArmDownL + 0.04;
    const armReachBase = isFast ? (isRunner ? 0.96 : 0.88) : isSearching ? 0.76 : 0.64;
    const armSwing = isFast ? 0.24 : 0.14;
    tArmFwdL = armReachBase + Math.sin(walkCycle * 0.92) * armSwing;
    tArmFwdR = -(armReachBase - 0.08 - Math.sin(walkCycle * 0.92) * armSwing);
    tForeL = isRunner ? 0.62 : gait === 'stiff' ? 0.26 : 0.44;
    tForeR = -(isRunner ? 0.66 : gait === 'stiff' ? 0.3 : 0.48);
    blend = isFast ? 15 : 11;
  }

  const limbBlend = isFarLod ? blend : Math.max(blend, 14);
  rig.curHipDrop = damp(rig.curHipDrop, tHipDrop, blend, dt);
  rig.curHipsRx = damp(rig.curHipsRx, tHipsRx, blend, dt);
  rig.curHipsRz = damp(rig.curHipsRz, tHipsRz, blend, dt);
  rig.curSpineRx = damp(rig.curSpineRx, tSpineRx, blend, dt);
  rig.curSpineRy = damp(rig.curSpineRy, tSpineRy, blend, dt);
  rig.curHeadRx = damp(rig.curHeadRx, tHeadRx, blend, dt);
  rig.curHeadRy = damp(rig.curHeadRy, tHeadRy, blend, dt);
  rig.curHeadRz = damp(rig.curHeadRz, tHeadRz, blend, dt);

  rig.curLegLx = damp(rig.curLegLx, tLegLx, limbBlend, dt);
  rig.curLegRx = damp(rig.curLegRx, tLegRx, limbBlend, dt);
  rig.curKneeLx = damp(rig.curKneeLx, tKneeLx, limbBlend, dt);
  rig.curKneeRx = damp(rig.curKneeRx, tKneeRx, limbBlend, dt);

  rig.curArmDownL = damp(rig.curArmDownL, tArmDownL, limbBlend, dt);
  rig.curArmDownR = damp(rig.curArmDownR, tArmDownR, limbBlend, dt);
  rig.curArmFwdL = damp(rig.curArmFwdL, tArmFwdL, limbBlend, dt);
  rig.curArmFwdR = damp(rig.curArmFwdR, tArmFwdR, limbBlend, dt);
  rig.curForeL = damp(rig.curForeL, tForeL, limbBlend, dt);
  rig.curForeR = damp(rig.curForeR, tForeR, limbBlend, dt);

  applyGlbPoseToBones(rig);
}
