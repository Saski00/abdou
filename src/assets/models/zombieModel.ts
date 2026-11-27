import * as THREE from 'three';
import { ZombieAIState, ZombieAnimState, ZombieGaitStyle } from '../../game/zombieAI';
import {
  CharacterDetailTextures,
  ZombieAnatomyGeometries,
  applyAnatomicalVertexAO,
  createCharacterDetailTextures,
  createZombieAnatomyGeometries,
  damp,
  mergeCharacterParts,
} from './characterGeometryKit';
import { applyTriplanarUVs, createTubePathGeometry } from './proceduralGeometryKit';

let cachedFpTextures: CharacterDetailTextures | null = null;
function getFpTextures(): CharacterDetailTextures {
  if (!cachedFpTextures) {
    cachedFpTextures = createCharacterDetailTextures();
  }
  return cachedFpTextures;
}

export type ZombieSharedGeometries = ZombieAnatomyGeometries;

export interface ZombieRigAnimData {
  currentState: ZombieAnimState;
  idlePhase: number;
  smoothedSpeed: number;
  smoothedYawRate: number;
}

export interface ZombieAnimExtra {
  actualSpeed?: number;
  yawRate?: number;
  gaitStyle?: ZombieGaitStyle;
  attackRecoveryTimer?: number;
  stunTimer?: number;
  stunMaxTimer?: number;
  hitDirectionSign?: number;
}

export interface ZombieRig {
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
  skinMat: THREE.MeshStandardMaterial;
  coatMat: THREE.MeshStandardMaterial;
  pantsMat: THREE.MeshStandardMaterial;
  eyeMat: THREE.MeshStandardMaterial;
  shadowMat: THREE.MeshBasicMaterial;
  archetypeId: 'walker' | 'runner' | 'brute';
  asymmetrySign: number;
  animState: ZombieRigAnimData;
  dispose: () => void;
}

export function createZombieSharedGeometries(): ZombieSharedGeometries {
  return createZombieAnatomyGeometries();
}

/**
 * Builds an articulated organic humanoid zombie (walker, runner, or brute) with bottom-center pivot at y=0.
 * Compatible with AssetManager so external GLTF/GLB rigs can drop in later.
 */
export function buildProceduralZombieModel(
  geos: ZombieSharedGeometries,
  tintVariant = 0,
  archetypeId: 'walker' | 'runner' | 'brute' = 'walker',
  visualScale = 1.0
): { group: THREE.Group; rig: ZombieRig } {
  const root = new THREE.Group();
  root.scale.setScalar(visualScale);

  const skinColors =
    archetypeId === 'runner'
      ? [0x5d6452, 0x52594a, 0x646153]
      : archetypeId === 'brute'
        ? [0x424a44, 0x3b423d, 0x4b5048]
        : [0x5d6759, 0x525c50, 0x64695a, 0x4c544b];
  const coatColors =
    archetypeId === 'runner'
      ? [0x2e211b, 0x242920]
      : archetypeId === 'brute'
        ? [0x171b21, 0x201c1f]
        : [0x21262d, 0x2c231e, 0x1e2825, 0x2a272f];
  const pantsColors = [0x171b21, 0x1e1f22, 0x191f1e];

  // Pale dead cataract eye colors — zero emissive glow
  const eyeColorHex =
    archetypeId === 'runner' ? 0x6b645c : archetypeId === 'brute' ? 0x5c5b55 : 0x73756a;

  const skinMat = new THREE.MeshStandardMaterial({
    color: skinColors[tintVariant % skinColors.length],
    roughness: 0.88,
    metalness: 0.02,
    vertexColors: true,
    bumpMap: geos.textures.undeadBump,
    bumpScale: 0.009,
  });
  const coatMat = new THREE.MeshStandardMaterial({
    color: coatColors[tintVariant % coatColors.length],
    roughness: 0.94,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.009,
  });
  const pantsMat = new THREE.MeshStandardMaterial({
    color: pantsColors[tintVariant % pantsColors.length],
    roughness: 0.94,
    metalness: 0.03,
    vertexColors: true,
    bumpMap: geos.textures.fabricBump,
    bumpScale: 0.007,
  });
  const woundMat = new THREE.MeshStandardMaterial({
    color: 0x381112,
    roughness: 0.42,
    metalness: 0.06,
    vertexColors: true,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x968a76,
    roughness: 0.72,
    metalness: 0.03,
  });
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x050607,
    roughness: 0.98,
    metalness: 0.0,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: tintVariant % 2 === 0 ? 0x1a1715 : 0x2e2824,
    roughness: 0.96,
    metalness: 0.02,
    vertexColors: true,
  });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: eyeColorHex,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.28,
    metalness: 0.05,
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

  // Pelvis / Hip assembly at 0.91m so boot soles sit cleanly on y = 0.0 (adult ~1.76m stature)
  const bodyPivot = new THREE.Group();
  bodyPivot.position.y = 0.91;
  root.add(bodyPivot);

  const pelvisMesh = new THREE.Mesh(geos.pelvis, pantsMat);
  pelvisMesh.castShadow = true;
  pelvisMesh.receiveShadow = true;
  bodyPivot.add(pelvisMesh);

  const hipWidth = archetypeId === 'brute' ? 0.125 : archetypeId === 'runner' ? 0.09 : 0.102;
  const thighGeo = archetypeId === 'brute' ? geos.thighBrute : geos.thigh;
  const shinGeo = archetypeId === 'brute' ? geos.shinBruteBoot : geos.shinTatteredBoot;

  // Articulated Legs (Hip -> Thigh -> Knee -> Shin + Boot)
  const leftLegPivot = new THREE.Group();
  leftLegPivot.position.set(-hipWidth, -0.01, 0);
  const leftThighMesh = new THREE.Mesh(thighGeo, pantsMat);
  leftThighMesh.castShadow = true;
  leftThighMesh.receiveShadow = true;
  leftLegPivot.add(leftThighMesh);

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.set(0, -0.42, 0);
  const leftShinMesh = new THREE.Mesh(shinGeo, pantsMat);
  leftShinMesh.castShadow = true;
  leftShinMesh.receiveShadow = true;
  leftKneePivot.add(leftShinMesh);
  leftLegPivot.add(leftKneePivot);
  bodyPivot.add(leftLegPivot);

  const rightLegPivot = new THREE.Group();
  rightLegPivot.position.set(hipWidth, -0.01, 0);
  const rightThighMesh = new THREE.Mesh(thighGeo, pantsMat);
  rightThighMesh.castShadow = true;
  rightThighMesh.receiveShadow = true;
  rightLegPivot.add(rightThighMesh);

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.set(0, -0.42, 0);
  const rightShinMesh = new THREE.Mesh(shinGeo, pantsMat);
  rightShinMesh.castShadow = true;
  rightShinMesh.receiveShadow = true;
  rightKneePivot.add(rightShinMesh);
  rightLegPivot.add(rightKneePivot);
  bodyPivot.add(rightLegPivot);

  // Spine Pivot for hunch, stagger & death bend
  const spinePivot = new THREE.Group();
  spinePivot.position.set(0, 0.04, 0);
  bodyPivot.add(spinePivot);

  const torsoGeo =
    archetypeId === 'brute'
      ? geos.torsoBrute
      : archetypeId === 'runner'
        ? geos.torsoRunner
        : geos.torsoWalker;
  const torsoMesh = new THREE.Mesh(torsoGeo, skinMat);
  torsoMesh.castShadow = true;
  torsoMesh.receiveShadow = true;
  spinePivot.add(torsoMesh);

  // Variant-specific clothing & wound silhouette
  if (archetypeId === 'brute') {
    const vest = new THREE.Mesh(geos.riotVestBrute, coatMat);
    vest.castShadow = true;
    vest.receiveShadow = true;
    spinePivot.add(vest);
  } else if (archetypeId === 'runner') {
    const rags = new THREE.Mesh(geos.tatteredRagsRunner, coatMat);
    rags.castShadow = true;
    spinePivot.add(rags);
  } else {
    const coat = new THREE.Mesh(geos.tatteredCoatWalker, coatMat);
    coat.castShadow = true;
    coat.receiveShadow = true;
    spinePivot.add(coat);
  }

  const ribWound = new THREE.Mesh(geos.ribWound, woundMat);
  spinePivot.add(ribWound);

  // Head assembly at top of spine
  const headZOffset = archetypeId === 'runner' ? -0.092 : archetypeId === 'brute' ? -0.080 : -0.062;
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.56, headZOffset);

  const headGeo =
    archetypeId === 'brute'
      ? geos.headBrute
      : archetypeId === 'runner'
        ? geos.headRunner
        : geos.headWalker;
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  headPivot.add(headMesh);

  if (tintVariant % 3 !== 2 && archetypeId !== 'brute') {
    const hairMesh = new THREE.Mesh(geos.sparseHair, hairMat);
    headPivot.add(hairMesh);
  }

  const eyeX = archetypeId === 'brute' ? 0.040 : 0.034;
  const eyeZ = archetypeId === 'brute' ? -0.090 : -0.084;
  const leftSocket = new THREE.Mesh(geos.eyeSocket, socketMat);
  leftSocket.position.set(-eyeX, 0.136, eyeZ);
  const rightSocket = new THREE.Mesh(geos.eyeSocket, socketMat);
  rightSocket.position.set(eyeX, 0.136, eyeZ);
  headPivot.add(leftSocket, rightSocket);

  // Dead cataract sclera recessed deep inside orbital hollow
  const leftEye = new THREE.Mesh(geos.eyeGlow, eyeMat);
  leftEye.position.set(-eyeX, 0.136, eyeZ - 0.002);
  const rightEye = new THREE.Mesh(geos.eyeGlow, eyeMat);
  rightEye.position.set(eyeX, 0.136, eyeZ - 0.002);
  headPivot.add(leftEye, rightEye);

  const teeth = new THREE.Mesh(geos.jawTeeth, boneMat);
  teeth.position.set(0, 0.058, eyeZ + 0.004);
  headPivot.add(teeth);
  spinePivot.add(headPivot);

  // Articulated 2-segment Arms (Shoulder -> Upper Arm -> Elbow -> Clawed Forearm)
  const shoulderX = archetypeId === 'brute' ? 0.255 : archetypeId === 'runner' ? 0.185 : 0.200;
  const shoulderZ = archetypeId === 'runner' ? -0.068 : -0.042;
  const upperArmGeo = archetypeId === 'brute' ? geos.upperArmBrute : geos.upperArm;
  const forearmGeo = archetypeId === 'brute' ? geos.forearmBrute : geos.forearmClawed;
  const elbowY = archetypeId === 'brute' ? -0.29 : -0.27;

  const leftArmPivot = new THREE.Group();
  leftArmPivot.position.set(-shoulderX, 0.47, shoulderZ);
  const leftUpperMesh = new THREE.Mesh(
    upperArmGeo,
    archetypeId === 'runner' ? skinMat : coatMat
  );
  leftUpperMesh.castShadow = true;
  leftArmPivot.add(leftUpperMesh);

  const leftForearmPivot = new THREE.Group();
  leftForearmPivot.position.set(0, elbowY, 0);
  const leftForearmMesh = new THREE.Mesh(
    forearmGeo,
    archetypeId === 'brute' ? skinMat : archetypeId === 'runner' ? woundMat : skinMat
  );
  leftForearmMesh.castShadow = true;
  leftForearmPivot.add(leftForearmMesh);
  leftArmPivot.add(leftForearmPivot);
  spinePivot.add(leftArmPivot);

  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(shoulderX, 0.47, shoulderZ);
  const rightUpperMesh = new THREE.Mesh(
    upperArmGeo,
    archetypeId === 'runner' ? skinMat : coatMat
  );
  rightUpperMesh.castShadow = true;
  rightArmPivot.add(rightUpperMesh);

  const rightForearmPivot = new THREE.Group();
  rightForearmPivot.position.set(0, elbowY, 0);
  const rightForearmMesh = new THREE.Mesh(
    forearmGeo,
    archetypeId === 'runner' ? woundMat : skinMat
  );
  rightForearmMesh.castShadow = true;
  rightForearmPivot.add(rightForearmMesh);
  rightArmPivot.add(rightForearmPivot);
  spinePivot.add(rightArmPivot);

  const asymmetrySign = tintVariant % 2 === 0 ? 1 : -1;

  const rig: ZombieRig = {
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
    skinMat,
    coatMat,
    pantsMat,
    eyeMat,
    shadowMat,
    archetypeId,
    asymmetrySign,
    animState: {
      currentState: 'idle',
      idlePhase: tintVariant * 1.37,
      smoothedSpeed: 0,
      smoothedYawRate: 0,
    },
    dispose: () => {
      skinMat.dispose();
      coatMat.dispose();
      pantsMat.dispose();
      woundMat.dispose();
      boneMat.dispose();
      socketMat.dispose();
      hairMat.dispose();
      eyeMat.dispose();
      shadowMat.dispose();
    },
  };

  return { group: root, rig };
}

export function resolveZombieAnimState(
  state: ZombieAIState,
  attackWindup: number,
  attackRecoveryTimer: number,
  actualSpeed: number
): ZombieAnimState {
  if (state === 'dead') return 'dead';
  if (state === 'stunned') return 'stunned';
  if (state === 'attacking') {
    if (attackWindup > 0) return 'attack_windup';
    if (attackRecoveryTimer > 0) return 'attack_recovery';
    return 'alert';
  }
  if (state === 'alert') return 'alert';
  if (state === 'suspicious') return 'suspicious';
  if (state === 'chasing') return actualSpeed > 0.14 ? 'chasing' : 'alert';
  if (state === 'investigating') return actualSpeed > 0.14 ? 'investigating' : 'suspicious';
  if (state === 'searching') return actualSpeed > 0.14 ? 'searching' : 'suspicious';
  if (state === 'roaming' || state === 'returning') return actualSpeed > 0.12 ? 'roaming' : 'idle';
  return 'idle';
}

export function animateZombieRig(
  rig: ZombieRig,
  state: ZombieAIState,
  walkCycle: number,
  attackWindup: number,
  attackWindupMax: number,
  hitFlashTimer: number,
  deathTimer: number,
  dt = 0.016,
  distSq = 0,
  extra?: ZombieAnimExtra
): void {
  // Subtle dark bruised hit reaction (no neon flash)
  if (hitFlashTimer > 0) {
    const t = hitFlashTimer / 0.18;
    rig.skinMat.emissive.setRGB(0.24 * t, 0.03 * t, 0.03 * t);
    rig.coatMat.emissive.setRGB(0.2 * t, 0.03 * t, 0.03 * t);
  } else {
    rig.skinMat.emissive.setRGB(0, 0, 0);
    rig.coatMat.emissive.setRGB(0, 0, 0);
  }

  const isFarLod = distSq > 22 * 22;
  const isBrute = rig.archetypeId === 'brute';
  const isRunner = rig.archetypeId === 'runner';
  const gait: ZombieGaitStyle =
    extra?.gaitStyle ?? (isRunner ? 'feral' : isBrute ? 'heavy' : 'shuffling');

  const rawSpeed = extra?.actualSpeed ?? (state === 'chasing' ? 3.2 : state === 'roaming' ? 1.4 : 0);
  const rawYawRate = extra?.yawRate ?? 0;
  rig.animState.smoothedSpeed = damp(rig.animState.smoothedSpeed, rawSpeed, 12, dt);
  rig.animState.smoothedYawRate = damp(rig.animState.smoothedYawRate, rawYawRate, 10, dt);
  rig.animState.idlePhase += dt * (state === 'alert' || state === 'chasing' ? 2.6 : 1.5);

  const recoveryTimer = extra?.attackRecoveryTimer ?? 0;
  const animState = resolveZombieAnimState(
    state,
    attackWindup,
    recoveryTimer,
    rig.animState.smoothedSpeed
  );
  rig.animState.currentState = animState;

  // Never emit glowing cartoon eyes
  rig.eyeMat.emissiveIntensity = 0;

  if (animState === 'dead') {
    const fallT = Math.min(1, deathTimer / 0.56);
    const buckleT = Math.min(1, deathTimer / 0.28);
    const eased = 1 - Math.pow(1 - fallT, 2.1);
    const buckleEased = 1 - Math.pow(1 - buckleT, 2);

    rig.leftKneePivot.rotation.x = buckleEased * 1.15;
    rig.rightKneePivot.rotation.x = buckleEased * 0.95;
    rig.leftLegPivot.rotation.x = -buckleEased * 0.45;
    rig.rightLegPivot.rotation.x = -buckleEased * 0.3;

    rig.bodyPivot.position.y = 0.91 - eased * 0.76;
    rig.bodyPivot.rotation.x = eased * (Math.PI * 0.48);
    rig.bodyPivot.rotation.z = eased * 0.16 * rig.asymmetrySign;
    rig.spinePivot.rotation.x = eased * 0.22;
    rig.spinePivot.rotation.y = damp(rig.spinePivot.rotation.y, 0.08 * rig.asymmetrySign, 10, dt);
    rig.headPivot.rotation.x = damp(rig.headPivot.rotation.x, 0.18, 10, dt);
    rig.headPivot.rotation.y = damp(rig.headPivot.rotation.y, 0.16 * rig.asymmetrySign, 10, dt);
    rig.headPivot.rotation.z = damp(rig.headPivot.rotation.z, 0.2 * rig.asymmetrySign, 10, dt);
    rig.leftArmPivot.rotation.x = damp(rig.leftArmPivot.rotation.x, 0.25, 10, dt);
    rig.rightArmPivot.rotation.x = damp(rig.rightArmPivot.rotation.x, 0.15, 10, dt);
    rig.leftForearmPivot.rotation.x = damp(rig.leftForearmPivot.rotation.x, 0.48, 10, dt);
    rig.rightForearmPivot.rotation.x = damp(rig.rightForearmPivot.rotation.x, 0.35, 10, dt);

    if (deathTimer > 3.2) {
      const sinkT = Math.min(1, (deathTimer - 3.2) / 1.4);
      rig.root.position.y -= sinkT * 0.34;
      rig.shadowMat.opacity = 0.42 * (1 - sinkT);
    }
    return;
  }

  // Target joint pose computed once by state machine (single-writer output at bottom)
  let tBodyY = 0.91;
  let tBodyRx = 0.04;
  let tBodyRz = 0;
  let tSpineRx = isRunner ? 0.22 : isBrute ? 0.12 : 0.15;
  let tSpineRy = 0;
  let tHeadRx = 0;
  let tHeadRy = 0;
  let tHeadRz = 0;
  let tLegLx = 0.06;
  let tLegRx = -0.06;
  let tKneeLx = 0.12;
  let tKneeRx = 0.1;
  let tArmLx = 0.6;
  let tArmRx = 0.54;
  let tForeLx = 0.42;
  let tForeRx = 0.46;
  let blend = isFarLod ? 16 : 12;

  const turnLean = Math.max(-0.22, Math.min(0.22, rig.animState.smoothedYawRate * 0.075));
  const turnHead = Math.max(-0.34, Math.min(0.34, rig.animState.smoothedYawRate * 0.11));

  if (animState === 'stunned') {
    const stunMax = Math.max(0.15, extra?.stunMaxTimer ?? 0.36);
    const stunRemaining = Math.max(0, extra?.stunTimer ?? 0.2);
    const stunImpulse = Math.min(1, stunRemaining / stunMax);
    const recoilCurve = Math.sin(Math.min(1, stunImpulse) * Math.PI * 0.5);
    const hitSign = extra?.hitDirectionSign ?? rig.asymmetrySign;

    tBodyY = 0.91 - recoilCurve * 0.06;
    tBodyRx = -0.22 * recoilCurve + 0.04;
    tBodyRz = hitSign * 0.12 * recoilCurve;
    tSpineRx = -0.18 * recoilCurve + 0.1;
    tSpineRy = hitSign * 0.28 * recoilCurve;
    tHeadRx = -0.22 * recoilCurve;
    tHeadRy = hitSign * 0.24 * recoilCurve;
    tHeadRz = hitSign * 0.26 * recoilCurve;
    tLegLx = -0.22 * recoilCurve;
    tLegRx = 0.2 * recoilCurve;
    tKneeLx = 0.34 * recoilCurve + 0.1;
    tKneeRx = 0.26 * recoilCurve + 0.1;
    tArmLx = 0.28 - recoilCurve * 0.24;
    tArmRx = 0.2 + recoilCurve * 0.22;
    tForeLx = 0.54;
    tForeRx = 0.58;
    blend = 18;
  } else if (animState === 'attack_windup') {
    const ratio =
      attackWindupMax > 0
        ? Math.max(0, Math.min(1, 1 - attackWindup / attackWindupMax))
        : 0;
    // Two-stage swing: 0..0.58 pulls arms & spine back in telegraph, 0.58..1.0 whips violently into strike
    if (ratio < 0.58) {
      const prep = ratio / 0.58;
      const e = prep * prep;
      tBodyY = 0.91 - e * 0.03;
      tBodyRx = 0.05 - e * 0.12;
      tBodyRz = -0.08 * rig.asymmetrySign * e;
      tSpineRx = 0.12 - e * 0.22;
      tSpineRy = -0.22 * rig.asymmetrySign * e;
      tHeadRx = -0.08 * e;
      tArmLx = 1.15 + e * 1.12;
      tArmRx = (isBrute ? 1.15 : 1.05) + e * 1.24;
      tForeLx = 0.52 + e * 0.36;
      tForeRx = 0.48 + e * 0.38;
      tLegLx = 0.16;
      tLegRx = -0.18;
      tKneeLx = 0.28;
      tKneeRx = 0.24;
    } else {
      const strike = (ratio - 0.58) / 0.42;
      const e = 1 - Math.pow(1 - strike, 2.2);
      tBodyY = 0.88 - e * 0.05;
      tBodyRx = -0.07 + e * 0.38;
      tBodyRz = 0.1 * rig.asymmetrySign * e;
      tSpineRx = -0.1 + e * 0.46;
      tSpineRy = 0.26 * rig.asymmetrySign * e;
      tHeadRx = 0.1 * e;
      tArmLx = 2.27 - e * 1.65;
      tArmRx = 2.29 - e * 1.72;
      tForeLx = 0.88 - e * 0.62;
      tForeRx = 0.86 - e * 0.64;
      tLegLx = 0.26;
      tLegRx = -0.28;
      tKneeLx = 0.36;
      tKneeRx = 0.28;
    }
    blend = 22;
  } else if (animState === 'attack_recovery') {
    const recDuration = isBrute ? 0.46 : isRunner ? 0.3 : 0.38;
    const r = Math.max(0, Math.min(1, recoveryTimer / recDuration));
    const followT = Math.sin(r * Math.PI * 0.5);
    tBodyY = 0.90 - followT * 0.04;
    tBodyRx = 0.12 + followT * 0.18;
    tBodyRz = 0.09 * rig.asymmetrySign * followT;
    tSpineRx = 0.18 + followT * 0.22;
    tSpineRy = 0.24 * rig.asymmetrySign * followT;
    tHeadRx = 0.06 * followT;
    tArmLx = 1.05 - followT * 0.56;
    tArmRx = 0.96 - followT * 0.58;
    tForeLx = 0.38;
    tForeRx = 0.34;
    tLegLx = 0.18;
    tLegRx = -0.18;
    tKneeLx = 0.26;
    tKneeRx = 0.2;
    blend = 14;
  } else if (animState === 'idle' || animState === 'suspicious' || animState === 'alert') {
    const isSuspicious = animState === 'suspicious';
    const isAlert = animState === 'alert';
    const ph = rig.animState.idlePhase;
    const sway = isFarLod ? 0 : Math.sin(ph) * (isAlert ? 0.025 : 0.048);
    const breath = isFarLod ? 0 : Math.sin(ph * 1.35) * (isAlert ? 0.018 : 0.013);
    const neckTwitch =
      !isFarLod && gait === 'stiff' ? Math.sin(ph * 3.7) * 0.07 : 0;

    tBodyY = 0.90 + breath;
    tBodyRx = isAlert ? 0.14 : gait === 'heavy' ? 0.06 : 0.03;
    tBodyRz = sway + turnLean * 0.5;
    tSpineRx = (isRunner ? 0.24 : isBrute ? 0.14 : 0.16) + (isAlert ? 0.14 : 0);
    tSpineRy = Math.sin(ph * 0.65) * (isSuspicious ? 0.12 : 0.04);
    tHeadRx = isAlert ? -0.08 : 0.06;
    tHeadRz = (isSuspicious ? 0.24 : 0.09) * rig.asymmetrySign - sway + neckTwitch;
    tHeadRy = isAlert
      ? turnHead
      : Math.sin(ph * (isSuspicious ? 1.45 : 0.55)) * (isSuspicious ? 0.36 : 0.15) + turnHead;
    tLegLx = gait === 'heavy' ? 0.09 : 0.06;
    tLegRx = gait === 'heavy' ? -0.09 : -0.06;
    tKneeLx = isAlert ? 0.18 : 0.12;
    tKneeRx = isAlert ? 0.14 : 0.09;

    const reach = isAlert ? 1.12 : isRunner ? 0.82 : 0.6;
    tArmLx = reach + sway;
    tArmRx = reach - 0.1 - sway;
    tForeLx = isAlert ? 0.34 : 0.44;
    tForeRx = isAlert ? 0.38 : 0.5;
    blend = isAlert ? 14 : 9;
  } else {
    // Locomotion: roaming / investigating / searching / chasing
    const isFast = animState === 'chasing';
    const isSearching = animState === 'searching';
    const speedRatio = Math.min(1.25, Math.max(0.2, rig.animState.smoothedSpeed / (isFast ? 3.3 : 1.6)));
    const s = Math.sin(walkCycle);
    const c = Math.cos(walkCycle);

    // 5 distinct zombie gait personalities
    let strideAmp = (isFast ? (isRunner ? 0.74 : 0.56) : isSearching ? 0.42 : 0.36) * Math.min(1.1, speedRatio + 0.18);
    let limpBiasL = 1.0;
    let limpBiasR = 1.0;
    let hipDropScale = 1.0;
    let latRoll = isBrute ? 0.1 : isFast ? 0.065 : 0.055;
    let kneeLift = isFast ? 0.72 : 0.46;
    let torsoFwd = isFast ? (isRunner ? 0.28 : 0.18) : 0.08;
    let spineHunch = isRunner ? 0.25 : isBrute ? 0.15 : 0.17;
    let spineTwist = 0.08;

    if (gait === 'limping') {
      // One bad leg drags with stiffer knee while body lurches sideways on every injured step
      limpBiasL = rig.asymmetrySign > 0 ? 0.64 : 1.12;
      limpBiasR = rig.asymmetrySign > 0 ? 1.12 : 0.64;
      latRoll = 0.105;
      hipDropScale = 1.35;
      torsoFwd += Math.max(0, s * rig.asymmetrySign) * 0.08;
    } else if (gait === 'shuffling') {
      strideAmp *= 0.84;
      kneeLift *= 0.76;
      latRoll = 0.07;
      spineTwist = 0.11;
    } else if (gait === 'stiff') {
      strideAmp *= 0.92;
      kneeLift *= 0.62;
      spineHunch += 0.04;
      tHeadRz = (0.18 + Math.sin(walkCycle * 1.8) * 0.05) * rig.asymmetrySign;
    } else if (gait === 'feral') {
      strideAmp *= 1.08;
      kneeLift = 0.82;
      torsoFwd = isFast ? 0.31 : 0.19;
      spineTwist = 0.13;
    } else if (gait === 'heavy') {
      strideAmp *= 0.94;
      hipDropScale = 1.45;
      latRoll = 0.12;
      kneeLift = 0.52;
      spineTwist = 0.09;
    }

    const hipDip = Math.abs(s) * (isFast ? 0.036 : 0.024) * hipDropScale;
    tBodyY = 0.91 - hipDip;
    tBodyRx = torsoFwd;
    tBodyRz = c * latRoll + turnLean;
    tSpineRx = spineHunch;
    tSpineRy = -s * spineTwist + turnHead * 0.25;

    tLegLx = s * strideAmp * limpBiasL;
    tLegRx = -s * strideAmp * limpBiasR;
    tKneeLx = Math.max(0.08, -c * kneeLift * limpBiasL + 0.18);
    tKneeRx = Math.max(0.08, c * kneeLift * limpBiasR + 0.18);

    if (gait !== 'stiff') {
      tHeadRz = (isFast ? -0.1 : 0.11) * rig.asymmetrySign - turnLean * 0.4;
    }
    tHeadRx = isFast ? -0.12 : 0.04;
    tHeadRy =
      (isSearching ? Math.sin(walkCycle * 0.9) * 0.42 : Math.sin(walkCycle * 0.5) * 0.12) +
      turnHead;

    const armBase = isFast ? (isRunner ? 1.38 : 1.18) : isSearching ? 1.0 : 0.84;
    const armSwing = isFast ? 0.26 : 0.15;
    tArmLx = armBase + Math.sin(walkCycle * 0.92) * armSwing;
    tArmRx = armBase - 0.08 - Math.sin(walkCycle * 0.92) * armSwing;
    tForeLx = isRunner ? 0.58 : gait === 'stiff' ? 0.2 : 0.36;
    tForeRx = isRunner ? 0.62 : gait === 'stiff' ? 0.24 : 0.42;
    blend = isFast ? 15 : 11;
  }

  // Single-writer damped joint application (smooth state transitions, zero popping)
  const limbBlend = isFarLod ? blend : Math.max(blend, 14);
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

/**
 * Helper to sculpt articulated first-person forearm + weathered canvas sleeve + wristwatch + fingerless tactical glove
 * with 4 distinct articulated curled fingers + exposed dirty fingertips.
 */
function buildFirstPersonGlovedArm(opts: {
  side: 'right' | 'left';
  pose: 'melee_grip' | 'pistol_grip' | 'pistol_support' | 'offhand_guard';
  disposables: { dispose: () => void }[];
}): THREE.Group {
  const armGroup = new THREE.Group();
  const fpTex = getFpTextures();

  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x282e2a,
    roughness: 0.92,
    metalness: 0.04,
    vertexColors: true,
    bumpMap: fpTex.fabricBump,
    bumpScale: 0.009,
  });
  const cuffMat = new THREE.MeshStandardMaterial({
    color: 0x1d211e,
    roughness: 0.9,
    metalness: 0.04,
    vertexColors: true,
    bumpMap: fpTex.fabricBump,
    bumpScale: 0.007,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x856350,
    roughness: 0.88,
    metalness: 0.02,
    vertexColors: true,
    bumpMap: fpTex.skinBump,
    bumpScale: 0.005,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x1b1a18,
    roughness: 0.78,
    metalness: 0.08,
    vertexColors: true,
    bumpMap: fpTex.fabricBump,
    bumpScale: 0.006,
  });
  const watchMat = new THREE.MeshStandardMaterial({
    color: 0x262c34,
    roughness: 0.46,
    metalness: 0.58,
  });

  opts.disposables.push(sleeveMat, cuffMat, skinMat, gloveMat, watchMat);

  // Sculpted forearm sleeve extending off-screen toward shoulder
  const sleeveGeo = new THREE.CylinderGeometry(0.036, 0.056, 0.37, 12);
  sleeveGeo.scale(1.06, 1, 0.94);
  sleeveGeo.translate(0, -0.185, 0);
  applyTriplanarUVs(sleeveGeo, 3.0);
  applyAnatomicalVertexAO(sleeveGeo, (_x, y) => (y > -0.06 ? 0.78 : 0.96));

  const cuffGeo = new THREE.TorusGeometry(0.036, 0.0085, 7, 14);
  cuffGeo.rotateX(Math.PI * 0.5);
  cuffGeo.translate(0, -0.015, 0);
  applyTriplanarUVs(cuffGeo, 4.0);
  applyAnatomicalVertexAO(cuffGeo, () => 0.82);

  const wristGeo = new THREE.CylinderGeometry(0.025, 0.030, 0.062, 10);
  wristGeo.translate(0, 0.02, 0);
  applyTriplanarUVs(wristGeo, 4.0);
  applyAnatomicalVertexAO(wristGeo, () => 0.9);

  // Fingerless leather glove wrap + reinforced knuckle ridge
  const palmGeo = new THREE.SphereGeometry(0.029, 10, 8);
  palmGeo.scale(0.66, 1.15, 1.05);
  palmGeo.translate(0, 0.064, 0);

  const knuckleRidge = new THREE.CapsuleGeometry(0.0075, 0.044, 3, 6);
  knuckleRidge.rotateX(Math.PI * 0.5);
  knuckleRidge.translate(opts.side === 'right' ? 0.015 : -0.015, 0.079, -0.004);

  const gloveParts: THREE.BufferGeometry[] = [palmGeo, knuckleRidge];
  const tipParts: THREE.BufferGeometry[] = [];
  const fZ = [-0.022, -0.007, 0.008, 0.021];
  const signX = opts.side === 'right' ? -1 : 1;

  // 4 distinct articulated fingers: gloved proximal phalanx + bare dirty skin curled distal fingertip
  for (let i = 0; i < 4; i++) {
    const prox = new THREE.CapsuleGeometry(0.0064, 0.019, 3, 6);
    prox.rotateZ(signX * 0.72);
    prox.translate(signX * 0.0085, 0.088 - i * 0.001, fZ[i]);
    gloveParts.push(prox);

    const tip = new THREE.CapsuleGeometry(0.0055, 0.015, 3, 5);
    tip.rotateZ(signX * 1.56);
    tip.translate(signX * 0.0165, 0.079 - i * 0.0015, fZ[i]);
    tipParts.push(tip);
  }

  const thumbBase = new THREE.CapsuleGeometry(0.0075, 0.018, 3, 6);
  thumbBase.rotateX(-0.55);
  thumbBase.rotateZ(-signX * 0.35);
  thumbBase.translate(signX * 0.016, 0.074, 0.016);
  gloveParts.push(thumbBase);

  const thumbTip = new THREE.CapsuleGeometry(0.0066, 0.015, 3, 5);
  thumbTip.rotateX(-0.82);
  thumbTip.rotateZ(-signX * 0.12);
  thumbTip.translate(signX * 0.02, 0.091, 0.011);
  tipParts.push(thumbTip);

  const gloveMerged = applyAnatomicalVertexAO(
    mergeCharacterParts(gloveParts, true, 5.0),
    (_x, y) => (y > 0.075 ? 0.88 : 0.96)
  );
  const tipsMerged = applyAnatomicalVertexAO(
    mergeCharacterParts(tipParts, true, 5.0),
    () => 0.9
  );

  opts.disposables.push(sleeveGeo, cuffGeo, wristGeo, gloveMerged, tipsMerged);

  const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
  const cuffMesh = new THREE.Mesh(cuffGeo, cuffMat);
  const wristMesh = new THREE.Mesh(wristGeo, skinMat);
  const gloveMesh = new THREE.Mesh(gloveMerged, gloveMat);
  const tipsMesh = new THREE.Mesh(tipsMerged, skinMat);

  armGroup.add(sleeveMesh, cuffMesh, wristMesh, gloveMesh, tipsMesh);

  if (opts.side === 'left') {
    const watchBandGeo = new THREE.TorusGeometry(0.027, 0.0048, 5, 12);
    watchBandGeo.rotateX(Math.PI * 0.5);
    watchBandGeo.translate(0, 0.023, 0);
    const watchFaceGeo = new THREE.CylinderGeometry(0.013, 0.013, 0.0075, 10);
    watchFaceGeo.rotateZ(Math.PI * 0.5);
    watchFaceGeo.translate(-0.026, 0.023, 0);
    const watchMerged = mergeCharacterParts([watchBandGeo, watchFaceGeo], true, 6.0);
    opts.disposables.push(watchMerged);
    armGroup.add(new THREE.Mesh(watchMerged, watchMat));
  }

  // Position & orient arm naturally relative to weapon origin
  if (opts.pose === 'melee_grip') {
    armGroup.position.set(0.018, -0.02, 0.022);
    armGroup.rotation.set(-0.98, 0.14, 0.32);
  } else if (opts.pose === 'pistol_grip') {
    armGroup.position.set(0.026, -0.095, 0.056);
    armGroup.rotation.set(-1.12, -0.06, 0.24);
  } else if (opts.pose === 'pistol_support') {
    armGroup.position.set(-0.042, -0.105, 0.048);
    armGroup.rotation.set(-1.08, 0.28, -0.44);
  } else {
    // offhand_guard tucked slightly lower-left of camera view
    armGroup.position.set(-0.46, -0.14, 0.12);
    armGroup.rotation.set(-0.88, -0.45, -0.24);
  }

  return armGroup;
}

/**
 * First-person heavy forged crowbar / pry bar with grime-taped grip & articulated hands.
 */
export function buildFirstPersonMeleePipe(): {
  group: THREE.Group;
  leftArmPivot: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const fpTex = getFpTextures();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x393f47,
    roughness: 0.58,
    metalness: 0.72,
    bumpMap: fpTex.undeadBump,
    bumpScale: 0.005,
  });
  const wrapMat = new THREE.MeshStandardMaterial({
    color: 0x1d1b19,
    roughness: 0.94,
    metalness: 0.04,
    bumpMap: fpTex.fabricBump,
    bumpScale: 0.008,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0x4b403d,
    roughness: 0.62,
    metalness: 0.52,
  });
  disposables.push(steelMat, wrapMat, tipMat);

  // Curved crowbar shaft & gooseneck (zero BoxGeometry)
  const shaftGeo = createTubePathGeometry(
    [
      new THREE.Vector3(0, -0.02, 0),
      new THREE.Vector3(0, 0.16, 0),
      new THREE.Vector3(0, 0.33, -0.004),
      new THREE.Vector3(0.012, 0.405, -0.026),
      new THREE.Vector3(0.028, 0.425, -0.068),
      new THREE.Vector3(0.036, 0.39, -0.104),
    ],
    0.0155,
    18,
    8
  );

  // Friction-tape wrapped grip with spiral ridge bands
  const gripParts: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(0.021, 0.0195, 0.15, 10),
  ];
  gripParts[0].translate(0, 0.045, 0);
  for (let r = 0; r < 6; r++) {
    const ring = new THREE.TorusGeometry(0.0215, 0.0025, 5, 10);
    ring.rotateX(Math.PI * 0.5 + 0.14);
    ring.translate(0, -0.015 + r * 0.024, 0);
    gripParts.push(ring);
  }
  const gripGeo = mergeCharacterParts(gripParts, true, 4.0);

  // Flattened split pry-tip via ExtrudeGeometry
  const tipShape = new THREE.Shape();
  tipShape.moveTo(-0.015, 0);
  tipShape.lineTo(0.015, 0);
  tipShape.lineTo(0.017, 0.052);
  tipShape.lineTo(0.006, 0.052);
  tipShape.lineTo(0, 0.024);
  tipShape.lineTo(-0.006, 0.052);
  tipShape.lineTo(-0.017, 0.052);
  tipShape.closePath();
  const tipGeo = new THREE.ExtrudeGeometry(tipShape, {
    depth: 0.009,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.0025,
    bevelSegments: 1,
  });
  tipGeo.rotateX(-Math.PI * 0.72);
  tipGeo.translate(0.036, 0.39, -0.102);

  disposables.push(shaftGeo, gripGeo, tipGeo);

  group.add(new THREE.Mesh(shaftGeo, steelMat));
  group.add(new THREE.Mesh(gripGeo, wrapMat));
  group.add(new THREE.Mesh(tipGeo, tipMat));

  const rightArm = buildFirstPersonGlovedArm({
    side: 'right',
    pose: 'melee_grip',
    disposables,
  });
  group.add(rightArm);

  const leftArmPivot = buildFirstPersonGlovedArm({
    side: 'left',
    pose: 'offhand_guard',
    disposables,
  });
  group.add(leftArmPivot);

  return {
    group,
    leftArmPivot,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * First-person parkerized combat knife + articulated survivor hands & sleeves.
 */
export function buildFirstPersonCombatBlade(): {
  group: THREE.Group;
  leftArmPivot: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];
  const fpTex = getFpTextures();

  const bladeMat = new THREE.MeshStandardMaterial({
    color: 0x5b636d,
    roughness: 0.36,
    metalness: 0.78,
  });
  const spineMat = new THREE.MeshStandardMaterial({
    color: 0x20252d,
    roughness: 0.55,
    metalness: 0.6,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x18191c,
    roughness: 0.92,
    metalness: 0.05,
    bumpMap: fpTex.fabricBump,
    bumpScale: 0.008,
  });
  const guardMat = new THREE.MeshStandardMaterial({
    color: 0x323842,
    roughness: 0.48,
    metalness: 0.72,
  });
  disposables.push(bladeMat, spineMat, gripMat, guardMat);

  const gripParts: THREE.BufferGeometry[] = [
    new THREE.CylinderGeometry(0.0155, 0.018, 0.135, 10),
  ];
  gripParts[0].scale(0.86, 1, 1.15);
  gripParts[0].translate(0, 0.032, 0);
  for (let r = 0; r < 5; r++) {
    const ring = new THREE.TorusGeometry(0.0165, 0.0022, 5, 10);
    ring.rotateX(Math.PI * 0.5);
    ring.scale(0.88, 1.15, 1);
    ring.translate(0, -0.015 + r * 0.023, 0);
    gripParts.push(ring);
  }
  const handleGeo = mergeCharacterParts(gripParts, true, 4.0);

  // Sculpted curved crossguard via Capsule
  const guardGeo = new THREE.CapsuleGeometry(0.0085, 0.044, 3, 6);
  guardGeo.rotateX(Math.PI * 0.5);
  guardGeo.translate(0, 0.102, 0);

  // Contoured drop-point blade via ExtrudeGeometry
  const bladeShape = new THREE.Shape();
  bladeShape.moveTo(-0.014, 0.106);
  bladeShape.lineTo(0.015, 0.106);
  bladeShape.lineTo(0.014, 0.265);
  bladeShape.quadraticCurveTo(0.004, 0.328, -0.011, 0.348); // drop point
  bladeShape.quadraticCurveTo(-0.017, 0.275, -0.014, 0.106);

  const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
    depth: 0.004,
    bevelEnabled: true,
    bevelThickness: 0.0022,
    bevelSize: 0.0022,
    bevelSegments: 1,
  });
  bladeGeo.rotateY(Math.PI * 0.5);
  bladeGeo.translate(-0.002, 0, 0);

  const fullerGeo = new THREE.CapsuleGeometry(0.0025, 0.11, 2, 5);
  fullerGeo.translate(0, 0.195, 0.007);

  disposables.push(handleGeo, guardGeo, bladeGeo, fullerGeo);

  group.add(new THREE.Mesh(handleGeo, gripMat));
  group.add(new THREE.Mesh(guardGeo, guardMat));
  group.add(new THREE.Mesh(bladeGeo, bladeMat));
  group.add(new THREE.Mesh(fullerGeo, spineMat));

  const rightArm = buildFirstPersonGlovedArm({
    side: 'right',
    pose: 'melee_grip',
    disposables,
  });
  group.add(rightArm);

  const leftArmPivot = buildFirstPersonGlovedArm({
    side: 'left',
    pose: 'offhand_guard',
    disposables,
  });
  group.add(leftArmPivot);

  return {
    group,
    leftArmPivot,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

/**
 * First-person parkerized 9mm service pistol with two-handed tactical grip,
 * beveled machined slide, blowback slideMesh, and muted steel sights (zero glowing arcade sight).
 */
export function buildFirstPersonServicePistol(): {
  group: THREE.Group;
  slideMesh: THREE.Mesh;
  leftArmPivot: THREE.Group;
  muzzleFlash: THREE.Mesh;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: { dispose: () => void }[] = [];

  const slideMat = new THREE.MeshStandardMaterial({
    color: 0x1d232b,
    roughness: 0.42,
    metalness: 0.82,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x111418,
    roughness: 0.82,
    metalness: 0.14,
  });
  const sightMat = new THREE.MeshStandardMaterial({
    color: 0x767e87,
    emissive: 0x000000,
    emissiveIntensity: 0,
    roughness: 0.45,
    metalness: 0.4,
  });
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xe2b872,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  disposables.push(slideMat, frameMat, sightMat, flashMat);

  // Machined beveled pistol slide
  const slideShape = new THREE.Shape();
  slideShape.moveTo(-0.017, 0);
  slideShape.lineTo(0.017, 0);
  slideShape.lineTo(0.017, 0.026);
  slideShape.lineTo(0.012, 0.036);
  slideShape.lineTo(-0.012, 0.036);
  slideShape.lineTo(-0.017, 0.026);
  slideShape.closePath();
  const slideGeo = new THREE.ExtrudeGeometry(slideShape, {
    depth: 0.21,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
  slideGeo.translate(0, 0.02, -0.16);

  const barrelGeo = new THREE.CylinderGeometry(0.0085, 0.0085, 0.045, 10);
  barrelGeo.rotateX(Math.PI * 0.5);
  barrelGeo.translate(0, 0.036, -0.172);

  // Ergonomic frame & rounded trigger guard
  const frameShape = new THREE.Shape();
  frameShape.moveTo(-0.014, 0);
  frameShape.lineTo(0.014, 0);
  frameShape.lineTo(0.015, 0.022);
  frameShape.lineTo(-0.015, 0.022);
  frameShape.closePath();
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, {
    depth: 0.175,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
  frameGeo.translate(0, 0.0, -0.132);

  const gripGeo = new THREE.CylinderGeometry(0.018, 0.022, 0.112, 8);
  gripGeo.scale(0.82, 1, 1.38);
  gripGeo.rotateX(0.26);
  gripGeo.translate(0, -0.046, 0.016);

  const guardGeo = new THREE.TorusGeometry(0.017, 0.0032, 5, 12, Math.PI * 1.15);
  guardGeo.rotateY(Math.PI * 0.5);
  guardGeo.rotateZ(-Math.PI * 0.45);
  guardGeo.translate(0, -0.006, -0.032);

  const sightGeo = new THREE.CapsuleGeometry(0.0024, 0.005, 2, 5);
  sightGeo.translate(0, 0.058, -0.148);

  // Star-shaped 3D muzzle flash
  const cone1 = new THREE.ConeGeometry(0.032, 0.095, 5);
  cone1.rotateX(-Math.PI * 0.5);
  const cone2 = new THREE.ConeGeometry(0.045, 0.055, 4);
  cone2.rotateX(Math.PI * 0.5);
  const flashGeo = mergeCharacterParts([cone1, cone2], false);

  disposables.push(slideGeo, barrelGeo, frameGeo, gripGeo, guardGeo, sightGeo, flashGeo);

  const slideMesh = new THREE.Mesh(slideGeo, slideMat);
  group.add(slideMesh);
  group.add(new THREE.Mesh(barrelGeo, slideMat));
  group.add(new THREE.Mesh(frameGeo, frameMat));
  group.add(new THREE.Mesh(gripGeo, frameMat));
  group.add(new THREE.Mesh(guardGeo, frameMat));

  const frontSight = new THREE.Mesh(sightGeo, sightMat);
  group.add(frontSight);

  const muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
  muzzleFlash.position.set(0, 0.038, -0.22);
  muzzleFlash.visible = false;
  group.add(muzzleFlash);

  const rightArm = buildFirstPersonGlovedArm({
    side: 'right',
    pose: 'pistol_grip',
    disposables,
  });
  group.add(rightArm);

  const leftArmPivot = buildFirstPersonGlovedArm({
    side: 'left',
    pose: 'pistol_support',
    disposables,
  });
  group.add(leftArmPivot);

  return {
    group,
    slideMesh,
    leftArmPivot,
    muzzleFlash,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}
