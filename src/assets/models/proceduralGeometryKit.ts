import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function seededRand(seed: number): () => number {
  let s = Math.floor(seed * 9973) % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Applies consistent world-space triplanar UVs so textures (brick, concrete, wood, tile)
 * wrap uniformly across ExtrudeGeometry, LatheGeometry, TubeGeometry, and custom meshes
 * without stretched seams.
 */
export function applyTriplanarUVs(
  geometry: THREE.BufferGeometry,
  tilesPerMeter = 0.35
): THREE.BufferGeometry {
  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  const pos = geometry.attributes.position;
  const norm = geometry.attributes.normal;
  const uvs = new Float32Array(pos.count * 2);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.abs(norm.getX(i));
    const ny = Math.abs(norm.getY(i));
    const nz = Math.abs(norm.getZ(i));

    let u = 0;
    let v = 0;
    if (ny >= nx && ny >= nz) {
      u = x * tilesPerMeter;
      v = z * tilesPerMeter;
    } else if (nx >= ny && nx >= nz) {
      u = z * tilesPerMeter;
      v = y * tilesPerMeter;
    } else {
      u = x * tilesPerMeter;
      v = y * tilesPerMeter;
    }
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }

  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  return geometry;
}

/**
 * Safely merges multiple static geometries sharing a material into a single draw call.
 * Converts indexed geometries to non-indexed and ensures position/normal/uv match.
 */
export function mergeParts(
  parts: THREE.BufferGeometry[],
  applyTriplanar = false,
  tilesPerMeter = 0.35
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
    // Keep only position, normal, uv so mergeGeometries never rejects mismatched attrs
    for (const key of Object.keys(g.attributes)) {
      if (key !== 'position' && key !== 'normal' && key !== 'uv') {
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
 * Creates a chamfered / beveled rectangular block via ExtrudeGeometry so edges catch light
 * cleanly instead of looking like harsh raw 90-degree BoxGeometry cubes.
 */
export function createBeveledBoxGeometry(
  w: number,
  h: number,
  d: number,
  bevel = 0.03,
  cornerRadius = 0.02
): THREE.BufferGeometry {
  const b = Math.min(bevel, w * 0.18, h * 0.25, d * 0.18);
  const hw = Math.max(0.01, w * 0.5 - b);
  const hd = Math.max(0.01, d * 0.5 - b);
  const r = Math.min(cornerRadius, hw * 0.45, hd * 0.45);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  if (r > 0.002) shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  if (r > 0.002) shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  if (r > 0.002) shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  if (r > 0.002) shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const depth = Math.max(0.01, h - b * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: b > 0.002,
    bevelThickness: b,
    bevelSize: b,
    bevelSegments: 2,
    curveSegments: 3,
  });
  geo.rotateX(-Math.PI * 0.5);
  geo.translate(0, -depth * 0.5, 0);
  applyTriplanarUVs(geo, 0.45);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Beveled & rounded-corner extruded concrete sidewalk slab.
 * Matches exact (w, d) bounding extents and sits centered with top at +height*0.5.
 */
export function createSidewalkSlabGeometry(
  w: number,
  d: number,
  height: number,
  cornerRadius = 0.55
): THREE.BufferGeometry {
  const bevel = 0.035;
  const hw = Math.max(0.1, w * 0.5 - bevel);
  const hd = Math.max(0.1, d * 0.5 - bevel);
  const r = Math.min(cornerRadius, hw * 0.38, hd * 0.38);

  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hd);
  shape.lineTo(hw - r, -hd);
  shape.quadraticCurveTo(hw, -hd, hw, -hd + r);
  shape.lineTo(hw, hd - r);
  shape.quadraticCurveTo(hw, hd, hw - r, hd);
  shape.lineTo(-hw + r, hd);
  shape.quadraticCurveTo(-hw, hd, -hw, hd - r);
  shape.lineTo(-hw, -hd + r);
  shape.quadraticCurveTo(-hw, -hd, -hw + r, -hd);

  const extrudeH = Math.max(0.02, height - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeH,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  geo.rotateX(-Math.PI * 0.5);
  geo.translate(0, -extrudeH * 0.5, 0);
  applyTriplanarUVs(geo, 0.25);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Pitched gabled roof extruded cleanly along Z (or rotated 90 deg for X-ridge).
 * Includes overhanging eaves so buildings immediately lose the boxy flat roof look.
 */
export function createGabledRoofGeometry(
  w: number,
  d: number,
  ridgeHeight: number,
  overhang = 0.42,
  thickness = 0.16,
  ridgeAlongX = true
): THREE.BufferGeometry {
  const span = (ridgeAlongX ? d : w) + overhang * 2;
  const run = (ridgeAlongX ? w : d) + overhang * 2;
  const halfSpan = span * 0.5;

  const shape = new THREE.Shape();
  shape.moveTo(-halfSpan, 0);
  shape.lineTo(0, ridgeHeight);
  shape.lineTo(halfSpan, 0);
  shape.lineTo(halfSpan, -thickness * 0.45);
  shape.lineTo(0, ridgeHeight - thickness);
  shape.lineTo(-halfSpan, -thickness * 0.45);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: run,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -run * 0.5);
  if (ridgeAlongX) {
    geo.rotateY(Math.PI * 0.5);
  }
  applyTriplanarUVs(geo, 0.42);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Triangular solid gable wall infill under a pitched roof.
 */
export function createGableEndWallGeometry(
  span: number,
  ridgeHeight: number,
  wallThick = 0.24
): THREE.BufferGeometry {
  const half = span * 0.5;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(0, ridgeHeight);
  shape.lineTo(half, 0);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: wallThick,
    bevelEnabled: false,
  });
  geo.translate(0, 0, -wallThick * 0.5);
  applyTriplanarUVs(geo, 0.35);
  return geo;
}

/**
 * Sawtooth / multi-bay industrial roof for warehouses & garages.
 */
export function createSawtoothRoofGeometry(
  w: number,
  d: number,
  bays = 3,
  peakHeight = 1.05,
  overhang = 0.28
): THREE.BufferGeometry {
  const span = w + overhang * 2;
  const depth = d + overhang * 2;
  const bayW = span / bays;
  const startX = -span * 0.5;

  const shape = new THREE.Shape();
  shape.moveTo(startX, 0);
  for (let i = 0; i < bays; i++) {
    const x0 = startX + i * bayW;
    const xPeak = x0 + bayW * 0.78;
    const x1 = x0 + bayW;
    shape.lineTo(xPeak, peakHeight);
    shape.lineTo(x1, 0.08);
  }
  shape.lineTo(startX + span, -0.14);
  shape.lineTo(startX, -0.14);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth * 0.5);
  applyTriplanarUVs(geo, 0.42);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Tapered mansard / hipped cap roof (creates classical sloped commercial/clinic roofline).
 */
export function createMansardRoofGeometry(
  w: number,
  d: number,
  height: number,
  inset = 0.85,
  overhang = 0.26
): THREE.BufferGeometry {
  const bw = (w + overhang * 2) * 0.5;
  const bd = (d + overhang * 2) * 0.5;
  const tw = Math.max(0.4, bw - inset);
  const td = Math.max(0.4, bd - inset);

  const positions = new Float32Array([
    // Front (+z)
    -bw, 0, bd, bw, 0, bd, tw, height, td,
    -bw, 0, bd, tw, height, td, -tw, height, td,
    // Back (-z)
    bw, 0, -bd, -bw, 0, -bd, -tw, height, -td,
    bw, 0, -bd, -tw, height, -td, tw, height, -td,
    // Left (-x)
    -bw, 0, -bd, -bw, 0, bd, -tw, height, td,
    -bw, 0, -bd, -tw, height, td, -tw, height, -td,
    // Right (+x)
    bw, 0, bd, bw, 0, -bd, tw, height, -td,
    bw, 0, bd, tw, height, -td, tw, height, td,
    // Top cap
    -tw, height, td, tw, height, td, tw, height, -td,
    -tw, height, td, tw, height, -td, -tw, height, -td,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  applyTriplanarUVs(geo, 0.42);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Brutalist sloped concrete buttress fin (for V4 Containment Lab / fortified bunkers).
 */
export function createButtressGeometry(
  bottomDepth: number,
  topDepth: number,
  height: number,
  thickness: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(bottomDepth, 0);
  shape.lineTo(topDepth, height);
  shape.lineTo(0, height);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -thickness * 0.5);
  applyTriplanarUVs(geo, 0.4);
  return geo;
}

/**
 * Curved sloped awning / canopy via Shape + ExtrudeGeometry.
 */
export function createCurvedAwningGeometry(
  w: number,
  outDepth: number,
  dropH: number
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, dropH);
  shape.quadraticCurveTo(outDepth * 0.65, dropH * 0.86, outDepth, 0.08);
  shape.lineTo(outDepth, -0.06);
  shape.lineTo(outDepth * 0.92, -0.1);
  shape.quadraticCurveTo(outDepth * 0.55, dropH * 0.68, 0, dropH - 0.09);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: w,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
    curveSegments: 8,
  });
  geo.translate(0, 0, -w * 0.5);
  geo.rotateY(-Math.PI * 0.5); // so +Z is outward
  applyTriplanarUVs(geo, 0.5);
  return geo;
}

/**
 * Classical tapered / fluted column via LatheGeometry.
 */
export function createArchitecturalColumnGeometry(
  radius: number,
  height: number
): THREE.BufferGeometry {
  const r = radius;
  const pts = [
    new THREE.Vector2(r * 1.45, 0),
    new THREE.Vector2(r * 1.45, 0.14),
    new THREE.Vector2(r * 1.15, 0.22),
    new THREE.Vector2(r * 1.0, 0.34),
    new THREE.Vector2(r * 0.86, height - 0.32),
    new THREE.Vector2(r * 1.12, height - 0.18),
    new THREE.Vector2(r * 1.42, height - 0.1),
    new THREE.Vector2(r * 1.42, height),
  ];
  const geo = new THREE.LatheGeometry(pts, 10);
  applyTriplanarUVs(geo, 0.5);
  return geo;
}

/**
 * Curved pipe / conduit / handle / faucet along 3D control points.
 */
export function createTubePathGeometry(
  points: THREE.Vector3[],
  radius: number,
  tubularSegments = 12,
  radialSegments = 7
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, false);
  applyTriplanarUVs(geo, 0.8);
  return geo;
}

/**
 * Multi-tiered beveled distant city tower cluster (replaces BoxGeometry(1,1,1) skyline).
 */
export function createSkylineSilhouetteGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const lower = createBeveledBoxGeometry(1.0, 0.62, 1.0, 0.04, 0.03);
  lower.translate(0, 0.31, 0);
  parts.push(lower);

  const mid = createBeveledBoxGeometry(0.76, 0.28, 0.78, 0.03, 0.02);
  mid.translate(-0.04, 0.74, 0.03);
  parts.push(mid);

  const crown = createMansardRoofGeometry(0.64, 0.66, 0.16, 0.14, 0.0);
  crown.translate(-0.04, 0.88, 0.03);
  parts.push(crown);

  const wing = createBeveledBoxGeometry(0.45, 0.44, 0.54, 0.03, 0.02);
  wing.translate(0.32, 0.22, -0.2);
  parts.push(wing);

  const spire = new THREE.CylinderGeometry(0.015, 0.035, 0.24, 5);
  spire.translate(-0.04, 1.12, 0.03);
  parts.push(spire);

  return mergeParts(parts, false);
}

export interface TerrainFlatZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

/**
 * Exact elevation sampler matching createSculptedTerrainGeometry so perimeter trees,
 * boulder outcrops, and scrub grass stay flush with sculpted wasteland hills.
 */
export function sampleTerrainHeight(
  x: number,
  z: number,
  flatZones: TerrainFlatZone[]
): number {
  let minZoneDist = 999;
  for (let f = 0; f < flatZones.length; f++) {
    const box = flatZones[f];
    const dx = Math.max(box.minX - x, 0, x - box.maxX);
    const dz = Math.max(box.minZ - z, 0, z - box.maxZ);
    const d = Math.hypot(dx, dz);
    if (d < minZoneDist) minZoneDist = d;
  }

  // Playable street grid center stays strictly flush so roads/floors never clip
  if (minZoneDist < 1.2) {
    return -0.02;
  }

  const innerDist = Math.max(0, minZoneDist - 1.2);
  const outerRamp = Math.max(
    0,
    Math.max(Math.abs(x) - 49.5, Math.abs(z) - 50.5)
  );

  const n1 = Math.sin(x * 0.075 + z * 0.04) * Math.cos(z * 0.068 - x * 0.03);
  const n2 = Math.sin(x * 0.19 - z * 0.16) * 0.45 + Math.cos(x * 0.13 + z * 0.21) * 0.35;
  const ridge = Math.abs(Math.sin(x * 0.045 - z * 0.055));

  const lotMound = Math.min(1, innerDist / 4.5) * (0.14 + (n1 * 0.14 + n2 * 0.08));
  const perimeterHill =
    outerRamp > 0
      ? Math.min(6.2, outerRamp * 0.18) * (0.45 + ridge * 0.75 + n1 * 0.32 + n2 * 0.2)
      : 0;

  return Math.max(-0.08, -0.02 + lotMound + perimeterHill);
}

/**
 * Sculpted wasteland terrain with organic outer dunes, berms, and rocky embankments
 * outside playable roads/sidewalks/buildings (y=-0.02 inside active street grid).
 */
export function createSculptedTerrainGeometry(
  size: number,
  segments: number,
  flatZones: TerrainFlatZone[]
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI * 0.5);

  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, sampleTerrainHeight(x, z, flatZones));
  }

  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Irregular multi-vertex polygonal ground patch (for organic asphalt breaks, puddles, dirt).
 */
export function createOrganicPatchGeometry(
  rx: number,
  rz: number,
  seed: number,
  points = 10
): THREE.BufferGeometry {
  const rand = seededRand(seed);
  const shape = new THREE.Shape();
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2;
    const radScale = 0.68 + rand() * 0.5;
    const px = Math.cos(a) * rx * radScale;
    const pz = Math.sin(a) * rz * radScale;
    if (i === 0) shape.moveTo(px, pz);
    else shape.lineTo(px, pz);
  }
  shape.closePath();
  const geo = new THREE.ShapeGeometry(shape, 1);
  geo.rotateX(-Math.PI * 0.5);
  applyTriplanarUVs(geo, 0.5);
  return geo;
}

/**
 * Fractured irregular concrete rubble chunk.
 */
export function createFracturedSlabGeometry(
  w: number,
  d: number,
  thick: number,
  seed: number
): THREE.BufferGeometry {
  const rand = seededRand(seed);
  const pts = 7;
  const shape = new THREE.Shape();
  for (let i = 0; i < pts; i++) {
    const a = (i / pts) * Math.PI * 2 + (rand() - 0.5) * 0.25;
    const r = 0.65 + rand() * 0.45;
    const x = Math.cos(a) * w * 0.5 * r;
    const y = Math.sin(a) * d * 0.5 * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thick,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI * 0.5);
  applyTriplanarUVs(geo, 0.6);
  return geo;
}

/**
 * Irregular stratified boulder / rock outcrop with flat grounded bottom.
 */
export function createBoulderGeometry(
  radius: number,
  seed: number,
  detail = 1
): THREE.BufferGeometry {
  const rand = seededRand(seed);
  const geo = new THREE.IcosahedronGeometry(radius, detail);
  const pos = geo.attributes.position;

  // Deterministic per-vertex noise mapped by spatial direction so shared vertices displace identically
  const pA = rand() * 6.28;
  const pB = rand() * 6.28;
  const sx = 0.85 + rand() * 0.45;
  const sy = 0.62 + rand() * 0.35;
  const sz = 0.85 + rand() * 0.45;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const len = Math.max(0.001, Math.hypot(x, y, z));
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    const ridge =
      0.84 +
      0.22 * Math.sin(nx * 3.7 + pA) * Math.cos(nz * 3.1 + pB) +
      0.14 * Math.sin(ny * 5.2 + nx * 2.4);

    let wy = y * sy * ridge;
    if (wy < -radius * 0.25) {
      wy = -radius * 0.25 + (wy + radius * 0.25) * 0.2;
    }
    pos.setXYZ(i, x * sx * ridge, wy + radius * 0.25, z * sz * ridge);
  }

  geo.computeVertexNormals();
  applyTriplanarUVs(geo, 0.65);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Procedural blighted / weathered tree archetypes using curved TubeGeometry trunks,
 * flared roots, forked limbs, and multi-clustered perturbed foliage (non-cube, non-lollipop).
 */
export function createProceduralTreeGeometries(variant: 0 | 1 | 2): {
  woodGeo: THREE.BufferGeometry;
  foliageGeo: THREE.BufferGeometry | null;
} {
  const rand = seededRand(901 + variant * 137);
  const woodParts: THREE.BufferGeometry[] = [];

  const height = variant === 0 ? 5.6 : variant === 1 ? 4.8 : 4.3;
  const leanX = (variant - 1) * 0.42;
  const leanZ = variant === 1 ? 0.35 : -0.22;

  // Root flare base
  const rootPts = [
    new THREE.Vector2(0.46, 0),
    new THREE.Vector2(0.32, 0.35),
    new THREE.Vector2(0.24, 0.85),
    new THREE.Vector2(0.2, 1.3),
  ];
  const flare = new THREE.LatheGeometry(rootPts, 7);
  woodParts.push(flare);

  // Curved primary trunk
  const trunkCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.1, 0),
    new THREE.Vector3(leanX * 0.25, height * 0.32, leanZ * 0.2),
    new THREE.Vector3(leanX * 0.72, height * 0.64, leanZ * 0.65),
    new THREE.Vector3(leanX, height * 0.92, leanZ),
  ]);
  const trunkGeo = new THREE.TubeGeometry(trunkCurve, 10, 0.17, 7, false);
  // Taper upper trunk radius manually
  const tPos = trunkGeo.attributes.position;
  for (let i = 0; i < tPos.count; i++) {
    const y = tPos.getY(i);
    const t = Math.max(0, Math.min(1, y / height));
    const c = trunkCurve.getPoint(t);
    const scale = 1.15 - t * 0.68;
    tPos.setXYZ(
      i,
      c.x + (tPos.getX(i) - c.x) * scale,
      c.y + (tPos.getY(i) - c.y) * scale,
      c.z + (tPos.getZ(i) - c.z) * scale
    );
  }
  trunkGeo.computeVertexNormals();
  woodParts.push(trunkGeo);

  // Forked limbs + twig tips
  const branchTips: THREE.Vector3[] = [];
  const branchCount = variant === 2 ? 5 : 4;
  for (let b = 0; b < branchCount; b++) {
    const startT = 0.48 + (b / branchCount) * 0.38;
    const basePt = trunkCurve.getPoint(startT);
    const angle = (b / branchCount) * Math.PI * 2 + variant * 0.8 + (rand() - 0.5) * 0.45;
    const reach = 1.15 + rand() * 0.95;
    const rise = 0.85 + rand() * 0.95;
    const midPt = new THREE.Vector3(
      basePt.x + Math.cos(angle) * reach * 0.55,
      basePt.y + rise * 0.52,
      basePt.z + Math.sin(angle) * reach * 0.55
    );
    const tipPt = new THREE.Vector3(
      basePt.x + Math.cos(angle) * reach,
      basePt.y + rise,
      basePt.z + Math.sin(angle) * reach
    );
    branchTips.push(tipPt);

    const bCurve = new THREE.CatmullRomCurve3([basePt, midPt, tipPt]);
    const bGeo = new THREE.TubeGeometry(bCurve, 6, 0.065, 5, false);
    const bPos = bGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const py = bPos.getY(i);
      const frac = Math.max(0, Math.min(1, (py - basePt.y) / Math.max(0.2, rise)));
      const pt = bCurve.getPoint(frac);
      const s = 1.0 - frac * 0.68;
      bPos.setXYZ(
        i,
        pt.x + (bPos.getX(i) - pt.x) * s,
        pt.y + (bPos.getY(i) - pt.y) * s,
        pt.z + (bPos.getZ(i) - pt.z) * s
      );
    }
    bGeo.computeVertexNormals();
    woodParts.push(bGeo);

    // Secondary sub-twig on gnarled dead or surviving limbs
    const twigTip = new THREE.Vector3(
      midPt.x + Math.cos(angle + 0.75) * 0.65,
      midPt.y + 0.55,
      midPt.z + Math.sin(angle + 0.75) * 0.65
    );
    const twigGeo = createTubePathGeometry(
      [midPt, twigTip],
      0.028,
      4,
      5
    );
    woodParts.push(twigGeo);
  }

  const woodGeo = mergeParts(woodParts, true, 0.5);

  if (variant === 2) {
    // Variant 2 is a skeletal blighted dead tree — zero canopy, pure silhouette
    return { woodGeo, foliageGeo: null };
  }

  // Asymmetric multi-cluster low-poly foliage crown (irregular organic canopy pads)
  const canopyParts: THREE.BufferGeometry[] = [];
  const crownCenters = [
    ...branchTips,
    new THREE.Vector3(leanX, height * 0.98, leanZ),
  ];
  for (let c = 0; c < crownCenters.length; c++) {
    const center = crownCenters[c];
    const rad = 0.78 + rand() * 0.48;
    const blob = new THREE.IcosahedronGeometry(rad, 1);
    const pos = blob.attributes.position;
    const ph = rand() * 6.28;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      const disp = 0.8 + 0.3 * Math.sin(px * 3.1 + ph) * Math.cos(pz * 2.9);
      pos.setXYZ(i, px * 1.18 * disp, py * 0.72 * disp, pz * 1.12 * disp);
    }
    blob.computeVertexNormals();
    blob.translate(center.x, center.y + 0.15, center.z);
    canopyParts.push(blob);
  }
  const foliageGeo = mergeParts(canopyParts, false);
  return { woodGeo, foliageGeo };
}

/**
 * Crossed arched grass-blade cluster for InstancedMesh ground cover.
 */
export function createGrassTuftGeometry(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bladeCount = 6;
  for (let i = 0; i < bladeCount; i++) {
    const angle = (i / bladeCount) * Math.PI * 2 + (i % 2) * 0.25;
    const h = 0.34 + (i % 3) * 0.1;
    const bend = 0.12 + (i % 2) * 0.08;
    const w = 0.055;

    const positions = new Float32Array([
      -w, 0, 0,
       w, 0, 0,
       w * 0.55, h * 0.55, bend * 0.35,

      -w, 0, 0,
       w * 0.55, h * 0.55, bend * 0.35,
      -w * 0.55, h * 0.55, bend * 0.35,

      -w * 0.55, h * 0.55, bend * 0.35,
       w * 0.55, h * 0.55, bend * 0.35,
       0, h, bend,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    g.rotateY(angle);
    g.translate(Math.cos(angle) * 0.07, 0, Math.sin(angle) * 0.07);
    g.computeVertexNormals();
    applyTriplanarUVs(g, 1.0);
    parts.push(g);
  }
  return mergeParts(parts, false);
}

/**
 * Curved / sloped vehicle body profiles extruded horizontally with beveled fenders & cabin.
 * Oriented along +Z forward so it fits directly into existing vehicle OBB colliders.
 */
export function createVehicleProfileGeometry(
  kind: 'sedan' | 'taxi' | 'pickup' | 'van'
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  if (kind === 'van') {
    // Ambulance / Delivery Van: sloped nose, curved roofline, chamfered rear
    shape.moveTo(-2.22, 0.34);
    shape.lineTo(2.15, 0.34);
    shape.lineTo(2.26, 0.62);
    shape.lineTo(2.18, 0.98);
    shape.lineTo(1.52, 1.08);
    shape.lineTo(1.12, 1.88);
    shape.lineTo(-1.98, 1.94);
    shape.lineTo(-2.24, 1.68);
    shape.closePath();
  } else if (kind === 'pickup') {
    // Pickup truck: muscular hood, upright cab, open rear cargo bed walls
    shape.moveTo(-2.14, 0.34);
    shape.lineTo(2.12, 0.34);
    shape.lineTo(2.18, 0.68);
    shape.lineTo(2.06, 0.96);
    shape.lineTo(1.08, 1.04);
    shape.lineTo(0.74, 1.66);
    shape.lineTo(-0.34, 1.68);
    shape.lineTo(-0.42, 1.04);
    shape.lineTo(-2.1, 1.06);
    shape.lineTo(-2.16, 0.68);
    shape.closePath();
  } else {
    // Sedan / Taxi: fastback hood, sloped windshield, curved roofline, rear decklid
    shape.moveTo(-1.98, 0.32);
    shape.lineTo(1.96, 0.32);
    shape.lineTo(2.04, 0.58);
    shape.lineTo(1.92, 0.86);
    shape.lineTo(0.98, 0.96);
    shape.lineTo(0.46, 1.46);
    shape.lineTo(-0.68, 1.46);
    shape.lineTo(-1.22, 0.98);
    shape.lineTo(-1.94, 0.92);
    shape.lineTo(-2.02, 0.62);
    shape.closePath();
  }

  const bodyW = kind === 'van' ? 1.82 : 1.68;
  const bevel = 0.085;
  const extrudeD = bodyW - bevel * 2;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: extrudeD,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 4,
  });
  // ExtrudeGeometry shape is X-Y extruded along +Z. Map shape X -> +Z forward, extrude Z -> X width.
  geo.translate(0, 0, -extrudeD * 0.5);
  geo.rotateY(-Math.PI * 0.5);
  applyTriplanarUVs(geo, 0.45);
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Pillowed rounded sandbag shape (never a hard brick).
 */
export function createSandbagGeometry(w = 0.56, h = 0.17, d = 0.32): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(0.5, 10, 7);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Slight pinch at ends, flatter belly underneath
    const pinch = 1.0 - Math.abs(x) * 0.25;
    const ny = y < 0 ? y * 0.72 : y * 1.08;
    pos.setXYZ(i, x * w, (ny + 0.38) * h, z * d * pinch);
  }
  geo.computeVertexNormals();
  applyTriplanarUVs(geo, 1.0);
  return geo;
}

/**
 * Draped catenary survivor tarp / tent canopy.
 */
export function createDrapedTarpGeometry(
  w: number,
  d: number,
  ridgeH: number
): THREE.BufferGeometry {
  const geo = new THREE.PlaneGeometry(w, d, 10, 8);
  geo.rotateX(-Math.PI * 0.5);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const normX = Math.abs(x) / (w * 0.5);
    const normZ = Math.abs(z) / (d * 0.5);
    // Ridge along Z, gentle catenary sag between ridge and ground stakes
    const ridgeLine = ridgeH * (1 - Math.pow(normX, 0.85));
    const sag = Math.sin(normX * Math.PI) * (0.09 + 0.05 * Math.cos(normZ * 2.5));
    const y = Math.max(0.03, ridgeLine - sag);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/**
 * Concave porcelain sink basin via LatheGeometry.
 */
export function createPorcelainBasinGeometry(
  radius = 0.22,
  depth = 0.14
): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.02),
    new THREE.Vector2(radius * 0.55, 0.02),
    new THREE.Vector2(radius * 0.78, depth * 0.45),
    new THREE.Vector2(radius * 0.88, depth * 0.92),
    new THREE.Vector2(radius * 1.05, depth),
    new THREE.Vector2(radius * 1.06, depth - 0.035),
    new THREE.Vector2(radius * 0.94, 0),
    new THREE.Vector2(0.0, 0),
  ];
  const geo = new THREE.LatheGeometry(pts, 14);
  applyTriplanarUVs(geo, 1.0);
  return geo;
}

/**
 * Medical oxygen tank / pressurized gas cylinder via LatheGeometry.
 */
export function createPressurizedTankGeometry(
  radius = 0.11,
  height = 0.96
): THREE.BufferGeometry {
  const bodyH = height * 0.76;
  const pts = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(radius, 0),
    new THREE.Vector2(radius, bodyH),
    new THREE.Vector2(radius * 0.82, bodyH + height * 0.09),
    new THREE.Vector2(radius * 0.38, bodyH + height * 0.16),
    new THREE.Vector2(radius * 0.28, height * 0.95),
    new THREE.Vector2(radius * 0.36, height),
    new THREE.Vector2(0.0, height),
  ];
  const geo = new THREE.LatheGeometry(pts, 12);
  applyTriplanarUVs(geo, 1.0);
  return geo;
}
