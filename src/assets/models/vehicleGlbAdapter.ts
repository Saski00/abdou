import * as THREE from 'three';

export type VehicleKind = 'sedan' | 'taxi' | 'pickup' | 'van';

export type VehiclePackModelId =
  | 'compact'
  | 'coupe'
  | 'hatchback'
  | 'minivan'
  | 'offroad'
  | 'pickup'
  | 'sedan'
  | 'sport'
  | 'suv'
  | 'wagon';

export interface VehiclePackTemplateStats {
  modelId: VehiclePackModelId;
  bodyNodeName: string;
  wheelCount: number;
  triangleCount: number;
  widthM: number;
  heightM: number;
  lengthM: number;
}

export interface VehiclePackCache {
  templates: Map<VehiclePackModelId, THREE.Group>;
  stats: Map<VehiclePackModelId, VehiclePackTemplateStats>;
  contactShadowGeo: THREE.PlaneGeometry;
  contactShadowMat: THREE.MeshBasicMaterial;
}

export const VEHICLE_PACK_GLB_URL = '/src/assets/models/passenger_car_pack.glb';

const BODY_NAME_TO_ID: Record<string, VehiclePackModelId> = {
  'compact body': 'compact',
  'coupe body': 'coupe',
  'hatchback body': 'hatchback',
  'minivan body': 'minivan',
  'offroad body': 'offroad',
  'pickup body': 'pickup',
  'sedan body': 'sedan',
  'sport body': 'sport',
  'suv body': 'suv',
  'wagon body': 'wagon',
};

const VEHICLE_ID_TO_MODEL: Record<string, VehiclePackModelId> = {
  v_taxi: 'hatchback',
  v_sedan1: 'wagon',
  v_pickup1: 'pickup',
  v_van1: 'minivan',
  v_garage1: 'sport',
  v_north1: 'offroad',
  v_south1: 'sedan',
  v_evac_van: 'suv',
  v_police_car: 'coupe',
  v_clinic_amb: 'minivan',
  v_mil_truck: 'pickup',
};

// Target physical bounds matching WorldBuilder collider footprints (meters)
const TARGET_BOUNDS_BY_ID: Record<VehiclePackModelId, { maxWidth: number; maxLength: number }> = {
  compact: { maxWidth: 1.82, maxLength: 3.85 },
  coupe: { maxWidth: 1.84, maxLength: 4.12 },
  hatchback: { maxWidth: 1.82, maxLength: 4.08 },
  sedan: { maxWidth: 1.85, maxLength: 4.16 },
  sport: { maxWidth: 1.84, maxLength: 4.10 },
  wagon: { maxWidth: 1.85, maxLength: 4.16 },
  pickup: { maxWidth: 1.86, maxLength: 4.44 },
  offroad: { maxWidth: 1.88, maxLength: 4.22 },
  minivan: { maxWidth: 1.94, maxLength: 4.62 },
  suv: { maxWidth: 1.98, maxLength: 4.56 },
};

export function selectVehiclePackModel(
  vehicleId: string,
  kind: VehicleKind
): VehiclePackModelId {
  const mapped = VEHICLE_ID_TO_MODEL[vehicleId];
  if (mapped) return mapped;
  switch (kind) {
    case 'taxi':
      return 'hatchback';
    case 'pickup':
      return 'pickup';
    case 'van':
      return 'minivan';
    case 'sedan':
    default:
      return 'sedan';
  }
}

function collectUsedResources(
  rootList: THREE.Object3D[],
  geos: Set<THREE.BufferGeometry>,
  mats: Set<THREE.Material>,
  textures: Set<THREE.Texture>
): void {
  for (const root of rootList) {
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      if (mesh.geometry) geos.add(mesh.geometry);
      const meshMats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of meshMats) {
        if (!mat) continue;
        mats.add(mat);
        const std = mat as THREE.MeshStandardMaterial;
        const texList = [std.map, std.roughnessMap, std.metalnessMap, std.normalMap, std.emissiveMap];
        for (const tex of texList) {
          if (tex) textures.add(tex);
        }
      }
    });
  }
}

function disposeUnusedSubtreeResources(
  obj: THREE.Object3D,
  protectedGeos: Set<THREE.BufferGeometry>,
  protectedMats: Set<THREE.Material>,
  protectedTextures: Set<THREE.Texture>
): void {
  const disposedMats = new Set<THREE.Material>();
  const disposedTextures = new Set<THREE.Texture>();
  obj.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (mesh.geometry && !protectedGeos.has(mesh.geometry)) {
      mesh.geometry.dispose();
    }
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const mat of mats) {
      if (!mat || protectedMats.has(mat) || disposedMats.has(mat)) continue;
      disposedMats.add(mat);
      const std = mat as THREE.MeshStandardMaterial;
      const texList = [std.map, std.roughnessMap, std.metalnessMap, std.normalMap, std.emissiveMap];
      for (const tex of texList) {
        if (tex && !protectedTextures.has(tex) && !disposedTextures.has(tex)) {
          disposedTextures.add(tex);
          tex.dispose();
        }
      }
      mat.dispose();
    }
  });
}

function createContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 8, 32, 32, 31);
    grad.addColorStop(0, 'rgba(4, 6, 10, 0.72)');
    grad.addColorStop(0.55, 'rgba(4, 6, 10, 0.42)');
    grad.addColorStop(1, 'rgba(4, 6, 10, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function optimizeVehicleMaterial(
  mat: THREE.Material,
  tunedCache: Map<THREE.Material, THREE.Material>
): THREE.Material {
  const existing = tunedCache.get(mat);
  if (existing) return existing;

  const std = mat as THREE.MeshStandardMaterial;
  if (!std.isMeshStandardMaterial) {
    tunedCache.set(mat, mat);
    return mat;
  }

  const nameLower = (std.name || '').toLowerCase();
  const cloned = std.clone();

  if (nameLower.startsWith('glass')) {
    cloned.color.setRGB(0.05, 0.07, 0.09);
    cloned.roughness = 0.08;
    cloned.metalness = 0.14;
    cloned.envMapIntensity = 1.05;
    cloned.transparent = true;
    cloned.opacity = Math.max(cloned.opacity, 0.8);
    cloned.depthWrite = true;
    cloned.side = THREE.DoubleSide;
  } else if (nameLower.startsWith('optics')) {
    cloned.roughness = 0.22;
    cloned.metalness = 0.12;
    cloned.envMapIntensity = 0.88;
  } else {
    // Body_* and Wheel_* PBR maps: subtle post-apocalyptic dust tint so cars blend into twilight lighting
    cloned.color.setHex(0xdedad2);
    cloned.envMapIntensity = 0.7;
    if (cloned.map) {
      cloned.map.anisotropy = 4;
      cloned.map.minFilter = THREE.LinearMipmapLinearFilter;
      cloned.map.needsUpdate = true;
    }
    if (cloned.roughnessMap) {
      cloned.roughnessMap.anisotropy = 2;
      cloned.roughnessMap.needsUpdate = true;
    }
  }

  tunedCache.set(mat, cloned);
  return cloned;
}

function resolveBodyModelId(rawName: string): VehiclePackModelId | undefined {
  // GLTFLoader sanitizes spaces to underscores (e.g. "Compact Body" -> "Compact_Body")
  const normalized = rawName.trim().toLowerCase().replace(/[\s_]+/g, ' ');
  return BODY_NAME_TO_ID[normalized];
}

function computeTightWorldBox(root: THREE.Object3D): THREE.Box3 {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  const vert = new THREE.Vector3();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return;
    const pos = mesh.geometry.attributes.position;
    if (!pos) return;
    const mat = mesh.matrixWorld;
    for (let i = 0; i < pos.count; i++) {
      vert.fromBufferAttribute(pos, i).applyMatrix4(mat);
      box.expandByPoint(vert);
    }
  });
  return box;
}

/**
 * Extracts and normalizes every vehicle assembly (body + 4 paired wheels) from
 * the combined `passenger_car_pack.glb` scene into grounded, collider-fitted templates
 * oriented with +Z forward and +Y up.
 */
export function buildVehiclePackCache(
  packScene: THREE.Group,
  usedModelIds?: Set<VehiclePackModelId>
): VehiclePackCache {
  packScene.updateMatrixWorld(true);

  const bodyNodes: { id: VehiclePackModelId; node: THREE.Object3D; worldPos: THREE.Vector3 }[] = [];
  const wheelNodes: { node: THREE.Object3D; worldPos: THREE.Vector3 }[] = [];
  const unusedNodes: THREE.Object3D[] = [];

  packScene.traverse((obj) => {
    const name = obj.name || '';
    const lower = name.trim().toLowerCase();
    const mappedId = resolveBodyModelId(name);
    if (mappedId) {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      bodyNodes.push({ id: mappedId, node: obj, worldPos });
    } else if (/^wheel_/i.test(lower) && obj.children.length > 0) {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      wheelNodes.push({ node: obj, worldPos });
    } else if (/^cylinder/i.test(lower) && obj.children.length > 0) {
      unusedNodes.push(obj);
    }
  });

  const assignedWheels = new Set<THREE.Object3D>();
  const templates = new Map<VehiclePackModelId, THREE.Group>();
  const stats = new Map<VehiclePackModelId, VehiclePackTemplateStats>();
  const tunedMaterials = new Map<THREE.Material, THREE.Material>();

  const shadowTex = createContactShadowTexture();
  const contactShadowGeo = new THREE.PlaneGeometry(1, 1);
  contactShadowGeo.rotateX(-Math.PI * 0.5);
  const contactShadowMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: shadowTex,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });

  const keptSourceNodes: THREE.Object3D[] = [];
  const unusedVehicleNodes: THREE.Object3D[] = [];

  for (const bodyEntry of bodyNodes) {
    // Pair the 4 nearest unassigned Wheel_* nodes belonging to this vehicle
    const pairedWheels = wheelNodes
      .filter((w) => !assignedWheels.has(w.node))
      .map((w) => ({ ...w, dist: w.worldPos.distanceTo(bodyEntry.worldPos) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 4);

    for (const w of pairedWheels) {
      assignedWheels.add(w.node);
    }

    if (usedModelIds && !usedModelIds.has(bodyEntry.id)) {
      unusedVehicleNodes.push(bodyEntry.node, ...pairedWheels.map((w) => w.node));
      continue;
    }

    keptSourceNodes.push(bodyEntry.node, ...pairedWheels.map((w) => w.node));

    // GLTF scene root (`Sketchfab_model`) already converts +Z-up mm into Three.js +Y-up meters.
    // Extract body + wheels in world-space orientation, then rotate around world Y so local -Y
    // (vehicle nose) points toward +Z forward.
    const refQuat = new THREE.Quaternion();
    if (pairedWheels.length > 0) {
      pairedWheels[0].node.getWorldQuaternion(refQuat);
    } else {
      bodyEntry.node.getWorldQuaternion(refQuat);
    }
    const forwardVec = new THREE.Vector3(0, -1, 0).applyQuaternion(refQuat);
    const turntableYaw = Math.atan2(forwardVec.x, forwardVec.z);

    const pivot = new THREE.Group();
    pivot.rotation.y = -turntableYaw;

    const toOriginMat = new THREE.Matrix4().makeTranslation(
      -bodyEntry.worldPos.x,
      -bodyEntry.worldPos.y,
      -bodyEntry.worldPos.z
    );

    const attachInWorldFrame = (sourceObj: THREE.Object3D): void => {
      const relMat = toOriginMat.clone().multiply(sourceObj.matrixWorld);
      const clone = sourceObj.clone(true);
      clone.matrixAutoUpdate = true;
      relMat.decompose(clone.position, clone.quaternion, clone.scale);
      pivot.add(clone);
    };

    attachInWorldFrame(bodyEntry.node);
    for (const w of pairedWheels) {
      attachInWorldFrame(w.node);
    }

    // Compute exact vertex-level bounds (avoids inflated AABBs on baked-rotation meshes like Coupe)
    const wrapper = new THREE.Group();
    wrapper.name = `vehicle_pack_${bodyEntry.id}`;
    wrapper.add(pivot);

    const rawBox = computeTightWorldBox(wrapper);
    const rawSize = new THREE.Vector3();
    rawBox.getSize(rawSize);

    const bounds = TARGET_BOUNDS_BY_ID[bodyEntry.id];
    const fitRatio = Math.min(
      bounds.maxWidth / Math.max(0.1, rawSize.x),
      bounds.maxLength / Math.max(0.1, rawSize.z)
    );
    wrapper.scale.setScalar(fitRatio);

    // Ground wheels flush at y = 0 and center XZ at (0, 0)
    const fittedBox = computeTightWorldBox(wrapper);
    const fittedCenter = new THREE.Vector3();
    const fittedSize = new THREE.Vector3();
    fittedBox.getCenter(fittedCenter);
    fittedBox.getSize(fittedSize);

    pivot.position.set(
      -fittedCenter.x / wrapper.scale.x,
      -fittedBox.min.y / wrapper.scale.y,
      -fittedCenter.z / wrapper.scale.z
    );
    wrapper.updateMatrixWorld(true);

    // Tune materials & shadows cleanly for survival horror atmosphere and mobile GPUs
    let triangleCount = 0;
    wrapper.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geo = mesh.geometry;
      if (geo) {
        triangleCount += geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;
      }
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => optimizeVehicleMaterial(m, tunedMaterials));
      } else if (mesh.material) {
        mesh.material = optimizeVehicleMaterial(mesh.material, tunedMaterials);
      }
      const primaryMatName = Array.isArray(mesh.material)
        ? (mesh.material[0]?.name ?? '').toLowerCase()
        : (mesh.material?.name ?? '').toLowerCase();
      const isGlassOrOptics =
        primaryMatName.startsWith('glass') || primaryMatName.startsWith('optics');
      mesh.castShadow = !isGlassOrOptics;
      mesh.receiveShadow = !isGlassOrOptics;
    });

    // Lightweight underbody contact shadow disc for Android/low-end modes with shadows off
    const shadowMesh = new THREE.Mesh(contactShadowGeo, contactShadowMat);
    shadowMesh.name = 'vehicle_contact_shadow';
    shadowMesh.position.set(0, 0.015, 0);
    shadowMesh.scale.set(fittedSize.x * 1.12, 1, fittedSize.z * 1.06);
    shadowMesh.castShadow = false;
    shadowMesh.receiveShadow = false;
    wrapper.add(shadowMesh);

    templates.set(bodyEntry.id, wrapper);
    stats.set(bodyEntry.id, {
      modelId: bodyEntry.id,
      bodyNodeName: bodyEntry.node.name,
      wheelCount: pairedWheels.length,
      triangleCount: Math.round(triangleCount),
      widthM: Number(fittedSize.x.toFixed(2)),
      heightM: Number(fittedSize.y.toFixed(2)),
      lengthM: Number(fittedSize.z.toFixed(2)),
    });
  }

  // Safely dispose unused turntable disc (`Cylinder001`) and unused vehicle templates
  // while preserving any geometries/textures shared with active templates.
  if (unusedNodes.length > 0 || unusedVehicleNodes.length > 0) {
    const protectedGeos = new Set<THREE.BufferGeometry>();
    const protectedMats = new Set<THREE.Material>();
    const protectedTextures = new Set<THREE.Texture>();
    collectUsedResources(keptSourceNodes, protectedGeos, protectedMats, protectedTextures);
    for (const unused of unusedNodes) {
      disposeUnusedSubtreeResources(unused, protectedGeos, protectedMats, protectedTextures);
    }
    for (const unusedVeh of unusedVehicleNodes) {
      disposeUnusedSubtreeResources(unusedVeh, protectedGeos, protectedMats, protectedTextures);
    }
  }

  return {
    templates,
    stats,
    contactShadowGeo,
    contactShadowMat,
  };
}

export function instantiatePackVehicle(
  cache: VehiclePackCache,
  modelId: VehiclePackModelId
): THREE.Group | null {
  const tpl = cache.templates.get(modelId);
  if (!tpl) return null;
  // Clone shares geometries, materials, and GPU textures across instances of the same model
  return tpl.clone(true);
}

export function disposeVehiclePackCache(cache: VehiclePackCache): void {
  cache.contactShadowGeo.dispose();
  cache.contactShadowMat.map?.dispose();
  cache.contactShadowMat.dispose();
  const disposedMats = new Set<THREE.Material>();
  for (const tpl of cache.templates.values()) {
    tpl.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        if (mat && !disposedMats.has(mat)) {
          disposedMats.add(mat);
          mat.dispose();
        }
      }
    });
  }
  cache.templates.clear();
  cache.stats.clear();
}
