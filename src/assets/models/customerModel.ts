import * as THREE from 'three';
import { CustomerAIState } from '../../game/types';

export interface CustomerSharedGeometries {
  torso: THREE.BoxGeometry;
  jacket: THREE.BoxGeometry;
  backpack: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  cap: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  shadowDisc: THREE.CircleGeometry;
  statusMarker: THREE.OctahedronGeometry;
  dispose: () => void;
}

export interface CustomerRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  statusMarker: THREE.Mesh;
  statusMat: THREE.MeshBasicMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createCustomerSharedGeometries(): CustomerSharedGeometries {
  const torso = new THREE.BoxGeometry(0.42, 0.54, 0.23);
  const jacket = new THREE.BoxGeometry(0.46, 0.44, 0.26);
  const backpack = new THREE.BoxGeometry(0.32, 0.38, 0.16);
  const head = new THREE.BoxGeometry(0.28, 0.30, 0.28);
  const cap = new THREE.BoxGeometry(0.30, 0.10, 0.31);
  const arm = new THREE.BoxGeometry(0.12, 0.54, 0.12);
  const leg = new THREE.BoxGeometry(0.15, 0.64, 0.16);
  const shadowDisc = new THREE.CircleGeometry(0.38, 14);
  shadowDisc.rotateX(-Math.PI * 0.5);
  const statusMarker = new THREE.OctahedronGeometry(0.085, 0);

  return {
    torso,
    jacket,
    backpack,
    head,
    cap,
    arm,
    leg,
    shadowDisc,
    statusMarker,
    dispose: () => {
      torso.dispose();
      jacket.dispose();
      backpack.dispose();
      head.dispose();
      cap.dispose();
      arm.dispose();
      leg.dispose();
      shadowDisc.dispose();
      statusMarker.dispose();
    },
  };
}

/**
 * Builds a lightweight 9-part articulated survivor customer with bottom-center pivot at y=0.
 * Visually distinct from hunched zombies (upright posture, warmer survivor gear, backpack, no glowing eyes).
 */
export function buildProceduralCustomerModel(
  geos: CustomerSharedGeometries,
  variant = 0
): { group: THREE.Group; rig: CustomerRig } {
  const root = new THREE.Group();

  const skinPalette = [0xd6a788, 0xc38e6d, 0xe0b99e, 0x9b6b4c, 0xcba182];
  const jacketPalette = [0x3b6e8c, 0xb45309, 0x4b6b4d, 0x7c4a3a, 0x475569];
  const packPalette = [0x57534e, 0x44403c, 0x3f4f44, 0x6b4f3a, 0x334155];

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinPalette[variant % skinPalette.length],
    roughness: 0.78,
    metalness: 0.02,
  });
  const jacketMat = new THREE.MeshStandardMaterial({
    color: jacketPalette[variant % jacketPalette.length],
    roughness: 0.85,
    metalness: 0.06,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x262b35,
    roughness: 0.9,
    metalness: 0.04,
  });
  const packMat = new THREE.MeshStandardMaterial({
    color: packPalette[variant % packPalette.length],
    roughness: 0.72,
    metalness: 0.12,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: variant % 2 === 0 ? 0x292524 : 0x78350f,
    roughness: 0.88,
    metalness: 0.04,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const statusMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.88,
  });

  const shadowMesh = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowMesh.position.y = 0.024;
  root.add(shadowMesh);

  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.66;
  root.add(bodyPivot);

  // Legs
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

  // Torso, jacket & survivor backpack (+Z is back, forward is -Z)
  const torsoMesh = new THREE.Mesh(geos.torso, skinMat);
  torsoMesh.position.y = 0.31;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  const jacketMesh = new THREE.Mesh(geos.jacket, jacketMat);
  jacketMesh.position.y = 0.34;
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  bodyPivot.add(jacketMesh);

  const packMesh = new THREE.Mesh(geos.backpack, packMat);
  packMesh.position.set(0, 0.35, 0.19);
  packMesh.castShadow = true;
  bodyPivot.add(packMesh);

  // Head & cap
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

  // Arms hanging naturally at sides
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.29, 0.54, 0);
  const leftArmMesh = new THREE.Mesh(geos.arm, jacketMat);
  leftArmMesh.position.y = -0.23;
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  bodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.29, 0.54, 0);
  const rightArmMesh = new THREE.Mesh(geos.arm, jacketMat);
  rightArmMesh.position.y = -0.23;
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);
  bodyPivot.add(rightArmPivot);

  // Subtle floating state marker above head (visible while browsing/purchasing)
  const statusMarker = new THREE.Mesh(geos.statusMarker, statusMat);
  statusMarker.position.set(0, 1.84, 0);
  statusMarker.visible = false;
  root.add(statusMarker);

  const rig: CustomerRig = {
    root,
    bodyPivot,
    headPivot,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    statusMarker,
    statusMat,
    shadowMat,
    dispose: () => {
      skinMat.dispose();
      jacketMat.dispose();
      pantsMat.dispose();
      packMat.dispose();
      capMat.dispose();
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
  hasPurchase: boolean
): void {
  // Subtle state marker cue inside/around shop
  if (state === 'browsing') {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0xf59e0b);
    rig.statusMarker.position.y = 1.85 + Math.sin(walkCycle * 1.6) * 0.03;
    rig.statusMarker.rotation.y = walkCycle * 0.7;
  } else if (state === 'going_to_checkout' || state === 'purchasing') {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0x34d399);
    rig.statusMarker.position.y = 1.85 + Math.sin(walkCycle * 2.2) * 0.035;
    rig.statusMarker.rotation.y = walkCycle * 1.1;
  } else if (state === 'leaving' && hasPurchase) {
    rig.statusMarker.visible = true;
    rig.statusMat.color.setHex(0x94a3b8);
    rig.statusMarker.position.y = 1.84;
    rig.statusMarker.rotation.y = walkCycle * 0.4;
  } else {
    rig.statusMarker.visible = false;
  }

  if (state === 'purchasing') {
    rig.bodyPivot.rotation.x = 0.04;
    rig.bodyPivot.rotation.z = 0;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x = 0.15;
    // Right arm gently extends toward register counter
    rig.rightArmPivot.rotation.x = 0.72 + Math.sin(walkCycle * 2.4) * 0.1;
    rig.headPivot.rotation.y = Math.sin(walkCycle * 1.1) * 0.08;
    return;
  }

  if (!isMoving) {
    // Calm browsing / waiting stance
    rig.bodyPivot.rotation.x = 0.02;
    rig.bodyPivot.rotation.z = 0;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x = 0.08;
    rig.rightArmPivot.rotation.x = state === 'browsing' ? 0.32 + Math.sin(walkCycle) * 0.08 : 0.08;
    rig.headPivot.rotation.y =
      state === 'browsing' ? Math.sin(walkCycle * 0.85) * 0.34 : Math.sin(walkCycle * 0.5) * 0.1;
    return;
  }

  // Upright natural human walking stride
  const stride = Math.sin(walkCycle) * 0.44;
  rig.leftLegPivot.rotation.x = stride;
  rig.rightLegPivot.rotation.x = -stride;
  rig.leftArmPivot.rotation.x = -stride * 0.75;
  rig.rightArmPivot.rotation.x = stride * 0.75;
  rig.bodyPivot.rotation.x = 0.04;
  rig.bodyPivot.rotation.z = Math.cos(walkCycle) * 0.025;
  rig.headPivot.rotation.y = Math.sin(walkCycle * 0.4) * 0.08;
}
