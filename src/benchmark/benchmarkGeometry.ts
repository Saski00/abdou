import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyTriplanarUVs } from '../assets/models/proceduralGeometryKit';

export const BENCHMARK_BONE_NAMES = [
  'pelvis',      // 0
  'spineLower',  // 1
  'spineUpper',  // 2
  'neck',        // 3
  'head',        // 4
  'jaw',         // 5
  'upperArmL',   // 6
  'forearmL',    // 7
  'handL',       // 8
  'upperArmR',   // 9
  'forearmR',    // 10
  'handR',       // 11
  'thighL',      // 12
  'shinL',       // 13
  'thighR',      // 14
  'shinR',       // 15
] as const;

export type BenchmarkBoneIndex = Record<(typeof BENCHMARK_BONE_NAMES)[number], number>;

export interface BenchmarkSkeletonRig {
  bones: THREE.Bone[];
  boneMap: BenchmarkBoneIndex;
  skeleton: THREE.Skeleton;
  rootBone: THREE.Bone;
}

export function createBenchmarkSkeleton(): BenchmarkSkeletonRig {
  const bones: THREE.Bone[] = [];
  const makeBone = (name: string, x: number, y: number, z: number, parent?: THREE.Bone): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.set(x, y, z);
    if (parent) parent.add(b);
    bones.push(b);
    return b;
  };

  // World-aligned adult bind pose (~1.78m total stature, soles at y = 0)
  const pelvis = makeBone('pelvis', 0, 0.92, 0);
  const spineLower = makeBone('spineLower', 0, 0.14, 0, pelvis);
  const spineUpper = makeBone('spineUpper', 0, 0.22, 0, spineLower);
  const neck = makeBone('neck', 0, 0.22, 0.006, spineUpper);
  const head = makeBone('head', 0, 0.09, -0.008, neck);
  const jaw = makeBone('jaw', 0, 0.016, -0.024, head);

  // Arms in slight A-pose downward (more natural shoulder deformation than T-pose)
  const upperArmL = makeBone('upperArmL', -0.20, 0.17, 0.01, spineUpper);
  const forearmL = makeBone('forearmL', -0.055, -0.275, 0.01, upperArmL);
  const handL = makeBone('handL', -0.035, -0.255, -0.005, forearmL);

  const upperArmR = makeBone('upperArmR', 0.20, 0.17, 0.01, spineUpper);
  const forearmR = makeBone('forearmR', 0.055, -0.275, 0.01, upperArmR);
  const handR = makeBone('handR', 0.035, -0.255, -0.005, forearmR);

  const thighL = makeBone('thighL', -0.098, -0.03, 0, pelvis);
  const shinL = makeBone('shinL', 0, -0.43, 0, thighL);

  const thighR = makeBone('thighR', 0.098, -0.03, 0, pelvis);
  const shinR = makeBone('shinR', 0, -0.43, 0, thighR);

  pelvis.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones);

  const boneMap = {
    pelvis: 0,
    spineLower: 1,
    spineUpper: 2,
    neck: 3,
    head: 4,
    jaw: 5,
    upperArmL: 6,
    forearmL: 7,
    handL: 8,
    upperArmR: 9,
    forearmR: 10,
    handR: 11,
    thighL: 12,
    shinL: 13,
    thighR: 14,
    shinR: 15,
  };

  return { bones, boneMap, skeleton, rootBone: pelvis };
}

function seededRand(seed: number): () => number {
  let s = (Math.floor(seed * 9973) % 2147483647) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function applyVertexAO(
  geometry: THREE.BufferGeometry,
  fn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number
): THREE.BufferGeometry {
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const v = THREE.MathUtils.clamp(
      fn(pos.getX(i), pos.getY(i), pos.getZ(i), norm.getX(i), norm.getY(i), norm.getZ(i)),
      0.34,
      1.05
    );
    colors[i * 3] = v;
    colors[i * 3 + 1] = v;
    colors[i * 3 + 2] = v;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

/**
 * Performs indexed Laplacian-style mesh smoothing while preserving open boundary creases.
 */
export function smoothIndexedGeometry(
  geometry: THREE.BufferGeometry,
  iterations = 2,
  lambda = 0.35
): THREE.BufferGeometry {
  const index = geometry.getIndex();
  const pos = geometry.attributes.position;
  if (!index || !pos) return geometry;

  const vCount = pos.count;
  const neighbors: Set<number>[] = Array.from({ length: vCount }, () => new Set<number>());
  const idxArr = index.array;
  for (let i = 0; i < idxArr.length; i += 3) {
    const a = idxArr[i];
    const b = idxArr[i + 1];
    const c = idxArr[i + 2];
    neighbors[a].add(b).add(c);
    neighbors[b].add(a).add(c);
    neighbors[c].add(a).add(b);
  }

  const next = new Float32Array(vCount * 3);
  for (let iter = 0; iter < iterations; iter++) {
    for (let i = 0; i < vCount; i++) {
      const nSet = neighbors[i];
      if (nSet.size < 3) {
        next[i * 3] = pos.getX(i);
        next[i * 3 + 1] = pos.getY(i);
        next[i * 3 + 2] = pos.getZ(i);
        continue;
      }
      let sx = 0;
      let sy = 0;
      let sz = 0;
      for (const nb of nSet) {
        sx += pos.getX(nb);
        sy += pos.getY(nb);
        sz += pos.getZ(nb);
      }
      const inv = 1 / nSet.size;
      const ox = pos.getX(i);
      const oy = pos.getY(i);
      const oz = pos.getZ(i);
      next[i * 3] = ox + (sx * inv - ox) * lambda;
      next[i * 3 + 1] = oy + (sy * inv - oy) * lambda;
      next[i * 3 + 2] = oz + (sz * inv - oz) * lambda;
    }
    for (let i = 0; i < vCount; i++) {
      pos.setXYZ(i, next[i * 3], next[i * 3 + 1], next[i * 3 + 2]);
    }
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * Merges static sub-parts cleanly, keeping uv + uv1 (for Three.js aoMap) + color.
 */
export function mergeBenchmarkParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    const g = part.index ? part.toNonIndexed() : part.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) applyTriplanarUVs(g, 2.2);
    if (!g.attributes.color) {
      const arr = new Float32Array(g.attributes.position.count * 3);
      arr.fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    }
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv' && key !== 'color') {
        g.deleteAttribute(key);
      }
    }
    normalized.push(g);
    part.dispose();
  }
  const merged =
    normalized.length === 1
      ? normalized[0]
      : (mergeGeometries(normalized, false) ?? normalized[0]);
  if (normalized.length > 1) {
    for (const g of normalized) if (g !== merged) g.dispose();
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

interface RingSection {
  center: THREE.Vector3;
  rx: number;
  rz: number;
  tiltX?: number;
  tiltZ?: number;
  pinchFront?: number; // subtle chest/crease shaping
  pinchBack?: number;
  boneWeights: [number, number][]; // [boneIdx, weight]
}

/**
 * Lofts a continuous indexed mesh with smooth cylindrical UVs + real per-vertex bone skinning weights.
 */
function loftSkinnedTube(
  sections: RingSection[],
  radialSegs: number,
  uvTileX = 1.0,
  uvTileY = 1.0
): THREE.BufferGeometry {
  const cols = radialSegs + 1;
  const rows = sections.length;
  const vertCount = rows * cols;

  const positions = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const skinIndices = new Uint16Array(vertCount * 4);
  const skinWeights = new Float32Array(vertCount * 4);

  const q = new THREE.Quaternion();
  const eul = new THREE.Euler();
  const pt = new THREE.Vector3();

  for (let r = 0; r < rows; r++) {
    const sec = sections[r];
    eul.set(sec.tiltX ?? 0, 0, sec.tiltZ ?? 0);
    q.setFromEuler(eul);

    // Normalize up to 4 bone weights
    const sorted = [...sec.boneWeights].sort((a, b) => b[1] - a[1]).slice(0, 4);
    const totalW = sorted.reduce((acc, s) => acc + s[1], 0) || 1;

    const vCoord = (r / Math.max(1, rows - 1)) * uvTileY;

    for (let c = 0; c < cols; c++) {
      const uFrac = c / radialSegs;
      // Start at +Z back center so the UV/geometry seam never runs down the front face/chest
      const theta = uFrac * Math.PI * 2 + Math.PI;
      const cosT = Math.sin(theta);
      const sinT = -Math.cos(theta);

      let lx = cosT * sec.rx;
      let lz = sinT * sec.rz;

      // Subtle anatomical cross-section sculpting (sternum valley / spine groove)
      if (sec.pinchFront && lz < 0) {
        const centerMask = Math.exp(-Math.pow((lx / Math.max(0.05, sec.rx)) * 4.2, 2));
        lz += centerMask * sec.pinchFront;
      }
      if (sec.pinchBack && lz > 0) {
        const centerMask = Math.exp(-Math.pow((lx / Math.max(0.05, sec.rx)) * 4.6, 2));
        lz -= centerMask * sec.pinchBack;
      }

      pt.set(lx, 0, lz).applyQuaternion(q).add(sec.center);

      const vi = r * cols + c;
      positions[vi * 3] = pt.x;
      positions[vi * 3 + 1] = pt.y;
      positions[vi * 3 + 2] = pt.z;

      uvs[vi * 2] = uFrac * uvTileX;
      uvs[vi * 2 + 1] = vCoord;

      for (let k = 0; k < 4; k++) {
        skinIndices[vi * 4 + k] = sorted[k] ? sorted[k][0] : 0;
        skinWeights[vi * 4 + k] = sorted[k] ? sorted[k][1] / totalW : 0;
      }
    }
  }

  const goingDown = rows > 1 && sections[rows - 1].center.y < sections[0].center.y;
  const indices: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < radialSegs; c++) {
      const a = r * cols + c;
      const b = r * cols + c + 1;
      const d = (r + 1) * cols + c;
      const e = (r + 1) * cols + c + 1;
      if (goingDown) {
        indices.push(a, b, d);
        indices.push(b, e, d);
      } else {
        indices.push(a, d, b);
        indices.push(b, d, e);
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  weldTubeSeamNormals(geo, rows, radialSegs);
  return geo;
}

function weldTubeSeamNormals(geo: THREE.BufferGeometry, rows: number, radialSegs: number): void {
  const norm = geo.attributes.normal;
  if (!norm) return;
  const cols = radialSegs + 1;
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  for (let r = 0; r < rows; r++) {
    const i0 = r * cols;
    const i1 = r * cols + radialSegs;
    v0.fromBufferAttribute(norm, i0);
    v1.fromBufferAttribute(norm, i1);
    v0.add(v1).normalize();
    norm.setXYZ(i0, v0.x, v0.y, v0.z);
    norm.setXYZ(i1, v0.x, v0.y, v0.z);
  }
  norm.needsUpdate = true;
}

/**
 * Merges multiple skinned BufferGeometries into a single SkinnedMesh BufferGeometry
 * (keeping skinIndex, skinWeight, uv, normal, and vertex color AO).
 */
function mergeSkinnedParts(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    const g = part.index ? part.toNonIndexed() : part.clone();
    if (!g.attributes.normal) g.computeVertexNormals();
    if (!g.attributes.uv) applyTriplanarUVs(g, 2.0);
    if (!g.attributes.color) {
      const cols = new Float32Array(g.attributes.position.count * 3);
      cols.fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    }
    nonIndexed.push(g);
    part.dispose();
  }
  const merged = mergeGeometries(nonIndexed, false) ?? nonIndexed[0];
  for (const g of nonIndexed) {
    if (g !== merged) g.dispose();
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Builds the continuous skinned inner body + trouser/sleeve mesh (zero capsule joint gaps!).
 * Returns two skinned geometries: skinZones (exposed neck/wrists/zombie tears) and clothZones (shirt/pants).
 */
export function buildSkinnedBodyGeometries(
  rig: BenchmarkSkeletonRig,
  mode: 'human' | 'zombie'
): {
  torsoAndArmsCloth: THREE.BufferGeometry;
  legsCloth: THREE.BufferGeometry;
  exposedSkinBody: THREE.BufferGeometry;
} {
  const b = rig.boneMap;
  const isZ = mode === 'zombie';
  const slim = isZ ? 0.84 : 1.0;

  // 1. Continuous Torso -> Neck Skin Collar + Inner Shirt Loft
  const torsoSections: RingSection[] = [
    { center: new THREE.Vector3(0, 0.78, 0.005), rx: 0.144 * slim, rz: 0.104 * slim, boneWeights: [[b.pelvis, 1.0]] },
    { center: new THREE.Vector3(0, 0.87, 0.005), rx: 0.146 * slim, rz: 0.105 * slim, boneWeights: [[b.pelvis, 0.86], [b.spineLower, 0.14]] },
    { center: new THREE.Vector3(0, 0.96, 0.004), rx: 0.142 * slim, rz: 0.103 * slim, boneWeights: [[b.pelvis, 0.55], [b.spineLower, 0.45]] },
    { center: new THREE.Vector3(0, 1.06, 0.008), rx: 0.130 * slim, rz: 0.095 * slim, pinchBack: 0.01, boneWeights: [[b.spineLower, 0.78], [b.pelvis, 0.22]] },
    { center: new THREE.Vector3(0, 1.18, 0.004), rx: 0.145 * slim, rz: 0.106 * slim, pinchBack: 0.012, boneWeights: [[b.spineLower, 0.45], [b.spineUpper, 0.55]] },
    { center: new THREE.Vector3(0, 1.30, isZ ? -0.014 : -0.002), rx: 0.168 * slim, rz: 0.116 * slim, pinchFront: 0.012, pinchBack: 0.014, boneWeights: [[b.spineUpper, 0.88], [b.spineLower, 0.12]] },
    { center: new THREE.Vector3(0, 1.41, isZ ? -0.022 : -0.004), rx: 0.180 * slim, rz: 0.112 * slim, pinchFront: 0.01, boneWeights: [[b.spineUpper, 0.92], [b.neck, 0.08]] },
    { center: new THREE.Vector3(0, 1.48, isZ ? -0.020 : 0.0), rx: 0.100 * slim, rz: 0.080 * slim, boneWeights: [[b.spineUpper, 0.52], [b.neck, 0.48]] },
  ];
  const torsoCloth = loftSkinnedTube(torsoSections, 26, 2.0, 2.2);
  smoothIndexedGeometry(torsoCloth, 1, 0.25);
  weldTubeSeamNormals(torsoCloth, torsoSections.length, 26);

  // 2. Continuous Left & Right Sleeved Arms (deltoid shoulder tucked smoothly inside chest -> bicep -> elbow -> forearm -> cuff)
  const buildArm = (side: -1 | 1, tornForearm: boolean): { sleeve: THREE.BufferGeometry; exposedArm?: THREE.BufferGeometry } => {
    const ua = side < 0 ? b.upperArmL : b.upperArmR;
    const fa = side < 0 ? b.forearmL : b.forearmR;
    const sx = side;

    const armRings: RingSection[] = [
      { center: new THREE.Vector3(sx * 0.125, 1.385, isZ ? -0.010 : 0.004), rx: 0.044 * slim, rz: 0.048 * slim, tiltZ: sx * 0.28, boneWeights: [[b.spineUpper, 1.0]] },
      { center: new THREE.Vector3(sx * 0.182, 1.375, isZ ? -0.004 : 0.008), rx: 0.052 * slim, rz: 0.054 * slim, tiltZ: sx * 0.16, boneWeights: [[ua, 0.55], [b.spineUpper, 0.45]] },
      { center: new THREE.Vector3(sx * 0.222, 1.295, 0.012), rx: 0.049 * slim, rz: 0.049 * slim, tiltZ: sx * 0.16, boneWeights: [[ua, 0.96], [fa, 0.04]] },
      { center: new THREE.Vector3(sx * 0.248, 1.19, 0.016), rx: 0.044 * slim, rz: 0.044 * slim, tiltZ: sx * 0.15, boneWeights: [[ua, 0.62], [fa, 0.38]] },
      { center: new THREE.Vector3(sx * 0.264, 1.14, 0.012), rx: 0.043 * slim, rz: 0.042 * slim, tiltZ: sx * 0.14, boneWeights: [[ua, 0.38], [fa, 0.62]] },
    ];

    if (!tornForearm) {
      armRings.push(
        { center: new THREE.Vector3(sx * 0.278, 1.03, 0.006), rx: 0.043 * slim, rz: 0.042 * slim, tiltZ: sx * 0.13, boneWeights: [[fa, 0.94], [ua, 0.06]] },
        { center: new THREE.Vector3(sx * 0.289, 0.93, 0.004), rx: 0.036 * slim, rz: 0.034 * slim, tiltZ: sx * 0.11, boneWeights: [[fa, 1.0]] }
      );
      const sleeve = loftSkinnedTube(armRings, 16, 1.5, 1.8);
      smoothIndexedGeometry(sleeve, 1, 0.24);
      weldTubeSeamNormals(sleeve, armRings.length, 16);
      return { sleeve };
    } else {
      // Torn zombie sleeve ends mid-forearm, exposing necrotic bare forearm + wrist
      armRings.push(
        { center: new THREE.Vector3(sx * 0.276, 1.06, 0.008), rx: 0.046 * slim, rz: 0.045 * slim, tiltZ: sx * 0.14, boneWeights: [[fa, 0.88], [ua, 0.12]] }
      );
      const sleeve = loftSkinnedTube(armRings, 16, 1.5, 1.4);
      weldTubeSeamNormals(sleeve, armRings.length, 16);
      const exposedRings: RingSection[] = [
        { center: new THREE.Vector3(sx * 0.274, 1.08, 0.008), rx: 0.038 * slim, rz: 0.036 * slim, tiltZ: sx * 0.14, boneWeights: [[fa, 0.82], [ua, 0.18]] },
        { center: new THREE.Vector3(sx * 0.282, 0.99, 0.005), rx: 0.033 * slim, rz: 0.031 * slim, tiltZ: sx * 0.12, boneWeights: [[fa, 0.96], [ua, 0.04]] },
        { center: new THREE.Vector3(sx * 0.290, 0.91, 0.003), rx: 0.027 * slim, rz: 0.024 * slim, tiltZ: sx * 0.11, boneWeights: [[fa, 1.0]] },
      ];
      const exposedArm = loftSkinnedTube(exposedRings, 14, 1.2, 1.2);
      return { sleeve, exposedArm };
    }
  };

  const leftArm = buildArm(-1, isZ);
  const rightArm = buildArm(1, false);

  const torsoClothNonIdx = applyVertexAO(mergeSkinnedParts([torsoCloth, leftArm.sleeve, rightArm.sleeve]), (_x, y) =>
    y < 0.92 ? 0.78 : y > 1.43 ? 0.84 : 0.98
  );

  // 3. Exposed Neck Skin & Exposed Zombie Forearm / Wrists
  const neckSkin = loftSkinnedTube(
    [
      { center: new THREE.Vector3(0, 1.45, 0.002), rx: 0.068 * slim, rz: 0.064 * slim, boneWeights: [[b.spineUpper, 0.55], [b.neck, 0.45]] },
      { center: new THREE.Vector3(0, 1.51, 0.004), rx: 0.056 * slim, rz: 0.056 * slim, boneWeights: [[b.neck, 0.78], [b.head, 0.22]] },
      { center: new THREE.Vector3(0, 1.58, -0.002), rx: 0.052 * slim, rz: 0.054 * slim, boneWeights: [[b.head, 0.82], [b.neck, 0.18]] },
    ],
    18,
    1.2,
    1.0
  );
  const wristL = loftSkinnedTube(
    [
      { center: new THREE.Vector3(-0.288, 0.945, 0.010), rx: 0.029 * slim, rz: 0.024 * slim, tiltZ: -0.11, boneWeights: [[b.forearmL, 0.85], [b.handL, 0.15]] },
      { center: new THREE.Vector3(-0.292, 0.895, 0.013), rx: 0.027 * slim, rz: 0.021 * slim, tiltZ: -0.11, boneWeights: [[b.handL, 0.75], [b.forearmL, 0.25]] },
    ],
    12,
    1.0,
    0.8
  );
  const wristR = loftSkinnedTube(
    [
      { center: new THREE.Vector3(0.288, 0.945, 0.010), rx: 0.029 * slim, rz: 0.024 * slim, tiltZ: 0.11, boneWeights: [[b.forearmR, 0.85], [b.handR, 0.15]] },
      { center: new THREE.Vector3(0.292, 0.895, 0.013), rx: 0.027 * slim, rz: 0.021 * slim, tiltZ: 0.11, boneWeights: [[b.handR, 0.75], [b.forearmR, 0.25]] },
    ],
    12,
    1.0,
    0.8
  );
  const skinParts = [neckSkin, wristL, wristR];
  if (leftArm.exposedArm) skinParts.push(leftArm.exposedArm);
  const exposedSkinBody = applyVertexAO(mergeSkinnedParts(skinParts), (_x, y) => (y > 1.46 && y < 1.54 ? 0.82 : 0.95));

  // 4. Continuous Trouser Legs (tucked inside hip pelvis -> thigh -> knee pleats -> calf -> boot cuff)
  const buildLeg = (side: -1 | 1): THREE.BufferGeometry => {
    const th = side < 0 ? b.thighL : b.thighR;
    const sh = side < 0 ? b.shinL : b.shinR;
    const lx = side * 0.098;
    const legRings: RingSection[] = [
      { center: new THREE.Vector3(lx * 0.68, 0.91, 0.004), rx: 0.066 * slim, rz: 0.074 * slim, boneWeights: [[b.pelvis, 0.90], [th, 0.10]] },
      { center: new THREE.Vector3(lx * 0.92, 0.80, 0.002), rx: 0.084 * slim, rz: 0.088 * slim, boneWeights: [[th, 0.78], [b.pelvis, 0.22]] },
      { center: new THREE.Vector3(lx, 0.69, 0.0), rx: 0.082 * slim, rz: 0.086 * slim, boneWeights: [[th, 0.94], [b.pelvis, 0.06]] },
      { center: new THREE.Vector3(lx, 0.58, -0.004), rx: 0.073 * slim, rz: 0.077 * slim, boneWeights: [[th, 0.86], [sh, 0.14]] },
      { center: new THREE.Vector3(lx, 0.49, -0.006), rx: 0.066 * slim, rz: 0.068 * slim, boneWeights: [[th, 0.48], [sh, 0.52]] },
      { center: new THREE.Vector3(lx, 0.36, 0.004), rx: 0.068 * slim, rz: 0.072 * slim, boneWeights: [[sh, 0.94], [th, 0.06]] },
      { center: new THREE.Vector3(lx, 0.22, 0.003), rx: 0.058 * slim, rz: 0.060 * slim, boneWeights: [[sh, 1.0]] },
      { center: new THREE.Vector3(lx, 0.135, 0.002), rx: 0.050 * slim, rz: 0.052 * slim, boneWeights: [[sh, 1.0]] },
    ];
    const leg = loftSkinnedTube(legRings, 18, 1.6, 2.5);
    smoothIndexedGeometry(leg, 1, 0.25);
    weldTubeSeamNormals(leg, legRings.length, 18);
    return leg;
  };

  const pelvisBridge = loftSkinnedTube(
    [
      { center: new THREE.Vector3(0, 0.77, 0.004), rx: 0.134 * slim, rz: 0.098 * slim, boneWeights: [[b.pelvis, 1.0]] },
      { center: new THREE.Vector3(0, 0.85, 0.004), rx: 0.156 * slim, rz: 0.110 * slim, boneWeights: [[b.pelvis, 0.95], [b.spineLower, 0.05]] },
      { center: new THREE.Vector3(0, 0.93, 0.004), rx: 0.154 * slim, rz: 0.108 * slim, boneWeights: [[b.pelvis, 0.82], [b.spineLower, 0.18]] },
      { center: new THREE.Vector3(0, 0.98, 0.005), rx: 0.146 * slim, rz: 0.105 * slim, boneWeights: [[b.pelvis, 0.64], [b.spineLower, 0.36]] },
    ],
    22,
    1.8,
    0.9
  );
  const legL = buildLeg(-1);
  const legR = buildLeg(1);
  const legsCloth = applyVertexAO(mergeSkinnedParts([pelvisBridge, legL, legR]), (_x, y) =>
    y < 0.26 || (y > 0.46 && y < 0.53) ? 0.8 : 0.96
  );

  return {
    torsoAndArmsCloth: torsoClothNonIdx,
    legsCloth,
    exposedSkinBody,
  };
}

/**
 * High-resolution vertex-sculpted anatomical head (44x32 sphere + ears) with facial landmarks.
 * Local origin sits at skull pivot (neck socket near y=-0.04, eye level y=0.055, crown y=0.175).
 */
export function buildBenchmarkHeadGeometry(mode: 'human' | 'zombie'): THREE.BufferGeometry {
  const isZ = mode === 'zombie';
  const r = 0.106;
  const sphere = new THREE.SphereGeometry(r, 44, 32);
  const pos = sphere.attributes.position;
  const uvs = sphere.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const nx = x / r;
    const ny = y / r;
    const nz = z / r; // -1 face front, +1 back of head

    // Adult cranium proportions
    y *= 1.18;
    x *= isZ ? 0.91 : 0.96;
    z *= nz > 0 ? 1.12 : 0.98;

    // Jaw taper + mandibular angle (gonion) + chin prominence
    if (ny < 0.12) {
      const lt = THREE.MathUtils.clamp((0.12 - ny) / 1.12, 0, 1);
      const jawW = THREE.MathUtils.lerp(1.0, isZ ? 0.52 : 0.60, Math.pow(lt, 1.1));
      x *= jawW;

      // Mandibular jaw corners
      const jawCorner = Math.exp(-Math.pow((ny + 0.38) * 3.8, 2)) * Math.exp(-Math.pow((Math.abs(nx) - 0.64) * 3.4, 2));
      x += Math.sign(nx) * jawCorner * 0.008;

      // Chin projection
      if (nz < -0.25) {
        const chin = Math.exp(-Math.pow((ny + 0.68) * 3.5, 2)) * Math.exp(-Math.pow(nx * 3.2, 2)) * (-nz);
        z -= chin * (isZ ? 0.018 : 0.024);
        y -= chin * 0.006;
      }
    }

    // Supraorbital brow ridge
    if (nz < -0.22 && ny > 0.06 && ny < 0.36) {
      const browArch =
        Math.exp(-Math.pow((ny - 0.19 - Math.abs(nx) * 0.06) * 6.5, 2)) *
        Math.exp(-Math.pow(nx * 1.4, 2)) *
        Math.max(0, -nz - 0.2);
      z -= browArch * (isZ ? 0.025 : 0.017);
    }

    // Deep orbital eye sockets
    if (nz < -0.35 && ny > -0.14 && ny < 0.2) {
      const leftEye = Math.exp(-Math.pow((nx + 0.32) * 5.2, 2));
      const rightEye = Math.exp(-Math.pow((nx - 0.32) * 5.2, 2));
      const vert = Math.exp(-Math.pow((ny - 0.035) * 7.2, 2));
      const orbit = (leftEye + rightEye) * vert * Math.max(0, -nz - 0.3);
      z += orbit * (isZ ? 0.034 : 0.021);
    }

    // Zygomatic cheekbones & sunken cheeks
    if (nz < -0.15 && ny > -0.4 && ny < 0.02) {
      const zygoma =
        (Math.exp(-Math.pow((nx + 0.48) * 4.2, 2)) + Math.exp(-Math.pow((nx - 0.48) * 4.2, 2))) *
        Math.exp(-Math.pow((ny + 0.12) * 5.6, 2));
      x += Math.sign(nx) * zygoma * (isZ ? 0.009 : 0.006);
      z -= zygoma * (isZ ? 0.013 : 0.009);

      // Hollow buccal cheek indentation
      const hollow =
        (Math.exp(-Math.pow((nx + 0.44) * 3.8, 2)) + Math.exp(-Math.pow((nx - 0.44) * 3.8, 2))) *
        Math.exp(-Math.pow((ny + 0.34) * 4.2, 2)) *
        Math.max(0, -nz);
      x *= 1 - hollow * (isZ ? 0.24 : 0.07);
      z += hollow * (isZ ? 0.016 : 0.006);
    }

    // Nasal bridge + defined tip + alar nostrils
    if (nz < -0.48 && ny > -0.32 && ny < 0.18) {
      const bridgeW = Math.exp(-Math.pow(nx * 7.8, 2));
      const bridgeH = Math.exp(-Math.pow((ny + 0.05) * 4.0, 2));
      const tipH = Math.exp(-Math.pow((ny + 0.19) * 7.8, 2));
      const alae =
        (Math.exp(-Math.pow((nx + 0.16) * 9.0, 2)) + Math.exp(-Math.pow((nx - 0.16) * 9.0, 2))) *
        Math.exp(-Math.pow((ny + 0.21) * 10.0, 2));
      const noseAmt = isZ ? 0.015 : 0.029;
      z -= bridgeW * (bridgeH * 0.72 + tipH * 0.62) * noseAmt;
      z -= alae * (isZ ? 0.005 : 0.011);
      if (isZ && ny < -0.14) {
        // Broken sunken cartilage at tip of zombie nose
        z += bridgeW * tipH * 0.008;
      }
    }

    // Mouth / lips / philtrum & undead open grimace cavity
    if (nz < -0.52 && ny > -0.58 && ny < -0.22) {
      const mouthW = Math.exp(-Math.pow(nx * 3.9, 2));
      const upperLip = Math.exp(-Math.pow((ny + 0.33) * 15.0, 2));
      const lowerLip = Math.exp(-Math.pow((ny + 0.43) * 14.0, 2));
      const cleft = Math.exp(-Math.pow((ny + 0.38) * 18.0, 2));
      if (!isZ) {
        z -= mouthW * (upperLip * 0.012 + lowerLip * 0.011);
        z += mouthW * cleft * 0.011;
      } else {
        // Gaping slack zombie mouth + asymmetric torn cheek pull on +X
        const gape = Math.exp(-Math.pow((ny + 0.40) * 8.0, 2)) * Math.exp(-Math.pow((nx - 0.04) * 3.0, 2));
        z += gape * 0.028;
        y -= ny < -0.40 ? 0.015 * mouthW : 0;
        if (nx > 0.22 && ny < -0.22 && ny > -0.52) {
          z += Math.exp(-Math.pow((nx - 0.38) * 4.5, 2)) * 0.016;
        }
      }
    }

    // Cheek-only gentle flattening (preserve nose & lip relief along center)
    if (nz < -0.68 && ny > -0.45 && ny < 0.28 && Math.abs(nx) > 0.24) {
      z += (-nz - 0.68) * 0.009;
    }

    // Shift center so pivot matches head bone (~0.06m above neck top)
    pos.setXYZ(i, x, y + 0.058, z);

    // Clean cylindrical face-centered UVs (-Z front mapped neatly)
    const faceU = 0.5 + Math.atan2(x, -z) / (Math.PI * 2);
    const faceV = THREE.MathUtils.clamp((y + 0.14) / 0.28, 0.02, 0.98);
    uvs.setXY(i, faceU, faceV);
  }

  sphere.computeVertexNormals();

  // Sculpted ears
  const earL = new THREE.SphereGeometry(0.023, 12, 10);
  earL.scale(0.36, 1.38, 0.82);
  earL.rotateY(0.22);
  earL.rotateZ(0.08);
  earL.translate(-0.098 * (isZ ? 0.91 : 0.96), 0.052, 0.014);

  const earR = new THREE.SphereGeometry(0.023, 12, 10);
  earR.scale(0.36, 1.38, 0.82);
  earR.rotateY(-0.22);
  earR.rotateZ(-0.08);
  earR.translate(0.098 * (isZ ? 0.91 : 0.96), 0.052, 0.014);

  const combined = mergeBenchmarkParts([sphere, earL, earR]);
  const cPos = combined.attributes.position;
  const cColors = new Float32Array(cPos.count * 3);
  for (let i = 0; i < cPos.count; i++) {
    const x = cPos.getX(i);
    const y = cPos.getY(i);
    const z = cPos.getZ(i);
    let rCol = 1.0;
    let gCol = 1.0;
    let bCol = 1.0;

    // Orbital socket shading
    if (z < -0.05 && y > 0.042 && y < 0.092 && Math.abs(x) > 0.014 && Math.abs(x) < 0.056) {
      const f = isZ ? 0.52 : 0.78;
      rCol *= f;
      gCol *= f * 0.92;
      bCol *= f * 0.94;
    }
    // Under-jaw & neck shadow
    if (y < 0.005) {
      rCol *= 0.82;
      gCol *= 0.80;
      bCol *= 0.80;
    }
    // Under-nose nostril shadow
    if (z < -0.085 && y > 0.026 && y < 0.038 && Math.abs(x) < 0.018) {
      rCol *= 0.74;
      gCol *= 0.68;
      bCol *= 0.68;
    }
    // Lips / mouth cavity tint
    if (z < -0.065 && y > -0.004 && y < 0.024 && Math.abs(x) < 0.032) {
      if (!isZ && Math.abs(x) < 0.022 && y > 0.002 && y < 0.018) {
        const seam = Math.exp(-Math.pow((y - 0.010) * 190, 2));
        rCol *= 0.90 - seam * 0.26;
        gCol *= 0.74 - seam * 0.28;
        bCol *= 0.72 - seam * 0.26;
      } else if (isZ) {
        rCol *= 0.45;
        gCol *= 0.28;
        bCol *= 0.28;
      }
    }
    if (Math.abs(x) > 0.088 && z > -0.01 && z < 0.03) {
      rCol *= 0.84;
      gCol *= 0.82;
      bCol *= 0.82;
    }
    cColors[i * 3] = rCol;
    cColors[i * 3 + 1] = gCol;
    cColors[i * 3 + 2] = bCol;
  }
  combined.setAttribute('color', new THREE.BufferAttribute(cColors, 3));
  return combined;
}

/**
 * Builds sculpted 5-finger articulated hand (wrist at y=0, palm + 5 2-segment fingers).
 */
export function buildBenchmarkHandGeometry(side: -1 | 1, clawed: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const sign = side; // -1 left (-X outer), +1 right (+X outer)

  const palm = new THREE.SphereGeometry(0.027, 12, 10);
  palm.scale(0.54, 1.24, 0.98);
  palm.translate(0, -0.038, -0.004);
  parts.push(palm);

  const fZ = [-0.022, -0.007, 0.0075, 0.021];
  const proxLen = clawed ? [0.024, 0.028, 0.026, 0.021] : [0.021, 0.024, 0.022, 0.017];
  const distLen = clawed ? [0.022, 0.025, 0.023, 0.018] : [0.018, 0.020, 0.018, 0.015];
  const radii = [0.0058, 0.0062, 0.0058, 0.0050];

  for (let i = 0; i < 4; i++) {
    const knuckleY = -0.066 + Math.abs(i - 1.5) * 0.002;
    const prox = new THREE.CapsuleGeometry(radii[i], proxLen[i], 4, 7);
    const curl1 = (clawed ? 0.34 : 0.18) * -sign;
    prox.rotateZ(curl1);
    prox.rotateX((i - 1.5) * (clawed ? 0.07 : 0.03));
    const midX = sign * -0.005;
    const midY = knuckleY - proxLen[i] * 0.65;
    prox.translate(midX, midY, fZ[i]);
    parts.push(prox);

    const dist = new THREE.CapsuleGeometry(radii[i] * 0.84, distLen[i], 4, 6);
    const curl2 = (clawed ? 0.92 : 0.44) * -sign;
    dist.rotateZ(curl2);
    dist.translate(midX + sign * -0.009, midY - distLen[i] * 0.72, fZ[i]);
    parts.push(dist);
  }

  // Opposable thumb (2 segments)
  const tProx = new THREE.CapsuleGeometry(0.0074, 0.019, 4, 7);
  tProx.rotateX(-0.52);
  tProx.rotateZ(sign * -0.28);
  tProx.translate(sign * -0.004, -0.032, -0.026);
  parts.push(tProx);

  const tDist = new THREE.CapsuleGeometry(0.0062, 0.016, 4, 6);
  tDist.rotateX(-0.76);
  tDist.rotateZ(sign * -0.14);
  tDist.translate(sign * -0.006, -0.051, -0.039);
  parts.push(tDist);

  return applyVertexAO(mergeBenchmarkParts(parts), (_x, y) => (y < -0.07 ? 0.78 : 0.96));
}

/**
 * Contoured leather work boot with tread welt, heel counter, lacing tongue, and ankle cuff.
 * Mounted at shin bone (y=0 = knee, sole bottom at y=-0.49).
 */
export function buildBenchmarkBootGeometry(side: -1 | 1): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const lx = side * 0.0; // relative to shin bone

  const cuff = new THREE.CylinderGeometry(0.060, 0.055, 0.16, 16, 1, true);
  cuff.translate(lx, -0.33, 0.002);
  parts.push(cuff);

  // Sculpted boot body
  const footShape = new THREE.Shape();
  footShape.moveTo(0.062, -0.47);
  footShape.lineTo(-0.155, -0.47);
  footShape.quadraticCurveTo(-0.175, -0.455, -0.165, -0.422);
  footShape.quadraticCurveTo(-0.112, -0.402, -0.044, -0.388);
  footShape.lineTo(0.056, -0.392);
  footShape.closePath();

  const upper = new THREE.ExtrudeGeometry(footShape, {
    depth: 0.092,
    bevelEnabled: true,
    bevelThickness: 0.014,
    bevelSize: 0.014,
    bevelSegments: 2,
    curveSegments: 6,
  });
  upper.rotateY(Math.PI * 0.5);
  upper.translate(-0.046, 0, 0);
  parts.push(upper);

  // Sole welt & heel block
  const soleShape = new THREE.Shape();
  soleShape.moveTo(0.068, -0.49);
  soleShape.lineTo(-0.162, -0.49);
  soleShape.lineTo(-0.162, -0.472);
  soleShape.lineTo(0.068, -0.472);
  soleShape.closePath();
  const sole = new THREE.ExtrudeGeometry(soleShape, {
    depth: 0.104,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 1,
  });
  sole.rotateY(Math.PI * 0.5);
  sole.translate(-0.052, 0, 0);
  parts.push(sole);

  return applyVertexAO(mergeBenchmarkParts(parts), (_x, y) => (y < -0.468 ? 0.65 : 0.92));
}

/**
 * Builds multi-layered open weathered leather jacket shell with integrated sloped collar,
 * contoured shoulders, open front chest, folded lapels, and optional tattered zombie rags.
 */
export function buildBenchmarkOuterJacket(tornZombie: boolean): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  // Continuous tailored jacket + integrated collar (spineUpper local origin: y=0 at ~1.28m)
  const scale = tornZombie ? 0.86 : 1.0;
  const zShiftChest = tornZombie ? -0.015 : -0.002;
  const zShiftShoulder = tornZombie ? -0.020 : -0.004;
  const rings: { y: number; zOff: number; rx: number; rz: number; openHalfRad: number }[] = [
    { y: -0.27, zOff: 0.005, rx: 0.162 * scale, rz: 0.118 * scale, openHalfRad: 0.36 },
    { y: -0.15, zOff: 0.006, rx: 0.156 * scale, rz: 0.114 * scale, openHalfRad: 0.40 },
    { y: -0.02, zOff: zShiftChest, rx: 0.186 * scale, rz: 0.132 * scale, openHalfRad: 0.44 },
    { y: 0.10, zOff: zShiftShoulder, rx: 0.200 * scale, rz: 0.130 * scale, openHalfRad: 0.48 },
    { y: 0.168, zOff: zShiftShoulder * 0.8, rx: 0.166 * scale, rz: 0.110 * scale, openHalfRad: 0.56 },
    { y: 0.205, zOff: zShiftShoulder * 0.3, rx: 0.088 * scale, rz: 0.082 * scale, openHalfRad: 0.66 },
    { y: 0.242, zOff: 0.002, rx: 0.094 * scale, rz: 0.088 * scale, openHalfRad: 0.74 },
  ];

  const cols = 28;
  const rows = rings.length;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);

  for (let r = 0; r < rows; r++) {
    const ring = rings[r];
    const v = r / (rows - 1);
    const startAngle = ring.openHalfRad;
    const sweep = Math.PI * 2 - ring.openHalfRad * 2;
    for (let c = 0; c < cols; c++) {
      const u = c / (cols - 1);
      const angle = startAngle + u * sweep;
      const sx = Math.sin(angle);
      const sz = -Math.cos(angle);
      let px = sx * ring.rx;
      let pz = sz * ring.rz + ring.zOff;
      const fold = r < rows - 2 ? Math.sin(r * 1.9 + u * 18.0) * 0.003 + Math.cos(u * 12.0) * 0.002 : 0;
      px += sx * fold;
      pz += sz * fold;
      const vi = r * cols + c;
      positions[vi * 3] = px;
      positions[vi * 3 + 1] = ring.y;
      positions[vi * 3 + 2] = pz;
      uvs[vi * 2] = u * 2.0;
      uvs[vi * 2 + 1] = v * 2.0;
    }
  }

  const indices: number[] = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const a = r * cols + c;
      const b = r * cols + c + 1;
      const d = (r + 1) * cols + c;
      const e = (r + 1) * cols + c + 1;
      indices.push(a, d, b);
      indices.push(b, d, e);
    }
  }

  const jacketShell = new THREE.BufferGeometry();
  jacketShell.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  jacketShell.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  jacketShell.setIndex(indices);
  jacketShell.computeVertexNormals();
  parts.push(jacketShell);

  // Left & right folded lapels along front opening (lowered/tucked on hunched zombie)
  for (const sx of [-1, 1]) {
    if (tornZombie && sx > 0) continue; // missing torn right lapel on zombie
    const topY = tornZombie ? 0.13 : 0.185;
    const lapelShape = new THREE.Shape();
    lapelShape.moveTo(0, topY);
    lapelShape.lineTo(sx * 0.044, topY - 0.06);
    lapelShape.lineTo(sx * 0.026, -0.24);
    lapelShape.lineTo(0, -0.25);
    lapelShape.closePath();
    const lapel = new THREE.ExtrudeGeometry(lapelShape, {
      depth: 0.010,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 1,
    });
    lapel.rotateY(sx * -0.24);
    lapel.translate(sx * 0.078 * scale, -0.01, -0.118 * scale + zShiftChest);
    parts.push(lapel);
  }

  if (tornZombie) {
    const rand = seededRand(71);
    const strips: [number, number, number, number][] = [
      [-0.14, -0.29, 0.04, 0.17],
      [-0.04, -0.31, 0.11, 0.20],
      [0.08, -0.28, 0.10, 0.16],
      [0.14, -0.26, -0.02, 0.18],
    ];
    for (const [fx, fy, fz, fh] of strips) {
      const sh = new THREE.Shape();
      sh.moveTo(-0.026, fh * 0.5);
      sh.lineTo(0.026, fh * 0.45);
      sh.lineTo(0.014, -fh * 0.42);
      sh.lineTo(-0.008, -fh * 0.56);
      sh.lineTo(-0.022, -fh * 0.2);
      sh.closePath();
      const rag = new THREE.ExtrudeGeometry(sh, { depth: 0.008, bevelEnabled: false });
      rag.rotateY(Math.atan2(fx, fz));
      rag.rotateX((rand() - 0.5) * 0.22);
      rag.translate(fx, fy, fz);
      parts.push(rag);
    }
  }

  return applyVertexAO(mergeBenchmarkParts(parts), (_x, y, z) => {
    if (y < -0.22) return 0.68;
    if (z > -0.09 && y > 0.18) return 0.80;
    return 0.96;
  });
}

/**
 * Smooth parametric scalp-hugging hair cap (continuous curved hairline with zero sawtooth holes).
 */
export function buildBenchmarkHairGeometry(mode: 'human' | 'zombie'): THREE.BufferGeometry {
  const isZ = mode === 'zombie';
  const r = 0.106;
  const latSegs = 20;
  const lonSegs = 40;
  const cols = lonSegs + 1;
  const rows = latSegs + 1;
  const positions = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);

  for (let c = 0; c < cols; c++) {
    const u = c / lonSegs;
    // az = 0 at -Z front center, PI at +Z back
    const az = u * Math.PI * 2;
    const sinA = Math.sin(az);
    const cosA = -Math.cos(az); // -1 at front (-Z), +1 at back (+Z)

    // Smooth continuous polar angle limit phiMax(az) from top pole (phi=0) downward
    let phiMax: number;
    if (!isZ) {
      // Front forehead hairline ~1.18 rad, dips softly at temples (~1.52), wraps down to nape at back (~2.02)
      const backWeight = THREE.MathUtils.smoothstep(cosA, -0.35, 0.75);
      const templeDip = Math.exp(-Math.pow((Math.abs(sinA) - 0.88) * 3.5, 2)) * 0.24;
      const sidePartSweep = Math.exp(-Math.pow((sinA - 0.25) * 3.2, 2)) * 0.08;
      phiMax = 1.18 + templeDip + sidePartSweep + backWeight * 0.82;
    } else {
      // Zombie: receding/thinning asymmetrical crown + back nape patch (clean hairline, zero forehead blobs)
      const asym = Math.sin(az * 2.0 + 0.7) * 0.14 + Math.cos(az * 3.0) * 0.08;
      const backWeight = THREE.MathUtils.smoothstep(cosA, -0.1, 0.85);
      phiMax = 0.92 + backWeight * 0.88 + asym;
    }

    for (let rIdx = 0; rIdx < rows; rIdx++) {
      const v = rIdx / latSegs;
      const phi = v * phiMax;
      const sinP = Math.sin(phi);
      const cosP = Math.cos(phi);

      const nx = sinP * sinA;
      const ny = cosP;
      const nz = sinP * cosA;

      let x = nx * r * (isZ ? 0.91 : 0.96);
      let y = ny * r * 1.18;
      let z = nz * r * (nz > 0 ? 1.12 : 0.98);

      // Taper thickness smoothly to 1.5mm at hairline edge so hair sits flush on scalp
      const edgeTaper = THREE.MathUtils.smoothstep(1 - v, 0, 0.25);
      const strandWave =
        (Math.sin(az * 22 + ny * 5) * 0.0018 + Math.cos(az * 38) * 0.0010) * edgeTaper;
      const baseThick = isZ ? 0.003 + 0.004 * edgeTaper : 0.003 + 0.008 * edgeTaper;
      const thick = baseThick + strandWave;

      const outLen = Math.hypot(x, y, z) || 1;
      x += (x / outLen) * thick;
      y += (y / outLen) * thick;
      z += (z / outLen) * thick;

      const vi = rIdx * cols + c;
      positions[vi * 3] = x;
      positions[vi * 3 + 1] = y + 0.058;
      positions[vi * 3 + 2] = z;
      uvs[vi * 2] = u * 2.0;
      uvs[vi * 2 + 1] = v * 1.5;
    }
  }

  const indices: number[] = [];
  for (let rIdx = 0; rIdx < latSegs; rIdx++) {
    for (let c = 0; c < lonSegs; c++) {
      const a = rIdx * cols + c;
      const b = rIdx * cols + c + 1;
      const d = (rIdx + 1) * cols + c;
      const e = (rIdx + 1) * cols + c + 1;
      indices.push(a, b, d);
      indices.push(b, e, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  return applyVertexAO(mergeBenchmarkParts([geo]), (_x, y, z) => {
    if (y < 0.06 || z > 0.08) return 0.74;
    return 0.96;
  });
}

/**
 * Zombie crooked upper/lower teeth + torn chest laceration cavity + separate pale fractured rib bones
 * + articulated asymmetric slack lower mandible attached to the `jaw` bone.
 */
export function buildBenchmarkZombieHorrorDetails(): {
  upperTeeth: THREE.BufferGeometry;
  lowerJawSkin: THREE.BufferGeometry;
  lowerTeeth: THREE.BufferGeometry;
  woundCavity: THREE.BufferGeometry;
  ribs: THREE.BufferGeometry;
} {
  const upperToothParts: THREE.BufferGeometry[] = [];
  const lowerToothParts: THREE.BufferGeometry[] = [];
  const xs = [-0.018, -0.011, -0.003, 0.005, 0.012, 0.019];
  for (let i = 0; i < xs.length; i++) {
    if (i === 2) continue; // broken missing tooth gap
    const topT = new THREE.ConeGeometry(0.0030, 0.010 + (i % 2) * 0.003, 5);
    topT.rotateX(Math.PI);
    topT.rotateZ((i - 2.5) * 0.14);
    topT.translate(xs[i], 0.013, -0.083 + Math.abs(i - 2.5) * 0.0022);
    upperToothParts.push(topT);

    // Lower teeth live in `jaw` bone local space (jaw pivot is at y=0.016, z=-0.024 relative to head)
    const botT = new THREE.ConeGeometry(0.0028, 0.0085 + ((i + 1) % 2) * 0.003, 5);
    botT.rotateZ((2.5 - i) * 0.12);
    botT.translate(xs[i] * 0.92 + 0.002, -0.019, -0.056 + Math.abs(i - 2.5) * 0.0022);
    lowerToothParts.push(botT);
  }
  const upperTeeth = applyVertexAO(mergeBenchmarkParts(upperToothParts), () => 0.80);
  const lowerTeeth = applyVertexAO(mergeBenchmarkParts(lowerToothParts), () => 0.78);

  // Asymmetric slack lower mandible + torn chin flesh in `jaw` bone local space
  const jawBase = new THREE.SphereGeometry(0.044, 14, 10);
  jawBase.scale(0.92, 0.56, 1.18);
  jawBase.rotateX(0.18);
  jawBase.rotateZ(0.08);
  jawBase.translate(0.003, -0.036, -0.040);
  const chinPoint = new THREE.SphereGeometry(0.022, 10, 8);
  chinPoint.scale(0.84, 0.76, 0.92);
  chinPoint.translate(0.004, -0.046, -0.068);
  const lowerJawSkin = applyVertexAO(mergeBenchmarkParts([jawBase, chinPoint]), (_x, y, z) =>
    y > -0.028 || z > -0.04 ? 0.65 : 0.92
  );

  // Torn chest laceration cavity + exposed fractured ribs (mounted on spineUpper)
  const cavity = new THREE.SphereGeometry(0.062, 12, 9);
  cavity.scale(0.92, 1.38, 0.25);
  cavity.rotateZ(-0.22);
  cavity.translate(0.028, -0.03, -0.106);
  const woundCavity = applyVertexAO(mergeBenchmarkParts([cavity]), (_x, _y, z) =>
    z < -0.112 ? 0.88 : 0.46
  );

  const ribParts: THREE.BufferGeometry[] = [];
  const ribSpecs: [number, number, number, number][] = [
    [0.018, -0.085, 0.056, -0.25],
    [0.026, -0.048, 0.064, -0.18],
    [0.034, -0.010, 0.058, -0.28],
    [0.042, 0.026, 0.044, -0.14],
  ];
  for (const [rx, ry, len, rot] of ribSpecs) {
    const rib = new THREE.CapsuleGeometry(0.0056, len, 4, 6);
    rib.rotateZ(Math.PI * 0.5 + rot);
    rib.rotateY(0.28);
    rib.translate(rx, ry, -0.114);
    ribParts.push(rib);
  }
  const ribs = applyVertexAO(mergeBenchmarkParts(ribParts), (_x, _y, z) =>
    z < -0.115 ? 0.98 : 0.65
  );

  return { upperTeeth, lowerJawSkin, lowerTeeth, woundCavity, ribs };
}
