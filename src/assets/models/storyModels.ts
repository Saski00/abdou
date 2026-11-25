import * as THREE from 'three';
import { MaterialPalette } from './proceduralModels';

export function buildStoryObjectModel(
  category: 'radio' | 'document' | 'relay' | 'cache',
  mats: MaterialPalette
): THREE.Group {
  const group = new THREE.Group();

  const indicatorMat = new THREE.MeshStandardMaterial({
    color: category === 'relay' ? 0x38bdf8 : category === 'radio' ? 0x34d399 : 0xfbbf24,
    emissive: category === 'relay' ? 0x0284c7 : category === 'radio' ? 0x059669 : 0xd97706,
    emissiveIntensity: 0.9,
    roughness: 0.3,
  });

  if (category === 'radio') {
    const casing = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.24, 0.30),
      mats.darkTrim
    );
    casing.position.y = 0.12;
    casing.castShadow = true;

    const faceplate = new THREE.Mesh(
      new THREE.BoxGeometry(0.40, 0.18, 0.03),
      mats.lampMetal
    );
    faceplate.position.set(0, 0.12, 0.145);

    const dial = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06, 0.02),
      indicatorMat
    );
    dial.position.set(-0.08, 0.14, 0.16);

    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.01, 0.015, 0.48, 8),
      mats.lampMetal
    );
    antenna.position.set(0.17, 0.45, -0.06);

    group.add(casing, faceplate, dial, antenna);
    return group;
  }

  if (category === 'document') {
    const folder = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.03, 0.40),
      mats.wood
    );
    folder.position.y = 0.015;
    folder.castShadow = true;

    const page = new THREE.Mesh(
      new THREE.BoxGeometry(0.26, 0.015, 0.33),
      mats.concrete
    );
    page.position.set(0, 0.032, 0.01);
    page.rotation.y = 0.06;

    const clip = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.02, 0.045),
      indicatorMat
    );
    clip.position.set(0, 0.044, -0.15);

    group.add(folder, page, clip);
    return group;
  }

  if (category === 'cache') {
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.86, 0.46, 0.56),
      mats.darkTrim
    );
    chest.position.y = 0.23;
    chest.castShadow = true;
    chest.receiveShadow = true;

    const lid = new THREE.Mesh(
      new THREE.BoxGeometry(0.90, 0.09, 0.60),
      mats.rustedMetal
    );
    lid.position.y = 0.49;
    lid.castShadow = true;

    const latch = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.08, 0.05),
      indicatorMat
    );
    latch.position.set(0, 0.44, 0.295);

    group.add(chest, lid, latch);
    return group;
  }

  // 'relay' — freestanding tall civil emergency repeater unit
  const plinth = new THREE.Mesh(
    new THREE.BoxGeometry(0.76, 0.22, 0.62),
    mats.concrete
  );
  plinth.position.y = 0.11;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  const cabinet = new THREE.Mesh(
    new THREE.BoxGeometry(0.62, 1.08, 0.46),
    mats.lampMetal
  );
  cabinet.position.y = 0.76;
  cabinet.castShadow = true;

  const screen = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.22, 0.04),
    indicatorMat
  );
  screen.position.set(0, 1.02, 0.23);

  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.05, 1.15, 8),
    mats.darkTrim
  );
  mast.position.set(0.18, 1.82, -0.08);
  mast.castShadow = true;

  const dish = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.08, 0.14, 12),
    mats.concrete
  );
  dish.position.set(0.18, 2.35, -0.02);
  dish.rotation.x = Math.PI * 0.35;

  group.add(plinth, cabinet, screen, mast, dish);
  return group;
}
