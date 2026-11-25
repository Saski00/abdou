import * as THREE from 'three';
import { PROFESSION_CONFIGS } from '../../game/staffSystem';
import { EmployeeProfession, EmployeeStatus } from '../../game/types';
import { tProfession } from '../../i18n';

export interface StaffSharedGeometries {
  torso: THREE.BoxGeometry;
  vest: THREE.BoxGeometry;
  backpack: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  cap: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  baton: THREE.CylinderGeometry;
  shadowDisc: THREE.CircleGeometry;
  statusMarker: THREE.OctahedronGeometry;
  dispose: () => void;
}

export interface StaffCharacterRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  vestMesh: THREE.Mesh;
  vestMat: THREE.MeshStandardMaterial;
  capMat: THREE.MeshStandardMaterial;
  packMesh: THREE.Mesh;
  batonMesh: THREE.Mesh;
  statusMarker: THREE.Mesh;
  statusMat: THREE.MeshBasicMaterial;
  labelSprite: THREE.Sprite | null;
  labelMat: THREE.SpriteMaterial | null;
  labelTex: THREE.CanvasTexture | null;
  dispose: () => void;
}

export function createStaffSharedGeometries(): StaffSharedGeometries {
  const torso = new THREE.BoxGeometry(0.42, 0.54, 0.23);
  const vest = new THREE.BoxGeometry(0.47, 0.45, 0.27);
  const backpack = new THREE.BoxGeometry(0.32, 0.38, 0.16);
  const head = new THREE.BoxGeometry(0.28, 0.30, 0.28);
  const cap = new THREE.BoxGeometry(0.30, 0.11, 0.31);
  const arm = new THREE.BoxGeometry(0.12, 0.54, 0.12);
  const leg = new THREE.BoxGeometry(0.15, 0.64, 0.16);
  const baton = new THREE.CylinderGeometry(0.025, 0.028, 0.46, 8);
  baton.rotateX(Math.PI * 0.45);
  const shadowDisc = new THREE.CircleGeometry(0.38, 14);
  shadowDisc.rotateX(-Math.PI * 0.5);
  const statusMarker = new THREE.OctahedronGeometry(0.085, 0);

  return {
    torso,
    vest,
    backpack,
    head,
    cap,
    arm,
    leg,
    baton,
    shadowDisc,
    statusMarker,
    dispose: () => {
      torso.dispose();
      vest.dispose();
      backpack.dispose();
      head.dispose();
      cap.dispose();
      arm.dispose();
      leg.dispose();
      baton.dispose();
      shadowDisc.dispose();
      statusMarker.dispose();
    },
  };
}

function createNameTagTexture(
  title: string,
  subtitle: string,
  accentColor: string
): THREE.CanvasTexture {
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
    name: string;
    subtitle: string;
  }
): { group: THREE.Group; rig: StaffCharacterRig } {
  const root = new THREE.Group();
  const variant = Math.max(0, options.variant);

  const skinPalette = [0xd8ab8c, 0xc38e6d, 0xe2bea4, 0x9b6b4c, 0xd0a284];
  const survivorShirtPalette = [0x92400e, 0x475569, 0x7c2d12, 0x3f6212, 0x374151];

  const profCfg = options.profession ? PROFESSION_CONFIGS[options.profession] : null;
  const vestHex = profCfg
    ? profCfg.coatColorHex
    : survivorShirtPalette[variant % survivorShirtPalette.length];
  const capHex = profCfg ? profCfg.hatColorHex : 0x292524;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinPalette[variant % skinPalette.length],
    roughness: 0.78,
    metalness: 0.02,
  });
  const vestMat = new THREE.MeshStandardMaterial({
    color: vestHex,
    roughness: 0.8,
    metalness: 0.08,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.9,
    metalness: 0.04,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: 0x44403c,
    roughness: 0.75,
    metalness: 0.1,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: capHex,
    roughness: 0.85,
    metalness: 0.06,
  });
  const batonMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.35,
    metalness: 0.75,
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

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.66;
  root.add(bodyPivot);

  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.11, 0, 0);
  const leftLegMesh = new THREE.Mesh(geos.leg, pantsMat);
  leftLegMesh.position.y = -0.32;
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.11, 0, 0);
  const rightLegMesh = new THREE.Mesh(geos.leg, pantsMat);
  rightLegMesh.position.y = -0.32;
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);
  bodyPivot.add(rightLegPivot);

  const torsoMesh = new THREE.Mesh(geos.torso, skinMat);
  torsoMesh.position.y = 0.31;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  const vestMesh = new THREE.Mesh(geos.vest, vestMat);
  vestMesh.position.y = 0.34;
  vestMesh.castShadow = true;
  vestMesh.receiveShadow = true;
  bodyPivot.add(vestMesh);

  const packMesh = new THREE.Mesh(geos.backpack, packMat);
  packMesh.position.set(0, 0.35, 0.19);
  packMesh.castShadow = true;
  packMesh.visible = options.kind === 'survivor' || options.profession === 'resource_collector';
  bodyPivot.add(packMesh);

  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.64, 0);
  const headMesh = new THREE.Mesh(geos.head, skinMat);
  headMesh.position.y = 0.15;
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  const capMesh = new THREE.Mesh(geos.cap, capMat);
  capMesh.position.set(0, 0.28, -0.015);
  capMesh.castShadow = true;
  headPivot.add(capMesh);
  bodyPivot.add(headPivot);

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.29, 0.54, 0);
  const leftArmMesh = new THREE.Mesh(geos.arm, vestMat);
  leftArmMesh.position.y = -0.23;
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  bodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.29, 0.54, 0);
  const rightArmMesh = new THREE.Mesh(geos.arm, vestMat);
  rightArmMesh.position.y = -0.23;
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);

  const batonMesh = new THREE.Mesh(geos.baton, batonMat);
  batonMesh.position.set(0, -0.47, -0.18);
  batonMesh.visible = options.profession === 'guard';
  rightArmPivot.add(batonMesh);
  bodyPivot.add(rightArmPivot);

  const statusMarker = new THREE.Mesh(geos.statusMarker, statusMat);
  statusMarker.position.set(0, 1.84, 0);
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
  const labelMat = new THREE.SpriteMaterial({
    map: labelTex,
    transparent: true,
    depthWrite: false,
  });
  const labelSprite = new THREE.Sprite(labelMat);
  labelSprite.position.set(0, 2.22, 0);
  labelSprite.scale.set(1.22, 0.34, 1);
  root.add(labelSprite);

  const rig: StaffCharacterRig = {
    root,
    bodyPivot,
    headPivot,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    vestMesh,
    vestMat,
    capMat,
    packMesh,
    batonMesh,
    statusMarker,
    statusMat,
    labelSprite,
    labelMat,
    labelTex,
    dispose: () => {
      skinMat.dispose();
      vestMat.dispose();
      pantsMat.dispose();
      packMat.dispose();
      capMat.dispose();
      batonMat.dispose();
      shadowMat.dispose();
      statusMat.dispose();
      labelMat.dispose();
      labelTex.dispose();
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
    rig.labelTex.dispose();
    const nextTex = createNameTagTexture(title, subtitle, accentColor);
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
    hitFlashTimer?: number;
  }
): void {
  const { status, walkCycle, isMoving, swingTimer = 0, hitFlashTimer = 0 } = options;

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
    rig.statusMarker.position.y = 1.84 + Math.sin(walkCycle * 1.5) * 0.03;
    rig.statusMarker.rotation.y = walkCycle * 0.7;
  }

  if (swingTimer > 0) {
    const p = 1 - Math.min(1, swingTimer / 0.28);
    const arc = Math.sin(p * Math.PI);
    rig.rightArmPivot.rotation.x = 0.25 + arc * 1.45;
    rig.leftArmPivot.rotation.x = 0.2;
    rig.bodyPivot.rotation.x = 0.08 * arc;
    rig.bodyPivot.rotation.z = 0;
    rig.leftLegPivot.rotation.x = 0.12;
    rig.rightLegPivot.rotation.x = -0.12;
    return;
  }

  if (!isMoving) {
    rig.bodyPivot.rotation.x = 0.02;
    rig.bodyPivot.rotation.z = 0;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x = 0.08;
    rig.rightArmPivot.rotation.x =
      status === 'working' ? 0.26 + Math.sin(walkCycle * 1.3) * 0.1 : 0.08;
    rig.headPivot.rotation.y = Math.sin(walkCycle * 0.5) * 0.16;
    return;
  }

  const stride = Math.sin(walkCycle) * 0.45;
  rig.leftLegPivot.rotation.x = stride;
  rig.rightLegPivot.rotation.x = -stride;
  rig.leftArmPivot.rotation.x = -stride * 0.75;
  rig.rightArmPivot.rotation.x = stride * 0.75;
  rig.bodyPivot.rotation.x = 0.04;
  rig.bodyPivot.rotation.z = Math.cos(walkCycle) * 0.024;
  rig.headPivot.rotation.y = Math.sin(walkCycle * 0.4) * 0.08;
}
