import * as THREE from 'three';
import {
  BenchmarkMaterialMaps,
  BenchmarkTextureBundle,
} from './benchmarkTextures';
import {
  BenchmarkSkeletonRig,
  buildBenchmarkBootGeometry,
  buildBenchmarkHairGeometry,
  buildBenchmarkHandGeometry,
  buildBenchmarkHeadGeometry,
  buildBenchmarkOuterJacket,
  buildBenchmarkZombieHorrorDetails,
  createBenchmarkSkeleton,
  buildSkinnedBodyGeometries,
} from './benchmarkGeometry';

export interface BenchmarkCharacterInstance {
  root: THREE.Group;
  rig: BenchmarkSkeletonRig;
  skinnedMeshes: THREE.SkinnedMesh[];
  materials: THREE.MeshStandardMaterial[];
  geometries: THREE.BufferGeometry[];
  animate: (elapsed: number) => void;
  dispose: () => void;
}

function makePbrMat(
  maps: BenchmarkMaterialMaps,
  opts: {
    color: number;
    roughness: number;
    metalness: number;
    normalScale: number;
    aoMapIntensity?: number;
    vertexColors?: boolean;
    side?: THREE.Side;
    sheen?: number;
    sheenRoughness?: number;
    sheenColor?: number;
    clearcoat?: number;
    clearcoatRoughness?: number;
  }
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: opts.color,
    map: maps.map,
    normalMap: maps.normalMap,
    normalScale: new THREE.Vector2(opts.normalScale, opts.normalScale),
    roughnessMap: maps.roughnessMap,
    roughness: opts.roughness,
    metalnessMap: maps.metalnessMap,
    metalness: opts.metalness,
    aoMap: maps.aoMap,
    aoMapIntensity: opts.aoMapIntensity ?? 0.65,
    vertexColors: opts.vertexColors ?? true,
    side: opts.side ?? THREE.FrontSide,
    sheen: opts.sheen ?? 0,
    sheenRoughness: opts.sheenRoughness ?? 0.7,
    sheenColor: new THREE.Color(opts.sheenColor ?? 0xffffff),
    clearcoat: opts.clearcoat ?? 0,
    clearcoatRoughness: opts.clearcoatRoughness ?? 0.3,
  });
}

function attachToBone(
  rig: BenchmarkSkeletonRig,
  boneName: keyof BenchmarkSkeletonRig['boneMap'],
  mesh: THREE.Object3D
): void {
  const idx = rig.boneMap[boneName];
  rig.bones[idx].add(mesh);
}

/**
 * TEST 1 — Highest-quality procedural human character achievable using Three.js r187 + WebGL2.
 */
export function buildBenchmarkHuman(tex: BenchmarkTextureBundle): BenchmarkCharacterInstance {
  const root = new THREE.Group();
  const rig = createBenchmarkSkeleton();
  root.add(rig.rootBone);

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];

  const skinMat = makePbrMat(tex.humanSkin, {
    color: 0xf4e8df,
    roughness: 0.76,
    metalness: 0.02,
    normalScale: 0.55,
    aoMapIntensity: 0.45,
    sheen: 0.22,
    sheenRoughness: 0.68,
    sheenColor: 0xffd7c2,
    clearcoat: 0.06,
    clearcoatRoughness: 0.52,
  });
  const shirtMat = makePbrMat(tex.dirtyCloth, {
    color: 0xc2cbd1,
    roughness: 0.98,
    metalness: 0.02,
    normalScale: 0.95,
    sheen: 0.42,
    sheenRoughness: 0.85,
    sheenColor: 0xd0d4d8,
  });
  const pantsMat = makePbrMat(tex.dirtyCloth, {
    color: 0x8e9588,
    roughness: 0.98,
    metalness: 0.02,
    normalScale: 0.95,
    sheen: 0.36,
    sheenRoughness: 0.88,
    sheenColor: 0xbcc0b8,
  });
  const leatherMat = makePbrMat(tex.leather, {
    color: 0xc2a894,
    roughness: 0.72,
    metalness: 0.06,
    normalScale: 1.05,
    side: THREE.DoubleSide,
    clearcoat: 0.08,
    clearcoatRoughness: 0.48,
  });
  const bootMat = makePbrMat(tex.leather, {
    color: 0x7a685b,
    roughness: 0.76,
    metalness: 0.05,
    normalScale: 0.95,
  });
  const hairMat = makePbrMat(tex.hair, {
    color: 0xa28c7a,
    roughness: 0.92,
    metalness: 0.02,
    normalScale: 0.60,
    sheen: 0.25,
    sheenRoughness: 0.62,
    sheenColor: 0xc9b5a0,
  });
  const metalMat = makePbrMat(tex.metal, {
    color: 0xc2c8d0,
    roughness: 0.42,
    metalness: 0.94,
    normalScale: 1.0,
    vertexColors: false,
  });
  const scleraMat = new THREE.MeshPhysicalMaterial({
    color: 0xc8c3ba,
    roughness: 0.22,
    metalness: 0.02,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
  });
  const irisMat = new THREE.MeshPhysicalMaterial({
    color: 0x2f3b45,
    roughness: 0.16,
    metalness: 0.04,
    clearcoat: 0.95,
    clearcoatRoughness: 0.06,
  });
  const browMat = new THREE.MeshStandardMaterial({
    color: 0x3b2c22,
    roughness: 0.92,
  });

  materials.push(
    skinMat,
    shirtMat,
    pantsMat,
    leatherMat,
    bootMat,
    hairMat,
    metalMat,
    scleraMat,
    irisMat,
    browMat
  );

  // 1. Continuous Skinned Body (Torso + Arms + Neck + Wrists + Trouser Legs)
  const bodyGeos = buildSkinnedBodyGeometries(rig, 'human');
  geometries.push(bodyGeos.torsoAndArmsCloth, bodyGeos.legsCloth, bodyGeos.exposedSkinBody);

  const makeSkinned = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial): THREE.SkinnedMesh => {
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.castShadow = true;
    sm.receiveShadow = true;
    sm.bind(rig.skeleton);
    sm.frustumCulled = false;
    skinnedMeshes.push(sm);
    root.add(sm);
    return sm;
  };

  makeSkinned(bodyGeos.torsoAndArmsCloth, shirtMat);
  makeSkinned(bodyGeos.legsCloth, pantsMat);
  makeSkinned(bodyGeos.exposedSkinBody, skinMat);

  // 2. Sculpted High-Res Head + Eyes + Eyebrows + Layered Hair
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d10,
    roughness: 0.12,
    metalness: 0.06,
  });
  materials.push(pupilMat);

  const headGeo = buildBenchmarkHeadGeometry('human');
  const hairGeo = buildBenchmarkHairGeometry('human');
  const scleraGeo = new THREE.SphereGeometry(0.0128, 12, 10);
  scleraGeo.scale(1.12, 0.74, 0.68);
  const irisGeo = new THREE.SphereGeometry(0.0068, 10, 8);
  irisGeo.scale(1.0, 1.0, 0.55);
  const pupilGeo = new THREE.SphereGeometry(0.0033, 8, 6);
  pupilGeo.scale(1.0, 1.0, 0.45);
  const lidGeo = new THREE.CapsuleGeometry(0.0025, 0.018, 3, 6);
  lidGeo.rotateZ(Math.PI * 0.5);
  const browGeo = new THREE.CapsuleGeometry(0.0024, 0.028, 3, 6);
  browGeo.rotateZ(Math.PI * 0.5);
  geometries.push(headGeo, hairGeo, scleraGeo, irisGeo, pupilGeo, lidGeo, browGeo);

  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  attachToBone(rig, 'head', headMesh);

  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.castShadow = true;
  hairMesh.receiveShadow = true;
  attachToBone(rig, 'head', hairMesh);

  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(scleraGeo, scleraMat);
    eye.position.set(sx * 0.031, 0.060, -0.0845);
    attachToBone(rig, 'head', eye);

    const iris = new THREE.Mesh(irisGeo, irisMat);
    iris.position.set(sx * 0.031, 0.060, -0.0900);
    attachToBone(rig, 'head', iris);

    const pupil = new THREE.Mesh(pupilGeo, pupilMat);
    pupil.position.set(sx * 0.031, 0.060, -0.0928);
    attachToBone(rig, 'head', pupil);

    const upperLid = new THREE.Mesh(lidGeo, skinMat);
    upperLid.position.set(sx * 0.031, 0.0665, -0.0882);
    upperLid.rotation.z = sx * -0.06;
    upperLid.rotation.y = sx * -0.18;
    attachToBone(rig, 'head', upperLid);

    const brow = new THREE.Mesh(browGeo, browMat);
    brow.position.set(sx * 0.031, 0.077, -0.0955);
    brow.rotation.z = sx * -0.07;
    brow.rotation.y = sx * -0.22;
    attachToBone(rig, 'head', brow);
  }

  // 3. Layered Open Leather Jacket + Flat Utility Belt + Steel Buckle
  const jacketGeo = buildBenchmarkOuterJacket(false);
  const beltGeo = new THREE.CylinderGeometry(0.160, 0.158, 0.038, 24);
  beltGeo.scale(1.01, 1.0, 0.725);
  const buckleGeo = new THREE.BoxGeometry(0.044, 0.038, 0.014);
  geometries.push(jacketGeo, beltGeo, buckleGeo);

  const jacketMesh = new THREE.Mesh(jacketGeo, leatherMat);
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  attachToBone(rig, 'spineUpper', jacketMesh);

  const beltMesh = new THREE.Mesh(beltGeo, bootMat);
  beltMesh.position.set(0, 0.02, 0.004);
  beltMesh.castShadow = true;
  attachToBone(rig, 'pelvis', beltMesh);

  const buckleMesh = new THREE.Mesh(buckleGeo, metalMat);
  buckleMesh.position.set(0, 0.02, -0.114);
  buckleMesh.castShadow = true;
  attachToBone(rig, 'pelvis', buckleMesh);

  // 4. 5-Finger Articulated Hands
  const handLGeo = buildBenchmarkHandGeometry(-1, false);
  const handRGeo = buildBenchmarkHandGeometry(1, false);
  geometries.push(handLGeo, handRGeo);

  const handLMesh = new THREE.Mesh(handLGeo, skinMat);
  handLMesh.castShadow = true;
  attachToBone(rig, 'handL', handLMesh);

  const handRMesh = new THREE.Mesh(handRGeo, skinMat);
  handRMesh.castShadow = true;
  attachToBone(rig, 'handR', handRMesh);

  // 5. Contoured Work Boots
  const bootLGeo = buildBenchmarkBootGeometry(-1);
  const bootRGeo = buildBenchmarkBootGeometry(1);
  geometries.push(bootLGeo, bootRGeo);

  const bootLMesh = new THREE.Mesh(bootLGeo, bootMat);
  bootLMesh.castShadow = true;
  bootLMesh.receiveShadow = true;
  attachToBone(rig, 'shinL', bootLMesh);

  const bootRMesh = new THREE.Mesh(bootRGeo, bootMat);
  bootRMesh.castShadow = true;
  bootRMesh.receiveShadow = true;
  attachToBone(rig, 'shinR', bootRMesh);

  // Natural grounded weight shift pose (+X rotation swings limbs forward toward -Z; -X bends knees back)
  const b = rig.boneMap;
  rig.bones[b.thighL].rotation.x = 0.06;
  rig.bones[b.shinL].rotation.x = -0.06;
  rig.bones[b.thighR].rotation.x = -0.05;
  rig.bones[b.shinR].rotation.x = -0.06;
  rig.bones[b.upperArmL].rotation.x = -0.04;
  rig.bones[b.forearmL].rotation.x = 0.24;
  rig.bones[b.upperArmR].rotation.x = 0.04;
  rig.bones[b.forearmR].rotation.x = 0.20;

  const animate = (elapsed: number) => {
    const breath = Math.sin(elapsed * 1.45);
    const sway = Math.sin(elapsed * 0.65);
    rig.bones[b.spineUpper].rotation.x = -0.02 + breath * 0.015;
    rig.bones[b.spineLower].rotation.z = sway * 0.012;
    rig.bones[b.head].rotation.y = Math.sin(elapsed * 0.42) * 0.06;
    rig.bones[b.head].rotation.x = -breath * 0.014 + 0.02;
    rig.bones[b.upperArmL].rotation.z = -0.04 + breath * 0.014;
    rig.bones[b.upperArmR].rotation.z = 0.04 - breath * 0.014;
    rig.skeleton.update();
  };

  return {
    root,
    rig,
    skinnedMeshes,
    materials,
    geometries,
    animate,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

/**
 * TEST 2 — Highest-quality procedural survival horror zombie achievable using Three.js r187 + WebGL2.
 */
export function buildBenchmarkZombie(tex: BenchmarkTextureBundle): BenchmarkCharacterInstance {
  const root = new THREE.Group();
  const rig = createBenchmarkSkeleton();
  root.add(rig.rootBone);

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];

  const zombieSkinMat = makePbrMat(tex.zombieSkin, {
    color: 0xdbe0ce,
    roughness: 0.88,
    metalness: 0.02,
    normalScale: 1.25,
    aoMapIntensity: 0.65,
  });
  const tornClothMat = makePbrMat(tex.dirtyCloth, {
    color: 0x9ca298,
    roughness: 0.98,
    metalness: 0.01,
    normalScale: 1.05,
    sheen: 0.35,
    sheenRoughness: 0.88,
    sheenColor: 0xa5aa9f,
  });
  const bloodClothMat = makePbrMat(tex.bloodStained, {
    color: 0xdad0c8,
    roughness: 0.78,
    metalness: 0.04,
    normalScale: 1.15,
    side: THREE.DoubleSide,
    clearcoat: 0.42,
    clearcoatRoughness: 0.24,
  });
  const pantsMat = makePbrMat(tex.dirtyCloth, {
    color: 0x7d8278,
    roughness: 0.98,
    metalness: 0.01,
    normalScale: 0.95,
    sheen: 0.3,
    sheenRoughness: 0.9,
  });
  const bootMat = makePbrMat(tex.leather, {
    color: 0x6a5b50,
    roughness: 0.82,
    metalness: 0.04,
    normalScale: 1.0,
  });
  const hairMat = makePbrMat(tex.hair, {
    color: 0x736357,
    roughness: 0.96,
    metalness: 0.02,
    normalScale: 0.75,
  });
  const deadEyeMat = new THREE.MeshPhysicalMaterial({
    color: 0x797367,
    roughness: 0.16,
    metalness: 0.04,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
  });
  const socketDarkMat = new THREE.MeshStandardMaterial({
    color: 0x160e10,
    roughness: 0.92,
  });
  const toothMat = new THREE.MeshStandardMaterial({
    color: 0x8f8368,
    roughness: 0.56,
    vertexColors: true,
  });
  const woundMat = makePbrMat(tex.bloodStained, {
    color: 0x8c2422,
    roughness: 0.34,
    metalness: 0.08,
    normalScale: 1.4,
    clearcoat: 0.82,
    clearcoatRoughness: 0.12,
  });
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0x9e9278,
    roughness: 0.62,
    vertexColors: true,
  });

  materials.push(
    zombieSkinMat,
    tornClothMat,
    bloodClothMat,
    pantsMat,
    bootMat,
    hairMat,
    deadEyeMat,
    socketDarkMat,
    toothMat,
    woundMat,
    boneMat
  );

  // 1. Continuous Skinned Undead Body (includes exposed necrotic left forearm & neck)
  const bodyGeos = buildSkinnedBodyGeometries(rig, 'zombie');
  geometries.push(bodyGeos.torsoAndArmsCloth, bodyGeos.legsCloth, bodyGeos.exposedSkinBody);

  const makeSkinned = (geo: THREE.BufferGeometry, mat: THREE.MeshStandardMaterial): THREE.SkinnedMesh => {
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.castShadow = true;
    sm.receiveShadow = true;
    sm.bind(rig.skeleton);
    sm.frustumCulled = false;
    skinnedMeshes.push(sm);
    root.add(sm);
    return sm;
  };

  makeSkinned(bodyGeos.torsoAndArmsCloth, tornClothMat);
  makeSkinned(bodyGeos.legsCloth, pantsMat);
  makeSkinned(bodyGeos.exposedSkinBody, zombieSkinMat);

  // 2. Sculpted Gaunt Head + Deep Dark Sockets + Dead Cataract Eyes + Animated Hinged Jaw + Teeth
  const headGeo = buildBenchmarkHeadGeometry('zombie');
  const hairGeo = buildBenchmarkHairGeometry('zombie');
  const { upperTeeth: upperTeethGeo, lowerJawSkin: lowerJawGeo, lowerTeeth: lowerTeethGeo, woundCavity: woundCavityGeo, ribs: ribsGeo } =
    buildBenchmarkZombieHorrorDetails();
  const socketGeo = new THREE.SphereGeometry(0.022, 12, 10);
  socketGeo.scale(1.1, 0.85, 0.55);
  const eyeGeo = new THREE.SphereGeometry(0.0095, 10, 8);
  eyeGeo.scale(1.0, 0.86, 0.65);
  const mouthVoidGeo = new THREE.SphereGeometry(0.022, 10, 8);
  mouthVoidGeo.scale(1.15, 0.65, 0.42);
  geometries.push(
    headGeo,
    hairGeo,
    upperTeethGeo,
    lowerJawGeo,
    lowerTeethGeo,
    woundCavityGeo,
    ribsGeo,
    socketGeo,
    eyeGeo,
    mouthVoidGeo
  );

  const headMesh = new THREE.Mesh(headGeo, zombieSkinMat);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  attachToBone(rig, 'head', headMesh);

  const hairMesh = new THREE.Mesh(hairGeo, hairMat);
  hairMesh.castShadow = true;
  attachToBone(rig, 'head', hairMesh);

  for (const sx of [-1, 1]) {
    const socket = new THREE.Mesh(socketGeo, socketDarkMat);
    socket.position.set(sx * 0.032, 0.062, -0.063);
    attachToBone(rig, 'head', socket);

    // Dead non-glowing cataract eyeball visibly recessed inside orbital socket
    const eye = new THREE.Mesh(eyeGeo, deadEyeMat);
    eye.position.set(sx * 0.032, 0.061, -0.0725);
    attachToBone(rig, 'head', eye);
  }

  const mouthVoid = new THREE.Mesh(mouthVoidGeo, socketDarkMat);
  mouthVoid.position.set(0.002, 0.006, -0.066);
  attachToBone(rig, 'head', mouthVoid);

  const upperTeethMesh = new THREE.Mesh(upperTeethGeo, toothMat);
  attachToBone(rig, 'head', upperTeethMesh);

  const lowerJawMesh = new THREE.Mesh(lowerJawGeo, zombieSkinMat);
  lowerJawMesh.castShadow = true;
  attachToBone(rig, 'jaw', lowerJawMesh);

  const lowerTeethMesh = new THREE.Mesh(lowerTeethGeo, toothMat);
  attachToBone(rig, 'jaw', lowerTeethMesh);

  // 3. Torn Blood-Stained Outer Jacket + Exposed Chest Laceration + Pale Ribs
  const jacketGeo = buildBenchmarkOuterJacket(true);
  geometries.push(jacketGeo);
  const jacketMesh = new THREE.Mesh(jacketGeo, bloodClothMat);
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  attachToBone(rig, 'spineUpper', jacketMesh);

  const woundMesh = new THREE.Mesh(woundCavityGeo, woundMat);
  woundMesh.castShadow = true;
  attachToBone(rig, 'spineUpper', woundMesh);

  const ribsMesh = new THREE.Mesh(ribsGeo, boneMat);
  ribsMesh.castShadow = true;
  attachToBone(rig, 'spineUpper', ribsMesh);

  // 4. Clawed Necrotic 5-Finger Hands
  const handLGeo = buildBenchmarkHandGeometry(-1, true);
  const handRGeo = buildBenchmarkHandGeometry(1, true);
  geometries.push(handLGeo, handRGeo);

  const handLMesh = new THREE.Mesh(handLGeo, zombieSkinMat);
  handLMesh.castShadow = true;
  attachToBone(rig, 'handL', handLMesh);

  const handRMesh = new THREE.Mesh(handRGeo, zombieSkinMat);
  handRMesh.castShadow = true;
  attachToBone(rig, 'handR', handRMesh);

  // 5. Worn Muddy Boots
  const bootLGeo = buildBenchmarkBootGeometry(-1);
  const bootRGeo = buildBenchmarkBootGeometry(1);
  geometries.push(bootLGeo, bootRGeo);

  const bootLMesh = new THREE.Mesh(bootLGeo, bootMat);
  bootLMesh.castShadow = true;
  bootLMesh.receiveShadow = true;
  attachToBone(rig, 'shinL', bootLMesh);

  const bootRMesh = new THREE.Mesh(bootRGeo, bootMat);
  bootRMesh.castShadow = true;
  bootRMesh.receiveShadow = true;
  attachToBone(rig, 'shinR', bootRMesh);

  // Asymmetric predatory forward-hunched undead stance (-X spine bends forward toward -Z; +X arms reach toward -Z)
  const b = rig.boneMap;
  rig.bones[b.pelvis].position.y = 0.89;
  rig.bones[b.pelvis].rotation.set(-0.08, 0.06, -0.04);
  rig.bones[b.spineLower].rotation.set(-0.14, -0.05, 0.06);
  rig.bones[b.spineUpper].rotation.set(-0.20, 0.08, -0.07);
  rig.bones[b.neck].rotation.set(-0.10, -0.05, 0.10);
  rig.bones[b.head].rotation.set(0.28, -0.08, 0.16);
  rig.bones[b.thighL].rotation.set(0.20, 0, -0.03);
  rig.bones[b.shinL].rotation.set(-0.26, 0, 0);
  rig.bones[b.thighR].rotation.set(-0.14, 0, 0.04);
  rig.bones[b.shinR].rotation.set(-0.16, 0, 0);
  rig.bones[b.upperArmL].rotation.set(0.58, 0.08, -0.10);
  rig.bones[b.forearmL].rotation.set(0.45, 0, 0);
  rig.bones[b.upperArmR].rotation.set(0.36, -0.06, 0.12);
  rig.bones[b.forearmR].rotation.set(0.58, 0, 0);
  rig.bones[b.jaw].rotation.set(-0.14, 0.03, 0.06);

  const animate = (elapsed: number) => {
    const lurch = Math.sin(elapsed * 1.15);
    const twitch = Math.sin(elapsed * 4.8) * Math.max(0, Math.sin(elapsed * 0.72));
    rig.bones[b.spineUpper].rotation.x = -0.20 - lurch * 0.035;
    rig.bones[b.spineLower].rotation.z = 0.06 + Math.cos(elapsed * 0.9) * 0.025;
    rig.bones[b.head].rotation.z = 0.16 + twitch * 0.08;
    rig.bones[b.head].rotation.y = -0.08 + Math.sin(elapsed * 0.55) * 0.10;
    rig.bones[b.jaw].rotation.x = -0.14 - Math.abs(lurch) * 0.09 - Math.abs(twitch) * 0.08;
    rig.bones[b.jaw].rotation.z = 0.06 + twitch * 0.04;
    rig.bones[b.upperArmL].rotation.x = 0.58 + lurch * 0.08;
    rig.bones[b.upperArmR].rotation.x = 0.36 - lurch * 0.06;
    rig.skeleton.update();
  };

  return {
    root,
    rig,
    skinnedMeshes,
    materials,
    geometries,
    animate,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}

export interface MaterialCalibrationStage {
  group: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  dispose: () => void;
}

/**
 * TEST 4 — Calibrated PBR Material Showcase (Skin, Dirty Cloth, Leather, Metal, Blood-Stained).
 */
export function buildBenchmarkMaterialPlinth(tex: BenchmarkTextureBundle): MaterialCalibrationStage {
  const group = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];

  const plinthGeo = new THREE.CylinderGeometry(0.17, 0.20, 0.36, 20);
  const sphereGeo = new THREE.SphereGeometry(0.145, 32, 24);
  geometries.push(plinthGeo, sphereGeo);

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e24,
    roughness: 0.88,
    metalness: 0.12,
  });
  materials.push(plinthMat);

  const specs: {
    label: string;
    maps: BenchmarkMaterialMaps;
    color: number;
    roughness: number;
    metalness: number;
    normalScale: number;
    sheen?: number;
    clearcoat?: number;
  }[] = [
    { label: 'Skin', maps: tex.humanSkin, color: 0xf4e8df, roughness: 0.76, metalness: 0.02, normalScale: 0.75, sheen: 0.25, clearcoat: 0.06 },
    { label: 'Dirty Cloth', maps: tex.dirtyCloth, color: 0xbec4ba, roughness: 0.98, metalness: 0.02, normalScale: 1.15, sheen: 0.45 },
    { label: 'Leather', maps: tex.leather, color: 0xc8ae9a, roughness: 0.72, metalness: 0.06, normalScale: 1.25, clearcoat: 0.08 },
    { label: 'Metal', maps: tex.metal, color: 0xc2c8d0, roughness: 0.42, metalness: 0.94, normalScale: 1.15 },
    { label: 'Blood-Stained', maps: tex.bloodStained, color: 0xe6dcd4, roughness: 0.74, metalness: 0.05, normalScale: 1.25, clearcoat: 0.72 },
  ];

  const spacing = 0.42;
  const startX = ((specs.length - 1) * spacing) * 0.5;

  specs.forEach((spec, idx) => {
    // +X is Left when viewed from -Z camera looking toward +Z
    const x = startX - idx * spacing;
    const plinth = new THREE.Mesh(plinthGeo, plinthMat);
    plinth.position.set(x, 0.18, 0);
    plinth.castShadow = true;
    plinth.receiveShadow = true;

    const mat = makePbrMat(spec.maps, {
      color: spec.color,
      roughness: spec.roughness,
      metalness: spec.metalness,
      normalScale: spec.normalScale,
      vertexColors: false,
      sheen: spec.sheen,
      clearcoat: spec.clearcoat,
    });
    materials.push(mat);

    const orb = new THREE.Mesh(sphereGeo, mat);
    orb.name = spec.label;
    orb.position.set(x, 0.53, 0);
    orb.castShadow = true;
    orb.receiveShadow = true;

    group.add(plinth, orb);
  });

  return {
    group,
    materials,
    dispose: () => {
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
    },
  };
}
