import * as THREE from 'three';
import { RESOURCE_ORDER } from '../../game/resources';
import { InventoryState, ResourceId } from '../../game/types';
import { AssetManager } from '../../engine/AssetManager';
import { BoxCollider, FloorZone, SafeZoneBounds, WorldColliders } from '../../engine/WorldBuilder';
import {
  INTERIOR_FLOOR_OFFSET,
  InteriorMaterialPalette,
  buildFurnitureModel,
} from './interiorBuildings';
import { MaterialPalette, createFramedSignAssembly } from './proceduralModels';
import { ResourceMaterialPalette, buildResourceModel } from './resourceModels';
import {
  applyTriplanarUVs,
  createBeveledBoxGeometry,
  createGableEndWallGeometry,
  createGabledRoofGeometry,
  createTubePathGeometry,
  mergeParts,
} from './proceduralGeometryKit';

/**
 * Multi-part procedural cash register & trade ledger sitting on The Last Shop counter.
 */
export function buildShopRegisterModel(
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const drawerBase = new THREE.Mesh(
    createBeveledBoxGeometry(0.56, 0.14, 0.44, 0.02, 0.02),
    mats.darkTrim
  );
  drawerBase.position.y = 0.07;
  drawerBase.castShadow = true;
  drawerBase.receiveShadow = true;

  const pullPts = [
    new THREE.Vector3(-0.07, 0.07, 0.22),
    new THREE.Vector3(-0.07, 0.07, 0.25),
    new THREE.Vector3(0.07, 0.07, 0.25),
    new THREE.Vector3(0.07, 0.07, 0.22),
  ];
  const drawerPull = new THREE.Mesh(
    createTubePathGeometry(pullPts, 0.012, 6, 5),
    intMats.brassHandle
  );

  // Sloped/arched vintage register housing
  const upperShape = new THREE.Shape();
  upperShape.moveTo(-0.18, 0);
  upperShape.lineTo(0.16, 0);
  upperShape.lineTo(0.16, 0.11);
  upperShape.lineTo(0.02, 0.22);
  upperShape.lineTo(-0.16, 0.24);
  upperShape.closePath();
  const upperGeo = new THREE.ExtrudeGeometry(upperShape, {
    depth: 0.44,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  upperGeo.translate(0, 0, -0.22);
  upperGeo.rotateY(-Math.PI * 0.5);
  applyTriplanarUVs(upperGeo, 0.8);

  const upperBody = new THREE.Mesh(upperGeo, mats.lampMetal);
  upperBody.position.set(0, 0.14, -0.02);
  upperBody.castShadow = true;

  const keypad = new THREE.Mesh(
    createBeveledBoxGeometry(0.36, 0.04, 0.2, 0.01, 0.015),
    intMats.porcelain
  );
  keypad.position.set(-0.02, 0.21, 0.12);
  keypad.rotation.x = 0.42;

  const displayPost = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.04, 0.15, 8),
    mats.darkTrim
  );
  displayPost.position.set(0.12, 0.4, -0.08);

  const displayHead = new THREE.Mesh(
    createBeveledBoxGeometry(0.24, 0.11, 0.075, 0.015, 0.02),
    mats.darkTrim
  );
  displayHead.position.set(0.12, 0.48, -0.08);

  const readoutScreen = new THREE.Mesh(
    createBeveledBoxGeometry(0.2, 0.06, 0.015, 0.004, 0.005),
    mats.lampBulbLit
  );
  readoutScreen.position.set(0.12, 0.48, -0.04);

  const ledgerCover = new THREE.Mesh(
    createBeveledBoxGeometry(0.32, 0.025, 0.24, 0.006, 0.015),
    intMats.rugWeathered
  );
  ledgerCover.position.set(-0.5, 0.013, 0.04);
  ledgerCover.rotation.y = 0.16;

  const ledgerPages = new THREE.Mesh(
    createBeveledBoxGeometry(0.29, 0.02, 0.21, 0.004, 0.008),
    intMats.porcelain
  );
  ledgerPages.position.set(-0.5, 0.028, 0.04);
  ledgerPages.rotation.y = 0.16;

  group.add(
    drawerBase,
    drawerPull,
    upperBody,
    keypad,
    displayPost,
    displayHead,
    readoutScreen,
    ledgerCover,
    ledgerPages
  );
  return group;
}

/**
 * Multi-part reinforced safehouse storage locker with arched trunk lid & brass padlock loop.
 */
export function buildShopStorageChestModel(
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    createBeveledBoxGeometry(0.96, 0.56, 0.56, 0.025, 0.03),
    intMats.cabinetWood
  );
  body.position.y = 0.28;
  body.castShadow = true;
  body.receiveShadow = true;

  // Arched domed chest lid via ExtrudeGeometry
  const archShape = new THREE.Shape();
  archShape.moveTo(-0.3, 0);
  archShape.lineTo(0.3, 0);
  archShape.quadraticCurveTo(0.3, 0.18, 0, 0.2);
  archShape.quadraticCurveTo(-0.3, 0.18, -0.3, 0);
  archShape.closePath();
  const lidGeo = new THREE.ExtrudeGeometry(archShape, {
    depth: 0.98,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
    curveSegments: 8,
  });
  lidGeo.translate(0, 0, -0.49);
  lidGeo.rotateY(Math.PI * 0.5);
  applyTriplanarUVs(lidGeo, 0.6);

  const lid = new THREE.Mesh(lidGeo, mats.darkTrim);
  lid.position.y = 0.56;
  lid.castShadow = true;

  const strapParts: THREE.BufferGeometry[] = [];
  for (const sx of [-0.34, 0.34]) {
    const band = createBeveledBoxGeometry(0.08, 0.64, 0.61, 0.01, 0.015);
    band.translate(sx, 0.34, 0);
    strapParts.push(band);
  }
  const straps = new THREE.Mesh(mergeParts(strapParts, false), mats.lampMetal);

  const clasp = new THREE.Mesh(
    createBeveledBoxGeometry(0.14, 0.12, 0.05, 0.012, 0.02),
    intMats.brassHandle
  );
  clasp.position.set(0, 0.53, 0.3);

  group.add(body, lid, straps, clasp);
  return group;
}

interface ShelfDisplaySlot {
  unlockLevel: number;
  mesh: THREE.Group;
}

export interface ShopShelfDisplayController {
  group: THREE.Group;
  syncStock: (stock: InventoryState, shopLevel?: number) => void;
}

/**
 * Builds multi-shelf 3D resource display meshes across The Last Shop's retail shelves
 * in local building coordinates. Each item slot toggles visibility 1:1 with live shop stock
 * on unlocked shelves (visibly empty when stock is 0).
 */
export function buildShopShelfDisplayGroup(
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): ShopShelfDisplayController {
  const group = new THREE.Group();
  const slotsByResource: Record<ResourceId, ShelfDisplaySlot[]> = {
    canned_food: [],
    water_bottle: [],
    medical_supplies: [],
    wood: [],
    scrap_metal: [],
  };

  // Coordinates relative to Last Shop origin (0, floorY, 0)
  const slotCoords: Record<
    ResourceId,
    { x: number; y: number; z: number; rotY: number; unlockLevel: number }[]
  > = {
    canned_food: [
      { x: 1.92, y: 0.945, z: 1.54, rotY: 0.12, unlockLevel: 1 },
      { x: 2.18, y: 0.945, z: 1.48, rotY: -0.25, unlockLevel: 1 },
      { x: 1.88, y: 1.645, z: 1.52, rotY: 0.3, unlockLevel: 1 },
      { x: -0.72, y: 0.945, z: -0.36, rotY: 0.1, unlockLevel: 2 },
      { x: -0.46, y: 1.645, z: -0.38, rotY: -0.18, unlockLevel: 2 },
      { x: 1.65, y: 0.945, z: -5.56, rotY: 0.2, unlockLevel: 3 },
      { x: 1.95, y: 1.645, z: -5.62, rotY: -0.15, unlockLevel: 3 },
      { x: -3.72, y: 0.945, z: -6.45, rotY: 1.4, unlockLevel: 4 },
      { x: -3.76, y: 1.645, z: -6.1, rotY: 1.7, unlockLevel: 4 },
      { x: -0.82, y: 0.78, z: -5.65, rotY: 0.25, unlockLevel: 5 },
      { x: -0.55, y: 0.78, z: -5.95, rotY: -0.35, unlockLevel: 5 },
    ],
    water_bottle: [
      { x: 2.48, y: 0.945, z: 1.46, rotY: -0.2, unlockLevel: 1 },
      { x: 2.74, y: 0.945, z: 1.55, rotY: 0.35, unlockLevel: 1 },
      { x: 3.12, y: 1.645, z: 1.48, rotY: -0.1, unlockLevel: 1 },
      { x: -0.18, y: 0.945, z: -0.38, rotY: 0.2, unlockLevel: 2 },
      { x: 0.12, y: 1.645, z: -0.36, rotY: -0.3, unlockLevel: 2 },
      { x: 2.28, y: 0.945, z: -5.62, rotY: 0.1, unlockLevel: 3 },
      { x: 2.58, y: 1.645, z: -5.56, rotY: -0.22, unlockLevel: 3 },
      { x: -3.75, y: 0.945, z: -5.75, rotY: 1.5, unlockLevel: 4 },
      { x: -3.72, y: 1.645, z: -5.45, rotY: 1.2, unlockLevel: 4 },
      { x: -0.22, y: 0.78, z: -5.62, rotY: 0.15, unlockLevel: 5 },
      { x: 0.05, y: 0.78, z: -5.98, rotY: -0.4, unlockLevel: 5 },
    ],
    medical_supplies: [
      { x: 3.06, y: 0.945, z: 1.52, rotY: 0.1, unlockLevel: 1 },
      { x: 2.15, y: 1.645, z: 1.48, rotY: -0.15, unlockLevel: 1 },
      { x: 2.84, y: 1.645, z: 1.52, rotY: 0.22, unlockLevel: 1 },
      { x: 0.44, y: 0.945, z: -0.38, rotY: -0.12, unlockLevel: 2 },
      { x: 0.48, y: 1.645, z: -0.38, rotY: 0.18, unlockLevel: 2 },
      { x: 2.95, y: 0.945, z: -5.58, rotY: 0.08, unlockLevel: 3 },
      { x: 3.15, y: 1.645, z: -5.62, rotY: -0.18, unlockLevel: 3 },
      { x: -3.74, y: 0.945, z: -5.12, rotY: 1.57, unlockLevel: 4 },
      { x: -3.76, y: 1.645, z: -6.55, rotY: 1.5, unlockLevel: 4 },
      { x: 0.36, y: 0.78, z: -5.68, rotY: -0.2, unlockLevel: 5 },
      { x: 0.56, y: 0.78, z: -6.0, rotY: 0.32, unlockLevel: 5 },
    ],
    wood: [
      { x: 2.02, y: 0.245, z: 1.5, rotY: 0.06, unlockLevel: 1 },
      { x: 2.48, y: 0.245, z: 1.48, rotY: -0.1, unlockLevel: 1 },
      { x: 1.98, y: 0.245, z: 1.62, rotY: 0.18, unlockLevel: 1 },
      { x: -0.58, y: 0.245, z: -0.38, rotY: 0.08, unlockLevel: 2 },
      { x: -0.15, y: 0.245, z: -0.38, rotY: -0.12, unlockLevel: 2 },
      { x: 1.85, y: 0.245, z: -5.6, rotY: 0.05, unlockLevel: 3 },
      { x: 2.38, y: 0.245, z: -5.6, rotY: -0.08, unlockLevel: 3 },
      { x: -3.74, y: 0.245, z: -6.25, rotY: 1.57, unlockLevel: 4 },
      { x: -3.74, y: 0.245, z: -5.65, rotY: 1.5, unlockLevel: 4 },
      { x: -0.78, y: 0.78, z: -6.08, rotY: 0.1, unlockLevel: 5 },
      { x: -0.38, y: 0.78, z: -6.06, rotY: -0.2, unlockLevel: 5 },
    ],
    scrap_metal: [
      { x: 2.95, y: 0.245, z: 1.5, rotY: -0.3, unlockLevel: 1 },
      { x: 3.18, y: 0.245, z: 1.55, rotY: 0.4, unlockLevel: 1 },
      { x: 2.75, y: 0.245, z: 1.42, rotY: -0.12, unlockLevel: 1 },
      { x: 0.35, y: 0.245, z: -0.38, rotY: 0.25, unlockLevel: 2 },
      { x: 0.56, y: 0.245, z: -0.38, rotY: -0.32, unlockLevel: 2 },
      { x: 2.95, y: 0.245, z: -5.6, rotY: 0.3, unlockLevel: 3 },
      { x: 3.22, y: 0.245, z: -5.58, rotY: -0.25, unlockLevel: 3 },
      { x: -3.75, y: 0.245, z: -5.18, rotY: 1.65, unlockLevel: 4 },
      { x: -3.75, y: 0.945, z: -6.1, rotY: 1.45, unlockLevel: 4 },
      { x: 0.12, y: 0.78, z: -6.08, rotY: 0.25, unlockLevel: 5 },
      { x: 0.52, y: 0.78, z: -5.68, rotY: -0.35, unlockLevel: 5 },
    ],
  };

  for (const id of RESOURCE_ORDER) {
    for (const pos of slotCoords[id]) {
      const model = buildResourceModel(id, resMats, mats);
      model.position.set(pos.x, pos.y, pos.z);
      model.rotation.y = pos.rotY;
      model.scale.setScalar(0.84);
      model.visible = false;
      group.add(model);
      slotsByResource[id].push({
        unlockLevel: pos.unlockLevel,
        mesh: model,
      });
    }
  }

  return {
    group,
    syncStock: (stock: InventoryState, shopLevel = 1) => {
      for (const id of RESOURCE_ORDER) {
        const qty = Math.max(0, Math.floor(stock[id] ?? 0));
        let shown = 0;
        for (const slot of slotsByResource[id]) {
          if (slot.unlockLevel <= shopLevel && shown < qty) {
            slot.mesh.visible = true;
            shown++;
          } else {
            slot.mesh.visible = false;
          }
        }
      }
    },
  };
}

export interface ShopProgressionStateInput {
  shopLevel: number;
  storageTier: number;
  ownedDecorations: string[];
  shopStock: InventoryState;
}

export interface ShopProgressionController {
  syncState: (state: ShopProgressionStateInput) => void;
  dispose: () => void;
}

function buildStorageRackModel(
  w: number,
  d: number,
  tier: number,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const h = 1.85;
  const frameParts: THREE.BufferGeometry[] = [];

  for (const [lx, lz] of [
    [-w * 0.44, -d * 0.44],
    [w * 0.44, -d * 0.44],
    [-w * 0.44, d * 0.44],
    [w * 0.44, d * 0.44],
  ]) {
    const leg = new THREE.CylinderGeometry(0.026, 0.03, h, 6);
    leg.translate(lx, h * 0.5, lz);
    frameParts.push(leg);
  }
  const frameMesh = new THREE.Mesh(mergeParts(frameParts, false), mats.lampMetal);
  frameMesh.castShadow = true;
  group.add(frameMesh);

  const shelfMat = tier >= 3 ? mats.darkTrim : mats.wood;
  for (const sy of [0.22, 0.84, 1.48]) {
    const plank = new THREE.Mesh(
      createBeveledBoxGeometry(w, 0.05, d, 0.012, 0.015),
      shelfMat
    );
    plank.position.y = sy;
    plank.receiveShadow = true;
    group.add(plank);
  }

  // Beveled storage crates & cylindrical supply drum stacked on rack
  const boxA = new THREE.Mesh(
    createBeveledBoxGeometry(w * 0.72, 0.34, d * 0.36, 0.02, 0.02),
    tier >= 3 ? intMats.cabinetWood : mats.wood
  );
  boxA.position.set(0, 0.41, -d * 0.2);
  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(Math.min(w, d) * 0.22, Math.min(w, d) * 0.22, 0.34, 10),
    mats.darkTrim
  );
  drum.position.set(0, 1.03, d * 0.16);
  const boxC = new THREE.Mesh(
    createBeveledBoxGeometry(w * 0.58, 0.24, d * 0.32, 0.02, 0.02),
    intMats.porcelain
  );
  boxC.position.set(0, 1.62, -d * 0.08);

  group.add(boxA, drum, boxC);
  return group;
}

/**
 * Builds all pre-warmed physical Level 2-5 shop expansion rooms/fixtures, Storage Tier 1-3 racks,
 * and 6 purchasable shop decorations for The Last Shop, wiring their dynamic Box/Floor/SafeZone colliders.
 */
export function buildShopProgressionGroup(
  buildingX: number,
  buildingZ: number,
  floorY: number,
  mats: MaterialPalette,
  intMats: InteriorMaterialPalette,
  resMats: ResourceMaterialPalette,
  assets: AssetManager,
  colliders: WorldColliders
): { root: THREE.Group; controller: ShopProgressionController } {
  const root = new THREE.Group();
  root.position.set(buildingX, floorY, buildingZ);

  const localDisposables: { dispose: () => void }[] = [];
  const registerBox = (
    localX: number,
    localZ: number,
    w: number,
    d: number,
    active = false,
    rotationY = 0
  ): BoxCollider => {
    const col: BoxCollider = {
      x: buildingX + localX,
      z: buildingZ + localZ,
      w,
      d,
      rotationY,
      active,
    };
    colliders.boxes.push(col);
    return col;
  };

  // --- Shared muted practical accent material for upgraded marquee & open sign ---
  const neonAmberMat = new THREE.MeshStandardMaterial({
    color: 0x997028,
    emissive: 0x6e4d14,
    emissiveIntensity: 0.35,
    roughness: 0.45,
  });
  const neonMintMat = new THREE.MeshStandardMaterial({
    color: 0x355e4c,
    emissive: 0x1c3d2f,
    emissiveIntensity: 0.3,
    roughness: 0.48,
  });
  const coolFridgeMat = new THREE.MeshStandardMaterial({
    color: 0x6c8291,
    emissive: 0x2e414d,
    emissiveIntensity: 0.25,
    roughness: 0.38,
  });
  localDisposables.push(neonAmberMat, neonMintMat, coolFridgeMat);

  // 0. Level 1-2 North Wall Archway Plug (sealed at Level 1-2, opens into North Annex at Level 3+)
  const archwayPlug = new THREE.Mesh(
    new THREE.BoxGeometry(1.48, 2.38, 0.24),
    mats.brick
  );
  archwayPlug.position.set(-2.15, 1.19, -3.88);
  archwayPlug.castShadow = true;
  archwayPlug.receiveShadow = true;
  root.add(archwayPlug);
  const archwayPlugCollider = registerBox(-2.15, -3.88, 1.48, 0.24, true);

  // 1. Level 2 — Improved Store (2nd front retail shelf, trim rails, warm wall sconce light)
  const level2Group = new THREE.Group();
  level2Group.visible = false;
  root.add(level2Group);

  const shelf2 = buildFurnitureModel('shelf', 1.8, 0.48, mats, intMats);
  shelf2.position.set(-0.15, 0, -0.38);
  level2Group.add(shelf2);
  const shelf2Collider = registerBox(-0.15, -0.38, 1.8, 0.48, false);

  const trimWest = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 7.6),
    intMats.cabinetWood
  );
  trimWest.position.set(-5.22, 1.15, 0);
  const trimEast = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.14, 7.6),
    intMats.cabinetWood
  );
  trimEast.position.set(5.22, 1.15, 0);

  const sconceHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.26, 0.12),
    mats.darkTrim
  );
  sconceHousing.position.set(5.2, 2.32, 1.4);
  const sconceBulb = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.14, 0.08),
    mats.lampBulbLit
  );
  sconceBulb.position.set(5.14, 2.32, 1.4);

  const level2Light = new THREE.PointLight(0xffd28a, 2.3, 8.5, 1.8);
  level2Light.position.set(2.4, 2.45, 1.0);
  level2Group.add(trimWest, trimEast, sconceHousing, sconceBulb, level2Light);

  // 2. Level 3 — Large General Store (Walkable North Annex Wing + Annex East Shelf + Annex Lighting)
  const level3Group = assets.instantiateAsset('shop.expansion_wing', () => {
    const g = new THREE.Group();
    const annexW = 8.8;
    const annexD = 3.82;
    const annexCenterZ = -5.89;
    const ceilingH = 3.4;

    // Wood plank floor slab
    const floor = new THREE.Mesh(
      new THREE.BoxGeometry(annexW - 0.12, INTERIOR_FLOOR_OFFSET * 2, annexD),
      mats.wood
    );
    floor.position.set(0, 0, annexCenterZ);
    floor.receiveShadow = true;

    // Ceiling & pitched gable roof matching main Last Shop architectural silhouette
    const ceiling = new THREE.Mesh(
      new THREE.BoxGeometry(annexW - 0.1, 0.14, annexD),
      intMats.ceilingSlab
    );
    ceiling.position.set(0, ceilingH + 0.07, annexCenterZ);

    const annexRoof = new THREE.Mesh(
      createGabledRoofGeometry(annexW, annexD, 1.25, 0.38, 0.16, false),
      mats.roofTar
    );
    annexRoof.position.set(0, ceilingH + 0.15, annexCenterZ);
    annexRoof.castShadow = true;

    const annexGable = new THREE.Mesh(
      createGableEndWallGeometry(annexW - 0.12, 1.18, 0.24),
      mats.brick
    );
    annexGable.position.set(0, ceilingH + 0.14, -7.68);

    // West & East Annex brick walls
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, ceilingH, annexD),
      mats.brick
    );
    westWall.position.set(-4.28, ceilingH * 0.5, annexCenterZ);
    westWall.castShadow = true;
    westWall.receiveShadow = true;

    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, ceilingH, annexD),
      mats.brick
    );
    eastWall.position.set(4.28, ceilingH * 0.5, annexCenterZ);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;

    // North wall with framed glass window
    const northLeft = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, ceilingH, 0.24),
      mats.brick
    );
    northLeft.position.set(-2.9, ceilingH * 0.5, -7.68);
    northLeft.castShadow = true;

    const northRight = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, ceilingH, 0.24),
      mats.brick
    );
    northRight.position.set(2.9, ceilingH * 0.5, -7.68);
    northRight.castShadow = true;

    const northSill = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.0, 0.24),
      mats.brick
    );
    northSill.position.set(0, 0.5, -7.68);

    const northHeader = new THREE.Mesh(
      new THREE.BoxGeometry(2.8, 1.0, 0.24),
      mats.brick
    );
    northHeader.position.set(0, 2.9, -7.68);

    const northWinFrame = new THREE.Mesh(
      createBeveledBoxGeometry(2.86, 0.1, 0.34, 0.02, 0.02),
      mats.darkTrim
    );
    northWinFrame.position.set(0, 1.0, -7.68);

    const northGlass = new THREE.Mesh(
      new THREE.BoxGeometry(2.74, 1.4, 0.04),
      intMats.windowGlass
    );
    northGlass.position.set(0, 1.7, -7.68);

    // Beveled door jamb around the archway
    const archHeader = new THREE.Mesh(
      createBeveledBoxGeometry(1.66, 0.12, 0.32, 0.02, 0.02),
      mats.darkTrim
    );
    archHeader.position.set(-2.15, 2.38, -3.88);

    // Annex East Retail Shelf
    const annexShelf = buildFurnitureModel('shelf', 2.2, 0.58, mats, intMats);
    annexShelf.position.set(2.4, 0, -5.6);

    // Warm shadowless Annex interior PointLight
    const annexLight = new THREE.PointLight(0xffcf87, 3.8, 10.5, 1.8);
    annexLight.position.set(-0.2, 2.95, -5.8);

    g.add(
      floor,
      ceiling,
      annexRoof,
      annexGable,
      westWall,
      eastWall,
      northLeft,
      northRight,
      northSill,
      northHeader,
      northWinFrame,
      northGlass,
      archHeader,
      annexShelf,
      annexLight
    );
    return g;
  });
  level3Group.visible = false;
  root.add(level3Group);

  const annexWestCollider = registerBox(-4.28, -5.89, 0.24, 3.82, false);
  const annexEastCollider = registerBox(4.28, -5.89, 0.24, 3.82, false);
  const annexNorthCollider = registerBox(0, -7.68, 8.8, 0.24, false);
  const annexShelfCollider = registerBox(2.4, -5.6, 2.2, 0.58, false);

  const annexFloorZone: FloorZone = {
    minX: buildingX - 4.28,
    maxX: buildingX + 4.28,
    minZ: buildingZ - 7.68,
    maxZ: buildingZ - 3.9,
    height: floorY,
    active: false,
  };
  colliders.floors.push(annexFloorZone);

  const annexCeilingZone: FloorZone = {
    minX: buildingX - 4.28,
    maxX: buildingX + 4.28,
    minZ: buildingZ - 7.68,
    maxZ: buildingZ - 3.9,
    height: floorY + 3.26,
    active: false,
  };
  colliders.ceilings?.push(annexCeilingZone);

  const annexSafeZone: SafeZoneBounds = {
    minX: buildingX - 4.4,
    maxX: buildingX + 4.4,
    minZ: buildingZ - 7.8,
    maxZ: buildingZ - 3.9,
    active: false,
  };
  colliders.safeZones?.push(annexSafeZone);

  // 3. Level 4 — Advanced Trading Center (Secondary Counter Wing, Annex West Rack, Marquee, Overhead Strips)
  const level4Group = new THREE.Group();
  level4Group.visible = false;
  root.add(level4Group);

  const counterWing = buildFurnitureModel('counter', 0.84, 1.12, mats, intMats);
  counterWing.position.set(-4.55, 0, 0.25);
  const wingCollider = registerBox(-4.55, 0.25, 0.84, 1.12, false);

  // Trade scale & radio atop secondary counter
  const scaleBase = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.08, 0.26),
    mats.lampMetal
  );
  scaleBase.position.set(-4.55, 1.0, 0.25);
  const scaleDish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.12, 0.04, 10),
    intMats.brassHandle
  );
  scaleDish.position.set(-4.55, 1.06, 0.25);

  const annexWestRack = buildFurnitureModel('shelf', 2.2, 0.56, mats, intMats);
  annexWestRack.position.set(-3.75, 0, -5.8);
  annexWestRack.rotation.y = Math.PI * 0.5;
  const annexWestRackCollider = registerBox(-3.75, -5.8, 0.56, 2.2, false);

  // Exterior illuminated storefront marquee & dual overhead strips
  const marqueeFrame = new THREE.Mesh(
    new THREE.BoxGeometry(6.2, 0.24, 0.28),
    mats.darkTrim
  );
  marqueeFrame.position.set(0, 3.85, 4.18);
  const marqueeStrip = new THREE.Mesh(
    new THREE.BoxGeometry(5.9, 0.1, 0.06),
    neonAmberMat
  );
  marqueeStrip.position.set(0, 3.85, 4.32);

  const ceilingStripA = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.06, 0.14),
    neonAmberMat
  );
  ceilingStripA.position.set(-1.8, 3.34, 1.6);
  const ceilingStripB = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 0.06, 0.14),
    neonAmberMat
  );
  ceilingStripB.position.set(1.8, 3.34, 1.6);

  level4Group.add(
    counterWing,
    scaleBase,
    scaleDish,
    annexWestRack,
    marqueeFrame,
    marqueeStrip,
    ceilingStripA,
    ceilingStripB
  );

  // 4. Level 5 — Major Survivor Trading Hub (Central Hub Showcase Island + Hub Crown Signage + Flanking Lanterns)
  const level5Group = new THREE.Group();
  level5Group.visible = false;
  root.add(level5Group);

  const hubTable = buildFurnitureModel('table', 1.9, 0.9, mats, intMats);
  hubTable.position.set(-0.2, 0, -5.85);
  const hubTableCollider = registerBox(-0.2, -5.85, 1.9, 0.9, false);

  const tableRunner = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.02, 0.42),
    intMats.rugWeathered
  );
  tableRunner.position.set(-0.2, 0.79, -5.85);

  const hubCrownBoard = createFramedSignAssembly(4.56, 0.62, 0.22, mats.shopSign, intMats.brassHandle);
  hubCrownBoard.position.set(0, 4.25, 4.18);
  const hubCrownBorder = new THREE.Group();

  const lanternLeft = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    mats.lampBulbLit
  );
  lanternLeft.position.set(-2.05, 2.7, 4.35);
  const lanternRight = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    mats.lampBulbLit
  );
  lanternRight.position.set(2.05, 2.7, 4.35);

  level5Group.add(
    hubTable,
    tableRunner,
    hubCrownBoard,
    hubCrownBorder,
    lanternLeft,
    lanternRight
  );

  // 5. Storage Upgrade Tiers 1..3 (Placed cleanly inside back storeroom without blocking doors or Annex archway)
  const storageTier1Group = assets.instantiateAsset('shop.storage_rack', () =>
    buildStorageRackModel(0.58, 1.42, 1, mats, intMats)
  );
  storageTier1Group.position.set(4.9, 0, -1.75);
  storageTier1Group.visible = false;
  root.add(storageTier1Group);
  const storageTier1Collider = registerBox(4.9, -1.75, 0.58, 1.42, false);

  const storageTier2Group = buildStorageRackModel(0.56, 1.3, 2, mats, intMats);
  storageTier2Group.position.set(-4.9, 0, -1.65);
  storageTier2Group.visible = false;
  root.add(storageTier2Group);
  const storageTier2Collider = registerBox(-4.9, -1.65, 0.56, 1.3, false);

  const storageTier3Group = buildStorageRackModel(1.45, 0.5, 3, mats, intMats);
  storageTier3Group.position.set(-0.6, 0, -1.18);
  storageTier3Group.visible = false;
  root.add(storageTier3Group);
  const storageTier3Collider = registerBox(-0.6, -1.18, 1.45, 0.5, false);

  // 6. Purchasable Shop Decorations (deco_sign, deco_floor, deco_lighting, deco_table, deco_shelves, deco_fridge)
  const decoSignGroup = assets.instantiateAsset('deco.sign', () => {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.42, 0.08),
      mats.darkTrim
    );
    frame.position.set(-2.6, 1.85, 3.66);
    const glowBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.96, 0.28, 0.03),
      neonMintMat
    );
    glowBar.position.set(-2.6, 1.85, 3.71);
    const extBanner = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.18, 0.06),
      neonAmberMat
    );
    extBanner.position.set(0, 2.52, 4.02);
    g.add(frame, glowBar, extBanner);
    return g;
  });
  decoSignGroup.visible = false;
  root.add(decoSignGroup);

  const decoFloorGroup = assets.instantiateAsset('deco.floor', () => {
    const g = new THREE.Group();
    const mainRunner = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.018, 2.4),
      intMats.rugWeathered
    );
    mainRunner.position.set(0.1, 0.012, 0.65);
    mainRunner.receiveShadow = true;

    const counterRunner = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 0.018, 0.95),
      intMats.rugWeathered
    );
    counterRunner.position.set(-1.6, 0.012, 0.45);
    counterRunner.receiveShadow = true;

    const borderTrim = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.021, 2.2),
      intMats.brassHandle
    );
    borderTrim.position.set(0.1, 0.012, 0.65);
    // Keep inner cloth visible above border trim
    const innerCloth = new THREE.Mesh(
      new THREE.BoxGeometry(1.36, 0.024, 2.06),
      intMats.rugWeathered
    );
    innerCloth.position.set(0.1, 0.012, 0.65);

    g.add(mainRunner, counterRunner, borderTrim, innerCloth);
    return g;
  });
  decoFloorGroup.visible = false;
  root.add(decoFloorGroup);

  const decoLightingGroup = assets.instantiateAsset('deco.lighting', () => {
    const g = new THREE.Group();
    for (const [px, pz] of [
      [-1.8, 1.2],
      [2.1, 1.4],
    ]) {
      const cord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.85, 6),
        mats.darkTrim
      );
      cord.position.set(px, 2.98, pz);
      const shade = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.22, 10, 1, true),
        mats.lampMetal
      );
      shade.position.set(px, 2.52, pz);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 8, 6),
        mats.lampBulbLit
      );
      bulb.position.set(px, 2.45, pz);
      g.add(cord, shade, bulb);
    }
    const fillLight = new THREE.PointLight(0xffe0a3, 2.5, 9.5, 1.8);
    fillLight.position.set(0.1, 2.5, 1.3);
    g.add(fillLight);
    return g;
  });
  decoLightingGroup.visible = false;
  root.add(decoLightingGroup);

  const decoTableGroup = assets.instantiateAsset('deco.table', () => {
    const g = new THREE.Group();
    const tbl = buildFurnitureModel('table', 1.1, 0.76, mats, intMats);
    const lanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.22, 8),
      mats.darkTrim
    );
    lanternBase.position.set(-0.26, 0.89, 0.08);
    const lanternGlow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.14, 8),
      mats.lampBulbLit
    );
    lanternGlow.position.set(-0.26, 0.92, 0.08);
    const sampleFood = buildResourceModel('canned_food', resMats, mats);
    sampleFood.position.set(0.22, 0.78, -0.05);
    sampleFood.scale.setScalar(0.88);
    g.add(tbl, lanternBase, lanternGlow, sampleFood);
    return g;
  });
  decoTableGroup.position.set(4.45, 0, 2.95);
  decoTableGroup.visible = false;
  root.add(decoTableGroup);
  const decoTableCollider = registerBox(4.45, 2.95, 1.1, 0.76, false);

  const decoShelvesGroup = assets.instantiateAsset('deco.shelves', () =>
    buildFurnitureModel('shelf', 1.5, 0.48, mats, intMats)
  );
  decoShelvesGroup.position.set(-4.96, 0, 2.7);
  decoShelvesGroup.rotation.y = Math.PI * 0.5;
  decoShelvesGroup.visible = false;
  root.add(decoShelvesGroup);
  const decoShelvesCollider = registerBox(-4.96, 2.7, 0.48, 1.5, false);

  const decoFridgeGroup = assets.instantiateAsset('deco.fridge', () => {
    const g = new THREE.Group();
    const cabinet = new THREE.Mesh(
      createBeveledBoxGeometry(0.86, 1.92, 0.68, 0.03, 0.06),
      intMats.porcelain
    );
    cabinet.position.y = 0.96;
    cabinet.castShadow = true;
    cabinet.receiveShadow = true;

    const header = new THREE.Mesh(
      createBeveledBoxGeometry(0.84, 0.24, 0.69, 0.02, 0.04),
      mats.darkTrim
    );
    header.position.y = 1.8;

    const glassFront = new THREE.Mesh(
      createBeveledBoxGeometry(0.72, 1.42, 0.04, 0.008, 0.02),
      intMats.windowGlass
    );
    glassFront.position.set(0, 0.92, 0.34);

    const interiorGlow = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 1.36, 0.03),
      coolFridgeMat
    );
    interiorGlow.position.set(0, 0.92, 0.28);

    const handlePts = [
      new THREE.Vector3(0.32, 1.24, 0.35),
      new THREE.Vector3(0.32, 1.24, 0.4),
      new THREE.Vector3(0.32, 0.78, 0.4),
      new THREE.Vector3(0.32, 0.78, 0.35),
    ];
    const handle = new THREE.Mesh(createTubePathGeometry(handlePts, 0.018, 6, 5), mats.lampMetal);

    g.add(cabinet, header, glassFront, interiorGlow, handle);
    return g;
  });
  decoFridgeGroup.position.set(4.7, 0, -0.18);
  decoFridgeGroup.visible = false;
  root.add(decoFridgeGroup);
  const decoFridgeCollider = registerBox(4.7, -0.18, 0.86, 0.68, false);

  const controller: ShopProgressionController = {
    syncState: (state: ShopProgressionStateInput) => {
      const lvl = Math.max(1, Math.min(5, Math.floor(state.shopLevel)));
      const tier = Math.max(0, Math.min(3, Math.floor(state.storageTier)));
      const decos = new Set(state.ownedDecorations);

      // Doorway archway opens at Level 3+
      const sealed = lvl < 3;
      archwayPlug.visible = sealed;
      archwayPlugCollider.active = sealed;

      // Level 2+
      const hasL2 = lvl >= 2;
      level2Group.visible = hasL2;
      shelf2Collider.active = hasL2;

      // Level 3+ (Walkable North Annex)
      const hasL3 = lvl >= 3;
      level3Group.visible = hasL3;
      annexWestCollider.active = hasL3;
      annexEastCollider.active = hasL3;
      annexNorthCollider.active = hasL3;
      annexShelfCollider.active = hasL3;
      annexFloorZone.active = hasL3;
      annexCeilingZone.active = hasL3;
      annexSafeZone.active = hasL3;

      // Level 4+
      const hasL4 = lvl >= 4;
      level4Group.visible = hasL4;
      wingCollider.active = hasL4;
      annexWestRackCollider.active = hasL4;

      // Level 5
      const hasL5 = lvl >= 5;
      level5Group.visible = hasL5;
      hubTableCollider.active = hasL5;

      // Storage Upgrades
      storageTier1Group.visible = tier >= 1;
      storageTier1Collider.active = tier >= 1;
      storageTier2Group.visible = tier >= 2;
      storageTier2Collider.active = tier >= 2;
      storageTier3Group.visible = tier >= 3;
      storageTier3Collider.active = tier >= 3;

      // Decorations
      decoSignGroup.visible = decos.has('deco_sign');
      decoFloorGroup.visible = decos.has('deco_floor');
      decoLightingGroup.visible = decos.has('deco_lighting');

      const hasTable = decos.has('deco_table');
      decoTableGroup.visible = hasTable;
      decoTableCollider.active = hasTable;

      const hasShelves = decos.has('deco_shelves');
      decoShelvesGroup.visible = hasShelves;
      decoShelvesCollider.active = hasShelves;

      const hasFridge = decos.has('deco_fridge');
      decoFridgeGroup.visible = hasFridge;
      decoFridgeCollider.active = hasFridge;
    },
    dispose: () => {
      for (const d of localDisposables) {
        d.dispose();
      }
    },
  };

  return { root, controller };
}
