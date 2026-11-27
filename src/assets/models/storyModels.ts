import * as THREE from 'three';
import { MaterialPalette } from './proceduralModels';
import {
  applyTriplanarUVs,
  createBeveledBoxGeometry,
  createTubePathGeometry,
} from './proceduralGeometryKit';

export function buildStoryObjectModel(
  category: 'radio' | 'document' | 'relay' | 'cache',
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const indicatorMat = new THREE.MeshStandardMaterial({
    color: category === 'relay' ? 0x3b6e85 : category === 'radio' ? 0x3d6652 : 0x7a5c28,
    emissive: category === 'relay' ? 0x1a3b4a : category === 'radio' ? 0x1c382b : 0x453110,
    emissiveIntensity: 0.25,
    roughness: 0.45,
  });

  if (category === 'radio') {
    const casing = new THREE.Mesh(
      createBeveledBoxGeometry(0.46, 0.24, 0.3, 0.025, 0.03),
      mats.darkTrim
    );
    casing.position.y = 0.12;
    casing.castShadow = true;

    const faceplate = new THREE.Mesh(
      createBeveledBoxGeometry(0.4, 0.18, 0.03, 0.008, 0.015),
      mats.lampMetal
    );
    faceplate.position.set(0, 0.12, 0.145);

    const dial = new THREE.Mesh(
      createBeveledBoxGeometry(0.16, 0.06, 0.02, 0.005, 0.01),
      indicatorMat
    );
    dial.position.set(-0.08, 0.14, 0.16);

    const knobGeo = new THREE.CylinderGeometry(0.024, 0.026, 0.03, 8);
    knobGeo.rotateX(Math.PI * 0.5);
    const k1 = new THREE.Mesh(knobGeo, mats.darkTrim);
    k1.position.set(0.09, 0.14, 0.165);
    const k2 = new THREE.Mesh(knobGeo, mats.darkTrim);
    k2.position.set(0.15, 0.09, 0.165);

    const handlePts = [
      new THREE.Vector3(-0.16, 0.24, 0),
      new THREE.Vector3(-0.16, 0.31, 0),
      new THREE.Vector3(0.16, 0.31, 0),
      new THREE.Vector3(0.16, 0.24, 0),
    ];
    const carry = new THREE.Mesh(createTubePathGeometry(handlePts, 0.014, 8, 5), mats.lampMetal);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.016, 0.5, 8),
      mats.lampMetal
    );
    antenna.position.set(0.18, 0.45, -0.06);

    group.add(casing, faceplate, dial, k1, k2, carry, antenna);
    return group;
  }

  if (category === 'document') {
    const folder = new THREE.Mesh(
      createBeveledBoxGeometry(0.32, 0.03, 0.4, 0.008, 0.02),
      mats.wood
    );
    folder.position.y = 0.015;
    folder.castShadow = true;

    const page = new THREE.Mesh(
      createBeveledBoxGeometry(0.26, 0.015, 0.33, 0.004, 0.005),
      mats.concrete
    );
    page.position.set(0, 0.032, 0.01);
    page.rotation.y = 0.06;

    const clip = new THREE.Mesh(
      createBeveledBoxGeometry(0.11, 0.022, 0.045, 0.005, 0.01),
      indicatorMat
    );
    clip.position.set(0, 0.044, -0.15);

    group.add(folder, page, clip);
    return group;
  }

  if (category === 'cache') {
    const chest = new THREE.Mesh(
      createBeveledBoxGeometry(0.86, 0.46, 0.56, 0.03, 0.04),
      mats.darkTrim
    );
    chest.position.y = 0.23;
    chest.castShadow = true;
    chest.receiveShadow = true;

    const lid = new THREE.Mesh(
      createBeveledBoxGeometry(0.9, 0.1, 0.6, 0.03, 0.04),
      mats.rustedMetal
    );
    lid.position.y = 0.49;
    lid.castShadow = true;

    const latch = new THREE.Mesh(
      createBeveledBoxGeometry(0.16, 0.08, 0.05, 0.01, 0.01),
      indicatorMat
    );
    latch.position.set(0, 0.44, 0.295);

    group.add(chest, lid, latch);
    return group;
  }

  // 'relay' — freestanding emergency repeater unit with beveled plinth & Lathe parabolic dish
  const plinth = new THREE.Mesh(
    createBeveledBoxGeometry(0.8, 0.22, 0.66, 0.03, 0.04),
    mats.concrete
  );
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const cabinet = new THREE.Mesh(
    createBeveledBoxGeometry(0.64, 1.08, 0.48, 0.03, 0.04),
    mats.lampMetal
  );
  cabinet.position.y = 0.76;
  cabinet.castShadow = true;

  const screen = new THREE.Mesh(
    createBeveledBoxGeometry(0.36, 0.22, 0.04, 0.008, 0.015),
    indicatorMat
  );
  screen.position.set(0, 1.02, 0.23);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 1.15, 8),
    mats.darkTrim
  );
  mast.position.set(0.18, 1.82, -0.08);
  mast.castShadow = true;

  const dishPts = [
    new THREE.Vector2(0.0, 0),
    new THREE.Vector2(0.14, 0.03),
    new THREE.Vector2(0.28, 0.12),
    new THREE.Vector2(0.32, 0.17),
    new THREE.Vector2(0.29, 0.18),
    new THREE.Vector2(0.12, 0.06),
    new THREE.Vector2(0.0, 0.03),
  ];
  const dishGeo = new THREE.LatheGeometry(dishPts, 14);
  applyTriplanarUVs(dishGeo, 1.0);
  const dish = new THREE.Mesh(dishGeo, mats.concrete);
  dish.position.set(0.18, 2.35, -0.02);
  dish.rotation.x = Math.PI * 0.35;

  const feedhorn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.015, 0.24, 6),
    indicatorMat
  );
  feedhorn.position.set(0.18, 2.42, 0.12);
  feedhorn.rotation.x = Math.PI * 0.35;

  group.add(plinth, cabinet, screen, mast, dish, feedhorn);
  return group;
}
