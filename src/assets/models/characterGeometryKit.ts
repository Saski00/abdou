import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyTriplanarUVs, createTubePathGeometry } from './proceduralGeometryKit';

export type HumanHairStyle =
  | 'short_crop'
  | 'messy'
  | 'long_layered'
  | 'ponytail_bun'
  | 'side_part'
  | 'bald_stubble';

export type HumanHeadwearKind = 'none' | 'cap' | 'beanie' | 'hood';

export interface CharacterDetailTextures {
  fabricBump: THREE.CanvasTexture | null;
  skinBump: THREE.CanvasTexture | null;
  undeadBump: THREE.CanvasTexture | null;
  dispose: () => void;
}

export interface HumanoidSharedGeometries {
  // Anatomical Core
  headHuman: THREE.BufferGeometry;
  headFemale: THREE.BufferGeometry;
  headStocky: THREE.BufferGeometry;
  eyeSclera: THREE.BufferGeometry;
  eyeIris: THREE.BufferGeometry;
  eyebrow: THREE.BufferGeometry;

  pelvis: THREE.BufferGeometry;
  torsoAthletic: THREE.BufferGeometry;
  torsoSlim: THREE.BufferGeometry;
  torsoStocky: THREE.BufferGeometry;

  upperArm: THREE.BufferGeometry;
  forearm: THREE.BufferGeometry;
  forearmRolled: THREE.BufferGeometry;
  handHuman: THREE.BufferGeometry;

  thigh: THREE.BufferGeometry;
  shinBoot: THREE.BufferGeometry;
  legBandage: THREE.BufferGeometry;

  // Hair & Headwear
  hairShortCrop: THREE.BufferGeometry;
  hairMessy: THREE.BufferGeometry;
  hairLongLayered: THREE.BufferGeometry;
  hairPonytailBun: THREE.BufferGeometry;
  hairSidePart: THREE.BufferGeometry;
  hairStubble: THREE.BufferGeometry;
  headwearCap: THREE.BufferGeometry;
  headwearCapVisor: THREE.BufferGeometry;
  headwearBeanie: THREE.BufferGeometry;
  headwearHood: THREE.BufferGeometry;

  // Layered Clothing & Gear
  jacketOpen: THREE.BufferGeometry;
  tacticalVest: THREE.BufferGeometry;
  apron: THREE.BufferGeometry;
  freightHarness: THREE.BufferGeometry;
  hoodieCollar: THREE.BufferGeometry;
  beltWithPouches: THREE.BufferGeometry;
  backpack: THREE.BufferGeometry;
  courierPack: THREE.BufferGeometry;
  baton: THREE.BufferGeometry;

  // Markers & Ground Shadows
  shadowDisc: THREE.BufferGeometry;
  statusMarker: THREE.BufferGeometry;

  textures: CharacterDetailTextures;
  dispose: () => void;
}

export interface ZombieAnatomyGeometries {
  headWalker: THREE.BufferGeometry;
  headRunner: THREE.BufferGeometry;
  headBrute: THREE.BufferGeometry;
  eyeSocket: THREE.BufferGeometry;
  eyeGlow: THREE.BufferGeometry;
  jawTeeth: THREE.BufferGeometry;

  pelvis: THREE.BufferGeometry;
  torsoWalker: THREE.BufferGeometry;
  torsoRunner: THREE.BufferGeometry;
  torsoBrute: THREE.BufferGeometry;

  tatteredCoatWalker: THREE.BufferGeometry;
  tatteredRagsRunner: THREE.BufferGeometry;
  riotVestBrute: THREE.BufferGeometry;
  ribWound: THREE.BufferGeometry;

  upperArm: THREE.BufferGeometry;
  forearmClawed: THREE.BufferGeometry;
  upperArmBrute: THREE.BufferGeometry;
  forearmBrute: THREE.BufferGeometry;

  thigh: THREE.BufferGeometry;
  shinTatteredBoot: THREE.BufferGeometry;
  thighBrute: THREE.BufferGeometry;
  shinBruteBoot: THREE.BufferGeometry;

  sparseHair: THREE.BufferGeometry;
  shadowDisc: THREE.BufferGeometry;
  textures: CharacterDetailTextures;
  dispose: () => void;
}

function seededRand(seed: number): () => number {
  let s = Math.floor(seed * 9973) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Merges character sub-parts while preserving vertex color AO (defaults white if missing).
 */
export function mergeCharacterParts(
  parts: THREE.BufferGeometry[],
  applyTriplanar = true,
  tilesPerMeter = 1.4
): THREE.BufferGeometry {
  const normalized: THREE.BufferGeometry[] = [];
  for (const part of parts) {
    const g = part.index ? part.toNonIndexed() : part.clone();
    if (!g.attributes.normal) {
      g.computeVertexNormals();
    }
    if (!g.attributes.uv) {
      applyTriplanarUVs(g, tilesPerMeter);
    }
    if (!g.attributes.color) {
      const count = g.attributes.position.count;
      const colors = new Float32Array(count * 3);
      colors.fill(1);
      g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
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
      : mergeGeometries(normalized, false) ?? normalized[0];

  if (normalized.length > 1) {
    for (const g of normalized) {
      if (g !== merged) g.dispose();
    }
  }
  if (applyTriplanar) {
    applyTriplanarUVs(merged, tilesPerMeter);
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Adds subtle per-vertex grayscale shading so skin folds, eye sockets, and clothing creases
 * retain natural depth under directional and ambient light.
 */
export function applyAnatomicalVertexAO(
  geometry: THREE.BufferGeometry,
  shadeFn: (x: number, y: number, z: number, nx: number, ny: number, nz: number) => number
): THREE.BufferGeometry {
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = THREE.MathUtils.clamp(
      shadeFn(
        pos.getX(i),
        pos.getY(i),
        pos.getZ(i),
        norm.getX(i),
        norm.getY(i),
        norm.getZ(i)
      ),
      0.38,
      1.08
    );
    colors[i * 3] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * Math.max(0.001, dt)));
}

/**
 * Lightweight shared bump maps for fabric weave, matte skin grain, and necrotic grime.
 * Returns nulls gracefully in headless Node audit environments without DOM canvas.
 */
export function createCharacterDetailTextures(): CharacterDetailTextures {
  if (typeof document === 'undefined') {
    return {
      fabricBump: null,
      skinBump: null,
      undeadBump: null,
      dispose: () => {},
    };
  }

  const makeBumpTex = (
    size: number,
    repeat: number,
    painter: (ctx: CanvasRenderingContext2D, s: number) => void
  ): THREE.CanvasTexture => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) painter(ctx, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat, repeat);
    tex.needsUpdate = true;
    return tex;
  };

  const fabricBump = makeBumpTex(96, 3.5, (ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    const rand = seededRand(41);
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, y, s, 1);
    }
    for (let x = 0; x < s; x += 3) {
      ctx.fillStyle = x % 6 === 0 ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.09)';
      ctx.fillRect(x, 0, 1, s);
    }
    for (let i = 0; i < 140; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.1)';
      ctx.fillRect(rand() * s, rand() * s, 2, 2);
    }
  });

  const skinBump = makeBumpTex(64, 2.2, (ctx, s) => {
    ctx.fillStyle = '#828282';
    ctx.fillRect(0, 0, s, s);
    const rand = seededRand(77);
    for (let i = 0; i < 240; i++) {
      ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(rand() * s, rand() * s, 1.5, 1.5);
    }
  });

  const undeadBump = makeBumpTex(96, 2.4, (ctx, s) => {
    ctx.fillStyle = '#7c7c7c';
    ctx.fillRect(0, 0, s, s);
    const rand = seededRand(113);
    for (let i = 0; i < 22; i++) {
      ctx.strokeStyle = rand() > 0.45 ? 'rgba(20,20,20,0.34)' : 'rgba(220,220,220,0.16)';
      ctx.lineWidth = 1 + rand() * 1.4;
      ctx.beginPath();
      const x0 = rand() * s;
      const y0 = rand() * s;
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(x0 + (rand() - 0.5) * 28, y0 + (rand() - 0.5) * 28, x0 + (rand() - 0.5) * 34, y0 + (rand() - 0.5) * 34);
      ctx.stroke();
    }
  });

  return {
    fabricBump,
    skinBump,
    undeadBump,
    dispose: () => {
      fabricBump.dispose();
      skinBump.dispose();
      undeadBump.dispose();
    },
  };
}

/**
 * Sculpts an organic anatomical head (-Z forward, neck base at y=0, crown at y~0.24).
 * Includes brow ridge, recessed orbital eye sockets, nose bridge, cheekbones, tapered jaw, and ears.
 */
function createSculptedHeadGeometry(opts: {
  widthScale: number;
  jawScale: number;
  gauntFactor: number; // 0 = healthy human, 1 = hollow undead
}): THREE.BufferGeometry {
  const { widthScale, jawScale, gauntFactor } = opts;
  const r = 0.103;
  const head = new THREE.SphereGeometry(r, 18, 14);
  const pos = head.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    const ny = y / r; // -1 bottom to +1 crown
    const nx = x / r;
    const nz = z / r; // -1 front face (-Z), +1 occiput (+Z)

    // Cranium elongation & slight back-of-head occiput depth
    y *= 1.16;
    z *= nz > 0 ? 1.08 : 0.98;
    x *= widthScale;

    // Taper lower half into jawline & chin
    if (ny < 0.08) {
      const lowerT = THREE.MathUtils.clamp((0.08 - ny) / 1.08, 0, 1);
      const jawNarrow = THREE.MathUtils.lerp(1.0, 0.56 * jawScale, Math.pow(lowerT, 1.15));
      x *= jawNarrow;
      // Forward chin projection at front-bottom
      if (nz < -0.2) {
        const chinFactor = Math.exp(-Math.pow((ny + 0.62) * 3.1, 2)) * (-nz);
        z -= chinFactor * (0.017 + (1 - gauntFactor) * 0.007);
      }
      // Hollow sunken cheeks near jaw/cheek
      if (gauntFactor > 0.1 && Math.abs(nx) > 0.42 && nz < 0.12) {
        x *= 1 - gauntFactor * 0.2 * Math.exp(-Math.pow((ny + 0.24) * 2.5, 2));
      }
    }

    // Brow ridge protrusion across upper front face
    if (nz < -0.28 && ny > 0.08 && ny < 0.44) {
      const brow = Math.exp(-Math.pow((ny - 0.24) * 5.2, 2)) * Math.max(0, -nz - 0.25);
      z -= brow * (0.014 + gauntFactor * 0.016);
    }

    // Deep orbital eye hollows
    if (nz < -0.38 && ny > -0.1 && ny < 0.22) {
      const eyeMask =
        (Math.exp(-Math.pow((nx + 0.34) * 4.4, 2)) + Math.exp(-Math.pow((nx - 0.34) * 4.4, 2))) *
        Math.exp(-Math.pow((ny - 0.05) * 6.0, 2));
      z += eyeMask * (0.015 + gauntFactor * 0.022);
    }

    // Cheekbones (sharper ridge below sunken eyes)
    if (nz < -0.2 && ny > -0.34 && ny < -0.02) {
      const cheekMask =
        (Math.exp(-Math.pow((nx + 0.52) * 3.6, 2)) + Math.exp(-Math.pow((nx - 0.52) * 3.6, 2))) *
        Math.exp(-Math.pow((ny + 0.14) * 5.0, 2));
      x *= 1 + cheekMask * 0.08;
      z -= cheekMask * 0.01;
    }

    // Subtle facial flattening at front so features sit naturally
    if (nz < -0.65 && ny > -0.45 && ny < 0.35) {
      z += (-nz - 0.65) * 0.014;
    }

    // Nose bridge contour
    if (nz < -0.58 && ny > -0.24 && ny < 0.15) {
      const noseW = Math.exp(-Math.pow(nx * 6.8, 2));
      const noseH = Math.exp(-Math.pow((ny + 0.07) * 4.2, 2));
      z -= noseW * noseH * (gauntFactor > 0.5 ? 0.011 : 0.021);
    }

    // Shift head so neck socket starts near y = 0.02 and crown reaches ~0.238
    pos.setXYZ(i, x, y + 0.12, z);
  }

  head.computeVertexNormals();
  applyTriplanarUVs(head, 3.0);

  // Subtle ears sculpted symmetrically on ±X
  const earGeoL = new THREE.SphereGeometry(0.022, 7, 6);
  earGeoL.scale(0.42, 1.35, 0.78);
  earGeoL.rotateY(0.18);
  earGeoL.translate(-0.099 * widthScale, 0.118, 0.012);

  const earGeoR = new THREE.SphereGeometry(0.022, 7, 6);
  earGeoR.scale(0.42, 1.35, 0.78);
  earGeoR.rotateY(-0.18);
  earGeoR.translate(0.099 * widthScale, 0.118, 0.012);

  // Neck column connecting head smoothly into clavicle
  const neckGeo = new THREE.CylinderGeometry(0.045 * jawScale, 0.054, 0.078, 10);
  neckGeo.translate(0, 0.015, 0.01);

  const combined = mergeCharacterParts([head, earGeoL, earGeoR, neckGeo], true, 3.0);
  applyAnatomicalVertexAO(combined, (x, y, z) => {
    let ao = 0.98;
    // Deepen eye sockets
    if (z < -0.05 && y > 0.115 && y < 0.16 && Math.abs(x) > 0.018 && Math.abs(x) < 0.062) {
      ao -= 0.18 + gauntFactor * 0.16;
    }
    // Deepen under chin & neck crease
    if (y < 0.055) {
      ao -= 0.16;
    }
    // Slight mouth/lip crevice shadow
    if (z < -0.07 && y > 0.052 && y < 0.075 && Math.abs(x) < 0.032) {
      ao -= 0.12 + gauntFactor * 0.14;
    }
    return ao;
  });
  return combined;
}

/**
 * Sculpts an organic anatomical torso (pelvis socket at y=0, chest/clavicle at y~0.50).
 */
function createSculptedTorsoGeometry(opts: {
  shoulderHalfW: number;
  waistHalfW: number;
  chestDepth: number;
  hunchForward: number;
}): THREE.BufferGeometry {
  const { shoulderHalfW, waistHalfW, chestDepth, hunchForward } = opts;
  const profile = [
    new THREE.Vector2(0.001, 0.0),
    new THREE.Vector2(waistHalfW * 0.96, 0.02),
    new THREE.Vector2(waistHalfW * 0.92, 0.12),
    new THREE.Vector2(waistHalfW * 0.98, 0.24),
    new THREE.Vector2(shoulderHalfW * 0.92, 0.36),
    new THREE.Vector2(shoulderHalfW * 1.02, 0.45),
    new THREE.Vector2(shoulderHalfW * 0.56, 0.51),
    new THREE.Vector2(0.058, 0.53),
    new THREE.Vector2(0.001, 0.54),
  ];
  const geo = new THREE.LatheGeometry(profile, 16);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);

    const t = THREE.MathUtils.clamp(y / 0.52, 0, 1);
    // Flatten front/back into human chest cross-section
    const depthRatio = THREE.MathUtils.lerp(0.68, chestDepth / Math.max(0.1, shoulderHalfW), t);
    z *= depthRatio;

    // Slight pectoral chest fill in front (-Z) & scapular curve in back (+Z)
    if (z < 0 && t > 0.55 && t < 0.9) {
      z -= 0.018 * Math.sin(((t - 0.55) / 0.35) * Math.PI);
    }
    // Natural lumbar S-curve + optional zombie hunch
    const hunch = hunchForward * Math.pow(t, 1.5);
    z -= hunch;
    if (t > 0.25 && t < 0.72) {
      z += 0.012 * Math.sin(((t - 0.25) / 0.47) * Math.PI);
    }
    // Subtle shoulder drop at outer edges
    if (t > 0.8 && Math.abs(x) > shoulderHalfW * 0.7) {
      x *= 1.04;
    }

    pos.setXYZ(i, x, y, z);
  }

  geo.computeVertexNormals();
  applyTriplanarUVs(geo, 1.8);
  applyAnatomicalVertexAO(geo, (_x, y, z) => {
    let ao = 0.98;
    if (y < 0.06) ao -= 0.12;
    if (y > 0.47) ao -= 0.09;
    if (z < -0.02 && y > 0.25 && y < 0.4) ao += 0.03;
    return ao;
  });
  return geo;
}

/**
 * Sculpts a tapered cylindrical limb segment (top pivot at y=0, bottom at y=-length).
 */
function createTaperedLimbSegment(
  topR: number,
  midR: number,
  botR: number,
  length: number,
  ovalZScale = 1.0,
  radialSegs = 10
): THREE.BufferGeometry {
  const profile = [
    new THREE.Vector2(0.001, 0.02),
    new THREE.Vector2(topR * 0.92, 0.01),
    new THREE.Vector2(topR, -length * 0.14),
    new THREE.Vector2(midR, -length * 0.46),
    new THREE.Vector2(botR * 1.05, -length * 0.82),
    new THREE.Vector2(botR, -length * 0.98),
    new THREE.Vector2(0.001, -length - 0.01),
  ];
  const geo = new THREE.LatheGeometry(profile, radialSegs);
  if (Math.abs(ovalZScale - 1) > 0.01) {
    geo.scale(1, 1, ovalZScale);
  }
  geo.computeVertexNormals();
  applyTriplanarUVs(geo, 2.2);
  applyAnatomicalVertexAO(geo, (_x, y) => {
    const t = THREE.MathUtils.clamp(-y / length, 0, 1);
    return t < 0.12 || t > 0.88 ? 0.86 : 0.98;
  });
  return geo;
}

/**
 * Sculpts a human or gnarled clawed hand with 4 articulated fingers + thumb (wrist at y=0).
 */
function createSculptedHandGeometry(clawed: boolean): THREE.BufferGeometry {
  const palm = new THREE.SphereGeometry(0.028, 8, 7);
  palm.scale(0.56, 1.24, 0.96);
  palm.translate(0, -0.036, -0.004);

  const parts: THREE.BufferGeometry[] = [palm];
  const fingerZOffsets = [-0.021, -0.007, 0.007, 0.02];
  const fingerLengths = clawed ? [0.046, 0.052, 0.048, 0.039] : [0.034, 0.038, 0.035, 0.028];
  const fingerRadii = clawed ? [0.0054, 0.0058, 0.0055, 0.0048] : [0.0062, 0.0066, 0.0062, 0.0054];

  for (let i = 0; i < 4; i++) {
    const f = new THREE.CapsuleGeometry(fingerRadii[i], fingerLengths[i], 3, 5);
    const curl = clawed ? -0.46 - (i % 2) * 0.14 : -0.24 - i * 0.03;
    f.rotateZ(curl);
    f.rotateX((i - 1.5) * (clawed ? 0.09 : 0.04));
    f.translate(
      clawed ? -0.009 : -0.005,
      -0.068 - fingerLengths[i] * 0.36,
      fingerZOffsets[i]
    );
    parts.push(f);
  }

  const thumb = new THREE.CapsuleGeometry(clawed ? 0.0068 : 0.0078, clawed ? 0.034 : 0.026, 3, 6);
  thumb.rotateX(-0.58);
  thumb.rotateZ(0.28);
  thumb.translate(-0.004, -0.044, -0.031);
  parts.push(thumb);

  const merged = mergeCharacterParts(parts, true, 4.0);
  applyAnatomicalVertexAO(merged, (_x, y) => (y < -0.065 ? 0.8 : 0.96));
  return merged;
}

/**
 * Sculpts a shin + ankle + anatomical boot with toe cap and heel welt (knee at y=0, sole at y=-0.48).
 */
function createShinWithBootGeometry(calfScale = 1.0): THREE.BufferGeometry {
  const shinProfile = [
    new THREE.Vector2(0.001, 0.02),
    new THREE.Vector2(0.061 * calfScale, 0.0),
    new THREE.Vector2(0.066 * calfScale, -0.14),
    new THREE.Vector2(0.053 * calfScale, -0.28),
    new THREE.Vector2(0.044 * calfScale, -0.37),
    new THREE.Vector2(0.001, -0.39),
  ];
  const shin = new THREE.LatheGeometry(shinProfile, 10);
  shin.scale(0.94, 1, 1.05);

  // Boot ankle collar
  const bootShaft = new THREE.CylinderGeometry(0.05 * calfScale, 0.052 * calfScale, 0.11, 10);
  bootShaft.translate(0, -0.375, 0.002);

  // Contoured foot/toebox via ExtrudeGeometry profile in YZ plane
  const footShape = new THREE.Shape();
  footShape.moveTo(0.056, -0.48); // heel bottom (+Z)
  footShape.lineTo(-0.146, -0.48); // toe bottom (-Z)
  footShape.quadraticCurveTo(-0.166, -0.465, -0.156, -0.435); // rounded toe bumper
  footShape.quadraticCurveTo(-0.106, -0.418, -0.042, -0.405); // instep slope
  footShape.lineTo(0.048, -0.405); // heel back
  footShape.closePath();

  const bootFoot = new THREE.ExtrudeGeometry(footShape, {
    depth: 0.086 * calfScale,
    bevelEnabled: true,
    bevelThickness: 0.013,
    bevelSize: 0.013,
    bevelSegments: 2,
    curveSegments: 4,
  });
  bootFoot.rotateY(Math.PI * 0.5);
  bootFoot.translate(-0.043 * calfScale, 0, 0);

  const merged = mergeCharacterParts([shin, bootShaft, bootFoot], true, 2.5);
  applyAnatomicalVertexAO(merged, (_x, y) => (y < -0.455 ? 0.72 : y < -0.36 ? 0.86 : 0.98));
  return merged;
}

/**
 * Sculpts 6 distinct mesh-based hairstyles fitted to createSculptedHeadGeometry.
 */
function createHairStyleGeometry(style: HumanHairStyle): THREE.BufferGeometry {
  if (style === 'bald_stubble') {
    const cap = new THREE.SphereGeometry(0.112, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
    cap.scale(1.0, 1.14, 1.08);
    cap.translate(0, 0.132, 0.008);
    return applyAnatomicalVertexAO(mergeCharacterParts([cap], true, 3.2), () => 0.85);
  }

  if (style === 'short_crop') {
    const crown = new THREE.SphereGeometry(0.116, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
    crown.scale(1.02, 1.16, 1.1);
    crown.rotateX(0.16);
    crown.translate(0, 0.136, 0.012);

    const fringe = new THREE.SphereGeometry(0.095, 10, 6);
    fringe.scale(0.95, 0.34, 0.62);
    fringe.rotateX(-0.2);
    fringe.translate(0, 0.215, -0.052);
    return applyAnatomicalVertexAO(mergeCharacterParts([crown, fringe], true, 3.2), (_x, y) =>
      y > 0.2 ? 1.0 : 0.84
    );
  }

  if (style === 'messy') {
    const parts: THREE.BufferGeometry[] = [];
    const base = new THREE.SphereGeometry(0.118, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.6);
    base.scale(1.04, 1.14, 1.12);
    base.rotateX(0.18);
    base.translate(0, 0.136, 0.012);
    parts.push(base);

    const tuftCoords: [number, number, number, number, number][] = [
      [-0.045, 0.228, -0.06, -0.35, 0.25],
      [0.01, 0.238, -0.068, -0.42, -0.1],
      [0.052, 0.224, -0.052, -0.3, -0.32],
      [-0.088, 0.19, -0.01, 0.08, 0.45],
      [0.088, 0.188, -0.01, 0.08, -0.45],
      [0.0, 0.21, 0.088, 0.45, 0.0],
    ];
    for (const [tx, ty, tz, rx, rz] of tuftCoords) {
      const tuft = new THREE.ConeGeometry(0.036, 0.085, 6);
      tuft.rotateX(rx);
      tuft.rotateZ(rz);
      tuft.translate(tx, ty, tz);
      parts.push(tuft);
    }
    return applyAnatomicalVertexAO(mergeCharacterParts(parts, true, 3.2), (_x, y) =>
      y > 0.22 ? 1.02 : 0.84
    );
  }

  if (style === 'long_layered') {
    const crown = new THREE.SphereGeometry(0.117, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6);
    crown.scale(1.04, 1.16, 1.12);
    crown.rotateX(0.12);
    crown.translate(0, 0.138, 0.012);

    const backFall = new THREE.CylinderGeometry(0.108, 0.128, 0.23, 12, 1, false, -Math.PI * 0.55, Math.PI * 1.1);
    backFall.rotateY(Math.PI);
    backFall.translate(0, 0.055, 0.025);

    const sideLockL = new THREE.CapsuleGeometry(0.028, 0.14, 4, 7);
    sideLockL.rotateZ(0.1);
    sideLockL.translate(-0.095, 0.085, -0.015);

    const sideLockR = new THREE.CapsuleGeometry(0.028, 0.14, 4, 7);
    sideLockR.rotateZ(-0.1);
    sideLockR.translate(0.095, 0.085, -0.015);

    return applyAnatomicalVertexAO(
      mergeCharacterParts([crown, backFall, sideLockL, sideLockR], true, 3.0),
      (_x, y) => (y < 0.03 ? 0.78 : 0.96)
    );
  }

  if (style === 'ponytail_bun') {
    const sleek = new THREE.SphereGeometry(0.115, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62);
    sleek.scale(1.01, 1.14, 1.1);
    sleek.rotateX(0.22);
    sleek.translate(0, 0.134, 0.014);

    const bun = new THREE.SphereGeometry(0.046, 10, 8);
    bun.scale(0.95, 1.05, 1.15);
    bun.translate(0, 0.16, 0.128);

    const tail = new THREE.ConeGeometry(0.034, 0.12, 8);
    tail.rotateX(Math.PI * 0.84);
    tail.translate(0, 0.105, 0.138);

    return applyAnatomicalVertexAO(mergeCharacterParts([sleek, bun, tail], true, 3.2), (_x, y, z) =>
      z > 0.11 && y < 0.12 ? 0.8 : 0.96
    );
  }

  // side_part
  const crown = new THREE.SphereGeometry(0.116, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58);
  crown.scale(1.02, 1.15, 1.11);
  crown.rotateX(0.14);
  crown.translate(0, 0.136, 0.01);

  const sweep = new THREE.SphereGeometry(0.092, 10, 7);
  sweep.scale(1.06, 0.45, 0.78);
  sweep.rotateZ(-0.18);
  sweep.translate(0.018, 0.224, -0.032);

  return applyAnatomicalVertexAO(mergeCharacterParts([crown, sweep], true, 3.2), (_x, y) =>
    y > 0.21 ? 1.0 : 0.86
  );
}

/**
 * Builds sculpted outer clothing shells (open jacket with lapels, vest, apron, harness, packs).
 */
function createOpenJacketGeometry(): THREE.BufferGeometry {
  // Back + sides shell (open across front center)
  const backShell = new THREE.CylinderGeometry(0.188, 0.172, 0.46, 14, 2, false, -Math.PI * 0.72, Math.PI * 1.44);
  backShell.scale(1.12, 1, 0.76);
  backShell.rotateY(Math.PI);
  backShell.translate(0, 0.25, 0.008);

  // Raised collar wrapping around neck sides & back
  const collar = new THREE.CylinderGeometry(0.092, 0.108, 0.075, 12, 1, true, -Math.PI * 0.72, Math.PI * 1.44);
  collar.rotateY(Math.PI);
  collar.translate(0, 0.505, 0.008);

  // Left & right jacket lapel folds
  const lapelL = new THREE.CylinderGeometry(0.032, 0.044, 0.44, 7);
  lapelL.scale(0.85, 1, 0.7);
  lapelL.rotateZ(-0.08);
  lapelL.translate(-0.088, 0.25, -0.098);

  const lapelR = new THREE.CylinderGeometry(0.032, 0.044, 0.44, 7);
  lapelR.scale(0.85, 1, 0.7);
  lapelR.rotateZ(0.08);
  lapelR.translate(0.088, 0.25, -0.098);

  const merged = mergeCharacterParts([backShell, collar, lapelL, lapelR], true, 1.8);
  return applyAnatomicalVertexAO(merged, (_x, y) => (y < 0.08 || y > 0.47 ? 0.82 : 0.98));
}

function createTacticalVestGeometry(): THREE.BufferGeometry {
  const plateFrontBack = createSculptedTorsoGeometry({
    shoulderHalfW: 0.206,
    waistHalfW: 0.168,
    chestDepth: 0.155,
    hunchForward: 0,
  });
  plateFrontBack.scale(1, 0.78, 1.03);
  plateFrontBack.translate(0, 0.11, 0);

  // Chest utility pouches (curved bevels)
  const pouchL = new THREE.CylinderGeometry(0.032, 0.034, 0.09, 7);
  pouchL.scale(1.15, 1, 0.7);
  pouchL.translate(-0.082, 0.23, -0.145);

  const pouchR = new THREE.CylinderGeometry(0.032, 0.034, 0.09, 7);
  pouchR.scale(1.15, 1, 0.7);
  pouchR.translate(0.082, 0.23, -0.145);

  const shoulderMic = new THREE.CylinderGeometry(0.018, 0.02, 0.055, 6);
  shoulderMic.rotateZ(0.28);
  shoulderMic.translate(-0.11, 0.45, -0.085);

  const merged = mergeCharacterParts([plateFrontBack, pouchL, pouchR, shoulderMic], true, 2.2);
  return applyAnatomicalVertexAO(merged, (_x, y, z) => (z < -0.13 && y < 0.27 ? 0.85 : 0.96));
}

function createApronGeometry(): THREE.BufferGeometry {
  const bibShape = new THREE.Shape();
  bibShape.moveTo(-0.11, 0.46);
  bibShape.lineTo(0.11, 0.46);
  bibShape.lineTo(0.15, 0.22);
  bibShape.lineTo(0.17, -0.06);
  bibShape.quadraticCurveTo(0, -0.08, -0.17, -0.06);
  bibShape.lineTo(-0.15, 0.22);
  bibShape.closePath();

  const front = new THREE.ExtrudeGeometry(bibShape, {
    depth: 0.024,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 1,
  });
  front.translate(0, 0, -0.152);

  // Neck strap torus arc
  const strap = createTubePathGeometry(
    [
      new THREE.Vector3(-0.085, 0.46, -0.12),
      new THREE.Vector3(-0.075, 0.54, 0.0),
      new THREE.Vector3(0, 0.54, 0.06),
      new THREE.Vector3(0.075, 0.54, 0.0),
      new THREE.Vector3(0.085, 0.46, -0.12),
    ],
    0.011,
    10,
    6
  );

  // Waist tie wrapping around back
  const waistTie = new THREE.TorusGeometry(0.158, 0.014, 6, 14);
  waistTie.rotateX(Math.PI * 0.5);
  waistTie.scale(1.02, 1, 0.78);
  waistTie.translate(0, 0.16, 0.01);

  const merged = mergeCharacterParts([front, strap, waistTie], true, 2.0);
  return applyAnatomicalVertexAO(merged, (_x, y) => (y < 0.0 ? 0.82 : 0.98));
}

function createFreightHarnessGeometry(): THREE.BufferGeometry {
  const strapL = createTubePathGeometry(
    [
      new THREE.Vector3(-0.095, 0.08, -0.135),
      new THREE.Vector3(-0.098, 0.34, -0.138),
      new THREE.Vector3(-0.095, 0.50, 0.0),
      new THREE.Vector3(-0.08, 0.34, 0.115),
      new THREE.Vector3(-0.075, 0.08, 0.108),
    ],
    0.018,
    10,
    6
  );
  const strapR = createTubePathGeometry(
    [
      new THREE.Vector3(0.095, 0.08, -0.135),
      new THREE.Vector3(0.098, 0.34, -0.138),
      new THREE.Vector3(0.095, 0.50, 0.0),
      new THREE.Vector3(0.08, 0.34, 0.115),
      new THREE.Vector3(0.075, 0.08, 0.108),
    ],
    0.018,
    10,
    6
  );
  const crossStrap = new THREE.CylinderGeometry(0.015, 0.015, 0.20, 6);
  crossStrap.rotateZ(Math.PI * 0.5);
  crossStrap.translate(0, 0.31, -0.14);

  return applyAnatomicalVertexAO(mergeCharacterParts([strapL, strapR, crossStrap], true, 2.5), () => 0.92);
}

function createSculptedBackpackGeometry(compactCourier: boolean): THREE.BufferGeometry {
  const body = new THREE.SphereGeometry(compactCourier ? 0.125 : 0.155, 12, 10);
  body.scale(compactCourier ? 0.92 : 1.04, compactCourier ? 1.25 : 1.48, compactCourier ? 0.52 : 0.62);
  body.translate(0, 0.31, 0.165);

  const topFlap = new THREE.SphereGeometry(compactCourier ? 0.11 : 0.135, 10, 7);
  topFlap.scale(0.95, 0.45, 0.62);
  topFlap.translate(0, compactCourier ? 0.42 : 0.47, 0.175);

  const bedroll = new THREE.CylinderGeometry(0.042, 0.042, compactCourier ? 0.22 : 0.29, 9);
  bedroll.rotateZ(Math.PI * 0.5);
  bedroll.translate(0, compactCourier ? 0.16 : 0.12, 0.19);

  const merged = mergeCharacterParts([body, topFlap, bedroll], true, 2.2);
  return applyAnatomicalVertexAO(merged, (_x, y, z) => (z < 0.14 || y < 0.15 ? 0.78 : 0.98));
}

function createCapAndVisorGeometry(): { cap: THREE.BufferGeometry; visor: THREE.BufferGeometry } {
  const cap = new THREE.SphereGeometry(0.118, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.54);
  cap.scale(1.03, 1.08, 1.11);
  cap.rotateX(0.14);
  cap.translate(0, 0.145, 0.008);

  // Curved brim extruded from crescent shape
  const visorShape = new THREE.Shape();
  visorShape.moveTo(-0.095, 0);
  visorShape.quadraticCurveTo(0, 0.035, 0.095, 0);
  visorShape.quadraticCurveTo(0.08, -0.095, 0, -0.105);
  visorShape.quadraticCurveTo(-0.08, -0.095, -0.095, 0);

  const visor = new THREE.ExtrudeGeometry(visorShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 1,
  });
  visor.rotateX(Math.PI * 0.5 + 0.14);
  visor.translate(0, 0.178, -0.085);

  return {
    cap: applyAnatomicalVertexAO(mergeCharacterParts([cap], true, 3.0), () => 0.94),
    visor: applyAnatomicalVertexAO(mergeCharacterParts([visor], true, 3.0), () => 0.86),
  };
}

function createBeanieGeometry(): THREE.BufferGeometry {
  const dome = new THREE.SphereGeometry(0.119, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.58);
  dome.scale(1.03, 1.24, 1.12);
  dome.rotateX(0.24);
  dome.translate(0, 0.145, 0.018);

  const cuff = new THREE.TorusGeometry(0.116, 0.022, 7, 16);
  cuff.rotateX(Math.PI * 0.5 + 0.2);
  cuff.scale(1.02, 1.09, 1.0);
  cuff.translate(0, 0.158, 0.004);

  return applyAnatomicalVertexAO(mergeCharacterParts([dome, cuff], true, 3.0), (_x, y) =>
    y < 0.16 ? 0.84 : 0.96
  );
}

function createHoodGeometry(): THREE.BufferGeometry {
  const cowl = new THREE.SphereGeometry(0.138, 14, 10, -Math.PI * 0.35, Math.PI * 1.7, 0, Math.PI * 0.72);
  cowl.rotateY(Math.PI * 0.5);
  cowl.scale(1.06, 1.18, 1.18);
  cowl.rotateX(0.12);
  cowl.translate(0, 0.125, 0.02);
  return applyAnatomicalVertexAO(mergeCharacterParts([cowl], true, 2.4), (_x, _y, z) =>
    z < -0.03 ? 0.78 : 0.95
  );
}

/**
 * Creates shared organic humanoid geometries for all living characters (survivors, staff, customers).
 */
export function createHumanoidSharedGeometries(): HumanoidSharedGeometries {
  const textures = createCharacterDetailTextures();

  const headHuman = createSculptedHeadGeometry({ widthScale: 0.98, jawScale: 0.98, gauntFactor: 0.02 });
  const headFemale = createSculptedHeadGeometry({ widthScale: 0.92, jawScale: 0.86, gauntFactor: 0.0 });
  const headStocky = createSculptedHeadGeometry({ widthScale: 1.06, jawScale: 1.08, gauntFactor: 0.03 });

  const eyeSclera = new THREE.SphereGeometry(0.0135, 8, 6);
  eyeSclera.scale(1.15, 0.78, 0.6);
  const eyeIris = new THREE.SphereGeometry(0.0078, 7, 5);
  eyeIris.scale(1, 1, 0.65);

  const eyebrow = new THREE.CapsuleGeometry(0.0048, 0.026, 2, 5);
  eyebrow.rotateZ(Math.PI * 0.5);

  const pelvis = new THREE.SphereGeometry(0.135, 12, 8);
  pelvis.scale(1.16, 0.65, 0.82);
  pelvis.translate(0, 0.015, 0);
  applyTriplanarUVs(pelvis, 2.0);
  applyAnatomicalVertexAO(pelvis, () => 0.88);

  const torsoAthletic = createSculptedTorsoGeometry({
    shoulderHalfW: 0.198,
    waistHalfW: 0.148,
    chestDepth: 0.138,
    hunchForward: 0,
  });
  const torsoSlim = createSculptedTorsoGeometry({
    shoulderHalfW: 0.176,
    waistHalfW: 0.132,
    chestDepth: 0.126,
    hunchForward: 0,
  });
  const torsoStocky = createSculptedTorsoGeometry({
    shoulderHalfW: 0.218,
    waistHalfW: 0.172,
    chestDepth: 0.156,
    hunchForward: 0.012,
  });

  const upperArm = createTaperedLimbSegment(0.054, 0.048, 0.042, 0.28, 1.02, 10);
  const forearm = createTaperedLimbSegment(0.044, 0.039, 0.030, 0.25, 0.98, 10);
  const forearmRolled = createTaperedLimbSegment(0.048, 0.038, 0.030, 0.25, 0.98, 10);
  const handHuman = createSculptedHandGeometry(false);

  const thigh = createTaperedLimbSegment(0.086, 0.078, 0.058, 0.435, 1.05, 10);
  const shinBoot = createShinWithBootGeometry(1.0);

  const bandageTop = new THREE.CylinderGeometry(0.072, 0.068, 0.14, 10, 1, true);
  bandageTop.translate(0, -0.25, 0);
  const legBandage = applyAnatomicalVertexAO(mergeCharacterParts([bandageTop], true, 3.0), () => 0.96);

  const hairShortCrop = createHairStyleGeometry('short_crop');
  hairShortCrop.scale(0.955, 0.965, 0.955);
  const hairMessy = createHairStyleGeometry('messy');
  hairMessy.scale(0.955, 0.965, 0.955);
  const hairLongLayered = createHairStyleGeometry('long_layered');
  hairLongLayered.scale(0.955, 0.965, 0.955);
  const hairPonytailBun = createHairStyleGeometry('ponytail_bun');
  hairPonytailBun.scale(0.955, 0.965, 0.955);
  const hairSidePart = createHairStyleGeometry('side_part');
  hairSidePart.scale(0.955, 0.965, 0.955);
  const hairStubble = createHairStyleGeometry('bald_stubble');
  hairStubble.scale(0.955, 0.965, 0.955);

  const { cap: headwearCap, visor: headwearCapVisor } = createCapAndVisorGeometry();
  headwearCap.scale(0.955, 0.96, 0.955);
  headwearCapVisor.scale(0.955, 0.96, 0.955);
  const headwearBeanie = createBeanieGeometry();
  headwearBeanie.scale(0.955, 0.96, 0.955);
  const headwearHood = createHoodGeometry();
  headwearHood.scale(0.955, 0.96, 0.955);

  const jacketOpen = createOpenJacketGeometry();
  const tacticalVest = createTacticalVestGeometry();
  const apron = createApronGeometry();
  const freightHarness = createFreightHarnessGeometry();

  const hoodieCollar = new THREE.TorusGeometry(0.106, 0.032, 7, 14);
  hoodieCollar.rotateX(Math.PI * 0.5 + 0.12);
  hoodieCollar.scale(1.05, 1.15, 0.95);
  hoodieCollar.translate(0, 0.495, 0.02);
  applyTriplanarUVs(hoodieCollar, 2.5);
  applyAnatomicalVertexAO(hoodieCollar, () => 0.88);

  const beltBand = new THREE.TorusGeometry(0.152, 0.022, 6, 16);
  beltBand.rotateX(Math.PI * 0.5);
  beltBand.scale(1.02, 0.84, 1.15);
  beltBand.translate(0, 0.07, 0);
  const buckle = new THREE.CylinderGeometry(0.024, 0.024, 0.02, 6);
  buckle.rotateX(Math.PI * 0.5);
  buckle.translate(0, 0.07, -0.142);
  const hipPouch = new THREE.CylinderGeometry(0.032, 0.034, 0.082, 7);
  hipPouch.scale(0.8, 1, 1.1);
  hipPouch.translate(-0.165, 0.06, -0.02);
  const beltWithPouches = applyAnatomicalVertexAO(
    mergeCharacterParts([beltBand, buckle, hipPouch], true, 2.5),
    () => 0.88
  );

  const backpack = createSculptedBackpackGeometry(false);
  const courierPack = createSculptedBackpackGeometry(true);

  // Realistic tactical guard baton with handle grip & guard ring
  const batonShaft = new THREE.CylinderGeometry(0.017, 0.021, 0.44, 10);
  batonShaft.translate(0, 0.16, 0);
  const batonGrip = new THREE.CylinderGeometry(0.021, 0.021, 0.12, 10);
  batonGrip.translate(0, -0.02, 0);
  const batonKnob = new THREE.SphereGeometry(0.024, 8, 6);
  batonKnob.translate(0, -0.085, 0);
  const baton = mergeCharacterParts([batonShaft, batonGrip, batonKnob], true, 3.0);
  baton.rotateX(-Math.PI * 0.46);

  const shadowDisc = new THREE.CircleGeometry(0.39, 18);
  shadowDisc.rotateX(-Math.PI * 0.5);
  const statusMarker = new THREE.OctahedronGeometry(0.075, 0);

  return {
    headHuman,
    headFemale,
    headStocky,
    eyeSclera,
    eyeIris,
    eyebrow,
    pelvis,
    torsoAthletic,
    torsoSlim,
    torsoStocky,
    upperArm,
    forearm,
    forearmRolled,
    handHuman,
    thigh,
    shinBoot,
    legBandage,
    hairShortCrop,
    hairMessy,
    hairLongLayered,
    hairPonytailBun,
    hairSidePart,
    hairStubble,
    headwearCap,
    headwearCapVisor,
    headwearBeanie,
    headwearHood,
    jacketOpen,
    tacticalVest,
    apron,
    freightHarness,
    hoodieCollar,
    beltWithPouches,
    backpack,
    courierPack,
    baton,
    shadowDisc,
    statusMarker,
    textures,
    dispose: () => {
      headHuman.dispose();
      headFemale.dispose();
      headStocky.dispose();
      eyeSclera.dispose();
      eyeIris.dispose();
      eyebrow.dispose();
      pelvis.dispose();
      torsoAthletic.dispose();
      torsoSlim.dispose();
      torsoStocky.dispose();
      upperArm.dispose();
      forearm.dispose();
      forearmRolled.dispose();
      handHuman.dispose();
      thigh.dispose();
      shinBoot.dispose();
      legBandage.dispose();
      hairShortCrop.dispose();
      hairMessy.dispose();
      hairLongLayered.dispose();
      hairPonytailBun.dispose();
      hairSidePart.dispose();
      hairStubble.dispose();
      headwearCap.dispose();
      headwearCapVisor.dispose();
      headwearBeanie.dispose();
      headwearHood.dispose();
      jacketOpen.dispose();
      tacticalVest.dispose();
      apron.dispose();
      freightHarness.dispose();
      hoodieCollar.dispose();
      beltWithPouches.dispose();
      backpack.dispose();
      courierPack.dispose();
      baton.dispose();
      shadowDisc.dispose();
      statusMarker.dispose();
      textures.dispose();
    },
  };
}

/**
 * Creates shared organic undead geometries for walker, runner, and brute archetypes.
 */
export function createZombieAnatomyGeometries(): ZombieAnatomyGeometries {
  const textures = createCharacterDetailTextures();

  const headWalker = createSculptedHeadGeometry({ widthScale: 0.96, jawScale: 0.9, gauntFactor: 0.78 });
  const headRunner = createSculptedHeadGeometry({ widthScale: 0.88, jawScale: 0.82, gauntFactor: 0.98 });
  const headBrute = createSculptedHeadGeometry({ widthScale: 1.14, jawScale: 1.18, gauntFactor: 0.65 });

  const eyeSocket = new THREE.SphereGeometry(0.023, 8, 6);
  eyeSocket.scale(1.12, 0.86, 0.58);
  const eyeGlow = new THREE.SphereGeometry(0.0088, 7, 5);
  eyeGlow.scale(1, 0.84, 0.62);

  // Slack asymmetric undead jaw with crooked jagged teeth wedges
  const toothParts: THREE.BufferGeometry[] = [];
  const toothOffsets = [-0.017, -0.009, 0.0, 0.009, 0.017];
  const toothHeights = [0.011, 0.014, 0.01, 0.015, 0.011];
  for (let i = 0; i < toothOffsets.length; i++) {
    const tTop = new THREE.ConeGeometry(0.0036, toothHeights[i], 4);
    tTop.rotateX(Math.PI);
    tTop.rotateZ((i - 2) * 0.11);
    tTop.translate(toothOffsets[i], 0.006, -0.002 + Math.abs(i - 2) * 0.0015);
    toothParts.push(tTop);
    if (i !== 2) {
      const tBot = new THREE.ConeGeometry(0.0032, toothHeights[i] * 0.85, 4);
      tBot.rotateZ((2 - i) * 0.12);
      tBot.translate(toothOffsets[i] * 0.92, -0.009, -0.001 + Math.abs(i - 2) * 0.0015);
      toothParts.push(tBot);
    }
  }
  const jawTeeth = applyAnatomicalVertexAO(mergeCharacterParts(toothParts, true, 4.0), () => 0.82);

  const pelvis = new THREE.SphereGeometry(0.128, 10, 7);
  pelvis.scale(1.12, 0.64, 0.80);
  pelvis.translate(0, 0.015, 0);
  applyTriplanarUVs(pelvis, 2.0);
  applyAnatomicalVertexAO(pelvis, () => 0.82);

  const torsoWalker = createSculptedTorsoGeometry({
    shoulderHalfW: 0.184,
    waistHalfW: 0.132,
    chestDepth: 0.128,
    hunchForward: 0.062,
  });
  const torsoRunner = createSculptedTorsoGeometry({
    shoulderHalfW: 0.162,
    waistHalfW: 0.112,
    chestDepth: 0.118,
    hunchForward: 0.095,
  });
  const torsoBrute = createSculptedTorsoGeometry({
    shoulderHalfW: 0.238,
    waistHalfW: 0.178,
    chestDepth: 0.168,
    hunchForward: 0.084,
  });

  // Irregular asymmetric torn coat strips for Walker (zero neat cones)
  const coatBack = new THREE.CylinderGeometry(0.188, 0.174, 0.44, 12, 2, false, -Math.PI * 0.62, Math.PI * 1.24);
  coatBack.scale(1.08, 1, 0.78);
  coatBack.rotateY(Math.PI);
  coatBack.translate(0, 0.24, -0.01);

  const ragRand = seededRand(29);
  const coatParts: THREE.BufferGeometry[] = [coatBack];
  const flapSpecs: [number, number, number, number, number][] = [
    [-0.135, 0.01, 0.04, 0.065, 0.20],
    [-0.06, -0.02, 0.11, 0.055, 0.17],
    [0.04, 0.0, 0.12, 0.06, 0.22],
    [0.13, -0.01, 0.02, 0.052, 0.15],
    [0.11, 0.03, -0.07, 0.048, 0.16],
  ];
  for (const [fx, fy, fz, fw, fh] of flapSpecs) {
    const stripShape = new THREE.Shape();
    stripShape.moveTo(-fw * 0.5, fh * 0.5);
    stripShape.lineTo(fw * 0.48, fh * 0.44);
    stripShape.lineTo(fw * (0.28 + ragRand() * 0.2), -fh * 0.38);
    stripShape.lineTo(-fw * 0.12, -fh * 0.55);
    stripShape.lineTo(-fw * 0.46, -fh * 0.22);
    stripShape.closePath();
    const strip = new THREE.ExtrudeGeometry(stripShape, {
      depth: 0.01,
      bevelEnabled: false,
    });
    strip.rotateY(Math.atan2(fx, fz));
    strip.rotateX((ragRand() - 0.5) * 0.16);
    strip.translate(fx, fy, fz);
    coatParts.push(strip);
  }
  const tatteredCoatWalker = applyAnatomicalVertexAO(
    mergeCharacterParts(coatParts, true, 2.0),
    (_x, y) => (y < 0.04 ? 0.64 : 0.92)
  );

  // Shredded feral torso straps for Runner
  const strap1 = createTubePathGeometry(
    [
      new THREE.Vector3(-0.115, 0.45, -0.08),
      new THREE.Vector3(-0.02, 0.26, -0.14),
      new THREE.Vector3(0.085, 0.06, -0.108),
    ],
    0.02,
    8,
    5
  );
  const strap2 = createTubePathGeometry(
    [
      new THREE.Vector3(0.135, 0.36, 0.08),
      new THREE.Vector3(0.02, 0.20, 0.12),
      new THREE.Vector3(-0.105, 0.04, 0.088),
    ],
    0.018,
    8,
    5
  );
  const tatteredRagsRunner = applyAnatomicalVertexAO(
    mergeCharacterParts([strap1, strap2], true, 2.2),
    () => 0.78
  );

  // Heavy torn riot armor/vest & asymmetric swollen shoulder guard for Brute
  const bruteVest = createTacticalVestGeometry();
  bruteVest.scale(1.2, 1.04, 1.14);
  const swollenPad = new THREE.SphereGeometry(0.094, 10, 7);
  swollenPad.scale(1.04, 0.85, 1.08);
  swollenPad.translate(0.24, 0.455, -0.015);
  const riotVestBrute = applyAnatomicalVertexAO(
    mergeCharacterParts([bruteVest, swollenPad], true, 2.0),
    () => 0.84
  );

  // Organic torn chest gash + irregular fractured rib bones (no neat torus rings)
  const ribParts: THREE.BufferGeometry[] = [];
  const gash = new THREE.SphereGeometry(0.056, 8, 6);
  gash.scale(0.95, 1.35, 0.26);
  gash.rotateZ(-0.24);
  gash.translate(0.032, 0.275, -0.115);
  ribParts.push(gash);

  const fracOffsets: [number, number, number, number][] = [
    [0.018, 0.225, 0.048, -0.26],
    [0.028, 0.258, 0.056, -0.18],
    [0.036, 0.292, 0.050, -0.29],
    [0.044, 0.324, 0.038, -0.12],
  ];
  for (const [rx, ry, len, rotZ] of fracOffsets) {
    const boneFrac = new THREE.CapsuleGeometry(0.0052, len, 3, 5);
    boneFrac.rotateZ(Math.PI * 0.5 + rotZ);
    boneFrac.rotateY(0.28);
    boneFrac.translate(rx, ry, -0.124);
    ribParts.push(boneFrac);
  }
  const ribWound = applyAnatomicalVertexAO(mergeCharacterParts(ribParts, true, 3.5), (_x, _y, z) =>
    z < -0.122 ? 0.94 : 0.58
  );

  const upperArm = createTaperedLimbSegment(0.050, 0.042, 0.036, 0.28, 1.0, 9);
  const forearmBase = createTaperedLimbSegment(0.040, 0.034, 0.027, 0.26, 0.96, 9);
  const clawHand = createSculptedHandGeometry(true);
  clawHand.translate(0, -0.255, 0);
  const forearmClawed = mergeCharacterParts([forearmBase, clawHand], true, 2.5);

  const upperArmBrute = createTaperedLimbSegment(0.076, 0.070, 0.056, 0.295, 1.05, 10);
  const forearmBruteBase = createTaperedLimbSegment(0.062, 0.056, 0.042, 0.275, 1.02, 10);
  const clawBrute = createSculptedHandGeometry(true);
  clawBrute.scale(1.3, 1.24, 1.3);
  clawBrute.translate(0, -0.27, 0);
  const forearmBrute = mergeCharacterParts([forearmBruteBase, clawBrute], true, 2.5);

  const thigh = createTaperedLimbSegment(0.078, 0.068, 0.052, 0.435, 1.04, 9);
  const shinTatteredBoot = createShinWithBootGeometry(0.95);
  const thighBrute = createTaperedLimbSegment(0.102, 0.090, 0.070, 0.435, 1.08, 10);
  const shinBruteBoot = createShinWithBootGeometry(1.18);

  // Sparse patchy hair tufts for undead realism
  const patch1 = new THREE.SphereGeometry(0.062, 8, 6);
  patch1.scale(1.06, 0.34, 1.15);
  patch1.translate(-0.038, 0.222, 0.032);
  const patch2 = new THREE.SphereGeometry(0.052, 7, 5);
  patch2.scale(0.88, 0.3, 0.96);
  patch2.translate(0.05, 0.208, 0.046);
  const sparseHair = applyAnatomicalVertexAO(mergeCharacterParts([patch1, patch2], true, 3.0), () => 0.72);

  const shadowDisc = new THREE.CircleGeometry(0.42, 18);
  shadowDisc.rotateX(-Math.PI * 0.5);

  return {
    headWalker,
    headRunner,
    headBrute,
    eyeSocket,
    eyeGlow,
    jawTeeth,
    pelvis,
    torsoWalker,
    torsoRunner,
    torsoBrute,
    tatteredCoatWalker,
    tatteredRagsRunner,
    riotVestBrute,
    ribWound,
    upperArm,
    forearmClawed,
    upperArmBrute,
    forearmBrute,
    thigh,
    shinTatteredBoot,
    thighBrute,
    shinBruteBoot,
    sparseHair,
    shadowDisc,
    textures,
    dispose: () => {
      headWalker.dispose();
      headRunner.dispose();
      headBrute.dispose();
      eyeSocket.dispose();
      eyeGlow.dispose();
      jawTeeth.dispose();
      pelvis.dispose();
      torsoWalker.dispose();
      torsoRunner.dispose();
      torsoBrute.dispose();
      tatteredCoatWalker.dispose();
      tatteredRagsRunner.dispose();
      riotVestBrute.dispose();
      ribWound.dispose();
      upperArm.dispose();
      forearmClawed.dispose();
      upperArmBrute.dispose();
      forearmBrute.dispose();
      thigh.dispose();
      shinTatteredBoot.dispose();
      thighBrute.dispose();
      shinBruteBoot.dispose();
      sparseHair.dispose();
      shadowDisc.dispose();
      textures.dispose();
    },
  };
}
