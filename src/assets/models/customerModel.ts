import * as THREE from 'three';
import { CustomerAIState } from '../../game/types';
import {
  HumanHairStyle,
  HumanHeadwearKind,
  HumanoidSharedGeometries,
  createHumanoidSharedGeometries,
  damp,
} from './characterGeometryKit';

export type CustomerSharedGeometries = HumanoidSharedGeometries;

export type CustomerAnimState = 'idle' | 'walk' | 'browsing' | 'purchasing' | 'carrying';

export interface CustomerRigAnimData {
  currentState: CustomerAnimState;
  idlePhase: number;
  smoothedSpeed: number;
  smoothedYawRate: number;
}

export interface CustomerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  spinePivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightLegPivot: THREE.Group;
  rightKneePivot: THREE.Group;
  statusMarker: THREE.Mesh;
  statusMat: THREE.MeshBasicMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  animData: CustomerRigAnimData;
  dispose: () => void;
}

interface CustomerVisualSpec {
  bodyType: 'slim' | 'athletic' | 'stocky';
  skinHex: number;
  shirtHex: number;
  jacketHex: number;
  pantsHex: number;
  bootHex: number;
  hairStyle: HumanHairStyle;
  hairHex: number;
  headwear: HumanHeadwearKind;
  headwearHex: number;
  packKind: 'backpack' | 'courier';
  packHex: number;
  hasHoodieCollar: boolean;
}

const CUSTOMER_APPEARANCE_BY_ID: Record<string, CustomerVisualSpec> = {
  mara: {
    bodyType: 'slim',
    skinHex: 0xc2967a,
    shirtHex: 0x9aa2ab,
    jacketHex: 0x2b4554,
    pantsHex: 0x21262e,
    bootHex: 0x1f1915,
    hairStyle: 'ponytail_bun',
    hairHex: 0x45271a,
    headwear: 'none',
    headwearHex: 0x292524,
    packKind: 'courier',
    packHex: 0x45413d,
    hasHoodieCollar: false,
  },
  cole: {
    bodyType: 'stocky',
    skinHex: 0xad7b5d,
    shirtHex: 0x7c8691,
    jacketHex: 0x63391e,
    pantsHex: 0x1e2128,
    bootHex: 0x1b1715,
    hairStyle: 'short_crop',
    hairHex: 0x221d1b,
    headwear: 'beanie',
    headwearHex: 0x3b2f24,
    packKind: 'backpack',
    packHex: 0x393632,
    hasHoodieCollar: false,
  },
  elena: {
    bodyType: 'slim',
    skinHex: 0xc7a38a,
    shirtHex: 0xa6a3a0,
    jacketHex: 0x344636,
    pantsHex: 0x232830,
    bootHex: 0x2b1f18,
    hairStyle: 'long_layered',
    hairHex: 0x36231a,
    headwear: 'none',
    headwearHex: 0x292524,
    packKind: 'courier',
    packHex: 0x333e36,
    hasHoodieCollar: true,
  },
  jax: {
    bodyType: 'athletic',
    skinHex: 0x875a40,
    shirtHex: 0x8e9298,
    jacketHex: 0x52342b,
    pantsHex: 0x1c2026,
    bootHex: 0x171513,
    hairStyle: 'short_crop',
    hairHex: 0x181615,
    headwear: 'cap',
    headwearHex: 0x262a2e,
    packKind: 'backpack',
    packHex: 0x4f3c2d,
    hasHoodieCollar: false,
  },
  nora: {
    bodyType: 'slim',
    skinHex: 0xb88e72,
    shirtHex: 0x989ea6,
    jacketHex: 0x37414e,
    pantsHex: 0x1e2329,
    bootHex: 0x1f1916,
    hairStyle: 'side_part',
    hairHex: 0x1d1816,
    headwear: 'hood',
    headwearHex: 0x2d3743,
    packKind: 'courier',
    packHex: 0x2a3441,
    hasHoodieCollar: true,
  },
};

const CUSTOMER_FALLBACK_ORDER = ['mara', 'cole', 'elena', 'jax', 'nora'];

export function createCustomerSharedGeometries(): CustomerSharedGeometries {
  return createHumanoidSharedGeometries();
}

function getHairGeometry(
  geos: HumanoidSharedGeometries,
  style: HumanHairStyle
): THREE.BufferGeometry {
  switch (style) {
    case 'messy':
      return geos.hairMessy;
    case 'long_layered':
      return geos.hairLongLayered;
    case 'ponytail_bun':
      return geos.hairPonytailBun;
    case 'side_part':
      return geos.hairSidePart;
    case 'bald_stubble':
      return geos.hairStubble;
    case 'short_crop':
    default:
      return geos.hairShortCrop;
  }
}

/**
 * Builds an articulated organic humanoid customer with bottom-center pivot at y=0.
 * Visually distinct per named customer profile (face, hair, clothing layers, backpack, boots).
 */
export function buildProceduralCustomerModel(
  geos: CustomerSharedGeometries,
  variant = 0,
  profileId?: string
): { group: THREE.Group; rig: CustomerRig } {
  const root = new THREE.Group();
  const resolvedId =
    profileId && CUSTOMER_APPEARANCE_BY_ID[profileId]
      ? profileId
      : CUSTOMER_FALLBACK_ORDER[Math.abs(variant) % CUSTOMER_FALLBACK_ORDER.length];
  const spec = CUSTOMER_APPEARANCE_BY_ID[resolvedId];

  const skinMat = new THREE.MeshStandardMaterial({
    color: spec.skinHex,
    roughness: 0.85,
    metalness: 0.01,
    vertexColors: true,
    bumpMap: geos.textures.skinBump,
    bumpScale: 0.004,
  });
  const shirtMat = new THREE.MeshStandardMaterial({
    color: spec.shirtHex,
    roughness: 0.9,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.006,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: spec.jacketHex,
    roughness: 0.86,
    metalness: 0.05,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.008,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: spec.pantsHex,
    roughness: 0.91,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.006,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: spec.packHex,
    roughness: 0.78,
    metalness: 0.1,
    vertexColors: true,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: spec.hairHex,
    roughness: 0.92,
    metalness: 0.04,
    vertexColors: true,
  });
  const headwearMat = new THREE.MeshStandardMaterial({
    color: spec.headwearHex,
    roughness: 0.88,
    metalness: 0.04,
    vertexColors: true,
  });
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xa8a399,
    roughness: 0.42,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x191614,
    roughness: 0.25,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const statusMat = new THREE.MeshBasicMaterial({
    color: 0x807257,
    transparent: true,
    opacity: 0.0,
  });

  const shadowMesh = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowMesh.position.y = 0.024;
  root.add(shadowMesh);

  // Hip height at 0.91m so boot soles touch y = 0.0 cleanly (adult ~1.76m stature)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.91;
  root.add(bodyPivot);

  const pelvisMesh = new THREE.Mesh(geos.pelvis, pantsMat);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  bodyPivot.add(pelvisMesh);

  const hipX = spec.bodyType === 'slim' ? 0.092 : spec.bodyType === 'stocky' ? 0.112 : 0.1;

  // Articulated 2-segment Legs (Thigh + Knee -> Shin & Boot)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-hipX, -0.01, 0);
  const leftThigh = new THREE.Mesh(geos.thigh, pantsMat);
  leftThigh.castShadow = true;
  leftThigh.receiveShadow = true;
  leftLegPivot.add(leftThigh);

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.set(0, -0.42, 0);
  const leftShin = new THREE.Mesh(geos.shinBoot, pantsMat);
  leftShin.castShadow = true;
  leftShin.receiveShadow = true;
  leftKneePivot.add(leftShin);
  leftLegPivot.add(leftKneePivot);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(hipX, -0.01, 0);
  const rightThigh = new THREE.Mesh(geos.thigh, pantsMat);
  rightThigh.castShadow = true;
  rightThigh.receiveShadow = true;
  rightLegPivot.add(rightThigh);

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.set(0, -0.42, 0);
  const rightShin = new THREE.Mesh(geos.shinBoot, pantsMat);
  rightShin.castShadow = true;
  rightShin.receiveShadow = true;
  rightKneePivot.add(rightShin);
  rightLegPivot.add(rightKneePivot);
  bodyPivot.add(rightLegPivot);

  // Spine & Torso layers
  const spinePivot = new THREE.Group();
  spinePivot.position.set(0, 0.04, 0);
  bodyPivot.add(spinePivot);

  const torsoGeo =
    spec.bodyType === 'slim'
      ? geos.torsoSlim
      : spec.bodyType === 'stocky'
        ? geos.torsoStocky
        : geos.torsoAthletic;
  const torsoMesh = new THREE.Mesh(torsoGeo, shirtMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  spinePivot.add(torsoMesh);

  const jacketMesh = new THREE.Mesh(geos.jacketOpen, jacketMat);
  if (spec.bodyType === 'slim') jacketMesh.scale.set(0.92, 0.98, 0.94);
  if (spec.bodyType === 'stocky') jacketMesh.scale.set(1.08, 1.01, 1.08);
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  spinePivot.add(jacketMesh);

  if (spec.hasHoodieCollar) {
    const collar = new THREE.Mesh(geos.hoodieCollar, jacketMat);
    spinePivot.add(collar);
  }

  const beltMesh = new THREE.Mesh(geos.beltWithPouches, packMat);
  if (spec.bodyType === 'slim') beltMesh.scale.set(0.92, 1, 0.94);
  if (spec.bodyType === 'stocky') beltMesh.scale.set(1.08, 1, 1.08);
  spinePivot.add(beltMesh);

  const packMesh = new THREE.Mesh(
    spec.packKind === 'courier' ? geos.courierPack : geos.backpack,
    packMat
  );
  packMesh.castShadow = true;
  spinePivot.add(packMesh);

  // Sculpted Head, Eyes, Brows, Hair & Optional Headwear
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.55, 0);

  const headGeo =
    spec.bodyType === 'slim'
      ? geos.headFemale
      : spec.bodyType === 'stocky'
        ? geos.headStocky
        : geos.headHuman;
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  const eyeX = spec.bodyType === 'slim' ? 0.031 : 0.034;
  const eyeZ = -0.090;
  for (const sx of [-1, 1]) {
    const sclera = new THREE.Mesh(geos.eyeSclera, scleraMat);
    sclera.position.set(sx * eyeX, 0.136, eyeZ);
    const iris = new THREE.Mesh(geos.eyeIris, irisMat);
    iris.position.set(sx * eyeX, 0.136, eyeZ - 0.004);
    const brow = new THREE.Mesh(geos.eyebrow, hairMat);
    brow.position.set(sx * eyeX, 0.155, eyeZ - 0.004);
    brow.rotation.z = sx * -0.06;
    headPivot.add(sclera, iris, brow);
  }

  const hairMesh = new THREE.Mesh(getHairGeometry(geos, spec.hairStyle), hairMat);
  hairMesh.castShadow = true;
  headPivot.add(hairMesh);

  if (spec.headwear === 'cap') {
    const cap = new THREE.Mesh(geos.headwearCap, headwearMat);
    cap.castShadow = true;
    const visor = new THREE.Mesh(geos.headwearCapVisor, headwearMat);
    headPivot.add(cap, visor);
  } else if (spec.headwear === 'beanie') {
    const beanie = new THREE.Mesh(geos.headwearBeanie, headwearMat);
    beanie.castShadow = true;
    headPivot.add(beanie);
  } else if (spec.headwear === 'hood') {
    const hood = new THREE.Mesh(geos.headwearHood, headwearMat);
    hood.castShadow = true;
    headPivot.add(hood);
  }
  spinePivot.add(headPivot);

  // Articulated 2-segment Arms (Shoulder -> Upper Arm -> Elbow -> Forearm -> Hand)
  const shoulderX = spec.bodyType === 'slim' ? 0.195 : spec.bodyType === 'stocky' ? 0.232 : 0.214;

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-shoulderX, 0.46, 0);
  const leftUpper = new THREE.Mesh(geos.upperArm, jacketMat);
  leftUpper.castShadow = true;
  leftArmPivot.add(leftUpper);

  const leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.set(0, -0.27, 0);
  const leftForearm = new THREE.Mesh(geos.forearm, jacketMat);
  leftForearm.castShadow = true;
  const leftHand = new THREE.Mesh(geos.handHuman, skinMat);
  leftHand.position.set(0, -0.245, 0);
  leftForearmPivot.add(leftForearm, leftHand);
  leftArmPivot.add(leftForearmPivot);
  spinePivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(shoulderX, 0.46, 0);
  const rightUpper = new THREE.Mesh(geos.upperArm, jacketMat);
  rightUpper.castShadow = true;
  rightArmPivot.add(rightUpper);

  const rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.set(0, -0.27, 0);
  const rightForearm = new THREE.Mesh(geos.forearm, jacketMat);
  rightForearm.castShadow = true;
  const rightHand = new THREE.Mesh(geos.handHuman, skinMat);
  rightHand.position.set(0, -0.245, 0);
  rightForearmPivot.add(rightForearm, rightHand);
  rightArmPivot.add(rightForearmPivot);
  spinePivot.add(rightArmPivot);

  // Keep statusMarker on rig for compatibility, permanently hidden for grounded horror realism
  const statusMarker = new THREE.Mesh(geos.statusMarker, statusMat);
  statusMarker.position.set(0, 2.0, 0);
  statusMarker.visible = false;
  root.add(statusMarker);

  const rig: CustomerRig = {
    root,
    bodyPivot,
    spinePivot,
    headPivot,
    leftArmPivot,
    leftForearmPivot,
    rightArmPivot,
    rightForearmPivot,
    leftLegPivot,
    leftKneePivot,
    rightLegPivot,
    rightKneePivot,
    statusMarker,
    statusMat,
    shadowMat,
    animData: {
      currentState: 'idle',
      idlePhase: variant * 1.3,
      smoothedSpeed: 0,
      smoothedYawRate: 0,
    },
    dispose: () => {
      skinMat.dispose();
      shirtMat.dispose();
      jacketMat.dispose();
      pantsMat.dispose();
      packMat.dispose();
      hairMat.dispose();
      headwearMat.dispose();
      scleraMat.dispose();
      irisMat.dispose();
      shadowMat.dispose();
      statusMat.dispose();
    },
  };

  return { group: root, rig };
}

export function animateCustomerRig(
  rig: CustomerRig,
  state: CustomerAIState,
  walkCycle: number,
  isMoving: boolean,
  hasPurchase: boolean,
  dt = 0.016,
  actualSpeed?: number,
  yawRate = 0,
  distSq = 0
): void {
  // Hide arcade floating diamonds permanently
  rig.statusMarker.visible = false;

  const isFarLod = distSq > 30 * 30;
  const rawSpeed = actualSpeed ?? (isMoving ? 1.8 : 0);
  rig.animData.smoothedSpeed = damp(rig.animData.smoothedSpeed, rawSpeed, 12, dt);
  rig.animData.smoothedYawRate = damp(rig.animData.smoothedYawRate, yawRate, 10, dt);
  rig.animData.idlePhase += dt * 1.5;

  let animState: CustomerAnimState = 'idle';
  if (state === 'purchasing') {
    animState = 'purchasing';
  } else if (state === 'leaving' && hasPurchase && (rig.animData.smoothedSpeed > 0.14 || isMoving)) {
    animState = 'carrying';
  } else if (rig.animData.smoothedSpeed > 0.14 || isMoving) {
    animState = 'walk';
  } else if (state === 'browsing') {
    animState = 'browsing';
  }
  rig.animData.currentState = animState;

  const ph = rig.animData.idlePhase;
  const turnLean = Math.max(-0.16, Math.min(0.16, rig.animData.smoothedYawRate * 0.06));
  const turnHead = Math.max(-0.28, Math.min(0.28, rig.animData.smoothedYawRate * 0.095));

  let tBodyY = 0.91;
  let tBodyRx = 0.015;
  let tBodyRz = 0;
  let tSpineRx = 0.015;
  let tSpineRy = 0;
  let tHeadRx = 0;
  let tHeadRy = 0;
  let tHeadRz = 0;
  let tLegLx = 0.03;
  let tLegRx = -0.03;
  let tKneeLx = 0.05;
  let tKneeRx = 0.05;
  let tArmLx = 0.06;
  let tArmRx = 0.08;
  let tForeLx = 0.22;
  let tForeRx = 0.24;
  let blend = 10;

  if (animState === 'purchasing') {
    tBodyY = 0.91 + (isFarLod ? 0 : Math.sin(ph * 1.1) * 0.005);
    tBodyRx = 0.03;
    tBodyRz = turnLean * 0.35;
    tSpineRx = 0.055;
    tSpineRy = Math.sin(ph * 1.4) * 0.04;
    tLegLx = 0.04;
    tLegRx = -0.04;
    tKneeLx = 0.06;
    tKneeRx = 0.06;
    tArmLx = 0.14;
    tForeLx = 0.28;
    tArmRx = 0.68 + Math.sin(ph * 2.2) * 0.1;
    tForeRx = 0.48 + Math.cos(ph * 2.2) * 0.06;
    tHeadRx = 0.02;
    tHeadRy = Math.sin(ph * 1.1) * 0.1 + turnHead * 0.5;
    blend = 11;
  } else if (animState === 'browsing') {
    const breath = isFarLod ? 0 : Math.sin(ph * 1.2) * 0.007;
    tBodyY = 0.91 + breath;
    tBodyRx = 0.02;
    tBodyRz = turnLean * 0.3;
    tSpineRx = 0.045;
    tSpineRy = Math.sin(ph * 0.8) * 0.05;
    tLegLx = 0.05;
    tLegRx = -0.05;
    tKneeLx = 0.06;
    tKneeRx = 0.05;
    tArmLx = 0.08;
    tForeLx = 0.24;
    tArmRx = 0.38 + Math.sin(ph * 1.35) * 0.1;
    tForeRx = 0.62 + Math.cos(ph * 1.35) * 0.07;
    tHeadRx = Math.sin(ph * 0.9) * 0.06;
    tHeadRy = Math.sin(ph * 0.85) * 0.34 + turnHead * 0.5;
    blend = 10;
  } else if (animState === 'walk' || animState === 'carrying') {
    const isCarrying = animState === 'carrying';
    const speedRatio = Math.min(1.2, Math.max(0.25, rig.animData.smoothedSpeed / 1.85));
    const s = Math.sin(walkCycle);
    const c = Math.cos(walkCycle);
    const stride = s * 0.45 * Math.min(1.06, speedRatio + 0.15);
    const hipDip = Math.abs(s) * 0.021;

    tBodyY = 0.91 - hipDip;
    tBodyRx = 0.03;
    tBodyRz = c * 0.024 + turnLean;
    tSpineRx = isCarrying ? 0.03 : 0.04;
    tSpineRy = -s * (isCarrying ? 0.035 : 0.055) + turnHead * 0.25;

    tLegLx = stride;
    tLegRx = -stride;
    tKneeLx = Math.max(0.06, -c * 0.56 + 0.12);
    tKneeRx = Math.max(0.06, c * 0.56 + 0.12);

    tArmLx = -stride * 0.72;
    tForeLx = 0.26 + Math.max(0, -s) * 0.32;
    if (isCarrying) {
      // Cradles purchased supplies naturally against chest/side while walking out
      tArmRx = 0.44 + stride * 0.14;
      tForeRx = 0.96;
    } else {
      tArmRx = stride * 0.72;
      tForeRx = 0.26 + Math.max(0, s) * 0.32;
    }
    tHeadRy = Math.sin(walkCycle * 0.4) * 0.08 + turnHead;
    tHeadRz = -turnLean * 0.35;
    blend = 13;
  } else {
    // Stationary idle
    const breath = isFarLod ? 0 : Math.sin(ph * 1.2) * 0.008;
    tBodyY = 0.91 + breath;
    tBodyRx = 0.015;
    tBodyRz = turnLean * 0.35;
    tSpineRx = 0.015;
    tLegLx = 0.03;
    tLegRx = -0.03;
    tKneeLx = 0.05;
    tKneeRx = 0.05;
    tArmLx = 0.06;
    tForeLx = 0.22;
    tArmRx = 0.08;
    tForeRx = 0.24;
    tHeadRy = Math.sin(ph * 0.5) * 0.1 + turnHead;
    blend = 10;
  }

  // Single-writer damped joint application
  const limbBlend = isFarLod ? blend : Math.max(blend, 13);
  rig.bodyPivot.position.y = damp(rig.bodyPivot.position.y, tBodyY, blend, dt);
  rig.bodyPivot.rotation.x = damp(rig.bodyPivot.rotation.x, tBodyRx, blend, dt);
  rig.bodyPivot.rotation.z = damp(rig.bodyPivot.rotation.z, tBodyRz, blend, dt);
  rig.spinePivot.rotation.x = damp(rig.spinePivot.rotation.x, tSpineRx, blend, dt);
  rig.spinePivot.rotation.y = damp(rig.spinePivot.rotation.y, tSpineRy, blend, dt);

  rig.headPivot.rotation.x = damp(rig.headPivot.rotation.x, tHeadRx, blend, dt);
  rig.headPivot.rotation.y = damp(rig.headPivot.rotation.y, tHeadRy, blend, dt);
  rig.headPivot.rotation.z = damp(rig.headPivot.rotation.z, tHeadRz, blend, dt);

  rig.leftLegPivot.rotation.x = damp(rig.leftLegPivot.rotation.x, tLegLx, limbBlend, dt);
  rig.rightLegPivot.rotation.x = damp(rig.rightLegPivot.rotation.x, tLegRx, limbBlend, dt);
  rig.leftKneePivot.rotation.x = damp(rig.leftKneePivot.rotation.x, tKneeLx, limbBlend, dt);
  rig.rightKneePivot.rotation.x = damp(rig.rightKneePivot.rotation.x, tKneeRx, limbBlend, dt);

  rig.leftArmPivot.rotation.x = damp(rig.leftArmPivot.rotation.x, tArmLx, limbBlend, dt);
  rig.rightArmPivot.rotation.x = damp(rig.rightArmPivot.rotation.x, tArmRx, limbBlend, dt);
  rig.leftForearmPivot.rotation.x = damp(rig.leftForearmPivot.rotation.x, tForeLx, limbBlend, dt);
  rig.rightForearmPivot.rotation.x = damp(rig.rightForearmPivot.rotation.x, tForeRx, limbBlend, dt);
}
