import * as THREE from 'three';
import { ProceduralTextureSet } from '../textures/proceduralTextures';
import {
  applyTriplanarUVs,
  createBeveledBoxGeometry,
  createBoulderGeometry,
  createCurvedAwningGeometry,
  createDrapedTarpGeometry,
  createFracturedSlabGeometry,
  createGableEndWallGeometry,
  createGabledRoofGeometry,
  createMansardRoofGeometry,
  createOrganicPatchGeometry,
  createSandbagGeometry,
  createSawtoothRoofGeometry,
  createTubePathGeometry,
  createVehicleProfileGeometry,
  mergeParts,
} from './proceduralGeometryKit';

export interface MaterialPalette {
  brick: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  darkTrim: THREE.MeshStandardMaterial;
  roofTar: THREE.MeshStandardMaterial;
  rustedMetal: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  barkWood: THREE.MeshStandardMaterial;
  mossRock: THREE.MeshStandardMaterial;
  tireRubber: THREE.MeshStandardMaterial;
  glassDark: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshStandardMaterial;
  shopSign: THREE.MeshStandardMaterial;
  awning: THREE.MeshStandardMaterial;
  lampMetal: THREE.MeshStandardMaterial;
  lampBulbLit: THREE.MeshStandardMaterial;
  streetLampBulb: THREE.MeshStandardMaterial;
  lampBulbDead: THREE.MeshStandardMaterial;
  trashBag: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  hydrantRed: THREE.MeshStandardMaterial;
  barrierHazard: THREE.MeshStandardMaterial;
  signValeStore: THREE.MeshStandardMaterial;
  signDepot04: THREE.MeshStandardMaterial;
  signStarlightDiner: THREE.MeshStandardMaterial;
  signRedlineAuto: THREE.MeshStandardMaterial;
  signMercerFlats: THREE.MeshStandardMaterial;
  signMainBlvd: THREE.MeshStandardMaterial;
  signCentralAve: THREE.MeshStandardMaterial;
  signQuarantine: THREE.MeshStandardMaterial;
  signPolicePrecinct: THREE.MeshStandardMaterial;
  signFieldClinic: THREE.MeshStandardMaterial;
  signResearchLab: THREE.MeshStandardMaterial;
  signDistrictNorth: THREE.MeshStandardMaterial;
  signDistrictCross: THREE.MeshStandardMaterial;
  beaconBlue: THREE.MeshStandardMaterial;
  beaconCyan: THREE.MeshStandardMaterial;
  beaconRed: THREE.MeshStandardMaterial;
  beaconAmber: THREE.MeshStandardMaterial;
  hazardStripe: THREE.MeshStandardMaterial;
  safetyOrange: THREE.MeshStandardMaterial;
  tarpBlue: THREE.MeshStandardMaterial;
  sandbag: THREE.MeshStandardMaterial;
  bloodStain: THREE.MeshStandardMaterial;
  oilSlick: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createMaterialPalette(textures: ProceduralTextureSet): MaterialPalette {
  const brick = new THREE.MeshStandardMaterial({
    map: textures.brickWall,
    normalMap: textures.brickNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.brickRoughness,
    roughness: 0.92,
    metalness: 0.03,
  });
  const concrete = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    normalMap: textures.concreteNormal,
    normalScale: new THREE.Vector2(0.7, 0.7),
    roughnessMap: textures.concreteRoughness,
    roughness: 0.92,
    metalness: 0.04,
  });
  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.68,
    metalness: 0.38,
  });
  const roofTar = new THREE.MeshStandardMaterial({
    color: 0x181b20,
    normalMap: textures.asphaltNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.95,
    metalness: 0.02,
  });
  const rustedMetal = new THREE.MeshStandardMaterial({
    map: textures.rustedMetal,
    normalMap: textures.rustedMetalNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughnessMap: textures.rustedMetalRoughness,
    roughness: 0.85,
    metalness: 0.52,
  });
  const wood = new THREE.MeshStandardMaterial({
    map: textures.woodPlank,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.woodRoughness,
    roughness: 0.88,
    metalness: 0.02,
  });
  const barkWood = new THREE.MeshStandardMaterial({
    color: 0x2e261f,
    map: textures.woodPlank,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(0.95, 0.95),
    roughness: 0.95,
    metalness: 0.0,
  });
  const mossRock = new THREE.MeshStandardMaterial({
    color: 0x454a44,
    normalMap: textures.concreteNormal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.94,
    metalness: 0.03,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x14161a,
    roughness: 0.92,
    metalness: 0.04,
  });
  const glassDark = new THREE.MeshStandardMaterial({
    color: 0x0e151d,
    roughness: 0.14,
    metalness: 0.32,
  });
  const warmWindow = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 1.15,
    roughness: 0.25,
    metalness: 0.1,
  });
  const shopSign = new THREE.MeshStandardMaterial({
    map: textures.shopSign,
    emissive: 0xb45309,
    emissiveMap: textures.shopSign,
    emissiveIntensity: 0.45,
    roughness: 0.48,
    metalness: 0.15,
  });
  const awning = new THREE.MeshStandardMaterial({
    map: textures.awningStripe,
    roughness: 0.88,
    metalness: 0.04,
  });
  const lampMetal = new THREE.MeshStandardMaterial({
    color: 0x353c45,
    roughness: 0.44,
    metalness: 0.76,
  });
  const lampBulbLit = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const streetLampBulb = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const lampBulbDead = new THREE.MeshStandardMaterial({
    color: 0x2f3b49,
    roughness: 0.42,
    metalness: 0.2,
  });
  const trashBag = new THREE.MeshStandardMaterial({
    color: 0x171b20,
    roughness: 0.36,
    metalness: 0.08,
  });
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x2d3d29,
    roughness: 0.92,
    metalness: 0.0,
  });
  const hydrantRed = new THREE.MeshStandardMaterial({
    color: 0x762323,
    roughness: 0.58,
    metalness: 0.34,
  });
  const barrierHazard = new THREE.MeshStandardMaterial({
    color: 0xb26d18,
    roughness: 0.78,
    metalness: 0.1,
  });
  const signValeStore = new THREE.MeshStandardMaterial({
    map: textures.signValeStore,
    emissive: 0xffffff,
    emissiveMap: textures.signValeStore,
    emissiveIntensity: 0.36,
    roughness: 0.65,
    metalness: 0.1,
  });
  const signDepot04 = new THREE.MeshStandardMaterial({
    map: textures.signDepot04,
    emissive: 0xe2e8f0,
    emissiveMap: textures.signDepot04,
    emissiveIntensity: 0.28,
    roughness: 0.7,
    metalness: 0.15,
  });
  const signStarlightDiner = new THREE.MeshStandardMaterial({
    map: textures.signStarlightDiner,
    emissive: 0xffffff,
    emissiveMap: textures.signStarlightDiner,
    emissiveIntensity: 0.48,
    roughness: 0.55,
    metalness: 0.12,
  });
  const signRedlineAuto = new THREE.MeshStandardMaterial({
    map: textures.signRedlineAuto,
    emissive: 0xffffff,
    emissiveMap: textures.signRedlineAuto,
    emissiveIntensity: 0.38,
    roughness: 0.65,
    metalness: 0.15,
  });
  const signMercerFlats = new THREE.MeshStandardMaterial({
    map: textures.signMercerFlats,
    emissive: 0xcbd5e1,
    emissiveMap: textures.signMercerFlats,
    emissiveIntensity: 0.25,
    roughness: 0.78,
    metalness: 0.08,
  });
  const signMainBlvd = new THREE.MeshStandardMaterial({
    map: textures.signMainBlvd,
    emissive: 0xd1fae5,
    emissiveMap: textures.signMainBlvd,
    emissiveIntensity: 0.26,
    roughness: 0.45,
    metalness: 0.25,
  });
  const signCentralAve = new THREE.MeshStandardMaterial({
    map: textures.signCentralAve,
    emissive: 0xd1fae5,
    emissiveMap: textures.signCentralAve,
    emissiveIntensity: 0.26,
    roughness: 0.45,
    metalness: 0.25,
  });
  const signQuarantine = new THREE.MeshStandardMaterial({
    map: textures.signQuarantine,
    emissive: 0xfef08a,
    emissiveMap: textures.signQuarantine,
    emissiveIntensity: 0.42,
    roughness: 0.52,
    metalness: 0.2,
  });
  const signPolicePrecinct = new THREE.MeshStandardMaterial({
    map: textures.signPolicePrecinct,
    emissive: 0xbfdbfe,
    emissiveMap: textures.signPolicePrecinct,
    emissiveIntensity: 0.48,
    roughness: 0.52,
    metalness: 0.18,
  });
  const signFieldClinic = new THREE.MeshStandardMaterial({
    map: textures.signFieldClinic,
    emissive: 0xa5f3fc,
    emissiveMap: textures.signFieldClinic,
    emissiveIntensity: 0.48,
    roughness: 0.5,
    metalness: 0.14,
  });
  const signResearchLab = new THREE.MeshStandardMaterial({
    map: textures.signResearchLab,
    emissive: 0xfde68a,
    emissiveMap: textures.signResearchLab,
    emissiveIntensity: 0.5,
    roughness: 0.48,
    metalness: 0.22,
  });
  const signDistrictNorth = new THREE.MeshStandardMaterial({
    map: textures.signDistrictNorth,
    emissive: 0xfef08a,
    emissiveMap: textures.signDistrictNorth,
    emissiveIntensity: 0.34,
    roughness: 0.45,
    metalness: 0.2,
  });
  const signDistrictCross = new THREE.MeshStandardMaterial({
    map: textures.signDistrictCross,
    emissive: 0xbae6fd,
    emissiveMap: textures.signDistrictCross,
    emissiveIntensity: 0.34,
    roughness: 0.45,
    metalness: 0.2,
  });
  const beaconBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    emissive: 0x2563eb,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  });
  const beaconCyan = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 2.0,
    roughness: 0.22,
  });
  const beaconRed = new THREE.MeshStandardMaterial({
    color: 0xf87171,
    emissive: 0xdc2626,
    emissiveIntensity: 2.2,
    roughness: 0.22,
  });
  const beaconAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 2.1,
    roughness: 0.22,
  });
  const hazardStripe = new THREE.MeshStandardMaterial({
    map: textures.hazardStripe,
    roughness: 0.75,
    metalness: 0.1,
  });
  const safetyOrange = new THREE.MeshStandardMaterial({
    color: 0xd95f18,
    roughness: 0.52,
    metalness: 0.06,
  });
  const tarpBlue = new THREE.MeshStandardMaterial({
    color: 0x2b4560,
    roughness: 0.88,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });
  const sandbag = new THREE.MeshStandardMaterial({
    color: 0x6b5f4b,
    roughness: 0.94,
    metalness: 0.0,
  });
  const bloodStain = new THREE.MeshStandardMaterial({
    color: 0x3b1114,
    roughness: 0.65,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  const oilSlick = new THREE.MeshStandardMaterial({
    color: 0x0b0e13,
    roughness: 0.22,
    metalness: 0.45,
    transparent: true,
    opacity: 0.74,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const all = [
    brick,
    concrete,
    darkTrim,
    roofTar,
    rustedMetal,
    wood,
    barkWood,
    mossRock,
    tireRubber,
    glassDark,
    warmWindow,
    shopSign,
    awning,
    lampMetal,
    lampBulbLit,
    streetLampBulb,
    lampBulbDead,
    trashBag,
    foliage,
    hydrantRed,
    barrierHazard,
    signValeStore,
    signDepot04,
    signStarlightDiner,
    signRedlineAuto,
    signMercerFlats,
    signMainBlvd,
    signCentralAve,
    signQuarantine,
    signPolicePrecinct,
    signFieldClinic,
    signResearchLab,
    signDistrictNorth,
    signDistrictCross,
    beaconBlue,
    beaconCyan,
    beaconRed,
    beaconAmber,
    hazardStripe,
    safetyOrange,
    tarpBlue,
    sandbag,
    bloodStain,
    oilSlick,
  ];

  return {
    brick,
    concrete,
    darkTrim,
    roofTar,
    rustedMetal,
    wood,
    barkWood,
    mossRock,
    tireRubber,
    glassDark,
    warmWindow,
    shopSign,
    awning,
    lampMetal,
    lampBulbLit,
    streetLampBulb,
    lampBulbDead,
    trashBag,
    foliage,
    hydrantRed,
    barrierHazard,
    signValeStore,
    signDepot04,
    signStarlightDiner,
    signRedlineAuto,
    signMercerFlats,
    signMainBlvd,
    signCentralAve,
    signQuarantine,
    signPolicePrecinct,
    signFieldClinic,
    signResearchLab,
    signDistrictNorth,
    signDistrictCross,
    beaconBlue,
    beaconCyan,
    beaconRed,
    beaconAmber,
    hazardStripe,
    safetyOrange,
    tarpBlue,
    sandbag,
    bloodStain,
    oilSlick,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}

export interface BuildingBuildOptions {
  w: number;
  h: number;
  d: number;
  style: 'last_shop' | 'apartment' | 'pharmacy' | 'garage' | 'diner' | 'warehouse';
  doorSide: 'south' | 'north' | 'east' | 'west';
}

export function buildLastShopModel(
  opts: BuildingBuildOptions,
  mats: MaterialPalette
): THREE.Group {
  const { w, h, d } = opts;
  const group = new THREE.Group();

  const hull = new THREE.Mesh(createBeveledBoxGeometry(w, h, d, 0.04, 0.04), mats.brick);
  hull.position.y = h * 0.5;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  const plinth = new THREE.Mesh(
    createBeveledBoxGeometry(w + 0.3, 0.35, d + 0.3, 0.03, 0.04),
    mats.concrete
  );
  plinth.position.y = 0.175;
  plinth.receiveShadow = true;
  group.add(plinth);

  // Gabled pitched roof instead of flat parapet box
  const roof = new THREE.Mesh(
    createGabledRoofGeometry(w, d, 1.5, 0.45, 0.18, true),
    mats.roofTar
  );
  roof.position.y = h + 0.04;
  roof.castShadow = true;
  group.add(roof);

  const gable = createGableEndWallGeometry(d - 0.12, 1.4, 0.24);
  gable.rotateY(Math.PI * 0.5);
  const gW = new THREE.Mesh(gable, mats.brick);
  gW.position.set(-w * 0.5 + 0.12, h + 0.02, 0);
  const gE = new THREE.Mesh(gable.clone(), mats.brick);
  gE.position.set(w * 0.5 - 0.12, h + 0.02, 0);
  group.add(gW, gE);

  const frontZ = d * 0.5;
  const awningMesh = new THREE.Mesh(
    createCurvedAwningGeometry(w - 1.2, 1.85, 0.65),
    mats.awning
  );
  awningMesh.position.set(0, 2.75, frontZ);
  awningMesh.castShadow = true;
  group.add(awningMesh);

  const signMesh = new THREE.Mesh(
    createBeveledBoxGeometry(5.6, 1.25, 0.22, 0.03, 0.02),
    mats.shopSign
  );
  signMesh.position.set(0, 4.1, frontZ + 0.16);
  group.add(signMesh);

  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.lampBulbLit);
  lantern.position.set(0, 2.75, frontZ + 0.35);
  group.add(lantern);

  return group;
}

/**
 * Non-block urban background & landmark buildings (e.g. Mercer Flats, perimeter towers).
 * Breaks box monotony with stepped wings, corner pilasters, recessed window bays,
 * pitched/mansard/sawtooth roofs, fire escape balconies, and rooftop water tanks.
 */
export function buildUrbanBuildingModel(
  opts: BuildingBuildOptions,
  mats: MaterialPalette
): THREE.Group {
  const { w, h, d, style, doorSide } = opts;
  const group = new THREE.Group();

  const wallMat =
    style === 'apartment' || style === 'diner' ? mats.brick : mats.concrete;

  // 1. Stepped architectural main massing (recessed upper setback tier on tall blocks)
  const hasSetback = h >= 6.8;
  const lowerH = hasSetback ? h * 0.66 : h;
  const body = new THREE.Mesh(
    createBeveledBoxGeometry(w, lowerH, d, 0.04, 0.05),
    wallMat
  );
  body.position.y = lowerH * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  if (hasSetback) {
    const upperH = h - lowerH;
    const upperBody = new THREE.Mesh(
      createBeveledBoxGeometry(w * 0.88, upperH, d * 0.86, 0.04, 0.05),
      wallMat
    );
    upperBody.position.set(0, lowerH + upperH * 0.5, 0);
    upperBody.castShadow = true;
    upperBody.receiveShadow = true;
    group.add(upperBody);

    const setbackLedge = new THREE.Mesh(
      createBeveledBoxGeometry(w + 0.24, 0.22, d + 0.24, 0.03, 0.04),
      mats.concrete
    );
    setbackLedge.position.y = lowerH;
    group.add(setbackLedge);
  }

  // 2. Corner pilasters & foundation water-table plinth
  const trimParts: THREE.BufferGeometry[] = [];
  const plinth = createBeveledBoxGeometry(w + 0.28, 0.36, d + 0.28, 0.03, 0.04);
  plinth.translate(0, 0.18, 0);
  trimParts.push(plinth);

  for (const [px, pz] of [
    [-w * 0.49, -d * 0.49],
    [w * 0.49, -d * 0.49],
    [-w * 0.49, d * 0.49],
    [w * 0.49, d * 0.49],
  ]) {
    const pil = createBeveledBoxGeometry(0.42, lowerH, 0.42, 0.03, 0.03);
    pil.translate(px, lowerH * 0.5, pz);
    trimParts.push(pil);
  }
  const trimMesh = new THREE.Mesh(mergeParts(trimParts, false), mats.darkTrim);
  trimMesh.castShadow = true;
  trimMesh.receiveShadow = true;
  group.add(trimMesh);

  // 3. Architectural Roof Cap (Mansard / Sawtooth / Gable instead of flat rectangle)
  const topW = hasSetback ? w * 0.88 : w;
  const topD = hasSetback ? d * 0.86 : d;
  if (style === 'warehouse' || style === 'garage') {
    const saw = new THREE.Mesh(
      createSawtoothRoofGeometry(topW, topD, 3, 1.15, 0.28),
      mats.rustedMetal
    );
    saw.position.y = h;
    saw.castShadow = true;
    group.add(saw);
  } else if (style === 'apartment') {
    const mansard = new THREE.Mesh(
      createMansardRoofGeometry(topW, topD, 1.15, Math.min(1.4, topW * 0.18), 0.28),
      mats.roofTar
    );
    mansard.position.y = h;
    mansard.castShadow = true;
    group.add(mansard);
  } else {
    const gable = new THREE.Mesh(
      createGabledRoofGeometry(topW, topD, 1.35, 0.34, 0.16, true),
      mats.roofTar
    );
    gable.position.y = h;
    gable.castShadow = true;
    group.add(gable);
  }

  // 4. Rooftop AC / Curved Ducts / Elevated Water Tower & Fire-Escape Balcony on Tall Blocks
  const exhaustPts = [
    new THREE.Vector3(-topW * 0.24, h + 0.3, topD * 0.12),
    new THREE.Vector3(-topW * 0.24, h + 1.35, topD * 0.12),
    new THREE.Vector3(-topW * 0.24, h + 1.48, topD * 0.28),
  ];
  const exhaustPipe = new THREE.Mesh(
    createTubePathGeometry(exhaustPts, 0.14, 8, 6),
    mats.lampMetal
  );
  group.add(exhaustPipe);

  if (h >= 7.5 && w >= 12) {
    const tankParts: THREE.BufferGeometry[] = [];
    for (const [lx, lz] of [
      [-0.65, -0.65],
      [0.65, -0.65],
      [-0.65, 0.65],
      [0.65, 0.65],
    ]) {
      const leg = new THREE.CylinderGeometry(0.06, 0.08, 1.35, 6);
      leg.translate(topW * 0.22 + lx, h + 1.1, -topD * 0.16 + lz);
      tankParts.push(leg);
    }
    group.add(new THREE.Mesh(mergeParts(tankParts, false), mats.darkTrim));

    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(0.92, 0.96, 1.5, 12),
      mats.wood
    );
    tank.position.set(topW * 0.22, h + 2.45, -topD * 0.16);
    tank.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.04, 0.55, 12), mats.rustedMetal);
    cap.position.set(topW * 0.22, h + 3.48, -topD * 0.16);
    group.add(tank, cap);

    // Exterior Steel Fire Escape Balcony + Ladder on front upper tier
    const feParts: THREE.BufferGeometry[] = [];
    const balconyFloor = createBeveledBoxGeometry(3.4, 0.08, 0.95, 0.015, 0.02);
    balconyFloor.translate(-w * 0.18, 4.15, d * 0.5 + 0.45);
    const railFront = createBeveledBoxGeometry(3.4, 0.06, 0.06, 0.01, 0.01);
    railFront.translate(-w * 0.18, 4.95, d * 0.5 + 0.9);
    for (let rx = -1.6; rx <= 1.61; rx += 0.8) {
      const post = new THREE.CylinderGeometry(0.025, 0.025, 0.82, 5);
      post.translate(-w * 0.18 + rx, 4.55, d * 0.5 + 0.9);
      feParts.push(post);
    }
    // Angled ladder flight descending to 2.2m
    for (const lx of [-1.25, -0.75]) {
      const rail = new THREE.CylinderGeometry(0.025, 0.025, 2.3, 5);
      rail.rotateX(0.32);
      rail.translate(-w * 0.18 + lx, 3.1, d * 0.5 + 0.72);
      feParts.push(rail);
    }
    const fireEscape = new THREE.Mesh(mergeParts(feParts, false), mats.lampMetal);
    fireEscape.castShadow = true;
    group.add(fireEscape);
  }

  // Curved downspout
  const downPts = [
    new THREE.Vector3(w * 0.5 + 0.06, lowerH, d * 0.42),
    new THREE.Vector3(w * 0.5 + 0.06, 0.3, d * 0.42),
    new THREE.Vector3(w * 0.5 + 0.22, 0.08, d * 0.42),
  ];
  group.add(new THREE.Mesh(createTubePathGeometry(downPts, 0.065, 8, 6), mats.lampMetal));

  // 5. Recessed / Framed Windows with Lintels, Sills & Angled Boarding Planks
  const floors = Math.max(1, Math.floor(h / 3.4));
  const cols = Math.max(2, Math.floor(w / 3.2));
  const winGlassParts: THREE.BufferGeometry[] = [];
  const winTrimParts: THREE.BufferGeometry[] = [];
  const plankParts: THREE.BufferGeometry[] = [];

  for (let f = 0; f < floors; f++) {
    const wy = 2.0 + f * 3.2;
    if (wy + 1.0 > h) break;
    const faceZ = wy > lowerH ? (topD * 0.5) : (d * 0.5);
    const colSpan = wy > lowerH ? topW : w;

    for (let c = 0; c < cols; c++) {
      const wx = -colSpan * 0.5 + ((c + 0.5) / cols) * colSpan;

      const glass = createBeveledBoxGeometry(1.26, 1.4, 0.08, 0.01, 0.01);
      glass.translate(wx, wy, faceZ + 0.02);
      winGlassParts.push(glass);

      const sill = createBeveledBoxGeometry(1.5, 0.11, 0.24, 0.02, 0.02);
      sill.translate(wx, wy - 0.74, faceZ + 0.08);
      const lintel = createBeveledBoxGeometry(1.52, 0.14, 0.24, 0.02, 0.02);
      lintel.translate(wx, wy + 0.76, faceZ + 0.07);
      winTrimParts.push(sill, lintel);

      if (f > 0 && c % 2 === 0) {
        const glassB = createBeveledBoxGeometry(1.26, 1.4, 0.08, 0.01, 0.01);
        glassB.translate(wx, wy, -faceZ - 0.02);
        winGlassParts.push(glassB);
        const sillB = createBeveledBoxGeometry(1.5, 0.11, 0.24, 0.02, 0.02);
        sillB.translate(wx, wy - 0.74, -faceZ - 0.08);
        winTrimParts.push(sillB);
      }

      if (f === 0 && (c + f) % 2 === 0) {
        const p1 = createBeveledBoxGeometry(1.48, 0.2, 0.12, 0.015, 0.01);
        p1.rotateZ(c % 2 === 0 ? 0.11 : -0.08);
        p1.translate(wx, wy + 0.12, faceZ + 0.09);
        const p2 = createBeveledBoxGeometry(1.48, 0.2, 0.12, 0.015, 0.01);
        p2.rotateZ(c % 2 === 0 ? -0.06 : 0.09);
        p2.translate(wx, wy - 0.24, faceZ + 0.09);
        plankParts.push(p1, p2);
      }
    }
  }

  if (winGlassParts.length > 0) {
    group.add(new THREE.Mesh(mergeParts(winGlassParts, false), mats.glassDark));
  }
  if (winTrimParts.length > 0) {
    group.add(new THREE.Mesh(mergeParts(winTrimParts, false), mats.darkTrim));
  }
  if (plankParts.length > 0) {
    group.add(new THREE.Mesh(mergeParts(plankParts, true, 0.6), mats.wood));
  }

  // 6. Entry doorway canopy & stoop on designated side
  const door = new THREE.Mesh(
    createBeveledBoxGeometry(1.42, 2.35, 0.18, 0.02, 0.02),
    mats.darkTrim
  );
  const doorLintel = new THREE.Mesh(
    createBeveledBoxGeometry(1.85, 0.24, 0.45, 0.03, 0.03),
    mats.concrete
  );
  if (doorSide === 'south') {
    door.position.set(0, 1.18, d * 0.5 + 0.05);
    doorLintel.position.set(0, 2.45, d * 0.5 + 0.16);
  } else if (doorSide === 'north') {
    door.position.set(0, 1.18, -d * 0.5 - 0.05);
    doorLintel.position.set(0, 2.45, -d * 0.5 - 0.16);
  } else if (doorSide === 'east') {
    door.rotation.y = Math.PI * 0.5;
    door.position.set(w * 0.5 + 0.05, 1.18, 0);
    doorLintel.rotation.y = Math.PI * 0.5;
    doorLintel.position.set(w * 0.5 + 0.16, 2.45, 0);
  } else {
    door.rotation.y = Math.PI * 0.5;
    door.position.set(-w * 0.5 - 0.05, 1.18, 0);
    doorLintel.rotation.y = Math.PI * 0.5;
    doorLintel.position.set(-w * 0.5 - 0.16, 2.45, 0);
  }
  group.add(door, doorLintel);

  // 7. Landmark Fascia Signboards
  if (style === 'apartment' && w < 14) {
    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(4.8, 1.0, 0.18, 0.025, 0.02),
      mats.signMercerFlats
    );
    sign.position.set(0, 3.35, d * 0.5 + 0.14);
    group.add(sign);
  }

  return group;
}

/**
 * Non-block sculpted vehicle builder using beveled ExtrudeGeometry side-profiles
 * with sloped hoods, angled windshields, open pickup beds, bumpers, grilles, and grounded wheels.
 */
export function buildVehicleModel(
  kind: 'sedan' | 'taxi' | 'pickup' | 'van',
  colorHex: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.56,
    metalness: 0.42,
  });

  const length = kind === 'van' ? 4.5 : kind === 'pickup' ? 4.35 : 4.05;
  const width = kind === 'van' ? 1.88 : 1.76;

  // 1. Sculpted beveled vehicle body silhouette (replaces stacked boxes)
  const bodyGeo = createVehicleProfileGeometry(kind);
  const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  group.add(bodyMesh);

  // Dark recessed underbody frame & wheel arch wells
  const underbody = new THREE.Mesh(
    createBeveledBoxGeometry(width - 0.24, 0.18, length - 0.35, 0.03, 0.04),
    mats.darkTrim
  );
  underbody.position.y = 0.28;
  group.add(underbody);

  // 2. Angled Glass Windshields & Side Cabin Glass
  if (kind === 'van') {
    const windshield = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.26, 0.64, 0.08, 0.015, 0.02),
      mats.glassDark
    );
    windshield.position.set(0, 1.46, 1.36);
    windshield.rotation.x = -0.44;
    group.add(windshield);

    const roofRack = new THREE.Mesh(
      createBeveledBoxGeometry(1.36, 0.08, 2.2, 0.02, 0.02),
      mats.darkTrim
    );
    roofRack.position.set(0, 1.98, -0.45);
    group.add(roofRack);
  } else if (kind === 'pickup') {
    const windshield = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.28, 0.58, 0.07, 0.015, 0.02),
      mats.glassDark
    );
    windshield.position.set(0, 1.34, 0.94);
    windshield.rotation.x = -0.48;

    const rearCabGlass = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.36, 0.42, 0.06, 0.01, 0.01),
      mats.glassDark
    );
    rearCabGlass.position.set(0, 1.38, -0.37);

    const bedFloor = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.34, 0.08, 1.54, 0.02, 0.02),
      mats.darkTrim
    );
    bedFloor.position.set(0, 0.99, -1.26);
    group.add(windshield, rearCabGlass, bedFloor);
  } else {
    const windshield = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.28, 0.56, 0.07, 0.015, 0.02),
      mats.glassDark
    );
    windshield.position.set(0, 1.22, 0.76);
    windshield.rotation.x = -0.74;

    const rearGlass = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.32, 0.54, 0.07, 0.015, 0.02),
      mats.glassDark
    );
    rearGlass.position.set(0, 1.22, -0.96);
    rearGlass.rotation.x = 0.72;

    const sideCabinGlass = new THREE.Mesh(
      createBeveledBoxGeometry(width - 0.1, 0.38, 1.4, 0.02, 0.03),
      mats.glassDark
    );
    sideCabinGlass.position.set(0, 1.22, -0.1);
    group.add(windshield, rearGlass, sideCabinGlass);

    if (kind === 'taxi') {
      const sign = new THREE.Mesh(
        createBeveledBoxGeometry(0.56, 0.18, 0.26, 0.03, 0.04),
        mats.barrierHazard
      );
      sign.position.set(0, 1.56, -0.08);
      group.add(sign);
    }
  }

  // 3. Sculpted Bumpers, Side Mirrors, Grille, Headlights & Exhaust Tailpipe
  const bumperParts: THREE.BufferGeometry[] = [];
  const fBump = createBeveledBoxGeometry(width + 0.04, 0.18, 0.18, 0.04, 0.05);
  fBump.translate(0, 0.38, length * 0.5 + 0.04);
  const rBump = createBeveledBoxGeometry(width + 0.04, 0.18, 0.18, 0.04, 0.05);
  rBump.translate(0, 0.38, -length * 0.5 - 0.04);
  const grille = createBeveledBoxGeometry(width * 0.48, 0.22, 0.08, 0.02, 0.03);
  grille.translate(0, 0.66, length * 0.5 - 0.01);
  // Side mirrors
  for (const mx of [-width * 0.5 - 0.08, width * 0.5 + 0.08]) {
    const mir = createBeveledBoxGeometry(0.14, 0.1, 0.12, 0.02, 0.03);
    mir.translate(mx, 1.06, 0.65);
    bumperParts.push(mir);
  }
  const tailpipe = new THREE.CylinderGeometry(0.04, 0.045, 0.28, 7);
  tailpipe.rotateX(Math.PI * 0.5);
  tailpipe.translate(-width * 0.32, 0.26, -length * 0.5 - 0.06);
  bumperParts.push(fBump, rBump, grille, tailpipe);

  group.add(new THREE.Mesh(mergeParts(bumperParts, false), mats.darkTrim));

  for (const sx of [-width * 0.35, width * 0.35]) {
    const hl = new THREE.Mesh(
      createBeveledBoxGeometry(0.24, 0.13, 0.07, 0.02, 0.03),
      mats.lampBulbDead
    );
    hl.position.set(sx, 0.68, length * 0.5 - 0.02);
    const tl = new THREE.Mesh(
      createBeveledBoxGeometry(0.22, 0.12, 0.07, 0.02, 0.03),
      mats.hydrantRed
    );
    tl.position.set(sx, 0.72, -length * 0.5 + 0.02);
    group.add(hl, tl);
  }

  // 4. Four grounded rubber tires with beveled alloy hubs
  const tireGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.24, 14);
  tireGeo.rotateZ(Math.PI * 0.5);
  const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.26, 10);
  rimGeo.rotateZ(Math.PI * 0.5);
  const wheelOffsets = [
    [-width * 0.45, 0.35, length * 0.31],
    [width * 0.45, 0.35, length * 0.31],
    [-width * 0.45, 0.35, -length * 0.31],
    [width * 0.45, 0.35, -length * 0.31],
  ];
  for (const [wx, wy, wz] of wheelOffsets) {
    const wheel = new THREE.Mesh(tireGeo, mats.tireRubber);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, mats.lampMetal);
    rim.position.set(wx, wy, wz);
    group.add(wheel, rim);
  }

  return group;
}

/**
 * Curved gooseneck street lamp with fluted Lathe pedestal & sculpted cobra hood.
 */
export function buildStreetLampModel(lit: boolean, mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const basePts = [
    new THREE.Vector2(0.26, 0),
    new THREE.Vector2(0.24, 0.18),
    new THREE.Vector2(0.18, 0.36),
    new THREE.Vector2(0.15, 0.65),
    new THREE.Vector2(0.11, 0.8),
  ];
  const base = new THREE.Mesh(new THREE.LatheGeometry(basePts, 10), mats.concrete);
  group.add(base);

  const polePts = [
    new THREE.Vector3(0, 0.72, 0),
    new THREE.Vector3(0, 4.45, 0),
    new THREE.Vector3(0, 5.05, 0.32),
    new THREE.Vector3(0, 5.14, 1.08),
  ];
  const pole = new THREE.Mesh(createTubePathGeometry(polePts, 0.068, 14, 8), mats.lampMetal);
  pole.castShadow = true;
  group.add(pole);

  const hood = new THREE.Mesh(
    createBeveledBoxGeometry(0.38, 0.14, 0.56, 0.035, 0.08),
    mats.darkTrim
  );
  hood.position.set(0, 5.14, 1.18);
  group.add(hood);

  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    lit ? mats.streetLampBulb : mats.lampBulbDead
  );
  bulb.scale.set(1, 0.55, 1.3);
  bulb.position.set(0, 5.04, 1.2);
  group.add(bulb);

  return group;
}

/**
 * Tapered trapezoidal steel dumpster with structural ribs, half-propped angled lid & casters.
 */
export function buildDumpsterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const greenSteel = new THREE.MeshStandardMaterial({
    color: 0x263b32,
    roughness: 0.72,
    metalness: 0.35,
  });

  // Tapered trapezoidal side profile extruded across width
  const binShape = new THREE.Shape();
  binShape.moveTo(-0.52, 0.12);
  binShape.lineTo(0.52, 0.12);
  binShape.lineTo(0.64, 1.24);
  binShape.lineTo(-0.64, 1.24);
  binShape.closePath();
  const binGeo = new THREE.ExtrudeGeometry(binShape, {
    depth: 1.88,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  binGeo.translate(0, 0, -0.94);
  binGeo.rotateY(Math.PI * 0.5);
  applyTriplanarUVs(binGeo, 0.5);

  const bin = new THREE.Mesh(binGeo, greenSteel);
  bin.castShadow = true;
  bin.receiveShadow = true;
  group.add(bin);

  // Structural vertical side ribs & side lift pockets
  const ribParts: THREE.BufferGeometry[] = [];
  const rim = createBeveledBoxGeometry(2.04, 0.1, 1.36, 0.02, 0.03);
  rim.translate(0, 1.24, 0);
  ribParts.push(rim);
  for (const rx of [-0.65, 0, 0.65]) {
    const rib = createBeveledBoxGeometry(0.08, 0.96, 1.26, 0.015, 0.01);
    rib.translate(rx, 0.7, 0);
    ribParts.push(rib);
  }
  const ribsMesh = new THREE.Mesh(mergeParts(ribParts, true, 0.5), mats.rustedMetal);
  group.add(ribsMesh);

  // Dual beveled hinged rubber lids (one propped slightly ajar!)
  const lidL = new THREE.Mesh(
    createBeveledBoxGeometry(0.92, 0.075, 1.26, 0.02, 0.03),
    mats.tireRubber
  );
  lidL.position.set(-0.48, 1.34, -0.03);
  lidL.rotation.set(-0.18, 0, 0.05);
  const lidR = new THREE.Mesh(
    createBeveledBoxGeometry(0.92, 0.075, 1.26, 0.02, 0.03),
    mats.tireRubber
  );
  lidR.position.set(0.48, 1.31, 0);
  group.add(lidL, lidR);

  // Caster feet
  const casterParts: THREE.BufferGeometry[] = [];
  for (const [cx, cz] of [
    [-0.75, 0.42],
    [0.75, 0.42],
    [-0.75, -0.42],
    [0.75, -0.42],
  ]) {
    const wheel = new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8);
    wheel.rotateZ(Math.PI * 0.5);
    wheel.translate(cx, 0.07, cz);
    casterParts.push(wheel);
  }
  group.add(new THREE.Mesh(mergeParts(casterParts, false), mats.darkTrim));

  return group;
}

/**
 * Slatted timber crate with recessed interior gaps, diagonal braces & metal corner brackets.
 */
export function buildCrateModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const woodParts: THREE.BufferGeometry[] = [];

  // Inner dark shadow core slightly recessed inside slatted plank walls
  const innerCore = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.84), mats.darkTrim);
  innerCore.position.y = 0.5;
  group.add(innerCore);

  // Slatted horizontal planks on all 4 sides + top lid planks
  for (const py of [0.22, 0.5, 0.78]) {
    const f = createBeveledBoxGeometry(0.96, 0.22, 0.05, 0.01, 0.01);
    f.translate(0, py, 0.46);
    const b = createBeveledBoxGeometry(0.96, 0.22, 0.05, 0.01, 0.01);
    b.translate(0, py, -0.46);
    const l = createBeveledBoxGeometry(0.05, 0.22, 0.96, 0.01, 0.01);
    l.translate(-0.46, py, 0);
    const r = createBeveledBoxGeometry(0.05, 0.22, 0.96, 0.01, 0.01);
    r.translate(0.46, py, 0);
    woodParts.push(f, b, l, r);
  }
  // Top lid slats
  for (const pz of [-0.3, 0, 0.3]) {
    const topP = createBeveledBoxGeometry(0.98, 0.05, 0.25, 0.01, 0.01);
    topP.translate(0, 0.96, pz);
    woodParts.push(topP);
  }
  // Diagonal cross-brace on front & back
  const diagF = createBeveledBoxGeometry(1.05, 0.1, 0.055, 0.01, 0.005);
  diagF.rotateZ(0.76);
  diagF.translate(0, 0.5, 0.48);
  const diagB = createBeveledBoxGeometry(1.05, 0.1, 0.055, 0.01, 0.005);
  diagB.rotateZ(-0.76);
  diagB.translate(0, 0.5, -0.48);
  woodParts.push(diagF, diagB);

  const woodMesh = new THREE.Mesh(mergeParts(woodParts, true, 0.7), mats.wood);
  woodMesh.castShadow = true;
  woodMesh.receiveShadow = true;
  group.add(woodMesh);

  // Corner metal angle posts
  const trimParts: THREE.BufferGeometry[] = [];
  for (const [cx, cz] of [
    [-0.47, -0.47],
    [0.47, -0.47],
    [-0.47, 0.47],
    [0.47, 0.47],
  ]) {
    const post = createBeveledBoxGeometry(0.09, 0.98, 0.09, 0.01, 0.01);
    post.translate(cx, 0.5, cz);
    trimParts.push(post);
  }
  group.add(new THREE.Mesh(mergeParts(trimParts, false), mats.darkTrim));

  return group;
}

export function buildTrashClusterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const bagOffsets = [
    { x: -0.28, z: -0.15, r: 0.34, sy: 0.85, seed: 11 },
    { x: 0.28, z: 0.12, r: 0.38, sy: 0.78, seed: 23 },
    { x: -0.04, z: 0.32, r: 0.28, sy: 0.9, seed: 37 },
  ];
  const bagParts: THREE.BufferGeometry[] = [];
  for (const b of bagOffsets) {
    const geo = createBoulderGeometry(b.r, b.seed, 1);
    geo.scale(1, b.sy, 1);
    geo.translate(b.x, 0.02, b.z);
    bagParts.push(geo);
  }
  const bags = new THREE.Mesh(mergeParts(bagParts, false), mats.trashBag);
  bags.castShadow = true;
  group.add(bags);

  // Tilted crushed wooden/cardboard crate beside bags
  const box = new THREE.Mesh(
    createBeveledBoxGeometry(0.46, 0.26, 0.38, 0.02, 0.02),
    mats.wood
  );
  box.position.set(0.32, 0.13, -0.28);
  box.rotation.set(0.08, 0.45, -0.16);
  box.castShadow = true;
  group.add(box);

  return group;
}

export function buildConcreteBarrierModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const shape = new THREE.Shape();
  shape.moveTo(-0.34, 0);
  shape.lineTo(0.34, 0);
  shape.lineTo(0.28, 0.22);
  shape.lineTo(0.14, 0.45);
  shape.lineTo(0.1, 0.95);
  shape.lineTo(-0.1, 0.95);
  shape.lineTo(-0.14, 0.45);
  shape.lineTo(-0.28, 0.22);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 2.2,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  geo.rotateY(Math.PI * 0.5);
  geo.translate(-1.1, 0, 0);
  applyTriplanarUVs(geo, 0.45);

  const mesh = new THREE.Mesh(geo, mats.concrete);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const stripe = new THREE.Mesh(
    createBeveledBoxGeometry(2.14, 0.14, 0.24, 0.015, 0.02),
    mats.barrierHazard
  );
  stripe.position.y = 0.82;
  group.add(stripe);

  return group;
}

/**
 * Fractured concrete slabs + jagged rock rubble + bent protruding steel rebar.
 */
export function buildRubblePileModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const concreteParts: THREE.BufferGeometry[] = [];
  const slabA = createFracturedSlabGeometry(1.15, 0.92, 0.16, 17);
  slabA.rotateZ(0.24);
  slabA.rotateY(0.4);
  slabA.translate(-0.15, 0.14, 0.08);
  concreteParts.push(slabA);

  const slabB = createFracturedSlabGeometry(0.85, 0.72, 0.14, 41);
  slabB.rotateX(-0.28);
  slabB.translate(0.38, 0.18, -0.2);
  concreteParts.push(slabB);

  const b1 = createBoulderGeometry(0.42, 71, 1);
  b1.translate(-0.42, 0.02, 0.26);
  const b2 = createBoulderGeometry(0.32, 93, 1);
  b2.translate(0.18, 0.02, -0.38);
  concreteParts.push(b1, b2);

  const pileMesh = new THREE.Mesh(mergeParts(concreteParts, true, 0.6), mats.concrete);
  pileMesh.castShadow = true;
  pileMesh.receiveShadow = true;
  group.add(pileMesh);

  // Bent rusted steel rebar jutting out of broken slab
  const rebarPts = [
    new THREE.Vector3(-0.2, 0.12, 0.1),
    new THREE.Vector3(0.05, 0.45, 0.02),
    new THREE.Vector3(0.28, 0.56, -0.14),
  ];
  const rebar = new THREE.Mesh(createTubePathGeometry(rebarPts, 0.018, 6, 5), mats.rustedMetal);
  group.add(rebar);

  return group;
}

export function buildShrubModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // Woody gnarled lower branches
  const stemParts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.4;
    const pts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.cos(a) * 0.18, 0.28, Math.sin(a) * 0.18),
      new THREE.Vector3(Math.cos(a) * 0.34, 0.5, Math.sin(a) * 0.34),
    ];
    stemParts.push(createTubePathGeometry(pts, 0.028, 5, 5));
  }
  group.add(new THREE.Mesh(mergeParts(stemParts, false), mats.barkWood));

  // Irregular multi-lobed perturbed foliage pads
  const leafParts: THREE.BufferGeometry[] = [];
  const blobs = [
    { x: 0, y: 0.45, z: 0, r: 0.56, seed: 51 },
    { x: -0.34, y: 0.32, z: 0.22, r: 0.42, seed: 62 },
    { x: 0.36, y: 0.34, z: -0.18, r: 0.44, seed: 73 },
  ];
  for (const b of blobs) {
    const g = createBoulderGeometry(b.r, b.seed, 1);
    g.scale(1.15, 0.78, 1.15);
    g.translate(b.x, b.y - 0.12, b.z);
    leafParts.push(g);
  }
  const foliageMesh = new THREE.Mesh(mergeParts(leafParts, false), mats.foliage);
  foliageMesh.castShadow = true;
  group.add(foliageMesh);
  return group;
}

export function buildHydrantModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const pts = [
    new THREE.Vector2(0.18, 0),
    new THREE.Vector2(0.18, 0.12),
    new THREE.Vector2(0.14, 0.18),
    new THREE.Vector2(0.14, 0.56),
    new THREE.Vector2(0.17, 0.6),
    new THREE.Vector2(0.15, 0.68),
    new THREE.Vector2(0.08, 0.76),
    new THREE.Vector2(0.0, 0.8),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 12), mats.hydrantRed);
  body.castShadow = true;
  group.add(body);

  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.38, 8),
    mats.darkTrim
  );
  nozzle.rotation.z = Math.PI * 0.5;
  nozzle.position.y = 0.48;
  group.add(nozzle);

  return group;
}

export function buildChainlinkFenceSegment(
  length: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const height = 2.15;

  const metalParts: THREE.BufferGeometry[] = [];
  const postCount = Math.max(2, Math.round(length / 3.0) + 1);
  for (let i = 0; i < postCount; i++) {
    const px = -length * 0.5 + (i / (postCount - 1)) * length;
    const post = new THREE.CylinderGeometry(0.045, 0.05, height, 6);
    post.translate(px, height * 0.5, 0);
    metalParts.push(post);
  }
  const topRail = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
  topRail.rotateZ(Math.PI * 0.5);
  topRail.translate(0, height - 0.05, 0);
  const midRail = new THREE.CylinderGeometry(0.025, 0.025, length, 6);
  midRail.rotateZ(Math.PI * 0.5);
  midRail.translate(0, height * 0.5, 0);
  metalParts.push(topRail, midRail);

  const frameMesh = new THREE.Mesh(mergeParts(metalParts, false), mats.lampMetal);
  frameMesh.castShadow = true;
  group.add(frameMesh);

  const meshMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    transparent: true,
    opacity: 0.35,
    side: THREE.DoubleSide,
    roughness: 0.6,
    metalness: 0.5,
    wireframe: true,
  });
  const panel = new THREE.Mesh(
    new THREE.PlaneGeometry(length, height - 0.15, Math.max(4, Math.round(length * 2)), 4),
    meshMat
  );
  panel.position.y = height * 0.5;
  group.add(panel);

  return group;
}

export function buildWoodFenceSegment(
  length: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const height = 1.9;

  const postParts: THREE.BufferGeometry[] = [];
  const postCount = Math.max(2, Math.round(length / 2.5) + 1);
  for (let i = 0; i < postCount; i++) {
    const px = -length * 0.5 + (i / (postCount - 1)) * length;
    const post = createBeveledBoxGeometry(0.12, height + 0.08, 0.12, 0.015, 0.01);
    post.translate(px, (height + 0.08) * 0.5, 0);
    postParts.push(post);
  }
  const postsMesh = new THREE.Mesh(mergeParts(postParts, false), mats.darkTrim);
  postsMesh.castShadow = true;
  group.add(postsMesh);

  // Vertical fence pickets & horizontal rails instead of 1 big flat board
  const woodParts: THREE.BufferGeometry[] = [];
  for (const ry of [0.45, 1.42]) {
    const rail = createBeveledBoxGeometry(length, 0.08, 0.06, 0.01, 0.005);
    rail.translate(0, ry, -0.02);
    woodParts.push(rail);
  }
  const picketCount = Math.max(4, Math.round(length / 0.28));
  const step = length / picketCount;
  for (let i = 0; i < picketCount; i++) {
    const px = -length * 0.5 + (i + 0.5) * step;
    const ph = height - 0.12 - (i % 3 === 0 ? 0.07 : 0);
    const picket = createBeveledBoxGeometry(step * 0.88, ph, 0.045, 0.008, 0.005);
    picket.translate(px, ph * 0.5 + 0.05, 0.03);
    woodParts.push(picket);
  }
  const fenceWood = new THREE.Mesh(mergeParts(woodParts, true, 0.7), mats.wood);
  fenceWood.castShadow = true;
  fenceWood.receiveShadow = true;
  group.add(fenceWood);

  return group;
}

export function buildStreetSignpostModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 3.3, 8), mats.lampMetal);
  pole.position.y = 1.65;
  pole.castShadow = true;
  const finial = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), mats.lampMetal);
  finial.position.y = 3.32;
  group.add(pole, finial);

  const bladeMain = new THREE.Mesh(
    createBeveledBoxGeometry(1.15, 0.28, 0.05, 0.01, 0.015),
    mats.signMainBlvd
  );
  bladeMain.position.set(0.32, 3.05, 0);
  group.add(bladeMain);

  const bladeCentral = new THREE.Mesh(
    createBeveledBoxGeometry(1.15, 0.28, 0.05, 0.01, 0.015),
    mats.signCentralAve
  );
  bladeCentral.position.set(0, 2.75, 0.32);
  bladeCentral.rotation.y = Math.PI * 0.5;
  group.add(bladeCentral);

  const bladeDirEW = new THREE.Mesh(
    createBeveledBoxGeometry(1.65, 0.28, 0.05, 0.01, 0.015),
    mats.signDistrictNorth
  );
  bladeDirEW.position.set(0, 2.38, 0);
  group.add(bladeDirEW);

  const bladeDirNS = new THREE.Mesh(
    createBeveledBoxGeometry(1.65, 0.28, 0.05, 0.01, 0.015),
    mats.signDistrictCross
  );
  bladeDirNS.position.set(0, 2.06, 0);
  bladeDirNS.rotation.y = Math.PI * 0.5;
  group.add(bladeDirNS);

  return group;
}

/**
 * Open tubular wire-frame shopping cart (eliminates solid cube basket).
 */
export function buildShoppingCartModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const metalParts: THREE.BufferGeometry[] = [];

  // Base tubular chassis & upright rear push posts
  const basePts = [
    new THREE.Vector3(-0.26, 0.16, -0.4),
    new THREE.Vector3(-0.24, 0.16, 0.38),
    new THREE.Vector3(0.24, 0.16, 0.38),
    new THREE.Vector3(0.26, 0.16, -0.4),
  ];
  metalParts.push(createTubePathGeometry(basePts, 0.02, 8, 6));

  for (const px of [-0.26, 0.26]) {
    const legPts = [
      new THREE.Vector3(px, 0.16, -0.38),
      new THREE.Vector3(px, 0.52, -0.38),
      new THREE.Vector3(px, 0.94, -0.45),
    ];
    metalParts.push(createTubePathGeometry(legPts, 0.018, 6, 5));
  }

  // Open wire-frame tapered basket rails (top rim, mid rim, bottom rim + vertical ribs)
  for (const [ry, bw, bl] of [
    [0.44, 0.52, 0.72],
    [0.64, 0.56, 0.78],
    [0.84, 0.6, 0.84],
  ]) {
    const hw = bw * 0.5;
    const hl = bl * 0.5;
    const f = new THREE.CylinderGeometry(0.011, 0.011, bw, 5);
    f.rotateZ(Math.PI * 0.5);
    f.translate(0, ry, hl + 0.02);
    const b = f.clone();
    b.translate(0, 0, -bl);
    const l = new THREE.CylinderGeometry(0.011, 0.011, bl, 5);
    l.rotateX(Math.PI * 0.5);
    l.translate(-hw, ry, 0.02);
    const r = l.clone();
    r.translate(bw, 0, 0);
    metalParts.push(f, b, l, r);
  }
  // Vertical basket ribs
  for (const rx of [-0.28, -0.14, 0, 0.14, 0.28]) {
    for (const rz of [-0.36, 0.38]) {
      const rib = new THREE.CylinderGeometry(0.009, 0.009, 0.42, 4);
      rib.translate(rx, 0.64, rz);
      metalParts.push(rib);
    }
  }
  for (const rz of [-0.2, 0, 0.2]) {
    for (const rx of [-0.28, 0.28]) {
      const rib = new THREE.CylinderGeometry(0.009, 0.009, 0.42, 4);
      rib.translate(rx, 0.64, rz);
      metalParts.push(rib);
    }
  }

  const cartFrame = new THREE.Mesh(mergeParts(metalParts, false), mats.lampMetal);
  cartFrame.castShadow = true;
  group.add(cartFrame);

  // Rear red push handle
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.58, 8),
    mats.hydrantRed
  );
  handle.rotation.z = Math.PI * 0.5;
  handle.position.set(0, 0.94, -0.45);
  group.add(handle);

  // 4 caster wheels
  const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
  wheelGeo.rotateZ(Math.PI * 0.5);
  for (const [wx, wz] of [
    [-0.25, -0.36],
    [0.25, -0.36],
    [-0.23, 0.36],
    [0.23, 0.36],
  ]) {
    const w = new THREE.Mesh(wheelGeo, mats.tireRubber);
    w.position.set(wx, 0.06, wz);
    group.add(w);
  }

  return group;
}

export function buildHazardConeClusterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const baseGeo = createBeveledBoxGeometry(0.34, 0.045, 0.34, 0.01, 0.04);
  const coneGeo = new THREE.ConeGeometry(0.14, 0.52, 10);

  const offsets = [
    { x: -0.35, z: -0.1, tilt: 0 },
    { x: 0.3, z: 0.22, tilt: 0.14 },
  ];
  for (const o of offsets) {
    const sub = new THREE.Group();
    const base = new THREE.Mesh(baseGeo, mats.tireRubber);
    base.position.y = 0.022;
    const cone = new THREE.Mesh(coneGeo, mats.safetyOrange);
    cone.position.y = 0.28;
    cone.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 10), mats.lampBulbDead);
    band.position.y = 0.34;
    sub.add(base, cone, band);
    sub.position.set(o.x, 0, o.z);
    sub.rotation.z = o.tilt;
    group.add(sub);
  }
  return group;
}

export function buildQuarantineSignModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const postParts: THREE.BufferGeometry[] = [];
  for (const px of [-0.78, 0.78]) {
    const post = new THREE.CylinderGeometry(0.04, 0.045, 1.9, 6);
    post.translate(px, 0.95, 0);
    const foot = createBeveledBoxGeometry(0.24, 0.06, 0.38, 0.01, 0.02);
    foot.translate(px, 0.03, 0);
    postParts.push(post, foot);
  }
  group.add(new THREE.Mesh(mergeParts(postParts, false), mats.darkTrim));

  const board = new THREE.Mesh(
    createBeveledBoxGeometry(1.75, 0.64, 0.07, 0.015, 0.02),
    mats.signQuarantine
  );
  board.position.set(0, 1.56, 0);
  board.castShadow = true;
  const bar = new THREE.Mesh(
    createBeveledBoxGeometry(1.78, 0.16, 0.06, 0.01, 0.015),
    mats.hazardStripe
  );
  bar.position.set(0, 0.9, 0);

  group.add(board, bar);
  return group;
}

/**
 * Pillowed bulging cloth sandbags stacked in offset courses.
 */
export function buildSandbagBarricadeModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const bagGeo = createSandbagGeometry(0.58, 0.18, 0.34);
  const bagParts: THREE.BufferGeometry[] = [];

  for (let row = 0; row < 3; row++) {
    const count = 4 - (row % 2);
    for (let i = 0; i < count; i++) {
      const bx = (i - (count - 1) * 0.5) * 0.54;
      const g = bagGeo.clone();
      g.rotateY((i % 2 === 0 ? 1 : -1) * 0.05);
      g.translate(bx, row * 0.15, (row % 2) * 0.035);
      bagParts.push(g);
    }
  }
  bagGeo.dispose();

  const mesh = new THREE.Mesh(mergeParts(bagParts, true, 1.0), mats.sandbag);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return group;
}

/**
 * Draped catenary survivor tarp shelter + rolled sleeping bag + boulder stone fire ring + charred logs.
 */
export function buildSurvivorCampModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // Rolled cylindrical sleeping pad & plump pillow
  const bagRoll = new THREE.Mesh(
    createBeveledBoxGeometry(0.84, 0.1, 1.72, 0.035, 0.08),
    mats.tarpBlue
  );
  bagRoll.position.set(-0.35, 0.05, 0);
  bagRoll.castShadow = true;
  const pillow = new THREE.Mesh(
    createBeveledBoxGeometry(0.52, 0.12, 0.32, 0.04, 0.08),
    mats.concrete
  );
  pillow.position.set(-0.35, 0.12, -0.62);
  group.add(bagRoll, pillow);

  // Wooden ridge poles + draped catenary tarp canopy
  const poleParts: THREE.BufferGeometry[] = [];
  for (const pz of [-0.78, 0.78]) {
    const upright = new THREE.CylinderGeometry(0.03, 0.034, 1.28, 6);
    upright.translate(-0.35, 0.64, pz);
    poleParts.push(upright);
  }
  const ridgePole = new THREE.CylinderGeometry(0.025, 0.025, 1.75, 6);
  ridgePole.rotateX(Math.PI * 0.5);
  ridgePole.translate(-0.35, 1.24, 0);
  poleParts.push(ridgePole);
  group.add(new THREE.Mesh(mergeParts(poleParts, false), mats.wood));

  const tarp = new THREE.Mesh(createDrapedTarpGeometry(1.75, 1.9, 1.22), mats.tarpBlue);
  tarp.position.set(-0.35, 0, 0);
  tarp.castShadow = true;
  group.add(tarp);

  // Stone-ring campfire + crossed charred firewood logs
  const stoneParts: THREE.BufferGeometry[] = [];
  const stones = 8;
  for (let i = 0; i < stones; i++) {
    const a = (i / stones) * Math.PI * 2;
    const stone = createBoulderGeometry(0.11, 200 + i * 17, 0);
    stone.translate(0.68 + Math.cos(a) * 0.34, 0.0, 0.25 + Math.sin(a) * 0.34);
    stoneParts.push(stone);
  }
  group.add(new THREE.Mesh(mergeParts(stoneParts, true, 1.0), mats.mossRock));

  const logParts: THREE.BufferGeometry[] = [];
  for (const rotY of [-0.45, 0.55, 1.4]) {
    const log = new THREE.CylinderGeometry(0.04, 0.048, 0.48, 6);
    log.rotateZ(Math.PI * 0.44);
    log.rotateY(rotY);
    log.translate(0.68, 0.08, 0.25);
    logParts.push(log);
  }
  group.add(new THREE.Mesh(mergeParts(logParts, true, 1.0), mats.barkWood));

  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.26, 0.04, 8), mats.rustedMetal);
  ash.position.set(0.68, 0.03, 0.25);
  group.add(ash);

  return group;
}

export function buildGroundDecalModel(
  kind: 'blood_scuffle' | 'oil_slick',
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const mat = kind === 'blood_scuffle' ? mats.bloodStain : mats.oilSlick;
  const seed = kind === 'blood_scuffle' ? 401 : 509;
  const main = new THREE.Mesh(createOrganicPatchGeometry(1.15, 0.85, seed, 12), mat);
  main.position.y = 0.015;
  group.add(main);

  const sub = new THREE.Mesh(createOrganicPatchGeometry(0.5, 0.42, seed + 19, 9), mat);
  sub.position.set(0.75, 0.015, 0.35);
  group.add(sub);

  return group;
}

/**
 * Stratified jagged rock boulder cluster for perimeter hills, roadside outcrops & parks.
 */
export function buildBoulderClusterModel(
  seed: number,
  scale: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const parts: THREE.BufferGeometry[] = [];

  const main = createBoulderGeometry(0.85 * scale, seed, 1);
  parts.push(main);

  const subA = createBoulderGeometry(0.5 * scale, seed + 29, 1);
  subA.translate(0.68 * scale, -0.02, 0.36 * scale);
  parts.push(subA);

  const subB = createBoulderGeometry(0.42 * scale, seed + 53, 1);
  subB.translate(-0.56 * scale, -0.02, -0.38 * scale);
  parts.push(subB);

  const rockMesh = new THREE.Mesh(mergeParts(parts, true, 0.55), mats.mossRock);
  rockMesh.castShadow = true;
  rockMesh.receiveShadow = true;
  group.add(rockMesh);
  return group;
}
