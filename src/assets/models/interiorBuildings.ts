import * as THREE from 'three';
import {
  BuildingDoorLocal,
  EnterableBuildingConfig,
  FurnitureKind,
  SearchContainerKind,
} from '../maps/buildingLayouts';
import { MaterialPalette } from './proceduralModels';
import { ResourceMaterialPalette } from './resourceModels';
import { ProceduralTextureSet } from '../textures/proceduralTextures';
import {
  applyTriplanarUVs,
  createArchitecturalColumnGeometry,
  createBeveledBoxGeometry,
  createButtressGeometry,
  createCurvedAwningGeometry,
  createGableEndWallGeometry,
  createGabledRoofGeometry,
  createMansardRoofGeometry,
  createPorcelainBasinGeometry,
  createPressurizedTankGeometry,
  createSawtoothRoofGeometry,
  createTubePathGeometry,
  mergeParts,
} from './proceduralGeometryKit';

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

export function createInteriorMaterialPalette(
  textures: ProceduralTextureSet
): InteriorMaterialPalette {
  const plasterWall = new THREE.MeshStandardMaterial({
    map: textures.interiorPlaster,
    normalMap: textures.interiorPlasterNormal,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughness: 0.92,
    metalness: 0.02,
  });
  const interiorWoodWall = new THREE.MeshStandardMaterial({
    color: 0x5c4636,
    map: textures.woodPlank,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: textures.woodRoughness,
    roughness: 0.88,
    metalness: 0.03,
  });
  const wornTileFloor = new THREE.MeshStandardMaterial({
    map: textures.wornTile,
    normalMap: textures.wornTileNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.wornTileRoughness,
    roughness: 0.82,
    metalness: 0.05,
  });
  const ceilingSlab = new THREE.MeshStandardMaterial({
    color: 0x22262d,
    normalMap: textures.concreteNormal,
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.95,
    metalness: 0.02,
  });
  const windowGlass = new THREE.MeshStandardMaterial({
    color: 0x8fb3d4,
    roughness: 0.14,
    metalness: 0.22,
    transparent: true,
    opacity: 0.36,
    side: THREE.DoubleSide,
  });
  const lightShaft = new THREE.MeshBasicMaterial({
    color: 0x9ec5e8,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const fabricDusty = new THREE.MeshStandardMaterial({
    color: 0x453d37,
    roughness: 0.94,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const rugWeathered = new THREE.MeshStandardMaterial({
    color: 0x542c27,
    roughness: 0.95,
    metalness: 0.0,
  });
  const porcelain = new THREE.MeshStandardMaterial({
    color: 0xc2c9d1,
    roughness: 0.34,
    metalness: 0.08,
  });
  const brassHandle = new THREE.MeshStandardMaterial({
    color: 0xc88d32,
    roughness: 0.38,
    metalness: 0.76,
  });
  const cabinetWood = new THREE.MeshStandardMaterial({
    color: 0x5c4532,
    map: textures.woodPlank,
    normalMap: textures.woodNormal,
    normalScale: new THREE.Vector2(0.45, 0.45),
    roughness: 0.84,
    metalness: 0.04,
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
 * non-block architectural roofs (gabled, sawtooth, mansard, pediment, dome), deep corner pilasters,
 * recessed framed windows with jagged shards, beveled door jambs, curved downspouts,
 * interior rafters/beams, and rich archetype details.
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
    createBeveledBoxGeometry(w - 0.16, INTERIOR_FLOOR_OFFSET * 2, d - 0.16, 0.01, 0.02),
    floorMat
  );
  floorMesh.position.y = 0;
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // 2. Interior Ceiling & Exposed Architectural Beams (eliminates flat box ceiling feel)
  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(w - 0.12, 0.12, d - 0.12),
    intMats.ceilingSlab
  );
  ceiling.position.y = ceilingH + 0.06;
  group.add(ceiling);

  const beamMat =
    exteriorStyle === 'last_shop' || exteriorStyle === 'house' || exteriorStyle === 'store'
      ? intMats.cabinetWood
      : mats.darkTrim;
  const beamParts: THREE.BufferGeometry[] = [];
  const beamCount = Math.max(3, Math.floor(w / 2.6));
  for (let i = 0; i < beamCount; i++) {
    const bx = -w * 0.42 + (i / Math.max(1, beamCount - 1)) * (w * 0.84);
    const beam = createBeveledBoxGeometry(0.16, 0.18, d - 0.35, 0.02, 0.01);
    beam.translate(bx, ceilingH - 0.07, 0);
    beamParts.push(beam);
  }
  const beamsMesh = new THREE.Mesh(mergeParts(beamParts, true, 0.4), beamMat);
  group.add(beamsMesh);

  // 3. Exterior Corner Pilasters, Belt Course & Foundation Water-Table Plinth
  const trimDetailParts: THREE.BufferGeometry[] = [];
  const pilasterW = 0.34;
  const pilasterH = ceilingH + 0.16;
  for (const [px, pz] of [
    [-w * 0.5 + 0.04, -d * 0.5 + 0.04],
    [w * 0.5 - 0.04, -d * 0.5 + 0.04],
    [-w * 0.5 + 0.04, d * 0.5 - 0.04],
    [w * 0.5 - 0.04, d * 0.5 - 0.04],
  ]) {
    const col = createBeveledBoxGeometry(pilasterW, pilasterH, pilasterW, 0.03, 0.02);
    col.translate(px, pilasterH * 0.5, pz);
    trimDetailParts.push(col);

    const cap = createBeveledBoxGeometry(pilasterW + 0.1, 0.14, pilasterW + 0.1, 0.02, 0.02);
    cap.translate(px, pilasterH + 0.04, pz);
    trimDetailParts.push(cap);
  }

  // Exterior cornice belt molding beneath roofline
  const belt = createBeveledBoxGeometry(w + 0.24, 0.16, d + 0.24, 0.03, 0.04);
  belt.translate(0, ceilingH + 0.08, 0);
  trimDetailParts.push(belt);

  const pilasterMesh = new THREE.Mesh(
    mergeParts(trimDetailParts, true, 0.4),
    exteriorStyle === 'clinic' || exteriorStyle === 'police' ? mats.concrete : mats.darkTrim
  );
  pilasterMesh.castShadow = true;
  pilasterMesh.receiveShadow = true;
  group.add(pilasterMesh);

  // Exterior drainage downspout with curved elbow along rear corner
  const pipePts = [
    new THREE.Vector3(w * 0.5 + 0.07, ceilingH + 0.05, -d * 0.35),
    new THREE.Vector3(w * 0.5 + 0.09, ceilingH - 0.35, -d * 0.35),
    new THREE.Vector3(w * 0.5 + 0.09, 0.32, -d * 0.35),
    new THREE.Vector3(w * 0.5 + 0.24, 0.09, -d * 0.35),
  ];
  const downspout = new THREE.Mesh(createTubePathGeometry(pipePts, 0.055, 10, 6), mats.lampMetal);
  downspout.castShadow = true;
  group.add(downspout);

  // 4. Archetype Architectural Roof Silhouettes (replaces generic flat parapet box)
  if (exteriorStyle === 'last_shop') {
    // Gabled timber-shingled roof with brick gable infill & overhanging eaves
    const roofGeo = createGabledRoofGeometry(w, d, 1.55, 0.48, 0.18, true);
    const roofMesh = new THREE.Mesh(roofGeo, mats.roofTar);
    roofMesh.position.y = ceilingH + 0.15;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);

    const gableGeo = createGableEndWallGeometry(d - 0.12, 1.45, 0.24);
    gableGeo.rotateY(Math.PI * 0.5);
    const gableW = new THREE.Mesh(gableGeo, mats.brick);
    gableW.position.set(-w * 0.5 + 0.12, ceilingH + 0.14, 0);
    const gableE = new THREE.Mesh(gableGeo.clone(), mats.brick);
    gableE.position.set(w * 0.5 - 0.12, ceilingH + 0.14, 0);
    group.add(gableW, gableE);

    const ridgeCap = new THREE.Mesh(
      createBeveledBoxGeometry(w + 1.0, 0.14, 0.26, 0.025, 0.02),
      mats.darkTrim
    );
    ridgeCap.position.y = ceilingH + 1.72;
    group.add(ridgeCap);
  } else if (exteriorStyle === 'house') {
    // Steep residential gable roof with brick gable triangles & ridge beam
    const roofGeo = createGabledRoofGeometry(w, d, 1.95, 0.52, 0.18, true);
    const roofMesh = new THREE.Mesh(roofGeo, mats.roofTar);
    roofMesh.position.y = ceilingH + 0.14;
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    group.add(roofMesh);

    const gableGeo = createGableEndWallGeometry(d - 0.14, 1.85, 0.24);
    gableGeo.rotateY(Math.PI * 0.5);
    const gableW = new THREE.Mesh(gableGeo, mats.wood);
    gableW.position.set(-w * 0.5 + 0.12, ceilingH + 0.14, 0);
    const gableE = new THREE.Mesh(gableGeo.clone(), mats.wood);
    gableE.position.set(w * 0.5 - 0.12, ceilingH + 0.14, 0);
    group.add(gableW, gableE);
  } else if (exteriorStyle === 'garage' || exteriorStyle === 'storage') {
    // Industrial sawtooth multi-bay corrugated roof
    const sawGeo = createSawtoothRoofGeometry(w, d, 3, 1.05, 0.32);
    const sawMesh = new THREE.Mesh(sawGeo, mats.rustedMetal);
    sawMesh.position.y = ceilingH + 0.15;
    sawMesh.castShadow = true;
    sawMesh.receiveShadow = true;
    group.add(sawMesh);
  } else if (exteriorStyle === 'diner') {
    // Retro tapered mansard crown + sloped cornice lip
    const mansard = new THREE.Mesh(
      createMansardRoofGeometry(w, d, 0.92, 0.95, 0.34),
      mats.hydrantRed
    );
    mansard.position.y = ceilingH + 0.14;
    mansard.castShadow = true;
    group.add(mansard);
  } else if (exteriorStyle === 'clinic') {
    // Hospital stepped mansard wing + raised clerestory monitor penthouse
    const mansard = new THREE.Mesh(
      createMansardRoofGeometry(w, d, 0.85, 1.1, 0.34),
      mats.concrete
    );
    mansard.position.y = ceilingH + 0.14;
    mansard.castShadow = true;
    group.add(mansard);

    const monitor = new THREE.Mesh(
      createMansardRoofGeometry(w * 0.58, d * 0.48, 0.65, 0.35, 0.18),
      mats.darkTrim
    );
    monitor.position.y = ceilingH + 0.95;
    monitor.castShadow = true;
    group.add(monitor);
  } else if (exteriorStyle === 'lab') {
    // Brutalist sloped bunker cap + octagonal containment dome
    const bunkerCap = new THREE.Mesh(
      createMansardRoofGeometry(w, d, 0.78, 1.25, 0.22),
      mats.darkTrim
    );
    bunkerCap.position.y = ceilingH + 0.14;
    bunkerCap.castShadow = true;
    group.add(bunkerCap);

    const domePts = [
      new THREE.Vector2(2.35, 0),
      new THREE.Vector2(2.2, 0.45),
      new THREE.Vector2(1.72, 0.92),
      new THREE.Vector2(0.95, 1.22),
      new THREE.Vector2(0.0, 1.32),
    ];
    const domeGeo = new THREE.LatheGeometry(domePts, 8);
    applyTriplanarUVs(domeGeo, 0.35);
    const dome = new THREE.Mesh(domeGeo, mats.rustedMetal);
    dome.position.set(-1.6, ceilingH + 0.88, -0.4);
    dome.castShadow = true;
    group.add(dome);
  } else if (exteriorStyle === 'police') {
    // Civic mansard roof + triangular stone pediment over north entrance
    const mansard = new THREE.Mesh(
      createMansardRoofGeometry(w, d, 0.95, 1.0, 0.3),
      mats.darkTrim
    );
    mansard.position.y = ceilingH + 0.14;
    mansard.castShadow = true;
    group.add(mansard);

    const pediment = new THREE.Mesh(
      createGableEndWallGeometry(5.8, 1.15, 0.42),
      mats.concrete
    );
    pediment.position.set(0, ceilingH + 0.14, -d * 0.5 - 0.16);
    pediment.castShadow = true;
    group.add(pediment);
  } else {
    // Storefront ('store' — Vale Corner Store): sloped commercial mansard roof
    const mansard = new THREE.Mesh(
      createMansardRoofGeometry(w, d, 0.85, 0.85, 0.28),
      mats.roofTar
    );
    mansard.position.y = ceilingH + 0.14;
    mansard.castShadow = true;
    group.add(mansard);
  }

  // 5. Modular Walls (with real door & window cutouts)
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

  // 6. Recessed Windows + Side Jambs + Beveled Sills + Jagged Broken Glass Shards
  for (let wi = 0; wi < cfg.windows.length; wi++) {
    const win = cfg.windows[wi];
    const winGroup = new THREE.Group();
    winGroup.position.set(win.x, 1.7, win.z);
    winGroup.rotation.y = win.rotationY;

    const frameParts: THREE.BufferGeometry[] = [];
    const topLintel = createBeveledBoxGeometry(win.w + 0.18, 0.11, 0.34, 0.02, 0.02);
    topLintel.translate(0, 0.73, 0);
    const botSill = createBeveledBoxGeometry(win.w + 0.22, 0.1, 0.36, 0.02, 0.02);
    botSill.translate(0, -0.73, 0.02);
    const jambL = createBeveledBoxGeometry(0.09, 1.4, 0.3, 0.015, 0.01);
    jambL.translate(-win.w * 0.5 + 0.02, 0, 0);
    const jambR = createBeveledBoxGeometry(0.09, 1.4, 0.3, 0.015, 0.01);
    jambR.translate(win.w * 0.5 - 0.02, 0, 0);
    const mullion = createBeveledBoxGeometry(0.055, 1.38, 0.1, 0.01, 0.01);
    const transBar = createBeveledBoxGeometry(win.w - 0.08, 0.05, 0.09, 0.01, 0.01);
    transBar.translate(0, 0.18, 0);
    frameParts.push(topLintel, botSill, jambL, jambR, mullion, transBar);

    const frameMesh = new THREE.Mesh(mergeParts(frameParts, false), mats.darkTrim);
    winGroup.add(frameMesh);

    // Jagged cracked window panes (subtle broken glass silhouette)
    const shardShape = new THREE.Shape();
    const hw = (win.w - 0.14) * 0.5;
    shardShape.moveTo(-hw, -0.66);
    shardShape.lineTo(hw, -0.66);
    shardShape.lineTo(hw, 0.66);
    shardShape.lineTo(hw * 0.18, 0.66);
    shardShape.lineTo(0.05, 0.14);
    shardShape.lineTo(-hw * 0.32, 0.66);
    shardShape.lineTo(-hw, 0.66);
    shardShape.closePath();
    const glassGeo = new THREE.ShapeGeometry(shardShape);
    const glass = new THREE.Mesh(glassGeo, intMats.windowGlass);
    winGroup.add(glass);

    group.add(winGroup);

    if (win.castLightShaft) {
      const patch = new THREE.Mesh(
        new THREE.PlaneGeometry(win.w * 0.85, 1.75),
        intMats.lightShaft
      );
      patch.rotation.x = -Math.PI * 0.5;
      patch.rotation.z = win.rotationY;
      const inwardX = win.x === 0 ? 0 : -Math.sign(win.x) * (Math.abs(win.x) > 3.5 ? 1.1 : 0);
      const inwardZ = win.z === 0 ? 0 : -Math.sign(win.z) * (Math.abs(win.z) > 2.5 ? 1.1 : 0);
      patch.position.set(win.x + inwardX, INTERIOR_FLOOR_OFFSET + 0.015, win.z + inwardZ);
      group.add(patch);
    }
  }

  // 7. Beveled Door Jamb Frames (Side Stiles + Molded Header)
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

    const frameParts: THREE.BufferGeometry[] = [];
    const topBeam = createBeveledBoxGeometry(door.width + 0.22, 0.12, 0.32, 0.02, 0.015);
    topBeam.translate(0, 1.18, 0);
    const jambL = createBeveledBoxGeometry(0.08, 2.36, 0.3, 0.015, 0.01);
    jambL.translate(-door.width * 0.5 - 0.02, 0, 0);
    const jambR = createBeveledBoxGeometry(0.08, 2.36, 0.3, 0.015, 0.01);
    jambR.translate(door.width * 0.5 + 0.02, 0, 0);
    frameParts.push(topBeam, jambL, jambR);

    frame.add(new THREE.Mesh(mergeParts(frameParts, false), mats.darkTrim));
    group.add(frame);
  }

  // 7b. Physical Ceiling Lamp Housing aligned to cfg.interiorLightOffset
  const lampY = Math.min(ceilingH - 0.15, Math.max(2.35, cfg.interiorLightOffset.y + 0.28));
  if (exteriorStyle === 'clinic' || exteriorStyle === 'lab') {
    const housing = new THREE.Mesh(
      createBeveledBoxGeometry(1.5, 0.09, 0.3, 0.02, 0.02),
      mats.darkTrim
    );
    housing.position.set(cfg.interiorLightOffset.x, ceilingH - 0.04, cfg.interiorLightOffset.z);
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.032, 1.32, 8),
      mats.beaconCyan
    );
    tube.rotation.z = Math.PI * 0.5;
    tube.position.set(cfg.interiorLightOffset.x, ceilingH - 0.1, cfg.interiorLightOffset.z);
    group.add(housing, tube);
  } else {
    const dropLen = Math.max(0.22, ceilingH - lampY);
    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, dropLen, 6),
      mats.darkTrim
    );
    cord.position.set(cfg.interiorLightOffset.x, ceilingH - dropLen * 0.5, cfg.interiorLightOffset.z);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.2, 12, 1, true),
      mats.lampMetal
    );
    shade.position.set(cfg.interiorLightOffset.x, lampY, cfg.interiorLightOffset.z);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.085, 8, 6),
      exteriorStyle === 'last_shop' ? mats.lampBulbLit : mats.beaconAmber
    );
    bulb.position.set(cfg.interiorLightOffset.x, lampY - 0.07, cfg.interiorLightOffset.z);
    group.add(cord, shade, bulb);
  }

  // 8. Archetype Exterior & Interior Silhouette Signatures
  if (exteriorStyle === 'last_shop') {
    const frontZ = d * 0.5;

    // Curved striped canopy awning + arched iron brackets + porch posts outside doorway
    const awningGeo = createCurvedAwningGeometry(w - 1.1, 1.85, 0.65);
    const awning = new THREE.Mesh(awningGeo, mats.awning);
    awning.position.set(0, 2.72, frontZ);
    awning.castShadow = true;
    group.add(awning);

    // Ornate curved iron awning brackets & flanking timber porch columns (well clear of door)
    for (const rx of [-4.25, 4.25]) {
      const bracketPts = [
        new THREE.Vector3(rx, 2.55, frontZ + 0.05),
        new THREE.Vector3(rx, 2.68, frontZ + 0.95),
        new THREE.Vector3(rx, 2.75, frontZ + 1.65),
      ];
      const bracket = new THREE.Mesh(createTubePathGeometry(bracketPts, 0.032, 8, 6), mats.lampMetal);
      group.add(bracket);
    }

    // Timber porch columns flanking storefront bay (placed safely outside window/door corridor)
    const postGeo = createArchitecturalColumnGeometry(0.11, 2.78);
    for (const px of [-2.45, 2.45]) {
      const post = new THREE.Mesh(postGeo, intMats.cabinetWood);
      post.position.set(px, 0, frontZ + 1.55);
      post.castShadow = true;
      group.add(post);
    }

    // Beveled LAST SHOP Signboard & Rooftop Chimney + Vent Turbine
    const signFrame = new THREE.Mesh(
      createBeveledBoxGeometry(5.8, 1.3, 0.24, 0.03, 0.03),
      mats.darkTrim
    );
    signFrame.position.set(0, ceilingH + 0.52, frontZ + 0.12);
    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(5.52, 1.08, 0.14, 0.02, 0.02),
      mats.shopSign
    );
    sign.position.set(0, ceilingH + 0.52, frontZ + 0.22);
    group.add(signFrame, sign);

    const lanternHousing = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.28, 0.14, 10),
      mats.darkTrim
    );
    lanternHousing.position.set(0, 2.76, frontZ + 0.36);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.lampBulbLit);
    lantern.position.set(0, 2.62, frontZ + 0.36);
    group.add(lanternHousing, lantern);

    // Brick chimney + terracotta flue pot on West slope + rooftop exhaust
    const chimney = new THREE.Mesh(
      createBeveledBoxGeometry(0.76, 1.55, 0.76, 0.03, 0.02),
      mats.brick
    );
    chimney.position.set(-w * 0.28, ceilingH + 1.15, -d * 0.2);
    chimney.castShadow = true;
    const chimneyCap = new THREE.Mesh(
      createBeveledBoxGeometry(0.92, 0.14, 0.92, 0.02, 0.02),
      mats.concrete
    );
    chimneyCap.position.set(-w * 0.28, ceilingH + 1.94, -d * 0.2);
    const flue = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.17, 0.36, 10),
      mats.rustedMetal
    );
    flue.position.set(-w * 0.28, ceilingH + 2.16, -d * 0.2);
    const exhaustPts = [
      new THREE.Vector3(w * 0.26, ceilingH + 0.65, -d * 0.15),
      new THREE.Vector3(w * 0.26, ceilingH + 1.38, -d * 0.15),
      new THREE.Vector3(w * 0.26, ceilingH + 1.48, -d * 0.4),
    ];
    const exhaust = new THREE.Mesh(createTubePathGeometry(exhaustPts, 0.13, 10, 8), mats.lampMetal);
    group.add(chimney, chimneyCap, flue, exhaust);
  } else if (exteriorStyle === 'store') {
    const frontZ = d * 0.5;
    const awning = new THREE.Mesh(
      createCurvedAwningGeometry(w - 1.6, 1.35, 0.52),
      mats.tarpBlue
    );
    awning.position.set(0, 2.62, frontZ);
    awning.castShadow = true;
    group.add(awning);

    const fascia = new THREE.Mesh(
      createBeveledBoxGeometry(w - 0.8, 0.92, 0.22, 0.03, 0.02),
      mats.signValeStore
    );
    fascia.position.set(0, ceilingH + 0.22, frontZ + 0.14);
    group.add(fascia);

    // Angled weathered shutter planks flanking front display window
    const plank = new THREE.Mesh(
      createBeveledBoxGeometry(1.72, 0.22, 0.1, 0.015, 0.01),
      mats.wood
    );
    plank.position.set(-2.5, 1.38, frontZ + 0.09);
    plank.rotation.z = -0.11;
    group.add(plank);
  } else if (exteriorStyle === 'storage') {
    const frontZ = d * 0.5;
    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(4.2, 0.95, 0.2, 0.03, 0.02),
      mats.signDepot04
    );
    sign.position.set(0, ceilingH + 0.2, frontZ + 0.14);
    group.add(sign);

    const bayLamp = new THREE.Mesh(
      createBeveledBoxGeometry(0.92, 0.16, 0.16, 0.02, 0.02),
      mats.beaconAmber
    );
    bayLamp.position.set(0, 2.68, frontZ + 0.1);
    group.add(bayLamp);

    // Curved gooseneck rooftop ventilation stack
    const ventPts = [
      new THREE.Vector3(2.2, ceilingH + 0.5, -1.5),
      new THREE.Vector3(2.2, ceilingH + 1.35, -1.5),
      new THREE.Vector3(2.55, ceilingH + 1.45, -1.5),
    ];
    const vent = new THREE.Mesh(createTubePathGeometry(ventPts, 0.22, 10, 8), mats.lampMetal);
    group.add(vent);
  } else if (exteriorStyle === 'house') {
    const northZ = -d * 0.5;
    // Gabled timber porch hood + two turned columns
    const porchHood = new THREE.Mesh(
      createGabledRoofGeometry(3.4, 1.45, 0.72, 0.2, 0.12, true),
      mats.wood
    );
    porchHood.position.set(0, 2.75, northZ - 0.7);
    porchHood.castShadow = true;
    group.add(porchHood);

    const colGeo = createArchitecturalColumnGeometry(0.09, 2.75);
    for (const px of [-1.42, 1.42]) {
      const col = new THREE.Mesh(colGeo, mats.wood);
      col.position.set(px, 0, northZ - 1.28);
      col.castShadow = true;
      group.add(col);
    }

    // Slatted wooden shutters + crooked broken board on front window
    const board = new THREE.Mesh(
      createBeveledBoxGeometry(1.58, 0.18, 0.09, 0.015, 0.01),
      mats.wood
    );
    board.position.set(2.4, 1.52, northZ - 0.08);
    board.rotation.z = 0.09;
    group.add(board);

    const chimney = new THREE.Mesh(
      createBeveledBoxGeometry(0.88, 2.25, 0.88, 0.03, 0.02),
      mats.brick
    );
    chimney.position.set(-3.2, ceilingH + 1.22, 2.4);
    chimney.castShadow = true;
    const chCap = new THREE.Mesh(
      createBeveledBoxGeometry(1.04, 0.14, 1.04, 0.02, 0.02),
      mats.concrete
    );
    chCap.position.set(-3.2, ceilingH + 2.38, 2.4);
    group.add(chimney, chCap);
  } else if (exteriorStyle === 'diner') {
    const northZ = -d * 0.5;
    // Streamlined curved mid-century visor canopy + neon tube
    const canopy = new THREE.Mesh(
      createCurvedAwningGeometry(w + 0.5, 1.45, 0.36),
      mats.hydrantRed
    );
    canopy.position.set(0, 2.78, northZ);
    canopy.rotation.y = Math.PI;
    canopy.castShadow = true;
    group.add(canopy);

    const dinerNeon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, w + 0.42, 8),
      mats.beaconAmber
    );
    dinerNeon.rotation.z = Math.PI * 0.5;
    dinerNeon.position.set(0, 2.75, northZ - 1.42);
    group.add(dinerNeon);

    const dinerPorchBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      mats.lampBulbLit
    );
    dinerPorchBulb.position.set(0, 2.66, northZ - 0.48);
    group.add(dinerPorchBulb);

    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(4.8, 0.96, 0.22, 0.03, 0.02),
      mats.signStarlightDiner
    );
    sign.position.set(0, ceilingH + 0.28, northZ - 0.16);
    group.add(sign);
  } else if (exteriorStyle === 'garage') {
    const northZ = -d * 0.5;
    const fascia = new THREE.Mesh(
      createBeveledBoxGeometry(5.2, 0.98, 0.22, 0.03, 0.02),
      mats.signRedlineAuto
    );
    fascia.position.set(0, ceilingH + 0.22, northZ - 0.15);
    group.add(fascia);

    // Ribbed corrugated steel roll-up shutter on west bay (actual 3D horizontal ribs)
    const shutterParts: THREE.BufferGeometry[] = [];
    const shutterBack = createBeveledBoxGeometry(4.0, 2.45, 0.1, 0.02, 0.01);
    shutterParts.push(shutterBack);
    for (let sy = -1.05; sy <= 1.08; sy += 0.22) {
      const rib = createBeveledBoxGeometry(3.92, 0.08, 0.17, 0.015, 0.01);
      rib.translate(0, sy, -0.02);
      shutterParts.push(rib);
    }
    const shutter = new THREE.Mesh(mergeParts(shutterParts, true, 0.5), mats.rustedMetal);
    shutter.position.set(-3.1, 1.24, northZ - 0.05);
    shutter.castShadow = true;
    group.add(shutter);

    const serviceLight = new THREE.Mesh(
      createBeveledBoxGeometry(0.85, 0.14, 0.14, 0.02, 0.02),
      mats.beaconAmber
    );
    serviceLight.position.set(1.6, 2.66, northZ - 0.12);
    group.add(serviceLight);

    const exhaustPts = [
      new THREE.Vector3(3.4, ceilingH + 0.35, 1.8),
      new THREE.Vector3(3.4, ceilingH + 1.35, 1.8),
      new THREE.Vector3(3.7, ceilingH + 1.45, 1.8),
    ];
    const vent = new THREE.Mesh(createTubePathGeometry(exhaustPts, 0.2, 10, 8), mats.lampMetal);
    group.add(vent);
  } else if (exteriorStyle === 'police') {
    const northZ = -d * 0.5;
    // Classical civic columns flanking main precinct doorway
    const colGeo = createArchitecturalColumnGeometry(0.14, ceilingH);
    for (const px of [-1.25, 1.25]) {
      const col = new THREE.Mesh(colGeo, mats.concrete);
      col.position.set(px, 0, northZ - 0.35);
      col.castShadow = true;
      group.add(col);
    }

    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(5.8, 1.0, 0.24, 0.03, 0.02),
      mats.signPolicePrecinct
    );
    sign.position.set(0, ceilingH + 0.22, northZ - 0.24);
    group.add(sign);

    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mats.beaconBlue);
    globe.position.set(0, 2.72, northZ - 0.28);
    group.add(globe);

    const roofStrobe = new THREE.Mesh(
      createBeveledBoxGeometry(1.15, 0.24, 0.3, 0.04, 0.04),
      mats.beaconBlue
    );
    roofStrobe.position.set(0, ceilingH + 1.12, northZ + 0.65);
    group.add(roofStrobe);

    // Steel security bars across front windows
    const barGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.42, 6);
    for (const wx of [-3.1, 3.1]) {
      for (let b = -0.9; b <= 0.91; b += 0.45) {
        const bar = new THREE.Mesh(barGeo, mats.lampMetal);
        bar.position.set(wx + b, 1.7, northZ - 0.14);
        group.add(bar);
      }
    }
  } else if (exteriorStyle === 'clinic') {
    // MERCY FIELD CLINIC — Architectural Hospital Upgrade
    const northZ = -d * 0.5;

    // 1. Pillared Ambulance Porte-Cochère Canopy
    const canopy = new THREE.Mesh(
      createBeveledBoxGeometry(5.6, 0.28, 1.75, 0.04, 0.08),
      mats.concrete
    );
    canopy.position.set(0, 2.95, northZ - 0.78);
    canopy.castShadow = true;
    group.add(canopy);

    const colGeo = createArchitecturalColumnGeometry(0.13, 2.86);
    for (const sx of [-2.45, 2.45]) {
      const col = new THREE.Mesh(colGeo, mats.concrete);
      col.position.set(sx, 0, northZ - 1.38);
      col.castShadow = true;
      group.add(col);
    }

    const triageStrip = new THREE.Mesh(
      createBeveledBoxGeometry(5.46, 0.1, 0.1, 0.02, 0.02),
      mats.beaconCyan
    );
    triageStrip.position.set(0, 2.95, northZ - 1.65);
    group.add(triageStrip);

    // 2. Facade Architectural Bays & Illuminated Red Cross Emblem
    const bayPilasters: THREE.BufferGeometry[] = [];
    for (const bx of [-4.45, -1.78, 1.78, 4.45]) {
      const pil = createBeveledBoxGeometry(0.28, ceilingH, 0.24, 0.025, 0.02);
      pil.translate(bx, ceilingH * 0.5, northZ - 0.08);
      bayPilasters.push(pil);
    }
    group.add(new THREE.Mesh(mergeParts(bayPilasters, true, 0.4), mats.concrete));

    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(5.4, 1.02, 0.24, 0.03, 0.02),
      mats.signFieldClinic
    );
    sign.position.set(0, ceilingH + 0.24, northZ - 0.18);
    group.add(sign);

    const crossBack = new THREE.Mesh(
      createBeveledBoxGeometry(1.16, 1.16, 0.1, 0.03, 0.06),
      mats.darkTrim
    );
    crossBack.position.set(-4.2, 2.58, northZ - 0.14);
    const crossH = new THREE.Mesh(
      createBeveledBoxGeometry(0.85, 0.24, 0.14, 0.02, 0.02),
      mats.beaconRed
    );
    crossH.position.set(-4.2, 2.58, northZ - 0.18);
    const crossV = new THREE.Mesh(
      createBeveledBoxGeometry(0.24, 0.85, 0.14, 0.02, 0.02),
      mats.beaconRed
    );
    crossV.position.set(-4.2, 2.58, northZ - 0.18);
    group.add(crossBack, crossH, crossV);

    // 3. Rooftop HVAC Penthouse + Curved Sterile Ducts
    const clinicVent = new THREE.Mesh(
      createBeveledBoxGeometry(1.45, 0.78, 1.25, 0.04, 0.04),
      mats.rustedMetal
    );
    clinicVent.position.set(3.2, ceilingH + 1.0, 1.2);
    const ductPts = [
      new THREE.Vector3(2.48, ceilingH + 0.95, 1.2),
      new THREE.Vector3(1.85, ceilingH + 0.95, 1.2),
      new THREE.Vector3(1.85, ceilingH + 0.55, 1.2),
    ];
    const clinicDuct = new THREE.Mesh(createTubePathGeometry(ductPts, 0.16, 8, 8), mats.lampMetal);
    group.add(clinicVent, clinicDuct);

    // 4. Interior Hospital Equipment: Medical Chart, Privacy Screen, Oxygen Cylinder & Wheeled Tray Cart
    const medChart = new THREE.Mesh(
      createBeveledBoxGeometry(1.25, 0.9, 0.06, 0.015, 0.02),
      intMats.porcelain
    );
    medChart.position.set(-1.6, 1.75, 0.08);
    const chartStripe = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.12, 0.07),
      mats.beaconCyan
    );
    chartStripe.position.set(-1.6, 2.02, 0.09);

    // Curved overhead triage privacy curtain track + draped curtain beside Exam Bed
    const curtainRailPts = [
      new THREE.Vector3(-0.32, 2.38, 1.45),
      new THREE.Vector3(-0.32, 2.38, 2.65),
      new THREE.Vector3(-0.85, 2.38, 3.65),
    ];
    const curtainRail = new THREE.Mesh(
      createTubePathGeometry(curtainRailPts, 0.02, 10, 6),
      mats.lampMetal
    );
    const curtainSheet = new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 1.85, 6, 1),
      intMats.fabricDusty
    );
    const cPos = curtainSheet.geometry.attributes.position;
    for (let i = 0; i < cPos.count; i++) {
      cPos.setZ(i, Math.sin(cPos.getX(i) * 9.0) * 0.055);
    }
    curtainSheet.geometry.computeVertexNormals();
    curtainSheet.rotation.y = Math.PI * 0.5;
    curtainSheet.position.set(-0.32, 1.42, 2.55);

    // Pressurized oxygen tank + brass valve next to Exam Bed
    const o2Tank = new THREE.Mesh(
      createPressurizedTankGeometry(0.11, 0.98),
      mats.lampMetal
    );
    o2Tank.position.set(-0.78, 0.02, 3.55);
    o2Tank.castShadow = true;
    const o2Collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.115, 0.115, 0.18, 10),
      mats.beaconCyan
    );
    o2Collar.position.set(-0.78, 0.72, 3.55);

    // IV Drip Stand with curved hook + hanging IV bag + Vital Monitor
    const ivPts = [
      new THREE.Vector3(-2.38, 0.05, 1.85),
      new THREE.Vector3(-2.38, 1.72, 1.85),
      new THREE.Vector3(-2.24, 1.84, 1.85),
    ];
    const ivPole = new THREE.Mesh(createTubePathGeometry(ivPts, 0.022, 10, 6), mats.lampMetal);
    const ivBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.24, 0.05, 5),
      mats.darkTrim
    );
    ivBase.position.set(-2.38, 0.03, 1.85);
    const ivBag = new THREE.Mesh(
      createBeveledBoxGeometry(0.14, 0.24, 0.07, 0.02, 0.02),
      mats.beaconCyan
    );
    ivBag.position.set(-2.24, 1.62, 1.85);

    const monitorScreen = new THREE.Mesh(
      createBeveledBoxGeometry(0.34, 0.26, 0.2, 0.025, 0.03),
      mats.darkTrim
    );
    monitorScreen.position.set(-2.35, 1.02, 2.9);
    const monitorGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.15, 0.03),
      mats.beaconCyan
    );
    monitorGlow.position.set(-2.35, 1.04, 2.79);

    group.add(
      medChart,
      chartStripe,
      curtainRail,
      curtainSheet,
      o2Tank,
      o2Collar,
      ivPole,
      ivBase,
      ivBag,
      monitorScreen,
      monitorGlow
    );
  } else if (exteriorStyle === 'lab') {
    const southZ = d * 0.5;
    // Brutalist angled exterior concrete buttresses along West, East & North walls
    const buttressGeo = createButtressGeometry(0.68, 0.22, ceilingH * 0.92, 0.34);
    for (const bx of [-4.2, 4.2]) {
      const buttN = new THREE.Mesh(buttressGeo, mats.concrete);
      buttN.rotation.y = Math.PI * 0.5;
      buttN.position.set(bx, 0, -d * 0.5);
      buttN.castShadow = true;
      group.add(buttN);
    }
    for (const bz of [-1.8, 1.8]) {
      const buttW = new THREE.Mesh(buttressGeo, mats.concrete);
      buttW.rotation.y = Math.PI;
      buttW.position.set(-w * 0.5, 0, bz);
      buttW.castShadow = true;
      const buttE = new THREE.Mesh(buttressGeo, mats.concrete);
      buttE.position.set(w * 0.5, 0, bz);
      buttE.castShadow = true;
      group.add(buttW, buttE);
    }

    // Chamfered airlock blast canopy
    const airlock = new THREE.Mesh(
      createBeveledBoxGeometry(3.3, 0.34, 1.38, 0.06, 0.06),
      mats.darkTrim
    );
    airlock.position.set(0, 2.9, southZ + 0.58);
    airlock.castShadow = true;
    group.add(airlock);

    const airlockBeacon = new THREE.Mesh(
      createBeveledBoxGeometry(3.15, 0.1, 0.12, 0.02, 0.02),
      mats.beaconAmber
    );
    airlockBeacon.position.set(0, 2.9, southZ + 1.24);
    group.add(airlockBeacon);

    const sign = new THREE.Mesh(
      createBeveledBoxGeometry(5.8, 1.04, 0.24, 0.03, 0.02),
      mats.signResearchLab
    );
    sign.position.set(0, ceilingH + 0.22, southZ + 0.16);
    group.add(sign);

    // Rooftop parabolic communications dish + curved heavy conduit
    const dish = new THREE.Mesh(
      new THREE.CylinderGeometry(0.68, 0.16, 0.45, 14),
      mats.lampMetal
    );
    dish.position.set(3.2, ceilingH + 1.1, -1.5);
    dish.rotation.x = 0.45;
    group.add(dish);

    const dishBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), mats.beaconRed);
    dishBeacon.position.set(3.2, ceilingH + 1.4, -1.4);
    group.add(dishBeacon);

    const conduitPts = [
      new THREE.Vector3(-1.6, ceilingH + 1.05, -0.4),
      new THREE.Vector3(1.2, ceilingH + 1.05, -0.4),
      new THREE.Vector3(1.2, ceilingH + 0.65, -2.5),
    ];
    group.add(new THREE.Mesh(createTubePathGeometry(conduitPts, 0.12, 10, 6), mats.rustedMetal));
  }

  return group;
}

/**
 * Builds an interactive 3D door pivoted around local X = 0 extending along +X to `width`.
 * Uses beveled panel leaf, raised recessed moldings, and curved lever handles.
 */
export function buildInteriorDoorModel(
  door: BuildingDoorLocal,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const pivot = new THREE.Group();
  const leafMat = door.kind === 'wood' ? intMats.cabinetWood : mats.lampMetal;

  const leafParts: THREE.BufferGeometry[] = [];
  const leaf = createBeveledBoxGeometry(door.width - 0.04, 2.3, 0.08, 0.014, 0.01);
  leaf.translate(door.width * 0.5, 1.15, 0);
  leafParts.push(leaf);

  const leafMesh = new THREE.Mesh(mergeParts(leafParts, true, 0.5), leafMat);
  leafMesh.castShadow = true;
  leafMesh.receiveShadow = true;

  // Raised rail & stile trim panels
  const trimParts: THREE.BufferGeometry[] = [];
  const upperPanel = createBeveledBoxGeometry(door.width * 0.64, 0.78, 0.1, 0.012, 0.01);
  upperPanel.translate(door.width * 0.5, 1.62, 0);
  const lowerPanel = createBeveledBoxGeometry(door.width * 0.64, 0.68, 0.1, 0.012, 0.01);
  lowerPanel.translate(door.width * 0.5, 0.64, 0);
  trimParts.push(upperPanel, lowerPanel);
  const trimMesh = new THREE.Mesh(mergeParts(trimParts, false), mats.darkTrim);

  // Curved brass lever handles on both sides
  const handlePts = [
    new THREE.Vector3(door.width - 0.16, 1.02, -0.11),
    new THREE.Vector3(door.width - 0.16, 1.02, 0.11),
  ];
  const spindle = new THREE.Mesh(
    createTubePathGeometry(handlePts, 0.018, 4, 6),
    intMats.brassHandle
  );
  const leverF = new THREE.Mesh(
    createBeveledBoxGeometry(0.14, 0.032, 0.035, 0.008, 0.01),
    intMats.brassHandle
  );
  leverF.position.set(door.width - 0.22, 1.02, 0.11);
  const leverB = new THREE.Mesh(
    createBeveledBoxGeometry(0.14, 0.032, 0.035, 0.008, 0.01),
    intMats.brassHandle
  );
  leverB.position.set(door.width - 0.22, 1.02, -0.11);

  pivot.add(leafMesh, trimMesh, spindle, leverF, leverB);

  if (door.lockedKeyId) {
    const lockPlate = new THREE.Mesh(
      createBeveledBoxGeometry(0.18, 0.26, 0.15, 0.015, 0.02),
      mats.darkTrim
    );
    lockPlate.position.set(door.width - 0.18, 1.24, 0);
    const lockLed = new THREE.Mesh(
      createBeveledBoxGeometry(0.09, 0.11, 0.165, 0.01, 0.015),
      door.kind === 'metal' ? mats.beaconRed : mats.beaconAmber
    );
    lockLed.position.set(door.width - 0.18, 1.27, 0);
    const hazardBar = new THREE.Mesh(
      new THREE.BoxGeometry(door.width * 0.78, 0.08, 0.096),
      mats.hazardStripe
    );
    hazardBar.position.set(door.width * 0.5, 0.86, 0);
    pivot.add(lockPlate, lockLed, hazardBar);
  }

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
      const baseParts: THREE.BufferGeometry[] = [];
      const body = createBeveledBoxGeometry(w - 0.04, 0.82, d - 0.06, 0.02, 0.02);
      body.translate(0, 0.49, 0);
      baseParts.push(body);
      const kick = createBeveledBoxGeometry(w - 0.12, 0.1, d - 0.14, 0.01, 0.01);
      kick.translate(0, 0.05, 0);
      baseParts.push(kick);
      // Recessed paneling pilasters along front face
      const panelCount = Math.max(2, Math.round(w / 0.85));
      for (let i = 0; i <= panelCount; i++) {
        const px = -w * 0.46 + (i / panelCount) * (w * 0.92);
        const stile = createBeveledBoxGeometry(0.07, 0.76, 0.06, 0.01, 0.01);
        stile.translate(px, 0.49, d * 0.47);
        baseParts.push(stile);
      }
      const baseMesh = new THREE.Mesh(mergeParts(baseParts, true, 0.5), intMats.cabinetWood);
      baseMesh.castShadow = true;
      baseMesh.receiveShadow = true;

      const top = new THREE.Mesh(
        createBeveledBoxGeometry(w + 0.1, 0.07, d + 0.1, 0.02, 0.03),
        mats.concrete
      );
      top.position.y = 0.935;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(baseMesh, top);
      break;
    }
    case 'shelf': {
      const frameParts: THREE.BufferGeometry[] = [];
      for (const [lx, lz] of [
        [-w * 0.46, -d * 0.42],
        [w * 0.46, -d * 0.42],
        [-w * 0.46, d * 0.42],
        [w * 0.46, d * 0.42],
      ]) {
        const leg = new THREE.CylinderGeometry(0.028, 0.032, 1.68, 6);
        leg.translate(lx, 0.84, lz);
        frameParts.push(leg);
      }
      // Diagonal X-brace along rear
      const braceA = new THREE.CylinderGeometry(0.015, 0.015, Math.hypot(w * 0.85, 1.3), 5);
      braceA.rotateZ(Math.atan2(w * 0.85, 1.3));
      braceA.translate(0, 0.92, -d * 0.42);
      frameParts.push(braceA);

      const frameMesh = new THREE.Mesh(mergeParts(frameParts, false), mats.lampMetal);
      frameMesh.castShadow = true;
      group.add(frameMesh);

      const plankParts: THREE.BufferGeometry[] = [];
      for (const py of [0.22, 0.92, 1.62]) {
        const p = createBeveledBoxGeometry(w, 0.055, d, 0.012, 0.015);
        p.translate(0, py, 0);
        plankParts.push(p);
      }
      const planksMesh = new THREE.Mesh(mergeParts(plankParts, true, 0.6), mats.wood);
      planksMesh.receiveShadow = true;
      group.add(planksMesh);
      break;
    }
    case 'table': {
      const top = new THREE.Mesh(
        createBeveledBoxGeometry(w, 0.07, d, 0.02, 0.04),
        mats.wood
      );
      top.position.y = 0.745;
      top.castShadow = true;
      top.receiveShadow = true;
      group.add(top);

      const frameParts: THREE.BufferGeometry[] = [];
      const apronF = createBeveledBoxGeometry(w * 0.82, 0.09, 0.04, 0.008, 0.005);
      apronF.translate(0, 0.66, d * 0.36);
      const apronB = createBeveledBoxGeometry(w * 0.82, 0.09, 0.04, 0.008, 0.005);
      apronB.translate(0, 0.66, -d * 0.36);
      frameParts.push(apronF, apronB);

      for (const [lx, lz] of [
        [-w * 0.43, -d * 0.38],
        [w * 0.43, -d * 0.38],
        [-w * 0.43, d * 0.38],
        [w * 0.43, d * 0.38],
      ]) {
        const leg = new THREE.CylinderGeometry(0.036, 0.024, 0.71, 8);
        leg.translate(lx, 0.355, lz);
        frameParts.push(leg);
      }
      const legsMesh = new THREE.Mesh(mergeParts(frameParts, false), mats.darkTrim);
      legsMesh.castShadow = true;
      group.add(legsMesh);
      break;
    }
    case 'couch': {
      const cushParts: THREE.BufferGeometry[] = [];
      const basePlinth = createBeveledBoxGeometry(w - 0.08, 0.14, d - 0.08, 0.02, 0.03);
      basePlinth.translate(0, 0.1, 0);
      cushParts.push(basePlinth);

      // Two contoured rounded seat cushions
      const cw = (w - 0.38) * 0.5;
      for (const cx of [-cw * 0.52, cw * 0.52]) {
        const seatC = createBeveledBoxGeometry(cw, 0.2, d - 0.18, 0.055, 0.08);
        seatC.translate(cx, 0.26, 0.04);
        const backC = createBeveledBoxGeometry(cw, 0.44, 0.22, 0.055, 0.08);
        backC.rotateX(-0.14);
        backC.translate(cx, 0.56, -d * 0.34);
        cushParts.push(seatC, backC);
      }

      // Rounded rolled armrests
      for (const ax of [-w * 0.44, w * 0.44]) {
        const arm = createBeveledBoxGeometry(0.2, 0.42, d - 0.04, 0.06, 0.08);
        arm.translate(ax, 0.36, 0);
        cushParts.push(arm);
      }
      const couchMesh = new THREE.Mesh(mergeParts(cushParts, false), intMats.fabricDusty);
      couchMesh.castShadow = true;
      couchMesh.receiveShadow = true;
      group.add(couchMesh);
      break;
    }
    case 'bed': {
      const woodParts: THREE.BufferGeometry[] = [];
      const frame = createBeveledBoxGeometry(w, 0.2, d, 0.02, 0.03);
      frame.translate(0, 0.18, 0);
      const headboard = createBeveledBoxGeometry(w, 0.86, 0.09, 0.025, 0.04);
      headboard.translate(0, 0.48, d * 0.46);
      woodParts.push(frame, headboard);
      for (const [lx, lz] of [
        [-w * 0.46, -d * 0.46],
        [w * 0.46, -d * 0.46],
        [-w * 0.46, d * 0.46],
        [w * 0.46, d * 0.46],
      ]) {
        const post = new THREE.CylinderGeometry(0.045, 0.04, 0.58, 8);
        post.translate(lx, 0.29, lz);
        woodParts.push(post);
      }
      const bedFrame = new THREE.Mesh(mergeParts(woodParts, true, 0.5), intMats.cabinetWood);
      bedFrame.castShadow = true;

      const mattress = new THREE.Mesh(
        createBeveledBoxGeometry(w - 0.12, 0.22, d - 0.12, 0.06, 0.08),
        intMats.fabricDusty
      );
      mattress.position.y = 0.38;
      mattress.castShadow = true;

      const blanket = new THREE.Mesh(
        createBeveledBoxGeometry(w - 0.06, 0.14, d * 0.62, 0.045, 0.06),
        intMats.rugWeathered
      );
      blanket.position.set(0, 0.45, -d * 0.15);

      const pillow = new THREE.Mesh(
        createBeveledBoxGeometry(w * 0.62, 0.14, 0.38, 0.05, 0.09),
        intMats.porcelain
      );
      pillow.position.set(0, 0.53, d * 0.31);
      group.add(bedFrame, mattress, blanket, pillow);
      break;
    }
    case 'kitchen_counter': {
      const body = new THREE.Mesh(
        createBeveledBoxGeometry(w, 0.84, d, 0.02, 0.02),
        intMats.plasterWall
      );
      body.position.y = 0.42;
      body.castShadow = true;

      const top = new THREE.Mesh(
        createBeveledBoxGeometry(w + 0.06, 0.06, d + 0.06, 0.02, 0.02),
        mats.wood
      );
      top.position.y = 0.87;

      const sinkBasin = new THREE.Mesh(createPorcelainBasinGeometry(0.22, 0.12), mats.lampMetal);
      sinkBasin.position.set(w * 0.22, 0.82, 0);

      const faucetPts = [
        new THREE.Vector3(w * 0.22, 0.9, -0.18),
        new THREE.Vector3(w * 0.22, 1.12, -0.16),
        new THREE.Vector3(w * 0.22, 1.14, -0.02),
        new THREE.Vector3(w * 0.22, 1.05, 0.02),
      ];
      const faucet = new THREE.Mesh(
        createTubePathGeometry(faucetPts, 0.018, 8, 6),
        intMats.brassHandle
      );
      group.add(body, top, sinkBasin, faucet);
      break;
    }
    case 'sink_vanity': {
      const cab = new THREE.Mesh(
        createBeveledBoxGeometry(w, 0.78, d, 0.02, 0.02),
        intMats.cabinetWood
      );
      cab.position.y = 0.39;
      cab.castShadow = true;

      const top = new THREE.Mesh(
        createBeveledBoxGeometry(w + 0.06, 0.07, d + 0.06, 0.02, 0.02),
        intMats.porcelain
      );
      top.position.y = 0.81;

      const bowl = new THREE.Mesh(createPorcelainBasinGeometry(0.21, 0.13), intMats.porcelain);
      bowl.position.set(0, 0.78, 0.02);

      const faucetPts = [
        new THREE.Vector3(0, 0.84, -0.15),
        new THREE.Vector3(0, 1.04, -0.12),
        new THREE.Vector3(0, 1.04, 0.0),
      ];
      const faucet = new THREE.Mesh(
        createTubePathGeometry(faucetPts, 0.016, 8, 6),
        mats.lampMetal
      );

      const mirrorFrame = new THREE.Mesh(
        createBeveledBoxGeometry(w * 0.78, 0.78, 0.06, 0.015, 0.02),
        intMats.cabinetWood
      );
      mirrorFrame.position.set(0, 1.55, -d * 0.42);
      const mirror = new THREE.Mesh(
        createBeveledBoxGeometry(w * 0.66, 0.66, 0.04, 0.005, 0.01),
        mats.glassDark
      );
      mirror.position.set(0, 1.55, -d * 0.39);
      group.add(cab, top, bowl, faucet, mirrorFrame, mirror);
      break;
    }
    case 'pallet_crates': {
      // Actual slatted wood pallet deck instead of solid slab
      const palletParts: THREE.BufferGeometry[] = [];
      for (let sz = -d * 0.42; sz <= d * 0.43; sz += d * 0.42) {
        const stringer = createBeveledBoxGeometry(w, 0.06, 0.09, 0.008, 0.005);
        stringer.translate(0, 0.03, sz);
        palletParts.push(stringer);
      }
      const slats = 5;
      for (let i = 0; i < slats; i++) {
        const sx = -w * 0.42 + (i / (slats - 1)) * (w * 0.84);
        const slat = createBeveledBoxGeometry(w / (slats * 1.35), 0.035, d, 0.006, 0.004);
        slat.translate(sx, 0.08, 0);
        palletParts.push(slat);
      }
      const c1 = createBeveledBoxGeometry(0.56, 0.5, 0.56, 0.025, 0.02);
      c1.translate(-0.18, 0.35, 0.12);
      palletParts.push(c1);

      const palletMesh = new THREE.Mesh(mergeParts(palletParts, true, 0.6), mats.wood);
      palletMesh.castShadow = true;
      palletMesh.receiveShadow = true;

      const c2 = new THREE.Mesh(
        createBeveledBoxGeometry(0.46, 0.42, 0.46, 0.025, 0.02),
        mats.darkTrim
      );
      c2.position.set(0.24, 0.31, -0.18);
      c2.rotation.y = 0.35;
      c2.castShadow = true;
      group.add(palletMesh, c2);
      break;
    }
    case 'rug': {
      const mat = new THREE.Mesh(
        createBeveledBoxGeometry(w, 0.018, d, 0.008, 0.04),
        intMats.rugWeathered
      );
      mat.position.y = 0.01;
      mat.receiveShadow = true;
      group.add(mat);
      break;
    }
    case 'broken_chair': {
      const chairParts: THREE.BufferGeometry[] = [];
      const seat = createBeveledBoxGeometry(0.46, 0.055, 0.46, 0.015, 0.04);
      seat.translate(0, 0.42, 0);
      chairParts.push(seat);

      const topRail = createBeveledBoxGeometry(0.46, 0.09, 0.055, 0.012, 0.02);
      topRail.translate(0, 0.9, -0.2);
      chairParts.push(topRail);
      for (const sx of [-0.18, -0.06, 0.06, 0.18]) {
        const spindle = new THREE.CylinderGeometry(0.018, 0.02, 0.46, 6);
        spindle.translate(sx, 0.66, -0.2);
        chairParts.push(spindle);
      }
      for (const [lx, lz] of [
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ]) {
        const leg = new THREE.CylinderGeometry(0.024, 0.018, 0.42, 6);
        leg.translate(lx, 0.21, lz);
        chairParts.push(leg);
      }
      const chairMesh = new THREE.Mesh(mergeParts(chairParts, true, 0.8), intMats.cabinetWood);
      chairMesh.castShadow = true;
      group.rotation.z = 0.14;
      group.add(chairMesh);
      break;
    }
  }

  return group;
}

/**
 * Builds searchable interior containers (cabinets, drawers, boxes, wall medical cabinets)
 * with beveled silhouettes, molded doors, curved pulls, and articulated pivots.
 */
export function buildSearchableContainerModel(
  kind: SearchContainerKind,
  mats: MaterialPalette,
  resMats: ResourceMaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  if (kind === 'cabinet') {
    const bodyParts: THREE.BufferGeometry[] = [];
    const main = createBeveledBoxGeometry(0.96, 1.32, 0.5, 0.02, 0.02);
    main.translate(0, 0.69, 0);
    const crown = createBeveledBoxGeometry(1.02, 0.08, 0.54, 0.02, 0.02);
    crown.translate(0, 1.38, 0);
    bodyParts.push(main, crown);

    const body = new THREE.Mesh(mergeParts(bodyParts, true, 0.6), intMats.cabinetWood);
    body.castShadow = true;
    body.receiveShadow = true;

    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.2, 0.04), mats.darkTrim);
    recess.position.set(0, 0.69, 0.24);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.44, 0.69, 0.26);

    const door = new THREE.Mesh(
      createBeveledBoxGeometry(0.88, 1.24, 0.05, 0.014, 0.015),
      intMats.interiorWoodWall
    );
    door.position.set(0.44, 0, 0);

    const pullPts = [
      new THREE.Vector3(0.79, 0.08, 0.02),
      new THREE.Vector3(0.79, 0.08, 0.07),
      new THREE.Vector3(0.79, -0.08, 0.07),
      new THREE.Vector3(0.79, -0.08, 0.02),
    ];
    const knob = new THREE.Mesh(
      createTubePathGeometry(pullPts, 0.014, 6, 5),
      intMats.brassHandle
    );

    doorPivot.add(door, knob);
    group.add(body, recess, doorPivot);
    group.userData.animPivot = doorPivot;
    group.userData.animKind = 'door';
  } else if (kind === 'drawer') {
    const body = new THREE.Mesh(
      createBeveledBoxGeometry(0.76, 0.72, 0.46, 0.02, 0.02),
      intMats.cabinetWood
    );
    body.position.y = 0.36;
    body.castShadow = true;

    const drawerPivot = new THREE.Group();
    drawerPivot.position.set(0, 0.56, 0.22);

    const face = new THREE.Mesh(
      createBeveledBoxGeometry(0.68, 0.2, 0.06, 0.015, 0.015),
      intMats.interiorWoodWall
    );
    const tray = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.34), mats.wood);
    tray.position.z = -0.17;
    const pullPts = [
      new THREE.Vector3(-0.08, 0, 0.03),
      new THREE.Vector3(-0.08, 0, 0.07),
      new THREE.Vector3(0.08, 0, 0.07),
      new THREE.Vector3(0.08, 0, 0.03),
    ];
    const pull = new THREE.Mesh(
      createTubePathGeometry(pullPts, 0.012, 6, 5),
      intMats.brassHandle
    );

    drawerPivot.add(face, tray, pull);
    group.add(body, drawerPivot);
    group.userData.animPivot = drawerPivot;
    group.userData.animKind = 'drawer';
  } else if (kind === 'med_cabinet') {
    const body = new THREE.Mesh(
      createBeveledBoxGeometry(0.58, 0.72, 0.22, 0.025, 0.04),
      resMats.medCaseWhite
    );
    body.position.y = 0.36;
    body.castShadow = true;

    const recess = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.62, 0.03), mats.darkTrim);
    recess.position.set(0, 0.36, 0.1);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.26, 0.36, 0.12);

    const door = new THREE.Mesh(
      createBeveledBoxGeometry(0.52, 0.66, 0.045, 0.014, 0.03),
      resMats.medCaseWhite
    );
    door.position.set(0.26, 0, 0);
    const crossH = new THREE.Mesh(
      createBeveledBoxGeometry(0.18, 0.05, 0.02, 0.005, 0.005),
      mats.hydrantRed
    );
    crossH.position.set(0.26, 0, 0.025);
    const crossV = new THREE.Mesh(
      createBeveledBoxGeometry(0.05, 0.18, 0.02, 0.005, 0.005),
      mats.hydrantRed
    );
    crossV.position.set(0.26, 0, 0.025);

    doorPivot.add(door, crossH, crossV);
    group.add(body, recess, doorPivot);
    group.userData.animPivot = doorPivot;
    group.userData.animKind = 'door';
  } else {
    // storage_box — beveled timber supply chest with iron straps
    const base = new THREE.Mesh(
      createBeveledBoxGeometry(0.8, 0.42, 0.52, 0.025, 0.02),
      mats.wood
    );
    base.position.y = 0.21;
    base.castShadow = true;
    const interior = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.42), mats.darkTrim);
    interior.position.y = 0.41;

    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, 0.42, -0.26);

    const lid = new THREE.Mesh(
      createBeveledBoxGeometry(0.84, 0.09, 0.54, 0.025, 0.025),
      mats.wood
    );
    lid.position.set(0, 0.045, 0.26);
    const latch = new THREE.Mesh(
      createBeveledBoxGeometry(0.14, 0.07, 0.04, 0.01, 0.01),
      intMats.brassHandle
    );
    latch.position.set(0, 0.01, 0.53);

    lidPivot.add(lid, latch);
    group.add(base, interior, lidPivot);
    group.userData.animPivot = lidPivot;
    group.userData.animKind = 'lid';
  }

  return group;
}
