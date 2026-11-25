import * as THREE from 'three';
import { ProceduralTextureSet } from '../textures/proceduralTextures';

export interface MaterialPalette {
  brick: THREE.MeshStandardMaterial;
  concrete: THREE.MeshStandardMaterial;
  darkTrim: THREE.MeshStandardMaterial;
  roofTar: THREE.MeshStandardMaterial;
  rustedMetal: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
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
    roughness: 0.88,
    metalness: 0.04,
  });
  const concrete = new THREE.MeshStandardMaterial({
    map: textures.concreteWall,
    roughness: 0.9,
    metalness: 0.05,
  });
  const darkTrim = new THREE.MeshStandardMaterial({
    color: 0x22262e,
    roughness: 0.65,
    metalness: 0.35,
  });
  const roofTar = new THREE.MeshStandardMaterial({
    color: 0x1d2026,
    roughness: 0.95,
    metalness: 0.02,
  });
  const rustedMetal = new THREE.MeshStandardMaterial({
    map: textures.rustedMetal,
    roughness: 0.72,
    metalness: 0.45,
  });
  const wood = new THREE.MeshStandardMaterial({
    map: textures.woodPlank,
    roughness: 0.86,
    metalness: 0.02,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x16181c,
    roughness: 0.92,
    metalness: 0.05,
  });
  const glassDark = new THREE.MeshStandardMaterial({
    color: 0x101720,
    roughness: 0.16,
    metalness: 0.25,
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
    roughness: 0.85,
    metalness: 0.04,
  });
  const lampMetal = new THREE.MeshStandardMaterial({
    color: 0x3b424c,
    roughness: 0.42,
    metalness: 0.78,
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
    color: 0x334155,
    roughness: 0.4,
    metalness: 0.2,
  });
  const trashBag = new THREE.MeshStandardMaterial({
    color: 0x1b2026,
    roughness: 0.38,
    metalness: 0.08,
  });
  const foliage = new THREE.MeshStandardMaterial({
    color: 0x344732,
    roughness: 0.9,
    metalness: 0.0,
  });
  const hydrantRed = new THREE.MeshStandardMaterial({
    color: 0x8b2626,
    roughness: 0.55,
    metalness: 0.35,
  });
  const barrierHazard = new THREE.MeshStandardMaterial({
    color: 0xc2781a,
    roughness: 0.75,
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

  // 1. Primary building hull (brick)
  const hull = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats.brick);
  hull.position.y = h * 0.5;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 2. Concrete foundation plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.28, 0.35, d + 0.28),
    mats.concrete
  );
  plinth.position.y = 0.175;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 3. Parapet roof cap & recessed tar slab
  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.35, 0.45, d + 0.35),
    mats.darkTrim
  );
  parapet.position.y = h + 0.22;
  parapet.castShadow = true;
  group.add(parapet);

  const roofPad = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.6, 0.12, d - 0.6),
    mats.roofTar
  );
  roofPad.position.y = h + 0.44;
  group.add(roofPad);

  // 4. Rooftop HVAC unit
  const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 1.4), mats.rustedMetal);
  hvac.position.set(-w * 0.25, h + 0.9, -d * 0.15);
  group.add(hvac);

  // 5. Storefront facing +Z (south side)
  const frontZ = d * 0.5;
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.55, 0.18), mats.darkTrim);
  doorFrame.position.set(0, 1.28, frontZ + 0.04);
  group.add(doorFrame);

  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.36, 2.35, 0.14), mats.wood);
  doorLeaf.position.set(0, 1.2, frontZ + 0.08);
  group.add(doorLeaf);

  // 6. Warm glowing storefront windows flanking the door
  const winGeo = new THREE.BoxGeometry(2.6, 1.85, 0.12);
  const winLeft = new THREE.Mesh(winGeo, mats.warmWindow);
  winLeft.position.set(-w * 0.27, 1.65, frontZ + 0.05);
  group.add(winLeft);

  const winRight = new THREE.Mesh(winGeo, mats.warmWindow);
  winRight.position.set(w * 0.27, 1.65, frontZ + 0.05);
  group.add(winRight);

  // 7. Striped storefront awning
  const awningMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w - 1.2, 0.16, 1.9),
    mats.awning
  );
  awningMesh.position.set(0, 3.05, frontZ + 0.85);
  awningMesh.rotation.x = 0.22;
  awningMesh.castShadow = true;
  group.add(awningMesh);

  // 8. LAST SHOP illuminated signboard
  const signMesh = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.25, 0.2), mats.shopSign);
  signMesh.position.set(0, 4.1, frontZ + 0.14);
  group.add(signMesh);

  // 9. Porch lantern housing above door
  const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mats.lampBulbLit);
  lantern.position.set(0, 2.75, frontZ + 0.35);
  group.add(lantern);

  return group;
}

export function buildUrbanBuildingModel(
  opts: BuildingBuildOptions,
  mats: MaterialPalette
): THREE.Group {
  const { w, h, d, style, doorSide } = opts;
  const group = new THREE.Group();

  const wallMat =
    style === 'apartment' || style === 'diner' ? mats.brick : mats.concrete;

  // 1. Main massing
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
  body.position.y = h * 0.5;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // 2. Foundation plinth
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.24, 0.32, d + 0.24),
    mats.darkTrim
  );
  plinth.position.y = 0.16;
  plinth.receiveShadow = true;
  group.add(plinth);

  // 3. Cornice / parapet cap
  const cornice = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.32, 0.38, d + 0.32),
    mats.darkTrim
  );
  cornice.position.y = h + 0.18;
  cornice.castShadow = true;
  group.add(cornice);

  // 4. Rooftop AC / vent box
  const vent = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.8, 1.5), mats.rustedMetal);
  vent.position.set(w * 0.2, h + 0.72, -d * 0.15);
  group.add(vent);

  // 5. Recessed dark / boarded windows along front/back faces
  const floors = Math.max(1, Math.floor(h / 3.4));
  const cols = Math.max(2, Math.floor(w / 3.2));
  const winGeo = new THREE.BoxGeometry(1.3, 1.45, 0.12);
  const plankGeo = new THREE.BoxGeometry(1.42, 0.24, 0.16);

  for (let f = 0; f < floors; f++) {
    const wy = 2.0 + f * 3.2;
    if (wy + 1.0 > h) break;
    for (let c = 0; c < cols; c++) {
      const wx = -w * 0.5 + ((c + 0.5) / cols) * w;
      const winFront = new THREE.Mesh(winGeo, mats.glassDark);
      winFront.position.set(wx, wy, d * 0.5 + 0.02);
      group.add(winFront);

      // Board up ground-floor windows on abandoned buildings
      if (f === 0 && (c + f) % 2 === 0) {
        const plank = new THREE.Mesh(plankGeo, mats.wood);
        plank.position.set(wx, wy, d * 0.5 + 0.08);
        plank.rotation.z = c % 2 === 0 ? 0.1 : -0.08;
        group.add(plank);
      }
    }
  }

  // 6. Entry doorway on designated side
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.35, 0.16), mats.darkTrim);
  if (doorSide === 'south') {
    door.position.set(0, 1.18, d * 0.5 + 0.05);
  } else if (doorSide === 'north') {
    door.position.set(0, 1.18, -d * 0.5 - 0.05);
  } else if (doorSide === 'east') {
    door.rotation.y = Math.PI * 0.5;
    door.position.set(w * 0.5 + 0.05, 1.18, 0);
  } else {
    door.rotation.y = Math.PI * 0.5;
    door.position.set(-w * 0.5 - 0.05, 1.18, 0);
  }
  group.add(door);

  // 7. Garage bay door or diner awning + Landmark Fascia Signboards
  if (style === 'garage') {
    const bay = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.7, 0.18), mats.rustedMetal);
    bay.position.set(w * 0.2, 1.35, -d * 0.5 - 0.04);
    group.add(bay);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.05, 0.16), mats.signRedlineAuto);
    sign.position.set(0, h - 0.8, -d * 0.5 - 0.1);
    sign.rotation.y = Math.PI;
    group.add(sign);
  } else if (style === 'diner') {
    const trim = new THREE.Mesh(new THREE.BoxGeometry(w + 0.25, 0.25, d + 0.25), mats.hydrantRed);
    trim.position.y = h - 0.25;
    group.add(trim);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 0.16), mats.signStarlightDiner);
    sign.position.set(0, h - 0.9, -d * 0.5 - 0.1);
    sign.rotation.y = Math.PI;
    group.add(sign);
  } else if (style === 'apartment' && w < 14) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 0.16), mats.signMercerFlats);
    sign.position.set(0, 3.35, d * 0.5 + 0.1);
    group.add(sign);
  }

  return group;
}

export function buildVehicleModel(
  kind: 'sedan' | 'taxi' | 'pickup' | 'van',
  colorHex: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.62,
    metalness: 0.35,
  });

  const length = kind === 'van' ? 4.6 : kind === 'pickup' ? 4.4 : 4.1;
  const width = kind === 'van' ? 1.95 : 1.82;

  // 1. Lower chassis
  const chassisH = kind === 'pickup' ? 0.72 : 0.65;
  const chassis = new THREE.Mesh(
    new THREE.BoxGeometry(width, chassisH, length),
    bodyMat
  );
  chassis.position.y = 0.28 + chassisH * 0.5;
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  group.add(chassis);

  // 2. Cabin / Van upper body
  if (kind === 'van') {
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 0.95, length - 0.55),
      bodyMat
    );
    upper.position.set(0, 0.28 + chassisH + 0.45, -0.18);
    upper.castShadow = true;
    group.add(upper);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.24, 0.68, 0.14),
      mats.glassDark
    );
    windshield.position.set(0, 1.36, length * 0.5 - 0.35);
    windshield.rotation.x = -0.25;
    group.add(windshield);
  } else if (kind === 'pickup') {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.1, 0.72, 1.55),
      bodyMat
    );
    cab.position.set(0, 0.28 + chassisH + 0.35, 0.35);
    cab.castShadow = true;
    group.add(cab);

    const bed = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.24, 0.12, 1.65),
      mats.darkTrim
    );
    bed.position.set(0, 0.28 + chassisH - 0.04, -1.28);
    group.add(bed);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.28, 0.55, 0.1),
      mats.glassDark
    );
    windshield.position.set(0, 1.28, 1.15);
    windshield.rotation.x = -0.38;
    group.add(windshield);
  } else {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.14, 0.62, 2.05),
      bodyMat
    );
    cabin.position.set(0, 0.28 + chassisH + 0.3, -0.1);
    cabin.castShadow = true;
    group.add(cabin);

    const windshield = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.28, 0.5, 0.1),
      mats.glassDark
    );
    windshield.position.set(0, 1.2, 0.96);
    windshield.rotation.x = -0.48;
    group.add(windshield);

    const rearGlass = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.3, 0.45, 0.1),
      mats.glassDark
    );
    rearGlass.position.set(0, 1.2, -1.16);
    rearGlass.rotation.x = 0.5;
    group.add(rearGlass);

    if (kind === 'taxi') {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.2, 0.28),
        mats.barrierHazard
      );
      sign.position.set(0, 1.65, 0.1);
      group.add(sign);
    }
  }

  // 3. Front & rear bumpers
  const bumperGeo = new THREE.BoxGeometry(width + 0.06, 0.18, 0.16);
  const frontBumper = new THREE.Mesh(bumperGeo, mats.darkTrim);
  frontBumper.position.set(0, 0.36, length * 0.5 + 0.05);
  group.add(frontBumper);

  const rearBumper = new THREE.Mesh(bumperGeo, mats.darkTrim);
  rearBumper.position.set(0, 0.36, -length * 0.5 - 0.05);
  group.add(rearBumper);

  // 4. Four grounded wheels
  const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12);
  wheelGeo.rotateZ(Math.PI * 0.5);
  const wheelOffsets = [
    [-width * 0.47, 0.34, length * 0.31],
    [width * 0.47, 0.34, length * 0.31],
    [-width * 0.47, 0.34, -length * 0.31],
    [width * 0.47, 0.34, -length * 0.31],
  ];
  for (const [wx, wy, wz] of wheelOffsets) {
    const wheel = new THREE.Mesh(wheelGeo, mats.tireRubber);
    wheel.position.set(wx, wy, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }

  return group;
}

export function buildStreetLampModel(lit: boolean, mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // 1. Concrete base collar
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 0.45, 8),
    mats.concrete
  );
  base.position.y = 0.225;
  group.add(base);

  // 2. Tapered steel pole
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.1, 4.9, 8),
    mats.lampMetal
  );
  pole.position.y = 2.65;
  pole.castShadow = true;
  group.add(pole);

  // 3. Angled arm
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.35), mats.lampMetal);
  arm.position.set(0, 5.05, 0.6);
  arm.rotation.x = -0.1;
  group.add(arm);

  // 4. Lamp hood housing
  const hood = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.55), mats.darkTrim);
  hood.position.set(0, 5.1, 1.2);
  group.add(hood);

  // 5. Bulb lens
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 8, 6),
    lit ? mats.streetLampBulb : mats.lampBulbDead
  );
  bulb.scale.y = 0.6;
  bulb.position.set(0, 5.01, 1.2);
  group.add(bulb);

  return group;
}

export function buildDumpsterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const greenSteel = new THREE.MeshStandardMaterial({
    color: 0x263b32,
    roughness: 0.72,
    metalness: 0.35,
  });

  // 1. Main steel bin
  const bin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.15, 1.25), greenSteel);
  bin.position.y = 0.66;
  bin.castShadow = true;
  bin.receiveShadow = true;
  group.add(bin);

  // 2. Rim collar
  const rim = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.1, 1.36), mats.rustedMetal);
  rim.position.y = 1.24;
  group.add(rim);

  // 3. Dual hinged lids
  const lidGeo = new THREE.BoxGeometry(0.92, 0.08, 1.26);
  const lidL = new THREE.Mesh(lidGeo, mats.tireRubber);
  lidL.position.set(-0.48, 1.32, 0);
  lidL.rotation.z = 0.06;
  group.add(lidL);

  const lidR = new THREE.Mesh(lidGeo, mats.tireRubber);
  lidR.position.set(0.48, 1.32, 0);
  group.add(lidR);

  // 4. Skids
  const skidGeo = new THREE.BoxGeometry(1.75, 0.1, 0.16);
  const skid1 = new THREE.Mesh(skidGeo, mats.darkTrim);
  skid1.position.set(0, 0.05, 0.44);
  group.add(skid1);
  const skid2 = new THREE.Mesh(skidGeo, mats.darkTrim);
  skid2.position.set(0, 0.05, -0.44);
  group.add(skid2);

  return group;
}

export function buildCrateModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const core = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.96, 0.96), mats.wood);
  core.position.y = 0.5;
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  const frameTop = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 1.04), mats.darkTrim);
  frameTop.position.y = 0.96;
  group.add(frameTop);

  const frameBot = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.1, 1.04), mats.darkTrim);
  frameBot.position.y = 0.05;
  group.add(frameBot);

  return group;
}

export function buildTrashClusterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const bagOffsets = [
    { x: -0.28, z: -0.15, r: 0.34, sy: 0.9 },
    { x: 0.28, z: 0.12, r: 0.38, sy: 0.82 },
    { x: -0.04, z: 0.32, r: 0.28, sy: 0.95 },
  ];
  for (const b of bagOffsets) {
    const bag = new THREE.Mesh(new THREE.DodecahedronGeometry(b.r, 0), mats.trashBag);
    bag.scale.set(1, b.sy, 1);
    bag.position.set(b.x, b.r * b.sy * 0.85, b.z);
    bag.castShadow = true;
    group.add(bag);
  }

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.38), mats.wood);
  box.position.set(0.32, 0.14, -0.28);
  box.rotation.y = 0.45;
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

  const mesh = new THREE.Mesh(geo, mats.concrete);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.16, 0.14, 0.24), mats.barrierHazard);
  stripe.position.y = 0.82;
  group.add(stripe);

  return group;
}

export function buildRubblePileModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const chunks = [
    { x: 0, y: 0.25, z: 0, s: 0.65 },
    { x: -0.45, y: 0.18, z: 0.28, s: 0.45 },
    { x: 0.48, y: 0.2, z: -0.18, s: 0.48 },
    { x: 0.12, y: 0.15, z: -0.42, s: 0.36 },
  ];
  for (const c of chunks) {
    const chunk = new THREE.Mesh(new THREE.DodecahedronGeometry(c.s, 0), mats.concrete);
    chunk.scale.set(1.2, 0.65, 1.0);
    chunk.position.set(c.x, c.y, c.z);
    chunk.rotation.set(c.x, c.z, 0.3);
    chunk.castShadow = true;
    chunk.receiveShadow = true;
    group.add(chunk);
  }

  return group;
}

export function buildShrubModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const blobs = [
    { x: 0, y: 0.45, z: 0, r: 0.58 },
    { x: -0.35, y: 0.32, z: 0.22, r: 0.4 },
    { x: 0.36, y: 0.34, z: -0.18, r: 0.42 },
  ];
  for (const b of blobs) {
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(b.r, 0), mats.foliage);
    m.position.set(b.x, b.y, b.z);
    m.castShadow = true;
    group.add(m);
  }
  return group;
}

export function buildHydrantModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.72, 10),
    mats.hydrantRed
  );
  body.position.y = 0.36;
  body.castShadow = true;
  group.add(body);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mats.hydrantRed);
  cap.position.y = 0.72;
  group.add(cap);

  const nozzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, 0.36, 8),
    mats.darkTrim
  );
  nozzle.rotation.z = Math.PI * 0.5;
  nozzle.position.y = 0.52;
  group.add(nozzle);

  return group;
}

export function buildChainlinkFenceSegment(
  length: number,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const height = 2.15;

  const postCount = Math.max(2, Math.round(length / 3.0) + 1);
  const postGeo = new THREE.CylinderGeometry(0.045, 0.045, height, 6);
  for (let i = 0; i < postCount; i++) {
    const px = -length * 0.5 + (i / (postCount - 1)) * length;
    const post = new THREE.Mesh(postGeo, mats.lampMetal);
    post.position.set(px, height * 0.5, 0);
    post.castShadow = true;
    group.add(post);
  }

  // Top & mid rails
  const railGeo = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
  railGeo.rotateZ(Math.PI * 0.5);
  const topRail = new THREE.Mesh(railGeo, mats.lampMetal);
  topRail.position.y = height - 0.05;
  group.add(topRail);

  const midRail = new THREE.Mesh(railGeo, mats.lampMetal);
  midRail.position.y = height * 0.5;
  group.add(midRail);

  // Subtle translucent wire mesh panel
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

  const postCount = Math.max(2, Math.round(length / 2.5) + 1);
  const postGeo = new THREE.BoxGeometry(0.12, height, 0.12);
  for (let i = 0; i < postCount; i++) {
    const px = -length * 0.5 + (i / (postCount - 1)) * length;
    const post = new THREE.Mesh(postGeo, mats.darkTrim);
    post.position.set(px, height * 0.5, 0);
    post.castShadow = true;
    group.add(post);
  }

  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(length, height - 0.15, 0.08),
    mats.wood
  );
  panel.position.y = height * 0.5;
  panel.castShadow = true;
  panel.receiveShadow = true;
  group.add(panel);

  return group;
}

export function buildStreetSignpostModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 3.25, 8), mats.lampMetal);
  pole.position.y = 1.625;
  pole.castShadow = true;
  group.add(pole);

  const bladeMain = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.05), mats.signMainBlvd);
  bladeMain.position.set(0.32, 3.05, 0);
  group.add(bladeMain);

  const bladeCentral = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.28, 0.05), mats.signCentralAve);
  bladeCentral.position.set(0, 2.75, 0.32);
  bladeCentral.rotation.y = Math.PI * 0.5;
  group.add(bladeCentral);

  const bladeDirEW = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.05), mats.signDistrictNorth);
  bladeDirEW.position.set(0, 2.38, 0);
  group.add(bladeDirEW);

  const bladeDirNS = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.28, 0.05), mats.signDistrictCross);
  bladeDirNS.position.set(0, 2.06, 0);
  bladeDirNS.rotation.y = Math.PI * 0.5;
  group.add(bladeDirNS);

  return group;
}

export function buildShoppingCartModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // Base frame + 4 small wheels
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.9), mats.lampMetal);
  frame.position.y = 0.18;
  group.add(frame);

  const wheelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 8);
  wheelGeo.rotateZ(Math.PI * 0.5);
  for (const [wx, wz] of [
    [-0.26, -0.36],
    [0.26, -0.36],
    [-0.26, 0.36],
    [0.26, 0.36],
  ]) {
    const w = new THREE.Mesh(wheelGeo, mats.tireRubber);
    w.position.set(wx, 0.06, wz);
    group.add(w);
  }

  // Basket walls (lightweight wire look via dark metallic slats)
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.44, 0.82), mats.lampMetal);
  basket.position.set(0, 0.64, 0.02);
  basket.castShadow = true;
  group.add(basket);

  // Rear push bar
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.66, 8), mats.hydrantRed);
  handle.rotation.z = Math.PI * 0.5;
  handle.position.set(0, 0.96, -0.45);
  group.add(handle);

  const postGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.78, 6);
  for (const px of [-0.28, 0.28]) {
    const p = new THREE.Mesh(postGeo, mats.lampMetal);
    p.position.set(px, 0.56, -0.42);
    group.add(p);
  }

  return group;
}

export function buildHazardConeClusterModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const baseGeo = new THREE.BoxGeometry(0.34, 0.04, 0.34);
  const coneGeo = new THREE.ConeGeometry(0.14, 0.52, 8);

  const offsets = [
    { x: -0.35, z: -0.1, tilt: 0 },
    { x: 0.3, z: 0.22, tilt: 0.14 },
  ];
  for (const o of offsets) {
    const sub = new THREE.Group();
    const base = new THREE.Mesh(baseGeo, mats.tireRubber);
    base.position.y = 0.02;
    const cone = new THREE.Mesh(coneGeo, mats.safetyOrange);
    cone.position.y = 0.28;
    cone.castShadow = true;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.1, 8), mats.lampBulbDead);
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

  const postL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), mats.darkTrim);
  postL.position.set(-0.78, 0.95, 0);
  const postR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), mats.darkTrim);
  postR.position.set(0.78, 0.95, 0);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.64, 0.07), mats.signQuarantine);
  board.position.set(0, 1.56, 0);
  board.castShadow = true;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.16, 0.06), mats.hazardStripe);
  bar.position.set(0, 0.9, 0);

  group.add(postL, postR, board, bar);
  return group;
}

export function buildSandbagBarricadeModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();
  const bagGeo = new THREE.BoxGeometry(0.58, 0.18, 0.34);

  for (let row = 0; row < 3; row++) {
    const count = 4 - (row % 2);
    for (let i = 0; i < count; i++) {
      const bx = (i - (count - 1) * 0.5) * 0.56;
      const bag = new THREE.Mesh(bagGeo, mats.sandbag);
      bag.position.set(bx, 0.09 + row * 0.17, (row % 2) * 0.04);
      bag.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.04;
      bag.castShadow = true;
      bag.receiveShadow = true;
      group.add(bag);
    }
  }
  return group;
}

export function buildSurvivorCampModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // Rolled bedroll
  const mat = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.09, 1.75), mats.tarpBlue);
  mat.position.set(-0.35, 0.045, 0);
  mat.castShadow = true;
  group.add(mat);

  const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.34), mats.concrete);
  pillow.position.set(-0.35, 0.11, -0.62);
  group.add(pillow);

  // Small tarp overhang supported by two poles
  const poleGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.35, 6);
  const p1 = new THREE.Mesh(poleGeo, mats.wood);
  p1.position.set(-0.9, 0.675, -0.75);
  const p2 = new THREE.Mesh(poleGeo, mats.wood);
  p2.position.set(-0.9, 0.675, 0.75);
  const tarpRoof = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.03, 1.9), mats.tarpBlue);
  tarpRoof.position.set(-0.35, 1.22, 0);
  tarpRoof.rotation.z = -0.32;
  tarpRoof.castShadow = true;
  group.add(p1, p2, tarpRoof);

  // Fire ring / ash basin beside bedroll
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.14, 8), mats.darkTrim);
  ring.position.set(0.68, 0.07, 0.25);
  const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.05, 8), mats.rustedMetal);
  ash.position.set(0.68, 0.12, 0.25);
  group.add(ring, ash);

  return group;
}

export function buildGroundDecalModel(
  kind: 'blood_scuffle' | 'oil_slick',
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const mat = kind === 'blood_scuffle' ? mats.bloodStain : mats.oilSlick;
  const main = new THREE.Mesh(new THREE.CircleGeometry(0.95, 10), mat);
  main.rotation.x = -Math.PI * 0.5;
  main.position.y = 0.015;
  main.scale.set(1.3, 0.85, 1);
  group.add(main);

  const sub = new THREE.Mesh(new THREE.CircleGeometry(0.45, 8), mat);
  sub.rotation.x = -Math.PI * 0.5;
  sub.position.set(0.7, 0.015, 0.35);
  group.add(sub);

  return group;
}
