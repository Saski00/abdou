import * as THREE from 'three';
import { ResourceId } from '../../game/types';
import { MaterialPalette } from './proceduralModels';
import {
  createBeveledBoxGeometry,
  createFracturedSlabGeometry,
  createTubePathGeometry,
  mergeParts,
} from './proceduralGeometryKit';

export interface ResourceMaterialPalette {
  tinMetal: THREE.MeshStandardMaterial;
  canLabelRed: THREE.MeshStandardMaterial;
  canLabelAmber: THREE.MeshStandardMaterial;
  waterPlastic: THREE.MeshStandardMaterial;
  waterCap: THREE.MeshStandardMaterial;
  medCaseWhite: THREE.MeshStandardMaterial;
  steelPipe: THREE.MeshStandardMaterial;
  toolRed: THREE.MeshStandardMaterial;
  caseOlive: THREE.MeshStandardMaterial;
  dispose: () => void;
}

export function createResourceMaterialPalette(): ResourceMaterialPalette {
  const tinMetal = new THREE.MeshStandardMaterial({
    color: 0x8f979e,
    roughness: 0.44,
    metalness: 0.72,
  });
  const canLabelRed = new THREE.MeshStandardMaterial({
    color: 0x6b2c27,
    roughness: 0.8,
    metalness: 0.04,
  });
  const canLabelAmber = new THREE.MeshStandardMaterial({
    color: 0x7a5425,
    roughness: 0.8,
    metalness: 0.04,
  });
  const waterPlastic = new THREE.MeshStandardMaterial({
    color: 0x566873,
    roughness: 0.36,
    metalness: 0.04,
    transparent: true,
    opacity: 0.72,
  });
  const waterCap = new THREE.MeshStandardMaterial({
    color: 0x243340,
    roughness: 0.64,
    metalness: 0.04,
  });
  const medCaseWhite = new THREE.MeshStandardMaterial({
    color: 0x9ea4aa,
    roughness: 0.65,
    metalness: 0.04,
  });
  const steelPipe = new THREE.MeshStandardMaterial({
    color: 0x4d555e,
    roughness: 0.56,
    metalness: 0.74,
  });
  const toolRed = new THREE.MeshStandardMaterial({
    color: 0x592421,
    roughness: 0.66,
    metalness: 0.34,
  });
  const caseOlive = new THREE.MeshStandardMaterial({
    color: 0x2d352a,
    roughness: 0.76,
    metalness: 0.24,
  });

  const all = [
    tinMetal,
    canLabelRed,
    canLabelAmber,
    waterPlastic,
    waterCap,
    medCaseWhite,
    steelPipe,
    toolRed,
    caseOlive,
  ];

  return {
    tinMetal,
    canLabelRed,
    canLabelAmber,
    waterPlastic,
    waterCap,
    medCaseWhite,
    steelPipe,
    toolRed,
    caseOlive,
    dispose: () => {
      for (const m of all) m.dispose();
    },
  };
}

export function buildCannedFoodModel(
  resMats: ResourceMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const makeCan = (labelMat: THREE.MeshStandardMaterial, h: number, r: number): THREE.Group => {
    const can = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), labelMat);
    body.position.y = h * 0.5;
    body.castShadow = true;

    const rimTop = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.022, 14),
      resMats.tinMetal
    );
    rimTop.position.y = h - 0.01;

    const rimBottom = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 1.04, r * 1.04, 0.02, 14),
      resMats.tinMetal
    );
    rimBottom.position.y = 0.01;

    can.add(body, rimTop, rimBottom);
    return can;
  };

  const canA = makeCan(resMats.canLabelRed, 0.19, 0.078);
  canA.position.set(-0.08, 0, 0.04);

  const canB = makeCan(resMats.canLabelAmber, 0.17, 0.075);
  canB.position.set(0.08, 0, -0.02);

  const canC = makeCan(resMats.canLabelRed, 0.15, 0.07);
  canC.position.set(0.0, 0.17, 0.01);
  canC.rotation.y = 0.6;

  group.add(canA, canB, canC);
  return group;
}

export function buildWaterBottleModel(
  resMats: ResourceMaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const makeBottle = (): THREE.Group => {
    const b = new THREE.Group();
    const lower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.22, 12),
      resMats.waterPlastic
    );
    lower.position.y = 0.11;
    lower.castShadow = true;

    const shoulder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.058, 0.07, 12),
      resMats.waterPlastic
    );
    shoulder.position.y = 0.255;

    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, 0.025, 10),
      resMats.waterPlastic
    );
    neck.position.y = 0.298;

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.026, 10),
      resMats.waterCap
    );
    cap.position.y = 0.32;

    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.08, 12),
      resMats.medCaseWhite
    );
    label.position.y = 0.125;

    b.add(lower, shoulder, neck, cap, label);
    return b;
  };

  const upright = makeBottle();
  upright.position.set(-0.06, 0, 0.03);

  const second = makeBottle();
  second.position.set(0.07, 0, -0.03);
  second.rotation.y = 0.4;

  group.add(upright, second);
  return group;
}

export function buildScrapMetalModel(
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  // Jagged fractured metal plate
  const plate = new THREE.Mesh(createFracturedSlabGeometry(0.46, 0.34, 0.03, 73), mats.rustedMetal);
  plate.position.set(0, 0.005, 0);
  plate.rotation.y = 0.2;
  plate.castShadow = true;
  plate.receiveShadow = true;

  // Curved bent steel pipe elbow
  const pipePts = [
    new THREE.Vector3(-0.2, 0.055, -0.04),
    new THREE.Vector3(0.0, 0.075, -0.02),
    new THREE.Vector3(0.18, 0.065, 0.08),
  ];
  const pipe = new THREE.Mesh(createTubePathGeometry(pipePts, 0.035, 8, 7), resMats.steelPipe);
  pipe.castShadow = true;

  // Perforated gear / sprocket wheel ring
  const hub = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 6, 12), mats.rustedMetal);
  hub.rotation.x = Math.PI * 0.44;
  hub.position.set(0.1, 0.055, 0.06);
  hub.castShadow = true;

  group.add(plate, pipe, hub);
  return group;
}

export function buildWoodModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const plankGeo = createBeveledBoxGeometry(0.58, 0.065, 0.13, 0.012, 0.015);
  const strapGeo = createBeveledBoxGeometry(0.04, 0.15, 0.31, 0.006, 0.01);

  const p1 = new THREE.Mesh(plankGeo, mats.wood);
  p1.position.set(0, 0.032, -0.08);
  p1.castShadow = true;

  const p2 = new THREE.Mesh(plankGeo, mats.wood);
  p2.position.set(0.02, 0.032, 0.08);
  p2.castShadow = true;

  const p3 = new THREE.Mesh(plankGeo, mats.wood);
  p3.position.set(-0.02, 0.098, -0.03);
  p3.rotation.y = 0.12;
  p3.castShadow = true;

  const p4 = new THREE.Mesh(plankGeo, mats.wood);
  p4.position.set(0.01, 0.098, 0.1);
  p4.rotation.y = -0.08;
  p4.castShadow = true;

  const strap = new THREE.Mesh(strapGeo, mats.darkTrim);
  strap.position.set(0.16, 0.07, 0.01);

  group.add(p1, p2, p3, p4, strap);
  return group;
}

export function buildMedicalSuppliesModel(
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  // Rounded polymer med hard-case
  const box = new THREE.Mesh(
    createBeveledBoxGeometry(0.38, 0.15, 0.28, 0.028, 0.045),
    resMats.medCaseWhite
  );
  box.position.y = 0.075;
  box.castShadow = true;
  box.receiveShadow = true;

  // Curved tubular carry handle
  const handlePts = [
    new THREE.Vector3(-0.06, 0.075, 0.135),
    new THREE.Vector3(-0.06, 0.075, 0.175),
    new THREE.Vector3(0.06, 0.075, 0.175),
    new THREE.Vector3(0.06, 0.075, 0.135),
  ];
  const handle = new THREE.Mesh(createTubePathGeometry(handlePts, 0.014, 6, 5), mats.darkTrim);

  const latchL = new THREE.Mesh(
    createBeveledBoxGeometry(0.04, 0.06, 0.03, 0.008, 0.01),
    mats.darkTrim
  );
  latchL.position.set(-0.11, 0.09, 0.142);
  const latchR = new THREE.Mesh(
    createBeveledBoxGeometry(0.04, 0.06, 0.03, 0.008, 0.01),
    mats.darkTrim
  );
  latchR.position.set(0.11, 0.09, 0.142);

  const crossH = new THREE.Mesh(
    createBeveledBoxGeometry(0.14, 0.016, 0.044, 0.004, 0.005),
    mats.hydrantRed
  );
  crossH.position.set(0, 0.154, 0);
  const crossV = new THREE.Mesh(
    createBeveledBoxGeometry(0.044, 0.016, 0.14, 0.004, 0.005),
    mats.hydrantRed
  );
  crossV.position.set(0, 0.154, 0);

  group.add(box, handle, latchL, latchR, crossH, crossV);
  return group;
}

export function buildResourceModel(
  kind: ResourceId,
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): THREE.Group {
  switch (kind) {
    case 'canned_food':
      return buildCannedFoodModel(resMats);
    case 'water_bottle':
      return buildWaterBottleModel(resMats);
    case 'scrap_metal':
      return buildScrapMetalModel(resMats, mats);
    case 'wood':
      return buildWoodModel(mats);
    case 'medical_supplies':
      return buildMedicalSuppliesModel(resMats, mats);
  }
}

export const WORKTABLE_HEIGHT = 0.78;

export function buildWorktableModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  // Beveled heavy butcher-block workbench top
  const top = new THREE.Mesh(
    createBeveledBoxGeometry(1.55, 0.075, 0.82, 0.02, 0.03),
    mats.wood
  );
  top.position.y = WORKTABLE_HEIGHT - 0.0375;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // Tubular steel legs + diagonal cross-bracing
  const frameParts: THREE.BufferGeometry[] = [];
  const legOffsets = [
    [-0.68, -0.32],
    [0.68, -0.32],
    [-0.68, 0.32],
    [0.68, 0.32],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.CylinderGeometry(0.036, 0.032, WORKTABLE_HEIGHT - 0.07, 8);
    leg.translate(lx, (WORKTABLE_HEIGHT - 0.07) * 0.5, lz);
    frameParts.push(leg);
  }
  const rearBrace = new THREE.CylinderGeometry(0.018, 0.018, 1.44, 6);
  rearBrace.rotateZ(Math.PI * 0.42);
  rearBrace.translate(0, 0.45, -0.32);
  frameParts.push(rearBrace);

  // Mounted bench vise on front-right corner
  const vise = createBeveledBoxGeometry(0.16, 0.13, 0.22, 0.015, 0.02);
  vise.translate(0.56, WORKTABLE_HEIGHT + 0.06, 0.34);
  frameParts.push(vise);

  const frameMesh = new THREE.Mesh(mergeParts(frameParts, false), mats.darkTrim);
  frameMesh.castShadow = true;
  group.add(frameMesh);

  const shelf = new THREE.Mesh(
    createBeveledBoxGeometry(1.38, 0.048, 0.68, 0.012, 0.02),
    mats.wood
  );
  shelf.position.y = 0.24;
  shelf.receiveShadow = true;
  group.add(shelf);

  return group;
}

export function buildHingedGateModel(
  width: number,
  kind: 'chainlink' | 'wood',
  mats: MaterialPalette
): THREE.Group {
  const pivot = new THREE.Group();

  if (kind === 'chainlink') {
    const metalParts: THREE.BufferGeometry[] = [];
    const topBar = new THREE.CylinderGeometry(0.035, 0.035, width, 7);
    topBar.rotateZ(Math.PI * 0.5);
    topBar.translate(width * 0.5, 1.92, 0);
    const botBar = new THREE.CylinderGeometry(0.035, 0.035, width, 7);
    botBar.rotateZ(Math.PI * 0.5);
    botBar.translate(width * 0.5, 0.14, 0);
    const postHinge = new THREE.CylinderGeometry(0.045, 0.048, 2.0, 8);
    postHinge.translate(0.03, 1.0, 0);
    const postLatch = new THREE.CylinderGeometry(0.04, 0.04, 1.98, 8);
    postLatch.translate(width - 0.04, 0.99, 0);
    const diag = new THREE.CylinderGeometry(0.022, 0.022, Math.hypot(width * 0.88, 1.68), 6);
    diag.rotateZ(-Math.atan2(width * 0.88, 1.68));
    diag.translate(width * 0.5, 1.03, 0);
    metalParts.push(topBar, botBar, postHinge, postLatch, diag);

    pivot.add(new THREE.Mesh(mergeParts(metalParts, false), mats.lampMetal));

    const meshMat = new THREE.MeshStandardMaterial({
      color: 0x4b5563,
      roughness: 0.7,
      metalness: 0.65,
      wireframe: true,
    });
    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(width - 0.1, 1.75, Math.max(4, Math.round(width * 3)), 6),
      meshMat
    );
    grid.position.set(width * 0.5, 1.03, 0);

    const handle = new THREE.Mesh(
      createBeveledBoxGeometry(0.16, 0.12, 0.14, 0.015, 0.02),
      mats.barrierHazard
    );
    handle.position.set(width - 0.18, 1.04, 0);

    pivot.add(grid, handle);
  } else {
    const woodParts: THREE.BufferGeometry[] = [];
    const railTop = createBeveledBoxGeometry(width, 0.09, 0.09, 0.01, 0.01);
    railTop.translate(width * 0.5, 1.65, 0);
    const railBot = createBeveledBoxGeometry(width, 0.09, 0.09, 0.01, 0.01);
    railBot.translate(width * 0.5, 0.42, 0);
    woodParts.push(railTop, railBot);

    const plankCount = Math.max(4, Math.floor(width / 0.28));
    const step = width / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const plank = createBeveledBoxGeometry(step * 0.86, 1.88, 0.055, 0.008, 0.008);
      plank.translate((i + 0.5) * step, 0.96, 0.04);
      woodParts.push(plank);
    }
    const gateWood = new THREE.Mesh(mergeParts(woodParts, true, 0.65), mats.wood);
    gateWood.castShadow = true;
    pivot.add(gateWood);

    const latch = new THREE.Mesh(
      createBeveledBoxGeometry(0.18, 0.1, 0.15, 0.015, 0.02),
      mats.barrierHazard
    );
    latch.position.set(width - 0.16, 1.02, 0.04);
    pivot.add(latch);
  }

  return pivot;
}

export function buildSupplyContainerModel(
  kind: 'supply_case' | 'tool_chest',
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();
  const bodyMat = kind === 'supply_case' ? resMats.caseOlive : resMats.toolRed;

  // Beveled rugged base case with structural side ribs
  const baseParts: THREE.BufferGeometry[] = [];
  const main = createBeveledBoxGeometry(0.86, 0.42, 0.52, 0.03, 0.04);
  main.translate(0, 0.21, 0);
  baseParts.push(main);
  for (const rx of [-0.28, 0, 0.28]) {
    const rib = createBeveledBoxGeometry(0.05, 0.36, 0.55, 0.01, 0.01);
    rib.translate(rx, 0.21, 0);
    baseParts.push(rib);
  }
  const base = new THREE.Mesh(mergeParts(baseParts, false), bodyMat);
  base.castShadow = true;
  base.receiveShadow = true;

  // Side tubular carry handles
  for (const sx of [-0.45, 0.45]) {
    const pts = [
      new THREE.Vector3(sx, 0.24, -0.09),
      new THREE.Vector3(sx + Math.sign(sx) * 0.04, 0.24, -0.09),
      new THREE.Vector3(sx + Math.sign(sx) * 0.04, 0.24, 0.09),
      new THREE.Vector3(sx, 0.24, 0.09),
    ];
    group.add(new THREE.Mesh(createTubePathGeometry(pts, 0.014, 6, 5), mats.darkTrim));
  }

  const interior = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.42), mats.darkTrim);
  interior.position.y = 0.41;

  // Hinged beveled lid
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.42, -0.26);

  const lid = new THREE.Mesh(
    createBeveledBoxGeometry(0.88, 0.11, 0.54, 0.03, 0.04),
    bodyMat
  );
  lid.position.set(0, 0.055, 0.26);
  lid.castShadow = true;

  const clasp = new THREE.Mesh(
    createBeveledBoxGeometry(0.14, 0.075, 0.045, 0.01, 0.01),
    mats.barrierHazard
  );
  clasp.position.set(0, 0.01, 0.53);

  const strapL = new THREE.Mesh(
    createBeveledBoxGeometry(0.06, 0.12, 0.55, 0.01, 0.01),
    mats.darkTrim
  );
  strapL.position.set(-0.28, 0.055, 0.26);
  const strapR = new THREE.Mesh(
    createBeveledBoxGeometry(0.06, 0.12, 0.55, 0.01, 0.01),
    mats.darkTrim
  );
  strapR.position.set(0.28, 0.055, 0.26);

  lidPivot.add(lid, clasp, strapL, strapR);
  group.add(base, interior, lidPivot);
  group.userData.lidPivot = lidPivot;
  return group;
}

export function buildKeyPickupModel(
  keyKind: 'key' | 'keycard',
  resMats: ResourceMaterialPalette,
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  if (keyKind === 'keycard') {
    const card = new THREE.Mesh(
      createBeveledBoxGeometry(0.28, 0.022, 0.19, 0.005, 0.02),
      resMats.medCaseWhite
    );
    card.position.y = 0.014;
    card.castShadow = true;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.282, 0.024, 0.048),
      mats.hydrantRed
    );
    stripe.position.set(0, 0.014, -0.052);

    const chip = new THREE.Mesh(
      createBeveledBoxGeometry(0.065, 0.025, 0.05, 0.004, 0.008),
      mats.barrierHazard
    );
    chip.position.set(-0.065, 0.014, 0.03);

    group.add(card, stripe, chip);
  } else {
    const tag = new THREE.Mesh(
      createBeveledBoxGeometry(0.16, 0.022, 0.095, 0.005, 0.025),
      mats.wood
    );
    tag.position.set(-0.095, 0.015, 0);
    tag.rotation.y = 0.3;

    const bow = new THREE.Mesh(
      new THREE.TorusGeometry(0.046, 0.014, 6, 12),
      mats.barrierHazard
    );
    bow.rotation.x = Math.PI * 0.5;
    bow.position.set(0.02, 0.016, 0);
    bow.castShadow = true;

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6),
      resMats.tinMetal
    );
    shaft.rotation.z = Math.PI * 0.5;
    shaft.position.set(0.115, 0.016, 0);

    const teeth = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, 0.016, 0.028),
      resMats.tinMetal
    );
    teeth.position.set(0.17, 0.016, 0.022);

    group.add(tag, bow, shaft, teeth);
  }

  return group;
}
