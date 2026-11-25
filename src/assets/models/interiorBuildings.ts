import * as THREE from 'three';
import {
  BuildingDoorLocal,
  EnterableBuildingConfig,
  FurnitureKind,
  SearchContainerKind,
} from '../maps/buildingLayouts';
import { MaterialPalette } from './proceduralModels';
import { ResourceMaterialPalette } from './resourceModels';

export interface InteriorMaterialPalette {
  plasterWall: THREE.MeshStandardMaterial;
  interiorWoodWall: THREE.MeshStandardMaterial;
  wornTileFloor: THREE.MeshStandardMaterial;
  ceilingSlab: THREE.MeshStandardMaterial;
  windowGlass: THREE.MeshStandardMaterial;
  lightShaft: THREE.MeshBasicMaterial;
  fabricDusty: THREE.MeshStandardMaterial;
  rugWeathered: THREE.MeshStandardMaterial;
  porcelain: THREE.MeshStandardMaterial;
  brassHandle: THREE.MeshStandardMaterial;
  cabinetWood: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createInteriorMaterialPalette(): InteriorMaterialPalette {
  const plasterWall = new THREE.MeshStandardMaterial({
    color: 0x52575e,
    roughness: 0.92,
    metalness: 0.02,
  });
  const interiorWoodWall = new THREE.MeshStandardMaterial({
    color: 0x453629,
    roughness: 0.88,
    metalness: 0.03,
  });
  const wornTileFloor = new THREE.MeshStandardMaterial({
    color: 0x3b414a,
    roughness: 0.85,
    metalness: 0.04,
  });
  const ceilingSlab = new THREE.MeshStandardMaterial({
    color: 0x262930,
    roughness: 0.95,
    metalness: 0.02,
  });
  const windowGlass = new THREE.MeshStandardMaterial({
    color: 0x8fb3d4,
    roughness: 0.14,
    metalness: 0.15,
    transparent: true,
    opacity: 0.34,
  });
  const lightShaft = new THREE.MeshBasicMaterial({
    color: 0x9ec5e8,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fabricDusty = new THREE.MeshStandardMaterial({
    color: 0x4b423c,
    roughness: 0.94,
    metalness: 0.0,
  });
  const rugWeathered = new THREE.MeshStandardMaterial({
    color: 0x592e28,
    roughness: 0.95,
    metalness: 0.0,
  });
  const porcelain = new THREE.MeshStandardMaterial({
    color: 0xcfd6de,
    roughness: 0.36,
    metalness: 0.06,
  });
  const brassHandle = new THREE.MeshStandardMaterial({
    color: 0xd99b38,
    roughness: 0.38,
    metalness: 0.72,
  });
  const cabinetWood = new THREE.MeshStandardMaterial({
    color: 0x5a422f,
    roughness: 0.82,
    metalness: 0.05,
  });

  const all = [
    plasterWall,
    interiorWoodWall,
    wornTileFloor,
    ceilingSlab,
    windowGlass,
    lightShaft,
    fabricDusty,
    rugWeathered,
    porcelain,
    brassHandle,
    cabinetWood,
  ];

  return {
    plasterWall,
    interiorWoodWall,
    wornTileFloor,
    ceilingSlab,
    windowGlass,
    lightShaft,
    fabricDusty,
    rugWeathered,
    porcelain,
    brassHandle,
    cabinetWood,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}

export const INTERIOR_FLOOR_OFFSET = 0.025;

/**
 * Builds the modular 3D exterior & interior architecture shell for an enterable building:
 * interior floor, ceiling, roof parapet, exterior signage/trim, walls with real door/window openings,
 * translucent windows, and subtle baked window light shafts.
 */
export function buildEnterableBuildingShell(
  cfg: EnterableBuildingConfig,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const { w, d, ceilingH, exteriorStyle, floorStyle } = cfg;

  // 1. Interior floor slab sitting flush above sidewalk without Z-fighting
  const floorMat =
    floorStyle === 'wood_planks'
      ? mats.wood
      : floorStyle === 'worn_tile'
        ? intMats.wornTileFloor
        : mats.concrete;

  const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.16, INTERIOR_FLOOR_OFFSET * 2, d - 0.16),
    floorMat
  );
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // 2. Ceiling & Exterior Roof Parapet
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.1, 0.14, d - 0.1),
    intMats.ceilingSlab
  );
  ceiling.position.y = ceilingH + 0.07;
  group.add(ceiling);

  const parapet = new THREE.Mesh(
    new THREE.BoxGeometry(w + 0.34, 0.42, d + 0.34),
    mats.darkTrim
  );
  parapet.position.y = ceilingH + 0.32;
  parapet.castShadow = true;
  group.add(parapet);

  const roofTar = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.5, 0.12, d - 0.5),
    mats.roofTar
  );
  roofTar.position.y = ceilingH + 0.52;
  group.add(roofTar);

  // 3. Modular Walls (with real door & window cutouts)
  const wallMatMap = {
    brick: mats.brick,
    concrete: mats.concrete,
    interior_plaster: intMats.plasterWall,
    interior_wood: intMats.interiorWoodWall,
    rusted: mats.rustedMetal,
  };

  for (const wall of cfg.walls) {
    const wh = wall.h ?? ceilingH;
    const wy = (wall.y ?? 0) + wh * 0.5;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(wall.w, wh, wall.d),
      wallMatMap[wall.material]
    );
    mesh.position.set(wall.x, wy, wall.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // 4. Windows + mullions + subtle natural window light pools on the interior floor
  for (const win of cfg.windows) {
    const winGroup = new THREE.Group();
    winGroup.position.set(win.x, 1.7, win.z);
    winGroup.rotation.y = win.rotationY;

    const glass = new THREE.Mesh(
      new THREE.BoxGeometry(win.w - 0.08, 1.4, 0.04),
      intMats.windowGlass
    );
    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(win.w, 0.08, 0.28),
      mats.darkTrim
    );
    frameTop.position.y = 0.72;
    const frameBot = new THREE.Mesh(
      new THREE.BoxGeometry(win.w, 0.08, 0.28),
      mats.darkTrim
    );
    frameBot.position.y = -0.72;
    const mullion = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 1.4, 0.08),
      mats.darkTrim
    );
    winGroup.add(glass, frameTop, frameBot, mullion);
    group.add(winGroup);

    if (win.castLightShaft) {
      // Zero-light-cost translucent floor patch inside the window
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(win.w * 0.85, 1.75),
        intMats.lightShaft
      );
      patch.rotation.x = -Math.PI * 0.5;
      patch.rotation.z = win.rotationY;
      // Offset slightly inward toward building center (0, 0)
      const inwardX = win.x === 0 ? 0 : -Math.sign(win.x) * (Math.abs(win.x) > 3.5 ? 1.1 : 0);
      const inwardZ = win.z === 0 ? 0 : -Math.sign(win.z) * (Math.abs(win.z) > 2.5 ? 1.1 : 0);
      patch.position.set(win.x + inwardX, INTERIOR_FLOOR_OFFSET + 0.015, win.z + inwardZ);
      group.add(patch);
    }
  }

  // 5. Door Jamb Frames
  for (const door of cfg.doors) {
    const frame = new THREE.Group();
    const dirX = Math.cos(door.baseRotationY);
    const dirZ = -Math.sin(door.baseRotationY);
    frame.position.set(
      door.hingeX + dirX * door.width * 0.5,
      1.19,
      door.hingeZ + dirZ * door.width * 0.5
    );
    frame.rotation.y = door.baseRotationY;

    const topBeam = new THREE.Mesh(
      new THREE.BoxGeometry(door.width + 0.14, 0.1, 0.28),
      mats.darkTrim
    );
    topBeam.position.y = 1.18;
    frame.add(topBeam);
    group.add(frame);
  }

  // 6. Archetype Exterior Details (Preserving Last Shop landmark identity + distinct building silhouettes)
  if (exteriorStyle === 'last_shop') {
    const frontZ = d * 0.5;
    const awning = new THREE.Mesh(
      new THREE.BoxGeometry(w - 1.2, 0.16, 1.85),
      mats.awning
    );
    awning.position.set(0, 2.95, frontZ + 0.88);
    awning.rotation.x = 0.22;
    awning.castShadow = true;
    group.add(awning);

    const sign = new THREE.Mesh(new THREE.BoxGeometry(5.6, 1.15, 0.2), mats.shopSign);
    sign.position.set(0, ceilingH + 0.45, frontZ + 0.16);
    group.add(sign);

    const lantern = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 10, 8),
      mats.lampBulbLit
    );
    lantern.position.set(0, 2.65, frontZ + 0.35);
    group.add(lantern);

    const hvac = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 1.3), mats.rustedMetal);
    hvac.position.set(-w * 0.25, ceilingH + 0.92, -d * 0.15);
    group.add(hvac);
  } else if (exteriorStyle === 'store') {
    const frontZ = d * 0.5;
    const fascia = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.8, 0.92, 0.2),
      mats.signValeStore
    );
    fascia.position.set(0, ceilingH + 0.14, frontZ + 0.12);
    group.add(fascia);

    // Cracked/boarded lower trim plank by display window
    const plank = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.2, 0.12),
      mats.wood
    );
    plank.position.set(-2.5, 1.38, frontZ + 0.08);
    plank.rotation.z = -0.11;
    group.add(plank);
  } else if (exteriorStyle === 'storage') {
    const frontZ = d * 0.5;
    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 0.95, 0.18),
      mats.signDepot04
    );
    sign.position.set(0, ceilingH + 0.16, frontZ + 0.14);
    group.add(sign);

    const vent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.28, 0.7, 8),
      mats.lampMetal
    );
    vent.position.set(2.2, ceilingH + 0.8, -1.6);
    group.add(vent);
  } else if (exteriorStyle === 'house') {
    const porchBeam = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.14, 1.2),
      mats.wood
    );
    porchBeam.position.set(0, 2.75, -d * 0.5 - 0.55);
    porchBeam.rotation.x = -0.18;
    porchBeam.castShadow = true;
    group.add(porchBeam);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(1.55, 0.18, 0.1),
      mats.wood
    );
    board.position.set(2.4, 1.52, -d * 0.5 - 0.06);
    board.rotation.z = 0.09;
    group.add(board);

    const chimney = new THREE.Mesh(
      new THREE.BoxGeometry(0.85, 1.4, 0.85),
      mats.brick
    );
    chimney.position.set(-3.2, ceilingH + 0.9, 2.4);
    group.add(chimney);
  }

  return group;
}

/**
 * Builds an interactive 3D door pivoted around local X = 0 extending along +X to `width`.
 * Has dual-sided lever handles so it can be clearly spotted and toggled from outdoors and indoors.
 */
export function buildInteriorDoorModel(
  door: BuildingDoorLocal,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const pivot = new THREE.Group();
  const leafMat = door.kind === 'wood' ? intMats.cabinetWood : mats.lampMetal;

  const leaf = new THREE.Mesh(
    new THREE.BoxGeometry(door.width - 0.04, 2.3, 0.08),
    leafMat
  );
  leaf.position.set(door.width * 0.5, 1.15, 0);
  leaf.castShadow = true;
  leaf.receiveShadow = true;

  // Recessed decorative trim bar
  const trim = new THREE.Mesh(
    new THREE.BoxGeometry(door.width * 0.65, 0.85, 0.095),
    mats.darkTrim
  );
  trim.position.set(door.width * 0.5, 1.55, 0);

  // Brass / amber handles on both sides
  const handle = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.05, 0.22),
    intMats.brassHandle
  );
  handle.position.set(door.width - 0.18, 1.02, 0);

  pivot.add(leaf, trim, handle);
  return pivot;
}

export function buildFurnitureModel(
  kind: FurnitureKind,
  w: number,
  d: number,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  switch (kind) {
    case 'counter': {
      const base = new THREE.Mesh(new THREE.BoxGeometry(w, 0.9, d), intMats.cabinetWood);
      base.position.y = 0.45;
      base.castShadow = true;
      base.receiveShadow = true;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.08, 0.06, d + 0.08), mats.concrete);
      top.position.y = 0.93;
      group.add(base, top);
      break;
    }
    case 'shelf': {
      const legGeo = new THREE.BoxGeometry(0.07, 1.68, 0.07);
      const offsets = [
        [-w * 0.46, -d * 0.42],
        [w * 0.46, -d * 0.42],
        [-w * 0.46, d * 0.42],
        [w * 0.46, d * 0.42],
      ];
      for (const [lx, lz] of offsets) {
        const leg = new THREE.Mesh(legGeo, mats.lampMetal);
        leg.position.set(lx, 0.84, lz);
        leg.castShadow = true;
        group.add(leg);
      }
      const plankGeo = new THREE.BoxGeometry(w, 0.05, d);
      for (const py of [0.22, 0.92, 1.62]) {
        const p = new THREE.Mesh(plankGeo, mats.wood);
        p.position.y = py;
        p.receiveShadow = true;
        group.add(p);
      }
      break;
    }
    case 'table': {
      const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.07, d), mats.wood);
      top.position.y = 0.745;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);
      const legGeo = new THREE.BoxGeometry(0.08, 0.71, 0.08);
      for (const [lx, lz] of [
        [-w * 0.43, -d * 0.38],
        [w * 0.43, -d * 0.38],
        [-w * 0.43, d * 0.38],
        [w * 0.43, d * 0.38],
      ]) {
        const leg = new THREE.Mesh(legGeo, mats.darkTrim);
        leg.position.set(lx, 0.355, lz);
        group.add(leg);
      }
      break;
    }
    case 'couch': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.38, d), intMats.fabricDusty);
      seat.position.y = 0.24;
      seat.castShadow = true;
      const back = new THREE.Mesh(new THREE.BoxGeometry(w, 0.46, 0.2), intMats.fabricDusty);
      back.position.set(0, 0.6, -d * 0.38);
      const armL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, d), intMats.fabricDusty);
      armL.position.set(-w * 0.44, 0.34, 0);
      const armR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.52, d), intMats.fabricDusty);
      armR.position.set(w * 0.44, 0.34, 0);
      group.add(seat, back, armL, armR);
      break;
    }
    case 'bed': {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), intMats.cabinetWood);
      frame.position.y = 0.14;
      const mattress = new THREE.Mesh(
        new THREE.BoxGeometry(w - 0.12, 0.22, d - 0.12),
        intMats.fabricDusty
      );
      mattress.position.y = 0.38;
      const pillow = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.65, 0.12, 0.38),
        intMats.porcelain
      );
      pillow.position.set(0, 0.53, d * 0.32);
      const headboard = new THREE.Mesh(
        new THREE.BoxGeometry(w, 0.85, 0.1),
        intMats.cabinetWood
      );
      headboard.position.set(0, 0.425, d * 0.47);
      group.add(frame, mattress, pillow, headboard);
      break;
    }
    case 'kitchen_counter': {
      const body = new THREE.Mesh(new THREE.BoxGeometry(w, 0.84, d), intMats.plasterWall);
      body.position.y = 0.42;
      body.castShadow = true;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), mats.wood);
      top.position.y = 0.87;
      const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.04, 0.42), mats.lampMetal);
      sinkBasin.position.set(w * 0.22, 0.91, 0);
      group.add(body, top, sinkBasin);
      break;
    }
    case 'sink_vanity': {
      const cab = new THREE.Mesh(new THREE.BoxGeometry(w, 0.78, d), intMats.cabinetWood);
      cab.position.y = 0.39;
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.08, d + 0.06), intMats.porcelain);
      top.position.y = 0.82;
      const mirror = new THREE.Mesh(new THREE.BoxGeometry(w * 0.72, 0.72, 0.05), mats.glassDark);
      mirror.position.set(0, 1.55, -d * 0.42);
      group.add(cab, top, mirror);
      break;
    }
    case 'pallet_crates': {
      const pallet = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), mats.wood);
      pallet.position.y = 0.06;
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.58), mats.wood);
      c1.position.set(-0.18, 0.38, 0.12);
      c1.castShadow = true;
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.46), mats.darkTrim);
      c2.position.set(0.24, 0.33, -0.18);
      c2.rotation.y = 0.35;
      group.add(pallet, c1, c2);
      break;
    }
    case 'rug': {
      const mat = new THREE.Mesh(new THREE.BoxGeometry(w, 0.015, d), intMats.rugWeathered);
      mat.position.y = 0.01;
      mat.receiveShadow = true;
      group.add(mat);
      break;
    }
    case 'broken_chair': {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.46), intMats.cabinetWood);
      seat.position.y = 0.42;
      const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.06), intMats.cabinetWood);
      back.position.set(0, 0.68, -0.2);
      const legGeo = new THREE.BoxGeometry(0.05, 0.42, 0.05);
      for (const [lx, lz] of [
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ]) {
        const leg = new THREE.Mesh(legGeo, intMats.cabinetWood);
        leg.position.set(lx, 0.21, lz);
        group.add(leg);
      }
      group.rotation.z = 0.14;
      group.add(seat, back);
      break;
    }
  }

  return group;
}

/**
 * Builds searchable interior containers (cabinets, drawers, boxes, wall medical cabinets)
 * with articulated animated pivots (`animKind`: `'door' | 'drawer' | 'lid'`).
 */
export function buildSearchableContainerModel(
  kind: SearchContainerKind,
  mats: MaterialPalette,
  resMats: ResourceMaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'cabinet') {
    // Tall standing supply/kitchen cabinet (0.96 x 1.38 x 0.54) with front swinging door
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.38, 0.5), intMats.cabinetWood);
    body.position.y = 0.69;
    body.castShadow = true;
    body.receiveShadow = true;

    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.2, 0.04), mats.darkTrim);
    recess.position.set(0, 0.69, 0.24);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.44, 0.69, 0.26);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.88, 1.24, 0.05), intMats.interiorWoodWall);
    door.position.set(0.44, 0, 0);
    const knob = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), intMats.brassHandle);
    knob.position.set(0.8, 0, 0.04);

    doorPivot.add(door, knob);
    group.add(body, recess, doorPivot);
    group.userData.animPivot = doorPivot;
    group.userData.animKind = 'door';
  } else if (kind === 'drawer') {
    // Chest / unit with sliding top drawer (0.76 x 0.72 x 0.46)
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.72, 0.46), intMats.cabinetWood);
    body.position.y = 0.36;
    body.castShadow = true;

    const drawerPivot = new THREE.Group();
    drawerPivot.position.set(0, 0.56, 0.22);

    const face = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.2, 0.06), intMats.interiorWoodWall);
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.34), mats.wood);
    tray.position.z = -0.17;
    const pull = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.05), intMats.brassHandle);
    pull.position.z = 0.04;

    drawerPivot.add(face, tray, pull);
    group.add(body, drawerPivot);
    group.userData.animPivot = drawerPivot;
    group.userData.animKind = 'drawer';
  } else if (kind === 'med_cabinet') {
    // Wall-mounted white medical cabinet with red cross & hinged front door
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.72, 0.22), resMats.medCaseWhite);
    body.position.y = 0.36;
    body.castShadow = true;

    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.03), mats.darkTrim);
    recess.position.set(0, 0.36, 0.1);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.26, 0.36, 0.12);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.66, 0.04), resMats.medCaseWhite);
    door.position.set(0.26, 0, 0);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.02), mats.hydrantRed);
    crossH.position.set(0.26, 0, 0.025);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.18, 0.02), mats.hydrantRed);
    crossV.position.set(0.26, 0, 0.025);

    doorPivot.add(door, crossH, crossV);
    group.add(body, recess, doorPivot);
    group.userData.animPivot = doorPivot;
    group.userData.animKind = 'door';
  } else {
    // storage_box (wooden/metal supply crate with hinged top lid)
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.42, 0.52), mats.wood);
    base.position.y = 0.21;
    base.castShadow = true;
    const interior = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.42), mats.darkTrim);
    interior.position.y = 0.41;

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.42, -0.26);

    const lid = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.08, 0.54), mats.wood);
    lid.position.set(0, 0.04, 0.26);
    const latch = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.04), intMats.brassHandle);
    latch.position.set(0, 0.01, 0.53);

    lidPivot.add(lid, latch);
    group.add(base, interior, lidPivot);
    group.userData.animPivot = lidPivot;
    group.userData.animKind = 'lid';
  }

  return group;
}
