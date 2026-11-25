import * as THREE from 'three';
import { ZombieAIState } from '../../game/zombieAI';

export interface ZombieSharedGeometries {
  torso: THREE.BoxGeometry;
  coat: THREE.BoxGeometry;
  ribPatch: THREE.BoxGeometry;
  head: THREE.BoxGeometry;
  eye: THREE.BoxGeometry;
  arm: THREE.BoxGeometry;
  leg: THREE.BoxGeometry;
  shadowDisc: THREE.CircleGeometry;
  dispose: () => void;
}

export interface ZombieRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  skinMat: THREE.MeshStandardMaterial;
  coatMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  dispose: () => void;
}

export function createZombieSharedGeometries(): ZombieSharedGeometries {
  const torso = new THREE.BoxGeometry(0.46, 0.56, 0.25);
  const coat = new THREE.BoxGeometry(0.50, 0.44, 0.28);
  const ribPatch = new THREE.BoxGeometry(0.24, 0.22, 0.04);
  const head = new THREE.BoxGeometry(0.30, 0.32, 0.30);
  const eye = new THREE.BoxGeometry(0.055, 0.04, 0.03);
  const arm = new THREE.BoxGeometry(0.13, 0.58, 0.13);
  const leg = new THREE.BoxGeometry(0.16, 0.66, 0.17);
  const shadowDisc = new THREE.CircleGeometry(0.42, 16);
  shadowDisc.rotateX(-Math.PI * 0.5);

  return {
    torso,
    coat,
    ribPatch,
    head,
    eye,
    arm,
    leg,
    shadowDisc,
    dispose: () => {
      torso.dispose();
      coat.dispose();
      ribPatch.dispose();
      head.dispose();
      eye.dispose();
      arm.dispose();
      leg.dispose();
      shadowDisc.dispose();
    },
  };
}

/**
 * Builds an articulated 10-part humanoid zombie with bottom-center pivot at y=0.
 * Compatible with AssetManager so external GLTF/GLB rigs can drop in later.
 */
export function buildProceduralZombieModel(
  geos: ZombieSharedGeometries,
  tintVariant = 0
): { group: THREE.Group; rig: ZombieRig } {
  const root = new THREE.Group();

  const skinColors = [0x6e7b6a, 0x626f61, 0x77806c, 0x5c665b];
  const coatColors = [0x2a2f36, 0x352b26, 0x26312d, 0x33303a];

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColors[tintVariant % skinColors.length],
    roughness: 0.88,
    metalness: 0.04,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: coatColors[tintVariant % coatColors.length],
    roughness: 0.92,
    metalness: 0.05,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: 0x1e2229,
    roughness: 0.94,
    metalness: 0.03,
  });
  const woundMat = new THREE.MeshStandardMaterial({
    color: 0x5a1f1f,
    roughness: 0.52,
    metalness: 0.1,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: 0x9ca87a,
    emissive: 0x6d7c3f,
    emissiveIntensity: 0.45,
    roughness: 0.35,
  });
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });

  const shadowMesh = new THREE.Mesh(geos.shadowDisc, shadowMat);
  shadowMesh.position.y = 0.025;
  root.add(shadowMesh);

  // Body assembly pivoted at pelvis/hip height so death collapse hinges naturally
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.68;
  root.add(bodyPivot);

  // Legs (pivoted at hip)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-0.12, 0.0, 0);
  const leftLegMesh = new THREE.Mesh(geos.leg, pantsMat);
  leftLegMesh.position.y = -0.33;
  leftLegMesh.castShadow = true;
  leftLegMesh.receiveShadow = true;
  leftLegPivot.add(leftLegMesh);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(0.12, 0.0, 0);
  const rightLegMesh = new THREE.Mesh(geos.leg, pantsMat);
  rightLegMesh.position.y = -0.33;
  rightLegMesh.castShadow = true;
  rightLegMesh.receiveShadow = true;
  rightLegPivot.add(rightLegMesh);
  bodyPivot.add(rightLegPivot);

  // Torso & tattered jacket
  const torsoMesh = new THREE.Mesh(geos.torso, skinMat);
  torsoMesh.position.y = 0.32;
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  bodyPivot.add(torsoMesh);

  const coatMesh = new THREE.Mesh(geos.coat, coatMat);
  coatMesh.position.y = 0.36;
  coatMesh.castShadow = true;
  coatMesh.receiveShadow = true;
  bodyPivot.add(coatMesh);

  const ribPatch = new THREE.Mesh(geos.ribPatch, woundMat);
  ribPatch.position.set(0.04, 0.34, -0.13);
  bodyPivot.add(ribPatch);

  // Head & sunken eyes (forward is -Z)
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.66, -0.02);
  const headMesh = new THREE.Mesh(geos.head, skinMat);
  headMesh.position.y = 0.16;
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  const leftEye = new THREE.Mesh(geos.eye, eyeMat);
  leftEye.position.set(-0.065, 0.18, -0.15);
  headPivot.add(leftEye);

  const rightEye = new THREE.Mesh(geos.eye, eyeMat);
  rightEye.position.set(0.065, 0.18, -0.15);
  headPivot.add(rightEye);
  bodyPivot.add(headPivot);

  // Arms (pivoted at shoulders, extending forward in -Z shambling pose)
  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-0.31, 0.56, 0);
  const leftArmMesh = new THREE.Mesh(geos.arm, coatMat);
  leftArmMesh.position.y = -0.24;
  leftArmMesh.castShadow = true;
  leftArmPivot.add(leftArmMesh);
  bodyPivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.31, 0.56, 0);
  const rightArmMesh = new THREE.Mesh(geos.arm, coatMat);
  rightArmMesh.position.y = -0.24;
  rightArmMesh.castShadow = true;
  rightArmPivot.add(rightArmMesh);
  bodyPivot.add(rightArmPivot);

  const rig: ZombieRig = {
    root,
    bodyPivot,
    headPivot,
    leftArmPivot,
    rightArmPivot,
    leftLegPivot,
    rightLegPivot,
    skinMat,
    coatMat,
    pantsMat,
    eyeMat,
    shadowMat,
    dispose: () => {
      skinMat.dispose();
      coatMat.dispose();
      pantsMat.dispose();
      woundMat.dispose();
      eyeMat.dispose();
      shadowMat.dispose();
    },
  };

  return { group: root, rig };
}

export function animateZombieRig(
  rig: ZombieRig,
  state: ZombieAIState,
  walkCycle: number,
  attackWindup: number,
  attackWindupMax: number,
  hitFlashTimer: number,
  deathTimer: number
): void {
  // Hit flash tint
  if (hitFlashTimer > 0) {
    const t = hitFlashTimer / 0.18;
    rig.skinMat.emissive.setRGB(0.65 * t, 0.08 * t, 0.08 * t);
    rig.coatMat.emissive.setRGB(0.55 * t, 0.06 * t, 0.06 * t);
  } else {
    rig.skinMat.emissive.setRGB(0, 0, 0);
    rig.coatMat.emissive.setRGB(0, 0, 0);
  }

  if (state === 'dead') {
    const fallT = Math.min(1, deathTimer / 0.52);
    const eased = 1 - Math.pow(1 - fallT, 2);
    rig.bodyPivot.rotation.x = eased * (Math.PI * 0.48);
    rig.bodyPivot.position.y = 0.68 - eased * 0.52;
    rig.leftArmPivot.rotation.x = 0.4;
    rig.rightArmPivot.rotation.x = 0.2;
    rig.eyeMat.emissiveIntensity = 0;

    if (deathTimer > 3.2) {
      const sinkT = Math.min(1, (deathTimer - 3.2) / 1.4);
      rig.root.position.y -= sinkT * 0.35;
      rig.shadowMat.opacity = 0.42 * (1 - sinkT);
    }
    return;
  }

  rig.bodyPivot.position.y = 0.68;
  rig.eyeMat.emissiveIntensity = state === 'chasing' || state === 'attacking' ? 0.85 : 0.42;

  if (state === 'idle') {
    const sway = Math.sin(walkCycle) * 0.04;
    rig.bodyPivot.rotation.x = 0.08;
    rig.bodyPivot.rotation.z = sway;
    rig.headPivot.rotation.z = -sway * 1.4;
    rig.headPivot.rotation.y = Math.sin(walkCycle * 0.6) * 0.14;
    rig.leftLegPivot.rotation.x = 0;
    rig.rightLegPivot.rotation.x = 0;
    rig.leftArmPivot.rotation.x = 0.68 + Math.sin(walkCycle) * 0.06;
    rig.rightArmPivot.rotation.x = 0.62 - Math.sin(walkCycle) * 0.06;
    return;
  }

  if (state === 'attacking') {
    const swingRatio =
      attackWindup > 0 && attackWindupMax > 0
        ? 1 - attackWindup / attackWindupMax
        : 0;
    const armRaise = swingRatio > 0 ? 1.85 - swingRatio * 1.35 : 0.95 + Math.sin(walkCycle * 2) * 0.12;
    rig.bodyPivot.rotation.x = 0.18 + (swingRatio > 0 ? Math.sin(swingRatio * Math.PI) * 0.22 : 0);
    rig.bodyPivot.rotation.z = 0;
    rig.headPivot.rotation.z = 0.08;
    rig.headPivot.rotation.y = 0;
    rig.leftLegPivot.rotation.x = 0.14;
    rig.rightLegPivot.rotation.x = -0.14;
    rig.leftArmPivot.rotation.x = armRaise;
    rig.rightArmPivot.rotation.x = armRaise + 0.1;
    return;
  }

  // Walking / Investigating / Chasing / Returning
  const isFast = state === 'chasing';
  const strideAmp = isFast ? 0.62 : 0.36;
  const stride = Math.sin(walkCycle) * strideAmp;
  rig.leftLegPivot.rotation.x = stride;
  rig.rightLegPivot.rotation.x = -stride;
  rig.bodyPivot.rotation.x = isFast ? 0.22 : 0.12;
  rig.bodyPivot.rotation.z = Math.cos(walkCycle) * (isFast ? 0.07 : 0.05);
  rig.headPivot.rotation.z = isFast ? -0.09 : 0.08;
  rig.headPivot.rotation.y = Math.sin(walkCycle * 0.5) * 0.12;
  rig.leftArmPivot.rotation.x = (isFast ? 1.28 : 0.92) + Math.sin(walkCycle * 0.8) * 0.14;
  rig.rightArmPivot.rotation.x = (isFast ? 1.22 : 0.86) - Math.sin(walkCycle * 0.8) * 0.14;
}

/**
 * First-person steel pipe / crowbar melee prop mounted to the player camera.
 */
export function buildFirstPersonMeleePipe(): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.38,
    metalness: 0.78,
  });
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0x7c2d12,
    roughness: 0.86,
    metalness: 0.05,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.48,
    metalness: 0.55,
  });

  const shaftGeo = new THREE.CylinderGeometry(0.017, 0.019, 0.44, 10);
  const gripGeo = new THREE.CylinderGeometry(0.022, 0.021, 0.14, 10);
  const hookGeo = new THREE.BoxGeometry(0.032, 0.07, 0.026);

  const shaft = new THREE.Mesh(shaftGeo, steelMat);
  shaft.position.y = 0.18;
  group.add(shaft);

  const grip = new THREE.Mesh(gripGeo, wrapMat);
  grip.position.y = 0.04;
  group.add(grip);

  const hook = new THREE.Mesh(hookGeo, tipMat);
  hook.position.set(0.016, 0.40, -0.02);
  hook.rotation.z = -0.55;
  group.add(hook);

  return {
    group,
    dispose: () => {
      shaftGeo.dispose();
      gripGeo.dispose();
      hookGeo.dispose();
      steelMat.dispose();
      wrapMat.dispose();
      tipMat.dispose();
    },
  };
}
