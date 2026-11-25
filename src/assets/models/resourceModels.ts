import * as THREE from 'three';
import { ResourceId } from '../../game/types';
import { MaterialPalette } from './proceduralModels';

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
    color: 0xb8c0c8,
    roughness: 0.34,
    metalness: 0.78,
  });
  const canLabelRed = new THREE.MeshStandardMaterial({
    color: 0xa6342a,
    roughness: 0.72,
    metalness: 0.05,
  });
  const canLabelAmber = new THREE.MeshStandardMaterial({
    color: 0xc27c24,
    roughness: 0.72,
    metalness: 0.05,
  });
  const waterPlastic = new THREE.MeshStandardMaterial({
    color: 0x5cc4f5,
    roughness: 0.16,
    metalness: 0.08,
    transparent: true,
    opacity: 0.84,
  });
  const waterCap = new THREE.MeshStandardMaterial({
    color: 0x1d4ed8,
    roughness: 0.45,
    metalness: 0.05,
  });
  const medCaseWhite = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    roughness: 0.48,
    metalness: 0.06,
  });
  const steelPipe = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.42,
    metalness: 0.82,
  });
  const toolRed = new THREE.MeshStandardMaterial({
    color: 0x8f2924,
    roughness: 0.52,
    metalness: 0.42,
  });
  const caseOlive = new THREE.MeshStandardMaterial({
    color: 0x3b4938,
    roughness: 0.68,
    metalness: 0.28,
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

  // Base rusted plate
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.32), mats.rustedMetal);
  plate.position.set(0, 0.018, 0);
  plate.rotation.y = 0.2;
  plate.castShadow = true;
  plate.receiveShadow = true;

  // Bent steel pipe
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.44, 10),
    resMats.steelPipe
  );
  pipe.rotation.z = Math.PI * 0.5;
  pipe.rotation.y = -0.35;
  pipe.position.set(0.02, 0.075, -0.02);
  pipe.castShadow = true;

  // Angled L-bracket / flange plate
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.16), resMats.tinMetal);
  bracket.position.set(-0.06, 0.08, 0.06);
  bracket.rotation.set(0.25, 0.5, -0.18);
  bracket.castShadow = true;

  // Gear / wheel hub ring
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.11, 0.045, 12),
    mats.rustedMetal
  );
  hub.position.set(0.11, 0.06, 0.07);
  hub.rotation.x = 0.22;
  hub.castShadow = true;

  group.add(plate, pipe, bracket, hub);
  return group;
}

export function buildWoodModel(mats: MaterialPalette): THREE.Group {
  const group = new THREE.Group();

  const plankGeo = new THREE.BoxGeometry(0.58, 0.065, 0.13);
  const strapGeo = new THREE.BoxGeometry(0.04, 0.15, 0.31);

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

  // White polymer hard case
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.28), resMats.medCaseWhite);
  box.position.y = 0.075;
  box.castShadow = true;
  box.receiveShadow = true;

  // Carry handle on front edge
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.045), mats.darkTrim);
  handle.position.set(0, 0.075, 0.155);

  // Two dark clasp latches
  const latchL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), mats.darkTrim);
  latchL.position.set(-0.11, 0.09, 0.145);
  const latchR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), mats.darkTrim);
  latchR.position.set(0.11, 0.09, 0.145);

  // Raised Red Cross emblem on lid
  const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.016, 0.044), mats.hydrantRed);
  crossH.position.set(0, 0.154, 0);
  const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.016, 0.14), mats.hydrantRed);
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

  // Tabletop surface flush at WORKTABLE_HEIGHT (0.78m)
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.07, 0.82), mats.wood);
  top.position.y = WORKTABLE_HEIGHT - 0.035;
  top.castShadow = true;
  top.receiveShadow = true;
  group.add(top);

  // 4 steel legs
  const legGeo = new THREE.BoxGeometry(0.08, WORKTABLE_HEIGHT - 0.07, 0.08);
  const legOffsets = [
    [-0.68, -0.32],
    [0.68, -0.32],
    [-0.68, 0.32],
    [0.68, 0.32],
  ];
  for (const [lx, lz] of legOffsets) {
    const leg = new THREE.Mesh(legGeo, mats.darkTrim);
    leg.position.set(lx, (WORKTABLE_HEIGHT - 0.07) * 0.5, lz);
    leg.castShadow = true;
    group.add(leg);
  }

  // Lower shelf
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.38, 0.045, 0.68), mats.wood);
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
    const frameTop = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.07, 0.07),
      mats.lampMetal
    );
    frameTop.position.set(width * 0.5, 1.92, 0);

    const frameBot = new THREE.Mesh(
      new THREE.BoxGeometry(width, 0.07, 0.07),
      mats.lampMetal
    );
    frameBot.position.set(width * 0.5, 0.14, 0);

    const postHinge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 2.0, 8),
      mats.lampMetal
    );
    postHinge.position.set(0.03, 1.0, 0);

    const postLatch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.98, 8),
      mats.lampMetal
    );
    postLatch.position.set(width - 0.04, 0.99, 0);

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

    // Amber latch handle on the swinging edge so players notice it is interactive
    const handle = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.12, 0.14),
      mats.barrierHazard
    );
    handle.position.set(width - 0.18, 1.04, 0);

    pivot.add(frameTop, frameBot, postHinge, postLatch, grid, handle);
  } else {
    const railTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.09, 0.09), mats.wood);
    railTop.position.set(width * 0.5, 1.65, 0);
    const railBot = new THREE.Mesh(new THREE.BoxGeometry(width, 0.09, 0.09), mats.wood);
    railBot.position.set(width * 0.5, 0.42, 0);
    pivot.add(railTop, railBot);

    const plankCount = Math.max(4, Math.floor(width / 0.28));
    const step = width / plankCount;
    for (let i = 0; i < plankCount; i++) {
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(step * 0.86, 1.88, 0.055),
        mats.wood
      );
      plank.position.set((i + 0.5) * step, 0.96, 0.04);
      plank.castShadow = true;
      pivot.add(plank);
    }

    const latch = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.1, 0.15),
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

  // Base chest box (0.86 x 0.44 x 0.52)
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.42, 0.52), bodyMat);
  base.position.y = 0.21;
  base.castShadow = true;
  base.receiveShadow = true;

  // Inner dark tray recess visible once lid opens
  const interior = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.04, 0.42), mats.darkTrim);
  interior.position.y = 0.41;

  // Hinged lid pivot at rear edge (z = -0.26, y = 0.42)
  const lidPivot = new THREE.Group();
  lidPivot.position.set(0, 0.42, -0.26);

  const lid = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.1, 0.54), bodyMat);
  lid.position.set(0, 0.05, 0.26);
  lid.castShadow = true;

  const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.07, 0.04), mats.barrierHazard);
  clasp.position.set(0, 0.01, 0.53);

  const strapL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.55), mats.darkTrim);
  strapL.position.set(-0.28, 0.05, 0.26);
  const strapR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.11, 0.55), mats.darkTrim);
  strapR.position.set(0.28, 0.05, 0.26);

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
      new THREE.BoxGeometry(0.28, 0.02, 0.19),
      resMats.medCaseWhite
    );
    card.position.y = 0.014;
    card.castShadow = true;

    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(0.282, 0.022, 0.048),
      mats.beaconRed
    );
    stripe.position.set(0, 0.014, -0.052);

    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.065, 0.024, 0.05),
      mats.beaconCyan
    );
    chip.position.set(-0.065, 0.014, 0.03);

    group.add(card, stripe, chip);
  } else {
    const tag = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.02, 0.095),
      mats.beaconAmber
    );
    tag.position.set(-0.095, 0.015, 0);
    tag.rotation.y = 0.3;

    const bow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.056, 0.056, 0.02, 12),
      mats.beaconAmber
    );
    bow.position.set(0.02, 0.016, 0);
    bow.castShadow = true;

    const shaft = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.016, 0.025),
      resMats.tinMetal
    );
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

