import * as THREE from 'three';
import { PROFESSION_CONFIGS } from '../../game/staffSystem';
import { EmployeeProfession, EmployeeStatus } from '../../game/types';
import { tProfession } from '../../i18n';
import {
  HumanHairStyle,
  HumanHeadwearKind,
  HumanoidSharedGeometries,
  createHumanoidSharedGeometries,
  damp,
} from './characterGeometryKit';

export type StaffSharedGeometries = HumanoidSharedGeometries;

export type HumanAnimState =
  | 'idle'
  | 'talking'
  | 'walk'
  | 'run'
  | 'working'
  | 'patrolling'
  | 'engaging'
  | 'attack'
  | 'hit_reaction'
  | 'recovering'
  | 'unpaid';

export interface StaffRigAnimData {
  currentState: HumanAnimState;
  idlePhase: number;
  smoothedSpeed: number;
  smoothedYawRate: number;
}

export interface StaffCharacterRig {
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
  vestMesh: THREE.Mesh;
  vestMat: THREE.MeshStandardMaterial;
  capMat: THREE.MeshStandardMaterial;
  apronMesh: THREE.Mesh;
  tacticalVestMesh: THREE.Mesh;
  harnessMesh: THREE.Mesh;
  packMesh: THREE.Mesh;
  batonMesh: THREE.Mesh;
  statusMarker: THREE.Mesh;
  statusMat: THREE.MeshBasicMaterial;
  labelSprite: THREE.Sprite | null;
  labelMat: THREE.SpriteMaterial | null;
  labelTex: THREE.CanvasTexture | null;
  animData: StaffRigAnimData;
  dispose: () => void;
}

interface SurvivorVisualSpec {
  bodyType: 'slim' | 'athletic' | 'stocky';
  skinHex: number;
  shirtHex: number;
  jacketHex: number;
  pantsHex: number;
  hairStyle: HumanHairStyle;
  hairHex: number;
  headwear: HumanHeadwearKind;
  headwearHex: number;
  rolledSleeves: boolean;
  legBandage: boolean;
  defaultApron: boolean;
  defaultVest: boolean;
  defaultHarness: boolean;
  defaultPack: boolean;
}

const SURVIVOR_VISUAL_SPECS: Record<string, SurvivorVisualSpec> = {
  surv_maya: {
    bodyType: 'slim',
    skinHex: 0xd9ab8c,
    shirtHex: 0xd6d3d1,
    jacketHex: 0x92400e,
    pantsHex: 0x262d38,
    hairStyle: 'ponytail_bun',
    hairHex: 0x45271a,
    headwear: 'none',
    headwearHex: 0x451a03,
    rolledSleeves: true,
    legBandage: false,
    defaultApron: true,
    defaultVest: false,
    defaultHarness: false,
    defaultPack: true,
  },
  surv_soren: {
    bodyType: 'athletic',
    skinHex: 0xc5906f,
    shirtHex: 0x64748b,
    jacketHex: 0x3f4c5e,
    pantsHex: 0x1e2633,
    hairStyle: 'short_crop',
    hairHex: 0x241e1a,
    headwear: 'none',
    headwearHex: 0x0f172a,
    rolledSleeves: false,
    legBandage: true,
    defaultApron: false,
    defaultVest: true,
    defaultHarness: false,
    defaultPack: false,
  },
  surv_dante: {
    bodyType: 'stocky',
    skinHex: 0x9c6b4d,
    shirtHex: 0x854d27,
    jacketHex: 0x57534e,
    pantsHex: 0x21242b,
    hairStyle: 'short_crop',
    hairHex: 0x181513,
    headwear: 'beanie',
    headwearHex: 0x1e3a34,
    rolledSleeves: true,
    legBandage: false,
    defaultApron: false,
    defaultVest: false,
    defaultHarness: true,
    defaultPack: true,
  },
  surv_kira: {
    bodyType: 'slim',
    skinHex: 0xd0a182,
    shirtHex: 0x94a3b8,
    jacketHex: 0x3b4d37,
    pantsHex: 0x1f2726,
    hairStyle: 'messy',
    hairHex: 0x1d1917,
    headwear: 'hood',
    headwearHex: 0x2f3e2d,
    rolledSleeves: false,
    legBandage: false,
    defaultApron: false,
    defaultVest: false,
    defaultHarness: false,
    defaultPack: true,
  },
  surv_toby: {
    bodyType: 'athletic',
    skinHex: 0xcfa080,
    shirtHex: 0xb45309,
    jacketHex: 0x374151,
    pantsHex: 0x1f2937,
    hairStyle: 'side_part',
    hairHex: 0x4b3526,
    headwear: 'cap',
    headwearHex: 0x292524,
    rolledSleeves: false,
    legBandage: false,
    defaultApron: false,
    defaultVest: false,
    defaultHarness: false,
    defaultPack: true,
  },
};

const SURVIVOR_VARIANT_FALLBACK = [
  'surv_maya',
  'surv_soren',
  'surv_dante',
  'surv_kira',
  'surv_toby',
];

export function createStaffSharedGeometries(): StaffSharedGeometries {
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

function createNameTagTexture(
  title: string,
  subtitle: string,
  accentColor: string
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(11, 15, 23, 0.86)';
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 12);
    ctx.fill();

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 12);
    ctx.stroke();

    ctx.direction = /[\u0600-\u06FF]/.test(`${title} ${subtitle}`) ? 'rtl' : 'ltr';
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px Cairo, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, 29);

    ctx.fillStyle = accentColor;
    ctx.font = '600 17px Cairo, system-ui, sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, 51);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function buildProceduralStaffModel(
  geos: StaffSharedGeometries,
  options: {
    variant: number;
    kind: 'survivor' | 'employee';
    profession?: EmployeeProfession;
    survivorId?: string;
    name: string;
    subtitle: string;
  }
): { group: THREE.Group; rig: StaffCharacterRig } {
  const root = new THREE.Group();
  const variant = Math.max(0, options.variant);
  const specId =
    options.survivorId && SURVIVOR_VISUAL_SPECS[options.survivorId]
      ? options.survivorId
      : SURVIVOR_VARIANT_FALLBACK[variant % SURVIVOR_VARIANT_FALLBACK.length];
  const spec = SURVIVOR_VISUAL_SPECS[specId];

  const profCfg = options.profession ? PROFESSION_CONFIGS[options.profession] : null;
  const vestHex = profCfg ? profCfg.coatColorHex : spec.jacketHex;
  const capHex = profCfg ? profCfg.hatColorHex : spec.headwearHex;

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
    roughness: 0.88,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.006,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestHex,
    roughness: 0.83,
    metalness: 0.06,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.008,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: spec.pantsHex,
    roughness: 0.9,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.006,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x44403c,
    roughness: 0.78,
    metalness: 0.1,
    vertexColors: true,
  });
  const apronMat = new THREE.MeshStandardMaterial({
    color: 0xd6cec2,
    roughness: 0.9,
    metalness: 0.02,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.007,
  });
  const tacMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.72,
    metalness: 0.18,
    vertexColors: true,
  });
  const bandageMat = new THREE.MeshStandardMaterial({
    color: 0xe2ddd5,
    roughness: 0.92,
    metalness: 0.02,
    vertexColors: true,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: spec.hairHex,
    roughness: 0.92,
    metalness: 0.04,
    vertexColors: true,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: capHex,
    roughness: 0.86,
    metalness: 0.05,
    vertexColors: true,
  });
  const batonMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.38,
    metalness: 0.76,
    vertexColors: true,
  });
  const scleraMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.35,
  });
  const irisMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b18,
    roughness: 0.25,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const statusMat = new THREE.MeshBasicMaterial({
    color: options.kind === 'survivor' ? 0x38bdf8 : 0x34d399,
    transparent: true,
    opacity: 0.9,
  });

  const shadowMesh = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowMesh.position.y = 0.024;
  root.add(shadowMesh);

  // Pelvis at 0.84m so boot soles rest flush at y = 0.0
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.84;
  root.add(bodyPivot);

  const pelvisMesh = new THREE.Mesh(geos.pelvis, pantsMat);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  bodyPivot.add(pelvisMesh);

  const hipX = spec.bodyType === 'slim' ? 0.092 : spec.bodyType === 'stocky' ? 0.112 : 0.1;

  // Articulated 2-segment Legs
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-hipX, -0.01, 0);
  const leftThigh = new THREE.Mesh(geos.thigh, pantsMat);
  leftThigh.castShadow = true;
  leftThigh.receiveShadow = true;
  leftLegPivot.add(leftThigh);

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.set(0, -0.39, 0);
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

  if (spec.legBandage) {
    const bandage = new THREE.Mesh(geos.legBandage, bandageMat);
    rightLegPivot.add(bandage);
  }

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.set(0, -0.39, 0);
  const rightShin = new THREE.Mesh(geos.shinBoot, pantsMat);
  rightShin.castShadow = true;
  rightShin.receiveShadow = true;
  rightKneePivot.add(rightShin);
  rightLegPivot.add(rightKneePivot);
  bodyPivot.add(rightLegPivot);

  // Spine, Torso & Layered Gear
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

  const vestMesh = new THREE.Mesh(geos.jacketOpen, vestMat);
  if (spec.bodyType === 'slim') vestMesh.scale.set(0.92, 0.98, 0.94);
  if (spec.bodyType === 'stocky') vestMesh.scale.set(1.08, 1.01, 1.08);
  vestMesh.castShadow = true;
  vestMesh.receiveShadow = true;
  spinePivot.add(vestMesh);

  const beltMesh = new THREE.Mesh(geos.beltWithPouches, packMat);
  if (spec.bodyType === 'slim') beltMesh.scale.set(0.92, 1, 0.94);
  if (spec.bodyType === 'stocky') beltMesh.scale.set(1.08, 1, 1.08);
  spinePivot.add(beltMesh);

  // Swappable Profession / Character Equipment Layers
  const apronMesh = new THREE.Mesh(geos.apron, apronMat);
  apronMesh.visible =
    options.profession === 'shopkeeper' ||
    (options.kind === 'survivor' && spec.defaultApron);
  spinePivot.add(apronMesh);

  const tacticalVestMesh = new THREE.Mesh(geos.tacticalVest, tacMat);
  if (spec.bodyType === 'slim') tacticalVestMesh.scale.set(0.92, 0.98, 0.94);
  if (spec.bodyType === 'stocky') tacticalVestMesh.scale.set(1.08, 1.01, 1.08);
  tacticalVestMesh.castShadow = true;
  tacticalVestMesh.visible =
    options.profession === 'guard' ||
    (options.kind === 'survivor' && spec.defaultVest);
  spinePivot.add(tacticalVestMesh);

  const harnessMesh = new THREE.Mesh(geos.freightHarness, packMat);
  if (spec.bodyType === 'slim') harnessMesh.scale.set(0.92, 0.98, 0.94);
  if (spec.bodyType === 'stocky') harnessMesh.scale.set(1.08, 1.01, 1.08);
  harnessMesh.visible =
    options.profession === 'storage_worker' ||
    (options.kind === 'survivor' && spec.defaultHarness);
  spinePivot.add(harnessMesh);

  const packMesh = new THREE.Mesh(
    specId === 'surv_kira' || specId === 'surv_maya' ? geos.courierPack : geos.backpack,
    packMat
  );
  packMesh.castShadow = true;
  packMesh.visible =
    options.profession === 'resource_collector' ||
    (options.kind === 'survivor' && spec.defaultPack);
  spinePivot.add(packMesh);

  // Sculpted Head, Eyes, Brows, Hair & Optional Headwear
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.53, 0);

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

  const eyeX = spec.bodyType === 'slim' ? 0.033 : 0.036;
  const eyeZ = -0.095;
  for (const sx of [-1, 1]) {
    const sclera = new THREE.Mesh(geos.eyeSclera, scleraMat);
    sclera.position.set(sx * eyeX, 0.142, eyeZ);
    const iris = new THREE.Mesh(geos.eyeIris, irisMat);
    iris.position.set(sx * eyeX, 0.142, eyeZ - 0.005);
    const brow = new THREE.Mesh(geos.eyebrow, hairMat);
    brow.position.set(sx * eyeX, 0.162, eyeZ - 0.004);
    brow.rotation.z = sx * -0.06;
    headPivot.add(sclera, iris, brow);
  }

  const hairMesh = new THREE.Mesh(getHairGeometry(geos, spec.hairStyle), hairMat);
  hairMesh.castShadow = true;
  headPivot.add(hairMesh);

  if (spec.headwear === 'cap') {
    const cap = new THREE.Mesh(geos.headwearCap, capMat);
    cap.castShadow = true;
    const visor = new THREE.Mesh(geos.headwearCapVisor, capMat);
    headPivot.add(cap, visor);
  } else if (spec.headwear === 'beanie') {
    const beanie = new THREE.Mesh(geos.headwearBeanie, capMat);
    beanie.castShadow = true;
    headPivot.add(beanie);
  } else if (spec.headwear === 'hood') {
    const hood = new THREE.Mesh(geos.headwearHood, capMat);
    hood.castShadow = true;
    headPivot.add(hood);
  }
  spinePivot.add(headPivot);

  // Articulated 2-segment Arms + Hands + Guard Baton
  const shoulderX = spec.bodyType === 'slim' ? 0.195 : spec.bodyType === 'stocky' ? 0.232 : 0.214;
  const forearmGeo = spec.rolledSleeves ? geos.forearmRolled : geos.forearm;
  const forearmMat = spec.rolledSleeves ? skinMat : vestMat;

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-shoulderX, 0.45, 0);
  const leftUpper = new THREE.Mesh(geos.upperArm, vestMat);
  leftUpper.castShadow = true;
  leftArmPivot.add(leftUpper);

  const leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.set(0, -0.26, 0);
  const leftForearm = new THREE.Mesh(forearmGeo, forearmMat);
  leftForearm.castShadow = true;
  const leftHand = new THREE.Mesh(geos.handHuman, skinMat);
  leftHand.position.set(0, -0.235, 0);
  leftForearmPivot.add(leftForearm, leftHand);
  leftArmPivot.add(leftForearmPivot);
  spinePivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(shoulderX, 0.45, 0);
  const rightUpper = new THREE.Mesh(geos.upperArm, vestMat);
  rightUpper.castShadow = true;
  rightArmPivot.add(rightUpper);

  const rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.set(0, -0.26, 0);
  const rightForearm = new THREE.Mesh(forearmGeo, forearmMat);
  rightForearm.castShadow = true;
  const rightHand = new THREE.Mesh(geos.handHuman, skinMat);
  rightHand.position.set(0, -0.235, 0);
  rightForearmPivot.add(rightForearm, rightHand);

  // Guard tactical baton gripped cleanly inside right hand
  const batonMesh = new THREE.Mesh(geos.baton, batonMat);
  batonMesh.position.set(0, -0.285, -0.022);
  batonMesh.visible = options.profession === 'guard';
  rightForearmPivot.add(batonMesh);

  rightArmPivot.add(rightForearmPivot);
  spinePivot.add(rightArmPivot);

  const statusMarker = new THREE.Mesh(geos.statusMarker, statusMat);
  statusMarker.position.set(0, 1.9, 0);
  root.add(statusMarker);

  const accentColor =
    options.kind === 'survivor'
      ? '#38bdf8'
      : options.profession === 'guard'
        ? '#60a5fa'
        : options.profession === 'shopkeeper'
          ? '#fbbf24'
          : options.profession === 'storage_worker'
            ? '#2dd4bf'
            : '#a3e635';

  const labelTex = createNameTagTexture(options.name, options.subtitle, accentColor);
  let labelMat: THREE.SpriteMaterial | null = null;
  let labelSprite: THREE.Sprite | null = null;
  if (labelTex) {
    labelMat = new THREE.SpriteMaterial({
      map: labelTex,
      transparent: true,
      depthWrite: false,
    });
    labelSprite = new THREE.Sprite(labelMat);
    labelSprite.position.set(0, 2.26, 0);
    labelSprite.scale.set(1.22, 0.34, 1);
    root.add(labelSprite);
  }

  const rig: StaffCharacterRig = {
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
    vestMesh,
    vestMat,
    capMat,
    apronMesh,
    tacticalVestMesh,
    harnessMesh,
    packMesh,
    batonMesh,
    statusMarker,
    statusMat,
    labelSprite,
    labelMat,
    labelTex,
    animData: {
      currentState: 'idle',
      idlePhase: variant * 1.1,
      smoothedSpeed: 0,
      smoothedYawRate: 0,
    },
    dispose: () => {
      skinMat.dispose();
      shirtMat.dispose();
      vestMat.dispose();
      pantsMat.dispose();
      packMat.dispose();
      apronMat.dispose();
      tacMat.dispose();
      bandageMat.dispose();
      hairMat.dispose();
      capMat.dispose();
      batonMat.dispose();
      scleraMat.dispose();
      irisMat.dispose();
      shadowMat.dispose();
      statusMat.dispose();
      labelMat?.dispose();
      labelTex?.dispose();
    },
  };

  return { group: root, rig };
}

export function updateStaffRigNameTag(
  rig: StaffCharacterRig,
  title: string,
  subtitle: string,
  accentColor: string
): void {
  if (rig.labelMat && rig.labelTex) {
    const nextTex = createNameTagTexture(title, subtitle, accentColor);
    if (!nextTex) return;
    rig.labelTex.dispose();
    rig.labelTex = nextTex;
    rig.labelMat.map = nextTex;
    rig.labelMat.needsUpdate = true;
  }
}

export function updateStaffRigProfessionVisuals(
  rig: StaffCharacterRig,
  name: string,
  profession: EmployeeProfession
): void {
  const cfg = PROFESSION_CONFIGS[profession];
  const profT = tProfession(profession);
  rig.vestMat.color.setHex(cfg.coatColorHex);
  rig.capMat.color.setHex(cfg.hatColorHex);
  rig.apronMesh.visible = profession === 'shopkeeper';
  rig.tacticalVestMesh.visible = profession === 'guard';
  rig.harnessMesh.visible = profession === 'storage_worker';
  rig.packMesh.visible = profession === 'resource_collector';
  rig.batonMesh.visible = profession === 'guard';

  const accentColor =
    profession === 'guard'
      ? '#60a5fa'
      : profession === 'shopkeeper'
        ? '#fbbf24'
        : profession === 'storage_worker'
          ? '#2dd4bf'
          : '#a3e635';

  updateStaffRigNameTag(rig, name, profT.shortLabel, accentColor);
}

export function animateStaffRig(
  rig: StaffCharacterRig,
  options: {
    status: EmployeeStatus | 'survivor';
    walkCycle: number;
    isMoving: boolean;
    swingTimer?: number;
    swingMaxTimer?: number;
    hitFlashTimer?: number;
    actualSpeed?: number;
    yawRate?: number;
    isTalking?: boolean;
    isRecovering?: boolean;
    distSq?: number;
    dt?: number;
  }
): void {
  const {
    status,
    walkCycle,
    isMoving,
    swingTimer = 0,
    swingMaxTimer = 0.3,
    hitFlashTimer = 0,
    actualSpeed,
    yawRate = 0,
    isTalking = false,
    isRecovering = false,
    distSq = 0,
    dt = 0.016,
  } = options;

  if (hitFlashTimer > 0) {
    rig.vestMat.emissive.setHex(0x7f1d1d);
  } else {
    rig.vestMat.emissive.setHex(0x000000);
  }

  // Subtle role marker color
  if (status === 'survivor') {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0x38bdf8);
  } else if (status === 'unpaid') {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0xf43f5e);
  } else if (status === 'engaging') {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0xf97316);
  } else {
    rig.statusMarker.visible = false;
  }

  if (rig.statusMarker.visible) {
    rig.statusMarker.position.y = 1.9 + Math.sin(walkCycle * 1.5) * 0.03;
    rig.statusMarker.rotation.y = walkCycle * 0.7;
  }

  const isFarLod = distSq > 30 * 30;
  const rawSpeed = actualSpeed ?? (isMoving ? (status === 'engaging' ? 2.8 : 2.0) : 0);
  rig.animData.smoothedSpeed = damp(rig.animData.smoothedSpeed, rawSpeed, 12, dt);
  rig.animData.smoothedYawRate = damp(rig.animData.smoothedYawRate, yawRate, 10, dt);
  rig.animData.idlePhase += dt * (status === 'engaging' ? 2.4 : 1.55);

  let animState: HumanAnimState = 'idle';
  if (swingTimer > 0) {
    animState = 'attack';
  } else if (hitFlashTimer > 0.02) {
    animState = 'hit_reaction';
  } else if (status === 'unpaid') {
    animState = 'unpaid';
  } else if (isRecovering) {
    animState = 'recovering';
  } else if (status === 'survivor') {
    animState = isTalking ? 'talking' : 'idle';
  } else if (rig.animData.smoothedSpeed > 0.14 || isMoving) {
    animState =
      status === 'engaging' || rig.animData.smoothedSpeed > 2.45
        ? 'run'
        : status === 'patrolling'
          ? 'patrolling'
          : 'walk';
  } else if (status === 'engaging') {
    animState = 'engaging';
  } else if (status === 'patrolling') {
    animState = 'patrolling';
  } else if (status === 'working') {
    animState = 'working';
  }
  rig.animData.currentState = animState;

  const ph = rig.animData.idlePhase;
  const turnLean = Math.max(-0.18, Math.min(0.18, rig.animData.smoothedYawRate * 0.065));
  const turnHead = Math.max(-0.3, Math.min(0.3, rig.animData.smoothedYawRate * 0.1));
  const hasBaton = rig.batonMesh.visible;

  let tBodyY = 0.84;
  let tBodyRx = 0.015;
  let tBodyRz = 0;
  let tSpineRx = 0.02;
  let tSpineRy = 0;
  let tHeadRx = 0;
  let tHeadRy = 0;
  let tHeadRz = 0;
  let tLegLx = 0.03;
  let tLegRx = -0.03;
  let tKneeLx = 0.05;
  let tKneeRx = 0.05;
  let tArmLx = 0.08;
  let tArmRx = 0.1;
  let tForeLx = 0.24;
  let tForeRx = 0.26;
  let blend = 11;

  if (animState === 'attack') {
    const p = 1 - Math.min(1, swingTimer / Math.max(0.1, swingMaxTimer));
    let windup = 0;
    let strike = 0;
    if (p < 0.28) {
      const k = p / 0.28;
      windup = k * k;
    } else if (p < 0.58) {
      const k = (p - 0.28) / 0.3;
      windup = 1 - k;
      strike = 1 - Math.pow(1 - k, 2.2);
    } else {
      const k = (p - 0.58) / 0.42;
      strike = 1 - k * k * (3 - 2 * k);
    }

    tBodyY = 0.84 - strike * 0.035;
    tBodyRx = 0.02 - windup * 0.08 + strike * 0.14;
    tBodyRz = windup * 0.05 - strike * 0.08;
    tSpineRx = 0.04 - windup * 0.12 + strike * 0.18;
    tSpineRy = -windup * 0.22 + strike * 0.32;
    tHeadRy = -tSpineRy * 0.55;
    tArmRx = 0.45 + windup * 1.45 - strike * 1.35 + 0.55;
    tForeRx = 0.52 + windup * 0.28 - strike * 0.28;
    tArmLx = 0.28 - strike * 0.18;
    tForeLx = 0.52;
    tLegLx = 0.18 + strike * 0.08;
    tLegRx = -0.18 - strike * 0.06;
    tKneeLx = 0.24;
    tKneeRx = 0.18;
    blend = 22;
  } else if (animState === 'hit_reaction') {
    const flinch = Math.min(1, hitFlashTimer / 0.16);
    tBodyY = 0.84 - flinch * 0.03;
    tBodyRx = -0.14 * flinch;
    tBodyRz = 0.08 * flinch;
    tSpineRx = -0.14 * flinch;
    tSpineRy = 0.2 * flinch;
    tHeadRx = -0.14 * flinch;
    tHeadRy = -0.16 * flinch;
    tArmLx = 0.35 + flinch * 0.2;
    tArmRx = 0.35 + flinch * 0.25;
    tForeLx = 0.65;
    tForeRx = 0.65;
    tLegLx = -0.1 * flinch;
    tLegRx = 0.12 * flinch;
    tKneeLx = 0.18;
    tKneeRx = 0.14;
    blend = 20;
  } else if (animState === 'unpaid') {
    const breath = isFarLod ? 0 : Math.sin(ph * 1.1) * 0.006;
    tBodyY = 0.84 + breath;
    tBodyRx = -0.01;
    tBodyRz = Math.sin(ph * 0.5) * 0.025;
    tSpineRx = 0.01;
    tHeadRx = 0.03;
    tHeadRy = Math.sin(ph * 0.75) * 0.18;
    tHeadRz = Math.sin(ph * 0.45) * 0.06;
    tArmLx = 0.42;
    tArmRx = 0.44;
    tForeLx = 1.08;
    tForeRx = 1.05;
    tLegLx = 0.05;
    tLegRx = -0.05;
    tKneeLx = 0.08;
    tKneeRx = 0.06;
    blend = 9;
  } else if (animState === 'recovering') {
    const breath = isFarLod ? 0 : Math.sin(ph * 2.1) * 0.012;
    tBodyY = 0.81 + breath;
    tBodyRx = 0.12;
    tSpineRx = 0.18;
    tHeadRx = -0.08;
    tHeadRy = Math.sin(ph * 0.6) * 0.1;
    tArmLx = 0.45;
    tArmRx = 0.48;
    tForeLx = 0.64;
    tForeRx = 0.66;
    tLegLx = 0.14;
    tLegRx = -0.14;
    tKneeLx = 0.28;
    tKneeRx = 0.24;
    blend = 9;
  } else if (animState === 'talking') {
    const breath = isFarLod ? 0 : Math.sin(ph * 1.2) * 0.007;
    const gesture = isFarLod ? 0 : Math.sin(ph * 1.85);
    tBodyY = 0.84 + breath;
    tBodyRx = 0.02;
    tBodyRz = Math.sin(ph * 0.55) * 0.02;
    tSpineRx = 0.03;
    tSpineRy = gesture * 0.05;
    tHeadRx = Math.sin(ph * 2.2) * 0.07;
    tHeadRy = Math.sin(ph * 0.8) * 0.08 + turnHead * 0.5;
    tHeadRz = Math.sin(ph * 1.1) * 0.05;
    tArmLx = 0.16 + Math.max(0, gesture) * 0.14;
    tForeLx = 0.42 + Math.max(0, gesture) * 0.22;
    tArmRx = 0.34 + Math.max(0, -gesture) * 0.22;
    tForeRx = 0.68 + Math.sin(ph * 2.1) * 0.14;
    tLegLx = 0.04;
    tLegRx = -0.04;
    tKneeLx = 0.06;
    tKneeRx = 0.05;
    blend = 10;
  } else if (animState === 'walk' || animState === 'run' || (animState === 'patrolling' && isMoving)) {
    const isRun = animState === 'run';
    const speedRatio = Math.min(1.2, Math.max(0.25, rig.animData.smoothedSpeed / (isRun ? 2.95 : 2.05)));
    const s = Math.sin(walkCycle);
    const c = Math.cos(walkCycle);
    const stride = s * (isRun ? 0.62 : 0.46) * Math.min(1.08, speedRatio + 0.15);
    const hipDip = Math.abs(s) * (isRun ? 0.032 : 0.02);

    tBodyY = 0.84 - hipDip;
    tBodyRx = isRun ? 0.09 : 0.03;
    tBodyRz = c * (isRun ? 0.038 : 0.024) + turnLean;
    tSpineRx = isRun ? 0.09 : 0.035;
    tSpineRy = -s * (isRun ? 0.09 : 0.055) + turnHead * 0.25;

    tLegLx = stride;
    tLegRx = -stride;
    tKneeLx = Math.max(0.06, -c * (isRun ? 0.72 : 0.56) + 0.12);
    tKneeRx = Math.max(0.06, c * (isRun ? 0.72 : 0.56) + 0.12);

    tArmLx = -stride * (isRun ? 0.92 : 0.72);
    tForeLx = (isRun ? 0.62 : 0.26) + Math.max(0, -s) * 0.32;
    if (hasBaton && isRun) {
      // Guard holds baton ready across hip while sprinting into combat
      tArmRx = 0.42 + stride * 0.35;
      tForeRx = 0.66;
    } else {
      tArmRx = stride * (isRun ? 0.92 : 0.72);
      tForeRx = (isRun ? 0.62 : 0.26) + Math.max(0, s) * 0.32;
    }
    tHeadRx = isRun ? -0.04 : 0;
    tHeadRy = Math.sin(walkCycle * 0.4) * 0.07 + turnHead;
    tHeadRz = -turnLean * 0.35;
    blend = isRun ? 16 : 13;
  } else {
    // Idle / Working / Stationary Patrolling / Engaging guard stance
    const breath = isFarLod ? 0 : Math.sin(ph * 1.2) * 0.008;
    const isWorking = animState === 'working';
    const isGuardReady = animState === 'engaging' || (hasBaton && animState === 'patrolling');
    const isSurvivor = status === 'survivor';

    tBodyY = 0.84 + breath;
    tBodyRx = isGuardReady ? 0.04 : 0.015;
    tBodyRz = turnLean * 0.4;
    tSpineRx = isWorking ? 0.055 : isGuardReady ? 0.05 : 0.02;
    tSpineRy = isWorking ? Math.sin(ph * 0.85) * 0.06 : 0;
    tLegLx = isGuardReady ? 0.1 : 0.03;
    tLegRx = isGuardReady ? -0.1 : -0.03;
    tKneeLx = isGuardReady ? 0.12 : 0.05;
    tKneeRx = isGuardReady ? 0.1 : 0.05;
    tArmLx = isGuardReady ? 0.22 : isSurvivor ? 0.1 + Math.sin(ph * 0.7) * 0.04 : 0.08;
    tForeLx = isGuardReady ? 0.46 : 0.26;
    tArmRx = isWorking
      ? 0.3 + Math.sin(ph * 1.6) * 0.12
      : isGuardReady
        ? 0.36
        : 0.1;
    tForeRx = isWorking ? 0.58 + Math.cos(ph * 1.6) * 0.08 : isGuardReady ? 0.52 : 0.28;
    tHeadRy = Math.sin(ph * 0.5) * (isWorking ? 0.18 : 0.14) + turnHead;
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
