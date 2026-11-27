import * as THREE from 'three';
import { ENTERABLE_BUILDINGS } from '../assets/maps/buildingLayouts';
import {
  NeighborhoodMapData,
  SIDEWALK_HEIGHT,
} from '../assets/maps/neighborhoodMap';
import {
  INTERIOR_FLOOR_OFFSET,
  buildEnterableBuildingShell,
  buildFurnitureModel,
  buildInteriorDoorModel,
  buildSearchableContainerModel,
  createInteriorMaterialPalette,
} from '../assets/models/interiorBuildings';
import {
  MaterialPalette,
  buildBoulderClusterModel,
  buildChainlinkFenceSegment,
  buildConcreteBarrierModel,
  buildCrateModel,
  buildDumpsterModel,
  buildGroundDecalModel,
  buildHazardConeClusterModel,
  buildHydrantModel,
  buildLastShopModel,
  buildQuarantineSignModel,
  buildRubblePileModel,
  buildSandbagBarricadeModel,
  buildShoppingCartModel,
  buildShrubModel,
  buildStreetLampModel,
  buildStreetSignpostModel,
  buildSurvivorCampModel,
  buildTrashClusterModel,
  buildUrbanBuildingModel,
  buildWoodFenceSegment,
} from '../assets/models/proceduralModels';
import {
  VEHICLE_PACK_GLB_URL,
  VehiclePackModelId,
  buildVehiclePackCache,
  disposeVehiclePackCache,
  instantiatePackVehicle,
  selectVehiclePackModel,
} from '../assets/models/vehicleGlbAdapter';
import {
  TerrainFlatZone,
  createGrassTuftGeometry,
  createOrganicPatchGeometry,
  createProceduralTreeGeometries,
  createSculptedTerrainGeometry,
  createSidewalkSlabGeometry,
  createSkylineSilhouetteGeometry,
  sampleTerrainHeight,
} from '../assets/models/proceduralGeometryKit';
import {
  buildHingedGateModel,
  buildKeyPickupModel,
  buildResourceModel,
  buildSupplyContainerModel,
  buildWorktableModel,
  createResourceMaterialPalette,
} from '../assets/models/resourceModels';
import {
  ShopProgressionController,
  ShopProgressionStateInput,
  ShopShelfDisplayController,
  buildShopProgressionGroup,
  buildShopRegisterModel,
  buildShopShelfDisplayGroup,
  buildShopStorageChestModel,
} from '../assets/models/shopModels';
import { buildStoryObjectModel } from '../assets/models/storyModels';
import { ProceduralTextureSet } from '../assets/textures/proceduralTextures';
import { STORY_OBJECTS } from '../game/missionSystem';
import { InventoryState, ResourceId } from '../game/types';
import {
  PROP_EXAMINE_SPECS,
  PROP_SEARCH_SPECS,
  PROP_WORKBENCH_NAMES,
  VEHICLE_INTERACT_SPECS,
  getInteriorFurnitureInteractionSpec,
} from '../game/worldObjectCatalog';
import { AssetManager } from './AssetManager';

export interface BoxCollider {
  x: number;
  z: number;
  w: number;
  d: number;
  rotationY: number;
  active?: boolean;
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

export interface SegmentCollider {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  halfThickness: number;
  active?: boolean;
}

export interface FloorZone {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
  active?: boolean;
}

export interface SafeZoneBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  active?: boolean;
}

export interface WorldColliders {
  boxes: BoxCollider[];
  circles: CircleCollider[];
  segments: SegmentCollider[];
  sidewalks: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  floors: FloorZone[];
  roads: { minX: number; maxX: number; minZ: number; maxZ: number }[];
  safeZones?: SafeZoneBounds[];
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

export interface WorldResourceInteractable {
  kind: 'resource';
  id: string;
  resourceId: ResourceId;
  amount: number;
  defaultAmount: number;
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
  collected: boolean;
}

export interface WorldDoorInteractable {
  kind: 'door';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  openSwingAngle: number;
  group: THREE.Group;
  pivot: THREE.Object3D;
  collider: SegmentCollider;
  isOpen: boolean;
  lockedKeyId?: string;
  lockedHint?: string;
  unlocked: boolean;
}

export interface WorldKeyInteractable {
  kind: 'key';
  id: string;
  name: string;
  keyKind: 'key' | 'keycard';
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
  collected: boolean;
}

export interface WorldContainerInteractable {
  kind: 'container';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
  lidPivot: THREE.Object3D | null;
  animKind: 'lid' | 'door' | 'drawer';
  isOpen: boolean;
  inspected: boolean;
  lootTaken: boolean;
  requiresToolResource?: ResourceId;
  lockedToolHint?: string;
  unlocked: boolean;
  loot?: {
    resourceId: ResourceId;
    amount: number;
  };
  defaultLoot?: {
    resourceId: ResourceId;
    amount: number;
  };
}

export interface WorldShopStationInteractable {
  kind: 'shop_station';
  stationKind: 'counter' | 'storage';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
}

export interface WorldStoryObjectInteractable {
  kind: 'story_object';
  id: string;
  name: string;
  actionLabel: string;
  category: 'radio' | 'document' | 'relay' | 'cache';
  x: number;
  y: number;
  z: number;
  group: THREE.Group;
}

export interface WorldVehicleInteractable {
  kind: 'vehicle';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  interactRadiusOffset: number;
  initialNote: string;
  inspectedNote: string;
  searched: boolean;
  lootTaken: boolean;
  loot?: {
    resourceId: ResourceId;
    amount: number;
  };
  defaultLoot?: {
    resourceId: ResourceId;
    amount: number;
  };
}

export interface WorldSearchablePropInteractable {
  kind: 'searchable_prop';
  id: string;
  name: string;
  searchAction: string;
  emptyAction: string;
  x: number;
  y: number;
  z: number;
  interactRadiusOffset: number;
  initialNote: string;
  inspectedNote: string;
  searched: boolean;
  lootTaken: boolean;
  loot?: {
    resourceId: ResourceId;
    amount: number;
  };
  defaultLoot?: {
    resourceId: ResourceId;
    amount: number;
  };
}

export interface WorldWorkbenchInteractable {
  kind: 'workbench';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  interactRadiusOffset: number;
}

export interface WorldExamineInteractable {
  kind: 'examine';
  id: string;
  name: string;
  actionLabel: string;
  noteTitle: string;
  noteText: string;
  x: number;
  y: number;
  z: number;
  interactRadiusOffset: number;
  examined: boolean;
}

export interface WorldBedInteractable {
  kind: 'bed';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  interactRadiusOffset: number;
}

export type WorldInteractable =
  | WorldResourceInteractable
  | WorldDoorInteractable
  | WorldContainerInteractable
  | WorldShopStationInteractable
  | WorldStoryObjectInteractable
  | WorldKeyInteractable
  | WorldVehicleInteractable
  | WorldSearchablePropInteractable
  | WorldWorkbenchInteractable
  | WorldExamineInteractable
  | WorldBedInteractable;

export interface DynamicLightHandle {
  light: THREE.PointLight;
  baseIntensity: number;
  seed: number;
}

export interface BuiltWorld {
  root: THREE.Group;
  detailDecorGroup: THREE.Group;
  colliders: WorldColliders;
  interactables: WorldInteractable[];
  flickerLights: DynamicLightHandle[];
  streetLampLights: DynamicLightHandle[];
  porchLights: DynamicLightHandle[];
  interiorLights: (DynamicLightHandle & { isSafeBase: boolean })[];
  streetLampPoolMat: THREE.MeshBasicMaterial;
  windowLightShaftMat: THREE.MeshBasicMaterial;
  syncShopDisplayStock: (stock: InventoryState, shopLevel?: number) => void;
  syncShopProgression: (state: ShopProgressionStateInput) => void;
  dispose: () => void;
}

function createSoftLightPoolTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
  grad.addColorStop(0, 'rgba(251, 191, 36, 0.34)');
  grad.addColorStop(0.45, 'rgba(217, 119, 6, 0.14)');
  grad.addColorStop(1, 'rgba(217, 119, 6, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildNeighborhoodWorld(
  map: NeighborhoodMapData,
  textures: ProceduralTextureSet,
  mats: MaterialPalette,
  assets: AssetManager
): BuiltWorld {
  const root = new THREE.Group();
  const colliders: WorldColliders = {
    boxes: [],
    circles: [],
    segments: [],
    sidewalks: [],
    floors: [],
    roads: [],
    safeZones: [],
    bounds: map.bounds,
  };
  const flickerLights: DynamicLightHandle[] = [];
  const streetLampLights: DynamicLightHandle[] = [];
  const porchLights: DynamicLightHandle[] = [];
  const interiorLights: (DynamicLightHandle & { isSafeBase: boolean })[] = [];
  const interactables: WorldInteractable[] = [];
  const shelfDisplays: ShopShelfDisplayController[] = [];
  const shopProgressions: ShopProgressionController[] = [];
  let activeShopLevel = 1;
  const resMats = createResourceMaterialPalette();
  const intMats = createInteriorMaterialPalette(textures);
  const localDisposables: { dispose: () => void }[] = [resMats, intMats];

  const detailDecorGroup = new THREE.Group();
  root.add(detailDecorGroup);

  // 1. Sculpted wasteland ground plane (flush inside street grid, organic hills on outer perimeter)
  const flatZones: TerrainFlatZone[] = [
    ...map.roads.map((r) => ({
      minX: r.x - r.w * 0.5,
      maxX: r.x + r.w * 0.5,
      minZ: r.z - r.d * 0.5,
      maxZ: r.z + r.d * 0.5,
    })),
    ...map.sidewalks.map((sw) => ({
      minX: sw.x - sw.w * 0.5,
      maxX: sw.x + sw.w * 0.5,
      minZ: sw.z - sw.d * 0.5,
      maxZ: sw.z + sw.d * 0.5,
    })),
    ...ENTERABLE_BUILDINGS.map((b) => ({
      minX: b.x - b.w * 0.5 - 0.5,
      maxX: b.x + b.w * 0.5 + 0.5,
      minZ: b.z - b.d * 0.5 - 0.5,
      maxZ: b.z + b.d * 0.5 + 0.5,
    })),
    ...map.buildings.map((b) => ({
      minX: b.x - b.w * 0.5 - 0.5,
      maxX: b.x + b.w * 0.5 + 0.5,
      minZ: b.z - b.d * 0.5 - 0.5,
      maxZ: b.z + b.d * 0.5 + 0.5,
    })),
  ];

  const groundMat = new THREE.MeshStandardMaterial({
    map: textures.wasteland,
    normalMap: textures.wastelandNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.96,
    metalness: 0.02,
  });
  localDisposables.push(groundMat);

  const groundGeo = createSculptedTerrainGeometry(250, 88, flatZones);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = 0;
  ground.receiveShadow = true;
  root.add(ground);
  localDisposables.push(groundGeo);

  // 1b. Distant Perimeter City Skyline (1 InstancedMesh draw call, stepped ruined silhouettes)
  const skylineGeo = createSkylineSilhouetteGeometry();
  const skylineMat = new THREE.MeshStandardMaterial({
    color: 0x161b23,
    roughness: 0.94,
    metalness: 0.08,
  });
  const skylineCount = 32;
  const skylineMesh = new THREE.InstancedMesh(skylineGeo, skylineMat, skylineCount);
  skylineMesh.receiveShadow = false;
  skylineMesh.castShadow = false;
  const _skyMat = new THREE.Matrix4();
  const _skyPos = new THREE.Vector3();
  const _skyQuat = new THREE.Quaternion();
  const _skyScale = new THREE.Vector3();
  const _yAxis = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < skylineCount; i++) {
    const angle = (i / skylineCount) * Math.PI * 2 + 0.11;
    const dist = 94 + ((i * 17) % 24);
    const sx = Math.cos(angle) * dist;
    const sz = Math.sin(angle) * dist;
    const bw = 9 + ((i * 7) % 10);
    const bd = 9 + ((i * 11) % 9);
    const bh = 11 + ((i * 13) % 22);
    const terrainY = sampleTerrainHeight(sx, sz, flatZones);
    _skyPos.set(sx, terrainY - 0.25, sz);
    _skyQuat.setFromAxisAngle(_yAxis, angle + (i % 3) * 0.2);
    _skyScale.set(bw, bh, bd);
    _skyMat.compose(_skyPos, _skyQuat, _skyScale);
    skylineMesh.setMatrixAt(i, _skyMat);
  }
  skylineMesh.instanceMatrix.needsUpdate = true;
  detailDecorGroup.add(skylineMesh);
  localDisposables.push(skylineGeo, skylineMat);

  // 2. Asphalt Roads (with aggregate normal + damp puddle roughness maps)
  const roadMat = new THREE.MeshStandardMaterial({
    map: textures.asphalt,
    normalMap: textures.asphaltNormal,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: textures.asphaltRoughness,
    roughness: 0.92,
    metalness: 0.04,
  });
  localDisposables.push(roadMat);

  for (const r of map.roads) {
    const rGeo = new THREE.PlaneGeometry(r.w, r.d);
    rGeo.rotateX(-Math.PI * 0.5);
    const roadMesh = new THREE.Mesh(rGeo, roadMat);
    roadMesh.position.set(r.x, 0, r.z);
    roadMesh.receiveShadow = true;
    root.add(roadMesh);
    localDisposables.push(rGeo);

    colliders.roads.push({
      minX: r.x - r.w * 0.5,
      maxX: r.x + r.w * 0.5,
      minZ: r.z - r.d * 0.5,
      maxZ: r.z + r.d * 0.5,
    });
  }

  // Subtle street drainage manholes & weathered asphalt patches (zero Z-fighting)
  const manholeGeo = new THREE.CylinderGeometry(0.42, 0.44, 0.02, 12);
  const manholeMat = new THREE.MeshStandardMaterial({
    color: 0x2a3038,
    roughness: 0.55,
    metalness: 0.65,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const tarPatchGeo = createOrganicPatchGeometry(1.45, 0.9, 777, 11);
  const tarPatchMat = new THREE.MeshStandardMaterial({
    color: 0x13161c,
    roughness: 0.65,
    metalness: 0.08,
    transparent: true,
    opacity: 0.68,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  localDisposables.push(manholeGeo, manholeMat, tarPatchGeo, tarPatchMat);
  for (const [mx, mz] of [
    [-10, -2.5],
    [12, 2.5],
    [-2.5, -20],
    [2.5, 22],
    [22, 34],
    [-22, -2.5],
  ]) {
    const mh = new THREE.Mesh(manholeGeo, manholeMat);
    mh.position.set(mx, 0.014, mz);
    mh.receiveShadow = true;
    detailDecorGroup.add(mh);
  }
  for (const [px, pz, rot] of [
    [-16, 1.2, 0.25],
    [8, -1.8, -0.4],
    [-1.4, -14, 1.1],
    [1.6, 15, 0.15],
    [18, 36.2, -0.3],
    [26, -34.5, 0.4],
  ]) {
    const patch = new THREE.Mesh(tarPatchGeo, tarPatchMat);
    patch.position.set(px, 0.014, pz);
    patch.rotation.y = rot;
    patch.receiveShadow = true;
    detailDecorGroup.add(patch);
  }

  // Organic weathered dirt/gravel shoulder patches softening outer road edges (1 InstancedMesh)
  const shoulderGeo = createOrganicPatchGeometry(1.85, 0.95, 813, 10);
  const shoulderMat = new THREE.MeshStandardMaterial({
    color: 0x3b352c,
    roughness: 0.96,
    metalness: 0.01,
    transparent: true,
    opacity: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const shoulderSpots: [number, number, number, number][] = [];
  for (let sx = -46; sx <= 46; sx += 7.5) {
    if (Math.abs(sx) < 9 || Math.abs(sx - 31) < 9 || Math.abs(sx + 29) < 9) continue;
    shoulderSpots.push([sx, -38.1, ((sx * 17) % 5) * 0.2, 0.9 + ((Math.abs(sx) * 7) % 3) * 0.15]);
    shoulderSpots.push([sx, 39.1, ((sx * 11) % 5) * 0.25, 0.9 + ((Math.abs(sx) * 5) % 3) * 0.15]);
  }
  for (let sz = -28; sz <= 28; sz += 8) {
    if (Math.abs(sz) < 9) continue;
    shoulderSpots.push([-46.1, sz, Math.PI * 0.5 + (sz % 3) * 0.15, 0.95]);
    shoulderSpots.push([47.1, sz, Math.PI * 0.5 - (sz % 3) * 0.15, 0.95]);
  }
  if (shoulderSpots.length > 0) {
    const shoulderMesh = new THREE.InstancedMesh(shoulderGeo, shoulderMat, shoulderSpots.length);
    shoulderMesh.receiveShadow = true;
    const _sMat = new THREE.Matrix4();
    const _sPos = new THREE.Vector3();
    const _sQuat = new THREE.Quaternion();
    const _sScale = new THREE.Vector3();
    for (let i = 0; i < shoulderSpots.length; i++) {
      const [sx, sz, rot, sc] = shoulderSpots[i];
      _sPos.set(sx, 0.012, sz);
      _sQuat.setFromAxisAngle(_yAxis, rot);
      _sScale.set(sc, 1, sc * 0.85);
      _sMat.compose(_sPos, _sQuat, _sScale);
      shoulderMesh.setMatrixAt(i, _sMat);
    }
    shoulderMesh.instanceMatrix.needsUpdate = true;
    detailDecorGroup.add(shoulderMesh);
  }
  localDisposables.push(shoulderGeo, shoulderMat);

  // Road Markings (with polygonOffset to avoid Z-fighting)
  const yellowLineMat = new THREE.MeshStandardMaterial({
    color: 0xb48a30,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const whitePaintMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.85,
    transparent: true,
    opacity: 0.55,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  localDisposables.push(yellowLineMat, whitePaintMat);

  // Dashed yellow centerlines on Main Blvd & Central Ave
  const dashGeoX = new THREE.PlaneGeometry(2.6, 0.14);
  dashGeoX.rotateX(-Math.PI * 0.5);
  for (let x = -60; x <= 60; x += 5) {
    if (Math.abs(x) < 9) continue;
    const d1 = new THREE.Mesh(dashGeoX, yellowLineMat);
    d1.position.set(x, 0.02, -0.18);
    const d2 = new THREE.Mesh(dashGeoX, yellowLineMat);
    d2.position.set(x, 0.02, 0.18);
    root.add(d1, d2);
  }
  localDisposables.push(dashGeoX);

  const dashGeoZ = new THREE.PlaneGeometry(0.14, 2.6);
  dashGeoZ.rotateX(-Math.PI * 0.5);
  for (let z = -55; z <= 55; z += 5) {
    if (Math.abs(z) < 9) continue;
    const d1 = new THREE.Mesh(dashGeoZ, yellowLineMat);
    d1.position.set(-0.18, 0.02, z);
    const d2 = new THREE.Mesh(dashGeoZ, yellowLineMat);
    d2.position.set(0.18, 0.02, z);
    root.add(d1, d2);
  }
  localDisposables.push(dashGeoZ);

  // Zebra crosswalk stripes at main intersection
  const cwStripeGeoX = new THREE.PlaneGeometry(0.65, 2.2);
  cwStripeGeoX.rotateX(-Math.PI * 0.5);
  for (let sx = -5.5; sx <= 5.5; sx += 1.4) {
    const sNorth = new THREE.Mesh(cwStripeGeoX, whitePaintMat);
    sNorth.position.set(sx, 0.02, -7.8);
    const sSouth = new THREE.Mesh(cwStripeGeoX, whitePaintMat);
    sSouth.position.set(sx, 0.02, 7.8);
    root.add(sNorth, sSouth);
  }
  localDisposables.push(cwStripeGeoX);

  const cwStripeGeoZ = new THREE.PlaneGeometry(2.2, 0.65);
  cwStripeGeoZ.rotateX(-Math.PI * 0.5);
  for (let sz = -5.5; sz <= 5.5; sz += 1.4) {
    const sWest = new THREE.Mesh(cwStripeGeoZ, whitePaintMat);
    sWest.position.set(-7.8, 0.02, sz);
    const sEast = new THREE.Mesh(cwStripeGeoZ, whitePaintMat);
    sEast.position.set(7.8, 0.02, sz);
    root.add(sWest, sEast);
  }
  localDisposables.push(cwStripeGeoZ);

  // Subtle painted parking stall dividers on parking lots (shared geometry, zero runtime cost)
  const stallStripeGeo = new THREE.PlaneGeometry(0.1, 2.5);
  stallStripeGeo.rotateX(-Math.PI * 0.5);
  localDisposables.push(stallStripeGeo);
  for (const r of map.roads) {
    if (r.roadKind !== 'parking') continue;
    if (r.orientation === 'x') {
      const startX = r.x - r.w * 0.5 + 2.2;
      const endX = r.x + r.w * 0.5 - 2.0;
      const stripeZ = r.z - r.d * 0.5 + 1.45;
      for (let sx = startX; sx <= endX; sx += 3.0) {
        const line = new THREE.Mesh(stallStripeGeo, whitePaintMat);
        line.position.set(sx, 0.02, stripeZ);
        root.add(line);
      }
    } else {
      const startZ = r.z - r.d * 0.5 + 2.2;
      const endZ = r.z + r.d * 0.5 - 2.0;
      const stripeX = r.x - r.w * 0.5 + 1.45;
      for (let sz = startZ; sz <= endZ; sz += 3.0) {
        const line = new THREE.Mesh(stallStripeGeo, whitePaintMat);
        line.position.set(stripeX, 0.02, sz);
        line.rotation.y = Math.PI * 0.5;
        root.add(line);
      }
    }
  }

  // 3. Raised Concrete Sidewalks (with expansion joint normal + roughness maps)
  const swMat = new THREE.MeshStandardMaterial({
    map: textures.sidewalk,
    normalMap: textures.sidewalkNormal,
    normalScale: new THREE.Vector2(0.75, 0.75),
    roughnessMap: textures.sidewalkRoughness,
    roughness: 0.92,
    metalness: 0.03,
  });
  localDisposables.push(swMat);

  for (const sw of map.sidewalks) {
    const swGeo = createSidewalkSlabGeometry(sw.w, sw.d, SIDEWALK_HEIGHT, 0.55);
    const swMesh = new THREE.Mesh(swGeo, swMat);
    swMesh.position.set(sw.x, SIDEWALK_HEIGHT * 0.5, sw.z);
    swMesh.receiveShadow = true;
    root.add(swMesh);
    localDisposables.push(swGeo);

    colliders.sidewalks.push({
      minX: sw.x - sw.w * 0.5,
      maxX: sw.x + sw.w * 0.5,
      minZ: sw.z - sw.d * 0.5,
      maxZ: sw.z + sw.d * 0.5,
    });
  }

  // 4. Buildings
  for (const b of map.buildings) {
    const group = assets.instantiateAsset(b.assetId, () =>
      b.style === 'last_shop'
        ? buildLastShopModel(
            { w: b.w, h: b.h, d: b.d, style: b.style, doorSide: b.doorSide },
            mats
          )
        : buildUrbanBuildingModel(
            { w: b.w, h: b.h, d: b.d, style: b.style, doorSide: b.doorSide },
            mats
          )
    );
    group.position.set(b.x, SIDEWALK_HEIGHT, b.z);
    root.add(group);

    colliders.boxes.push({
      x: b.x,
      z: b.z,
      w: b.w + 0.2,
      d: b.d + 0.2,
      rotationY: 0,
    });

    // Warm sanctuary PointLight on Last Shop porch (no shadow cast for low-end speed)
    if (b.style === 'last_shop') {
      const porchLight = new THREE.PointLight(0xd99b52, 12, 15, 1.8);
      porchLight.position.set(b.x, SIDEWALK_HEIGHT + 2.75, b.z + b.d * 0.5 + 1.1);
      root.add(porchLight);
      flickerLights.push({ light: porchLight, baseIntensity: 12, seed: 1.7 });
    }
  }

  // 5. Abandoned Vehicles (loaded from passenger_car_pack.glb without primitive fallback)
  let worldDisposed = false;
  localDisposables.push({
    dispose: () => {
      worldDisposed = true;
    },
  });

  const vehicleAnchors: {
    id: string;
    modelId: VehiclePackModelId;
    anchor: THREE.Group;
  }[] = [];
  const usedVehicleModelIds = new Set<VehiclePackModelId>();

  for (const v of map.vehicles) {
    const anchor = new THREE.Group();
    anchor.name = v.id;
    anchor.position.set(v.x, 0, v.z);
    anchor.rotation.y = v.rotationY;
    root.add(anchor);

    const modelId = selectVehiclePackModel(v.id, v.kind);
    usedVehicleModelIds.add(modelId);
    vehicleAnchors.push({ id: v.id, modelId, anchor });

    const len = v.kind === 'van' ? 4.7 : v.kind === 'pickup' ? 4.5 : 4.2;
    const wid = v.kind === 'van' ? 2.05 : 1.9;
    colliders.boxes.push({
      x: v.x,
      z: v.z,
      w: wid,
      d: len,
      rotationY: v.rotationY,
    });

    const vSpec = VEHICLE_INTERACT_SPECS[v.id];
    if (vSpec) {
      interactables.push({
        kind: 'vehicle',
        id: v.id,
        name: vSpec.name,
        x: v.x,
        y: 0,
        z: v.z,
        interactRadiusOffset: v.kind === 'van' ? 2.25 : 2.05,
        initialNote: vSpec.initialNote,
        inspectedNote: vSpec.inspectedNote,
        searched: false,
        lootTaken: false,
        loot: vSpec.loot ? { ...vSpec.loot } : undefined,
        defaultLoot: vSpec.loot ? { ...vSpec.loot } : undefined,
      });
    }
  }

  if (vehicleAnchors.length > 0) {
    void assets.loadExternalGltfAsset(VEHICLE_PACK_GLB_URL).then((loaded) => {
      if (worldDisposed || !loaded) {
        if (!loaded) {
          console.error(
            `WorldBuilder: Failed to load vehicle GLB pack "${VEHICLE_PACK_GLB_URL}": ${assets.getLastLoadError(VEHICLE_PACK_GLB_URL) ?? 'unknown error'}`
          );
        }
        return;
      }
      const packCache = buildVehiclePackCache(loaded.scene.clone(true), usedVehicleModelIds);
      localDisposables.push({
        dispose: () => disposeVehiclePackCache(packCache),
      });
      for (const item of vehicleAnchors) {
        const instance = instantiatePackVehicle(packCache, item.modelId);
        if (instance) {
          item.anchor.add(instance);
        } else {
          console.error(
            `WorldBuilder: Vehicle model "${item.modelId}" not found in "${VEHICLE_PACK_GLB_URL}" for "${item.id}"`
          );
        }
      }
    });
  }

  // 6. Street Lamps + lightweight light pools
  const lightPoolTex = createSoftLightPoolTexture();
  localDisposables.push(lightPoolTex);
  const lightPoolMat = new THREE.MeshBasicMaterial({
    map: lightPoolTex,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const poolGeo = new THREE.PlaneGeometry(8.5, 8.5);
  poolGeo.rotateX(-Math.PI * 0.5);
  localDisposables.push(lightPoolMat, poolGeo);

  for (let i = 0; i < map.lamps.length; i++) {
    const l = map.lamps[i];
    const group = assets.instantiateAsset(l.assetId, () => buildStreetLampModel(l.lit, mats));
    group.position.set(l.x, SIDEWALK_HEIGHT, l.z);
    group.rotation.y = l.rotationY;
    root.add(group);

    colliders.circles.push({ x: l.x, z: l.z, radius: 0.28 });

    if (l.lit) {
      const forwardX = Math.sin(l.rotationY) * 1.2;
      const forwardZ = Math.cos(l.rotationY) * 1.2;

      // Baked additive ground pool (zero GPU light cost!)
      const pool = new THREE.Mesh(poolGeo, lightPoolMat);
      pool.position.set(l.x + forwardX, SIDEWALK_HEIGHT + 0.03, l.z + forwardZ);
      root.add(pool);

      if (l.pointLight) {
        const pt = new THREE.PointLight(0xd99b52, 12, 15, 1.8);
        pt.position.set(l.x + forwardX, SIDEWALK_HEIGHT + 4.8, l.z + forwardZ);
        root.add(pt);
        const handle = { light: pt, baseIntensity: 12, seed: i * 2.3 + 0.5 };
        flickerLights.push(handle);
        streetLampLights.push(handle);
      }
    }
  }

  // 7. Fences
  for (const f of map.fences) {
    const dx = f.x2 - f.x1;
    const dz = f.z2 - f.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const angle = Math.atan2(dz, dx);

    const fenceMesh =
      f.kind === 'chainlink'
        ? buildChainlinkFenceSegment(len, mats)
        : buildWoodFenceSegment(len, mats);

    fenceMesh.position.set((f.x1 + f.x2) * 0.5, SIDEWALK_HEIGHT, (f.z1 + f.z2) * 0.5);
    fenceMesh.rotation.y = -angle;
    root.add(fenceMesh);

    colliders.segments.push({
      x1: f.x1,
      z1: f.z1,
      x2: f.x2,
      z2: f.z2,
      halfThickness: 0.16,
    });
  }

  // 8. Props (Dumpsters, Crates, Trash, Barriers, Rubble, Shrubs, Hydrants)
  for (const p of map.props) {
    const baseY = p.onSidewalk ? SIDEWALK_HEIGHT : 0;
    const propGroup = assets.instantiateAsset(p.assetId, () => {
      switch (p.kind) {
        case 'dumpster':
          return buildDumpsterModel(mats);
        case 'crate':
          return buildCrateModel(mats);
        case 'trash':
          return buildTrashClusterModel(mats);
        case 'barrier':
          return buildConcreteBarrierModel(mats);
        case 'rubble':
          return buildRubblePileModel(mats);
        case 'shrub':
          return buildShrubModel(mats);
        case 'hydrant':
          return buildHydrantModel(mats);
        case 'worktable':
          return buildWorktableModel(mats);
        case 'street_sign':
          return buildStreetSignpostModel(mats);
        case 'shopping_cart':
          return buildShoppingCartModel(mats);
        case 'hazard_cones':
          return buildHazardConeClusterModel(mats);
        case 'quarantine_sign':
          return buildQuarantineSignModel(mats);
        case 'sandbag':
          return buildSandbagBarricadeModel(mats);
        case 'survivor_camp':
          return buildSurvivorCampModel(mats);
        case 'blood_scuffle':
          return buildGroundDecalModel('blood_scuffle', mats);
        case 'oil_slick':
          return buildGroundDecalModel('oil_slick', mats);
      }
    });

    propGroup.position.set(p.x, baseY, p.z);
    propGroup.rotation.y = p.rotationY;
    root.add(propGroup);

    if (p.solid) {
      if (p.shape === 'rect') {
        colliders.boxes.push({
          x: p.x,
          z: p.z,
          w: p.colliderW,
          d: p.colliderD,
          rotationY: p.rotationY,
        });
      } else {
        colliders.circles.push({
          x: p.x,
          z: p.z,
          radius: p.colliderRadius,
        });
      }
    }

    if (p.kind === 'worktable') {
      interactables.push({
        kind: 'workbench',
        id: p.id,
        name: PROP_WORKBENCH_NAMES[p.id] ?? 'Supply Workbench',
        x: p.x,
        y: baseY,
        z: p.z,
        interactRadiusOffset: 0.75,
      });
    } else if (PROP_SEARCH_SPECS[p.id]) {
      const s = PROP_SEARCH_SPECS[p.id];
      interactables.push({
        kind: 'searchable_prop',
        id: p.id,
        name: s.name,
        searchAction: s.searchAction,
        emptyAction: s.emptyAction,
        x: p.x,
        y: baseY,
        z: p.z,
        interactRadiusOffset: s.radiusOffset,
        initialNote: s.initialNote,
        inspectedNote: s.inspectedNote,
        searched: false,
        lootTaken: false,
        loot: s.loot ? { ...s.loot } : undefined,
        defaultLoot: s.loot ? { ...s.loot } : undefined,
      });
    } else if (PROP_EXAMINE_SPECS[p.id]) {
      const ex = PROP_EXAMINE_SPECS[p.id];
      interactables.push({
        kind: 'examine',
        id: p.id,
        name: ex.name,
        actionLabel: ex.actionLabel,
        noteTitle: ex.noteTitle,
        noteText: ex.noteText,
        x: p.x,
        y: baseY,
        z: p.z,
        interactRadiusOffset: ex.radiusOffset,
        examined: false,
      });
    }
  }

  // 9. Collectible 3D Resources (GLB/GLTF-extensible via AssetManager)
  for (const r of map.resources) {
    const baseY = (r.onSidewalk ? SIDEWALK_HEIGHT : 0) + (r.surfaceOffsetY ?? 0);
    const assetId = `resource.${r.resourceId}`;
    const resGroup = assets.instantiateAsset(
      assetId,
      () => buildResourceModel(r.resourceId, resMats, mats),
      true,
      false
    );
    resGroup.position.set(r.x, baseY, r.z);
    resGroup.rotation.y = r.rotationY;
    root.add(resGroup);

    interactables.push({
      kind: 'resource',
      id: r.id,
      resourceId: r.resourceId,
      amount: r.amount,
      defaultAmount: r.amount,
      x: r.x,
      y: baseY,
      z: r.z,
      group: resGroup,
      collected: false,
    });
  }

  // 10. Interactive Hinged Gates / Doors
  for (const g of map.gates) {
    const dx = g.x2 - g.x1;
    const dz = g.z2 - g.z1;
    const len = Math.hypot(dx, dz);
    if (len < 0.2) continue;
    const angle = Math.atan2(dz, dx);

    const gateHolder = new THREE.Group();
    gateHolder.position.set(g.x1, SIDEWALK_HEIGHT, g.z1);
    gateHolder.rotation.y = -angle;

    const swingPivot = assets.instantiateAsset(g.assetId, () =>
      buildHingedGateModel(len, g.kind, mats)
    );
    gateHolder.add(swingPivot);
    root.add(gateHolder);

    const segCollider: SegmentCollider = {
      x1: g.x1,
      z1: g.z1,
      x2: g.x2,
      z2: g.z2,
      halfThickness: 0.16,
      active: true,
    };
    colliders.segments.push(segCollider);

    interactables.push({
      kind: 'door',
      id: g.id,
      name: g.name,
      x: (g.x1 + g.x2) * 0.5,
      y: SIDEWALK_HEIGHT,
      z: (g.z1 + g.z2) * 0.5,
      x1: g.x1,
      z1: g.z1,
      x2: g.x2,
      z2: g.z2,
      openSwingAngle: g.openSwingAngle,
      group: gateHolder,
      pivot: swingPivot,
      collider: segCollider,
      isOpen: false,
      lockedKeyId: g.lockedKeyId,
      lockedHint: g.lockedHint,
      unlocked: !g.lockedKeyId,
    });
  }

  // 11. Inspectable Supply Containers
  for (const c of map.containers) {
    const baseY = c.onSidewalk ? SIDEWALK_HEIGHT : 0;
    let builtPivot: THREE.Object3D | null = null;
    const chestGroup = assets.instantiateAsset(c.assetId, () => {
      const m = buildSupplyContainerModel(c.kind, resMats, mats);
      builtPivot = (m.userData.lidPivot as THREE.Object3D | undefined) ?? null;
      return m;
    });
    chestGroup.position.set(c.x, baseY, c.z);
    chestGroup.rotation.y = c.rotationY;
    root.add(chestGroup);

    colliders.boxes.push({
      x: c.x,
      z: c.z,
      w: 0.92,
      d: 0.58,
      rotationY: c.rotationY,
    });

    interactables.push({
      kind: 'container',
      id: c.id,
      name: c.name,
      x: c.x,
      y: baseY,
      z: c.z,
      group: chestGroup,
      lidPivot: builtPivot,
      animKind: 'lid',
      isOpen: false,
      inspected: false,
      lootTaken: false,
      requiresToolResource: c.requiresToolResource,
      lockedToolHint: c.lockedToolHint,
      unlocked: !c.requiresToolResource,
      loot: c.loot ? { ...c.loot } : undefined,
      defaultLoot: c.loot ? { ...c.loot } : undefined,
    });
  }

  // 12. Enterable 3D Buildings (Modular Interiors, Doors, Furniture, Searchable Containers & Loot)
  for (let bi = 0; bi < ENTERABLE_BUILDINGS.length; bi++) {
    const b = ENTERABLE_BUILDINGS[bi];
    const shell = assets.instantiateAsset(b.assetId, () =>
      buildEnterableBuildingShell(b, mats, intMats)
    );
    shell.position.set(b.x, SIDEWALK_HEIGHT, b.z);
    root.add(shell);

    const floorY = SIDEWALK_HEIGHT + INTERIOR_FLOOR_OFFSET;
    colliders.floors.push({
      minX: b.x - b.w * 0.5 + 0.12,
      maxX: b.x + b.w * 0.5 - 0.12,
      minZ: b.z - b.d * 0.5 + 0.12,
      maxZ: b.z + b.d * 0.5 - 0.12,
      height: floorY,
    });

    if (b.archetype === 'shop') {
      colliders.safeZones?.push({
        minX: b.x - b.w * 0.5,
        maxX: b.x + b.w * 0.5,
        minZ: b.z - b.d * 0.5,
        maxZ: b.z + b.d * 0.5,
      });
    }

    // Wall colliders
    for (const wall of b.walls) {
      if (wall.solid === false) continue;
      colliders.boxes.push({
        x: b.x + wall.x,
        z: b.z + wall.z,
        w: wall.w,
        d: wall.d,
        rotationY: 0,
      });
    }

    // Porch sanctuary light outside Last Shop
    if (b.exteriorStyle === 'last_shop') {
      const porchLight = new THREE.PointLight(0xd99b52, 12, 15, 1.8);
      porchLight.position.set(b.x, SIDEWALK_HEIGHT + 2.65, b.z + b.d * 0.5 + 1.1);
      root.add(porchLight);
      const handle = { light: porchLight, baseIntensity: 12, seed: 1.7 };
      flickerLights.push(handle);
      porchLights.push(handle);
    }

    // Low-cost shadowless interior atmosphere PointLight
    const intLight = new THREE.PointLight(
      b.interiorLightColor,
      b.interiorLightIntensity,
      10.5,
      1.8
    );
    intLight.position.set(
      b.x + b.interiorLightOffset.x,
      floorY + b.interiorLightOffset.y,
      b.z + b.interiorLightOffset.z
    );
    root.add(intLight);
    const intHandle = {
      light: intLight,
      baseIntensity: b.interiorLightIntensity,
      seed: 4.1 + bi * 1.9,
      isSafeBase: b.archetype === 'shop',
    };
    interiorLights.push(intHandle);
    if (b.archetype === 'shop' || b.archetype === 'store') {
      flickerLights.push(intHandle);
    }

    // Interior Furniture
    for (let fi = 0; fi < b.furniture.length; fi++) {
      const furn = b.furniture[fi];
      const fMesh = buildFurnitureModel(furn.kind, furn.w, furn.d, mats, intMats);
      fMesh.position.set(b.x + furn.x, floorY, b.z + furn.z);
      fMesh.rotation.y = furn.rotationY;
      root.add(fMesh);

      if (furn.solid) {
        colliders.boxes.push({
          x: b.x + furn.x,
          z: b.z + furn.z,
          w: furn.w,
          d: furn.d,
          rotationY: furn.rotationY,
        });
      }

      const furnSpec = getInteriorFurnitureInteractionSpec(b.id, furn.kind, fi);
      if (furnSpec) {
        const fx = b.x + furn.x;
        const fz = b.z + furn.z;
        const fid = `furn_${b.id}_${furn.kind}_${fi}`;
        if (furnSpec.interactKind === 'workbench') {
          interactables.push({
            kind: 'workbench',
            id: fid,
            name: furnSpec.name,
            x: fx,
            y: floorY,
            z: fz,
            interactRadiusOffset: furnSpec.radiusOffset,
          });
        } else if (furnSpec.interactKind === 'bed') {
          interactables.push({
            kind: 'bed',
            id: fid,
            name: furnSpec.name,
            x: fx,
            y: floorY,
            z: fz,
            interactRadiusOffset: furnSpec.radiusOffset,
          });
        } else {
          interactables.push({
            kind: 'examine',
            id: fid,
            name: furnSpec.name,
            actionLabel: furnSpec.actionLabel ?? 'Examine',
            noteTitle: furnSpec.noteTitle ?? furnSpec.name,
            noteText: furnSpec.noteText ?? '',
            x: fx,
            y: floorY,
            z: fz,
            interactRadiusOffset: furnSpec.radiusOffset,
            examined: false,
          });
        }
      }
    }

    // Functional Exterior & Interior Doors
    for (const d of b.doors) {
      const x1 = b.x + d.hingeX;
      const z1 = b.z + d.hingeZ;
      const x2 = x1 + Math.cos(d.baseRotationY) * d.width;
      const z2 = z1 - Math.sin(d.baseRotationY) * d.width;

      const doorHolder = new THREE.Group();
      doorHolder.position.set(x1, floorY, z1);
      doorHolder.rotation.y = d.baseRotationY;

      const swingPivot = assets.instantiateAsset(d.assetId, () =>
        buildInteriorDoorModel(d, mats, intMats)
      );
      doorHolder.add(swingPivot);
      root.add(doorHolder);

      const segCollider: SegmentCollider = {
        x1,
        z1,
        x2,
        z2,
        halfThickness: 0.12,
        active: true,
      };
      colliders.segments.push(segCollider);

      interactables.push({
        kind: 'door',
        id: d.id,
        name: d.name,
        x: (x1 + x2) * 0.5,
        y: floorY,
        z: (z1 + z2) * 0.5,
        x1,
        z1,
        x2,
        z2,
        openSwingAngle: d.openSwingAngle,
        group: doorHolder,
        pivot: swingPivot,
        collider: segCollider,
        isOpen: false,
        lockedKeyId: d.lockedKeyId,
        lockedHint: d.lockedHint,
        unlocked: !d.lockedKeyId,
      });
    }

    // Searchable Interior Containers (Cabinets, Drawers, Storage Boxes, Med Cabinets)
    for (const c of b.containers) {
      let animPivot: THREE.Object3D | null = null;
      let animKind: 'lid' | 'door' | 'drawer' = 'lid';
      const cGroup = assets.instantiateAsset(c.assetId, () => {
        const built = buildSearchableContainerModel(c.kind, mats, resMats, intMats);
        animPivot = (built.userData.animPivot as THREE.Object3D | undefined) ?? null;
        animKind = (built.userData.animKind as 'lid' | 'door' | 'drawer' | undefined) ?? 'lid';
        return built;
      });
      const cy = floorY + (c.yOffset ?? 0);
      cGroup.position.set(b.x + c.x, cy, b.z + c.z);
      cGroup.rotation.y = c.rotationY;
      root.add(cGroup);

      if (c.solid) {
        colliders.boxes.push({
          x: b.x + c.x,
          z: b.z + c.z,
          w: c.w,
          d: c.d,
          rotationY: c.rotationY,
        });
      }

      interactables.push({
        kind: 'container',
        id: c.id,
        name: c.name,
        x: b.x + c.x,
        y: floorY,
        z: b.z + c.z,
        group: cGroup,
        lidPivot: animPivot,
        animKind,
        isOpen: false,
        inspected: false,
        lootTaken: false,
        unlocked: true,
        loot: c.loot ? { ...c.loot } : undefined,
        defaultLoot: c.loot ? { ...c.loot } : undefined,
      });
    }

    // Interior Collectible Resources
    for (const r of b.resources) {
      const ry = floorY + r.yOffset;
      const assetId = `resource.${r.resourceId}`;
      const rGroup = assets.instantiateAsset(
        assetId,
        () => buildResourceModel(r.resourceId, resMats, mats),
        true,
        false
      );
      rGroup.position.set(b.x + r.x, ry, b.z + r.z);
      rGroup.rotation.y = r.rotationY;
      root.add(rGroup);

      interactables.push({
        kind: 'resource',
        id: r.id,
        resourceId: r.resourceId,
        amount: r.amount,
        defaultAmount: r.amount,
        x: b.x + r.x,
        y: ry,
        z: b.z + r.z,
        group: rGroup,
        collected: false,
      });
    }

    // Interior Keys & Access Keycards
    if (b.keys) {
      for (const k of b.keys) {
        const ky = floorY + k.yOffset;
        const kGroup = assets.instantiateAsset(
          `key.${k.keyKind}`,
          () => buildKeyPickupModel(k.keyKind, resMats, mats),
          true,
          false
        );
        kGroup.position.set(b.x + k.x, ky, b.z + k.z);
        kGroup.rotation.y = k.rotationY;
        root.add(kGroup);

        interactables.push({
          kind: 'key',
          id: k.id,
          name: k.name,
          keyKind: k.keyKind,
          x: b.x + k.x,
          y: ky,
          z: b.z + k.z,
          group: kGroup,
          collected: false,
        });
      }
    }

    // Shop Counter Register & Backroom Storage Locker
    if (b.shopStations) {
      for (const st of b.shopStations) {
        const sy = floorY + (st.yOffset ?? 0);
        const stGroup = assets.instantiateAsset(st.assetId, () =>
          st.kind === 'counter'
            ? buildShopRegisterModel(mats, intMats)
            : buildShopStorageChestModel(mats, intMats)
        );
        stGroup.position.set(b.x + st.x, sy, b.z + st.z);
        stGroup.rotation.y = st.rotationY;
        root.add(stGroup);

        if (st.solid) {
          colliders.boxes.push({
            x: b.x + st.x,
            z: b.z + st.z,
            w: st.w,
            d: st.d,
            rotationY: st.rotationY,
          });
        }

        interactables.push({
          kind: 'shop_station',
          stationKind: st.kind,
          id: st.id,
          name: st.name,
          x: b.x + st.x,
          y: sy,
          z: b.z + st.z,
          group: stGroup,
        });
      }
    }

    // Dynamic Shop Shelf Display Stock Meshes (building-relative coords for multi-shelf progression)
    if (b.shopDisplayShelf) {
      const displayCtrl = buildShopShelfDisplayGroup(resMats, mats);
      displayCtrl.group.position.set(b.x, floorY, b.z);
      root.add(displayCtrl.group);
      shelfDisplays.push(displayCtrl);
    }

    // Dynamic Shop Level Expansions (Levels 2-5), Storage Racks (Tiers 1-3) & Decorations
    if (b.archetype === 'shop') {
      const prog = buildShopProgressionGroup(
        b.x,
        b.z,
        floorY,
        mats,
        intMats,
        resMats,
        assets,
        colliders
      );
      root.add(prog.root);
      shopProgressions.push(prog.controller);
      localDisposables.push(prog.controller);
    }
  }

  // 13. Story / Mission Interactive 3D Objects (radios, manifests, journals, emergency relay)
  for (const so of STORY_OBJECTS) {
    const assetKey = `story.${so.category}`;
    const soGroup = assets.instantiateAsset(assetKey, () =>
      buildStoryObjectModel(so.category, mats)
    );
    soGroup.position.set(so.x, so.y, so.z);
    soGroup.rotation.y = so.rotationY;
    root.add(soGroup);

    if (so.category === 'relay' || so.category === 'cache') {
      colliders.boxes.push({
        x: so.x,
        z: so.z,
        w: so.category === 'relay' ? 0.78 : 0.88,
        d: so.category === 'relay' ? 0.64 : 0.58,
        rotationY: so.rotationY,
      });
    }

    interactables.push({
      kind: 'story_object',
      id: so.id,
      name: so.name,
      actionLabel: so.actionLabel,
      category: so.category,
      x: so.x,
      y: so.y,
      z: so.z,
      group: soGroup,
    });
  }

  // 14. Organic Flora & Geology: Procedural Trees, Stratified Boulders & Instanced Scrub Grass
  const distToSegment2D = (
    px: number,
    pz: number,
    x1: number,
    z1: number,
    x2: number,
    z2: number
  ): number => {
    const vx = x2 - x1;
    const vz = z2 - z1;
    const lenSq = vx * vx + vz * vz;
    if (lenSq < 1e-6) return Math.hypot(px - x1, pz - z1);
    const t = Math.max(0, Math.min(1, ((px - x1) * vx + (pz - z1) * vz) / lenSq));
    return Math.hypot(px - (x1 + t * vx), pz - (z1 + t * vz));
  };

  const isOnSidewalk = (x: number, z: number): boolean =>
    map.sidewalks.some(
      (sw) =>
        x >= sw.x - sw.w * 0.5 + 0.15 &&
        x <= sw.x + sw.w * 0.5 - 0.15 &&
        z >= sw.z - sw.d * 0.5 + 0.15 &&
        z <= sw.z + sw.d * 0.5 - 0.15
    );

  const isSpotClear = (x: number, z: number, pad: number): boolean => {
    if (Math.hypot(x - map.playerSpawn.x, z - map.playerSpawn.z) < 2.8 + pad) return false;
    for (const r of map.roads) {
      if (
        x >= r.x - r.w * 0.5 - pad &&
        x <= r.x + r.w * 0.5 + pad &&
        z >= r.z - r.d * 0.5 - pad &&
        z <= r.z + r.d * 0.5 + pad
      ) {
        return false;
      }
    }
    for (const eb of ENTERABLE_BUILDINGS) {
      // Extra margin to protect exterior doors, porches, and Shop Level 3 North Annex
      const annexPadN = eb.archetype === 'shop' ? 3.8 : 1.0;
      if (
        x >= eb.x - eb.w * 0.5 - 1.2 - pad &&
        x <= eb.x + eb.w * 0.5 + 1.2 + pad &&
        z >= eb.z - eb.d * 0.5 - annexPadN - pad &&
        z <= eb.z + eb.d * 0.5 + 1.6 + pad
      ) {
        return false;
      }
      for (const d of eb.doors) {
        if (Math.hypot(x - (eb.x + d.hingeX), z - (eb.z + d.hingeZ)) < 2.6 + pad) {
          return false;
        }
      }
    }
    for (const b of map.buildings) {
      if (
        x >= b.x - b.w * 0.5 - 1.0 - pad &&
        x <= b.x + b.w * 0.5 + 1.0 + pad &&
        z >= b.z - b.d * 0.5 - 1.0 - pad &&
        z <= b.z + b.d * 0.5 + 1.0 + pad
      ) {
        return false;
      }
    }
    for (const f of map.fences) {
      if (distToSegment2D(x, z, f.x1, f.z1, f.x2, f.z2) < 0.8 + pad) return false;
    }
    for (const g of map.gates) {
      if (distToSegment2D(x, z, g.x1, g.z1, g.x2, g.z2) < 1.8 + pad) return false;
    }
    for (const v of map.vehicles) {
      if (Math.hypot(x - v.x, z - v.z) < 2.5 + pad) return false;
    }
    for (const l of map.lamps) {
      if (Math.hypot(x - l.x, z - l.z) < 1.1 + pad) return false;
    }
    for (const p of map.props) {
      if (Math.hypot(x - p.x, z - p.z) < 1.4 + pad) return false;
    }
    for (const c of map.containers) {
      if (Math.hypot(x - c.x, z - c.z) < 1.3 + pad) return false;
    }
    for (const r of map.resources) {
      if (Math.hypot(x - r.x, z - r.z) < 1.1 + pad) return false;
    }
    return true;
  };

  // Shared tree archetypes (variants 0, 1: blighted foliage; variant 2: skeletal deadwood)
  const treeArchetypes = [
    createProceduralTreeGeometries(0),
    createProceduralTreeGeometries(1),
    createProceduralTreeGeometries(2),
  ];
  for (const arch of treeArchetypes) {
    localDisposables.push(arch.woodGeo);
    if (arch.foliageGeo) localDisposables.push(arch.foliageGeo);
  }

  const placedTrees: { x: number; z: number; y: number; scale: number }[] = [];
  const treeCandidates: [number, number, 0 | 1 | 2, number, number][] = [
    // In-town yards, alleys & vacant lots
    [-34.2, -11.6, 1, 0.9, 0.3],
    [-26.8, -12.8, 2, 0.85, 1.4],
    [-35.4, -24.5, 0, 0.96, 2.2],
    [35.4, -25.2, 1, 0.92, 0.7],
    [26.2, -25.4, 2, 0.88, 2.8],
    [-35.4, 10.2, 0, 0.95, 1.1],
    [-34.8, 26.2, 1, 1.0, 2.5],
    [-26.4, 26.8, 2, 0.86, 0.4],
    [-19.2, 26.2, 0, 0.94, 1.9],
    [-9.4, 27.0, 1, 0.88, 3.1],
    [28.4, 27.6, 2, 0.9, 0.9],
    [35.6, 27.2, 0, 0.96, 2.4],
    // Outer north lots & lab perimeter strip
    [-17.2, -41.5, 1, 0.95, 1.6],
    [-10.4, -47.2, 0, 1.02, 0.2],
    [10.4, -41.8, 2, 0.92, 2.1],
    [16.4, -47.2, 1, 0.98, 1.0],
    // Outer south precinct & clinic flanks
    [-10.4, 47.4, 0, 0.96, 2.7],
    [34.6, 42.2, 1, 0.92, 0.6],
    [34.2, 47.6, 2, 0.88, 1.8],
    // Outer perimeter wasteland ridges (horizon & perimeter depth)
    [-53.8, -39.5, 0, 1.15, 0.4],
    [-54.2, -25.8, 2, 1.08, 1.9],
    [-53.2, 25.5, 1, 1.12, 2.6],
    [-54.5, 39.5, 0, 1.18, 1.1],
    [53.5, -39.5, 1, 1.14, 2.2],
    [54.2, -24.5, 0, 1.1, 0.8],
    [53.4, 25.8, 2, 1.08, 3.0],
    [54.0, 39.8, 1, 1.16, 1.5],
    [-41.5, -54.5, 0, 1.14, 0.9],
    [-26.5, -55.2, 2, 1.05, 2.4],
    [10.5, -55.4, 1, 1.12, 1.3],
    [40.2, -54.6, 0, 1.16, 2.8],
    [-40.2, 54.6, 1, 1.12, 0.5],
    [9.8, 55.4, 0, 1.15, 2.0],
    [38.8, 54.6, 2, 1.08, 1.2],
  ];

  for (const [tx, tz, variant, scale, rotY] of treeCandidates) {
    if (!isSpotClear(tx, tz, 0.95)) continue;
    const onSw = isOnSidewalk(tx, tz);
    const ty = onSw ? SIDEWALK_HEIGHT : sampleTerrainHeight(tx, tz, flatZones);
    const arch = treeArchetypes[variant];

    const tGroup = new THREE.Group();
    tGroup.position.set(tx, ty, tz);
    tGroup.rotation.y = rotY;
    tGroup.scale.setScalar(scale);

    const trunkMesh = new THREE.Mesh(arch.woodGeo, mats.barkWood);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    tGroup.add(trunkMesh);

    if (arch.foliageGeo) {
      const canopyMesh = new THREE.Mesh(arch.foliageGeo, mats.foliage);
      canopyMesh.castShadow = true;
      canopyMesh.receiveShadow = true;
      tGroup.add(canopyMesh);
    }
    root.add(tGroup);
    placedTrees.push({ x: tx, z: tz, y: ty, scale });

    if (
      tx > map.bounds.minX &&
      tx < map.bounds.maxX &&
      tz > map.bounds.minZ &&
      tz < map.bounds.maxZ
    ) {
      colliders.circles.push({ x: tx, z: tz, radius: 0.34 * scale });
    }
  }

  // Stratified boulder clusters in vacant lots, outer roadsides & perimeter slopes
  const boulderCandidates: [number, number, number, number, number][] = [
    [-24.2, -13.2, 101, 0.9, 0.3],
    [-16.8, -47.2, 202, 1.05, 1.2],
    [13.8, -46.8, 303, 0.95, 2.1],
    [-35.2, 27.6, 404, 0.9, 0.8],
    [35.2, 11.4, 505, 0.85, 1.7],
    [35.4, 46.2, 606, 1.0, 2.5],
    [-11.2, 41.2, 707, 0.85, 0.4],
    [-51.8, -10.5, 808, 1.35, 1.1],
    [-52.4, 11.5, 909, 1.45, 2.3],
    [52.2, -11.0, 1010, 1.4, 0.7],
    [52.6, 11.8, 1111, 1.32, 1.9],
    [2.5, -52.5, 1212, 1.28, 2.8],
    [-46.8, -52.2, 1313, 1.38, 0.6],
    [47.2, 52.4, 1414, 1.35, 1.4],
  ];
  for (const [bx, bz, seed, scale, rotY] of boulderCandidates) {
    if (!isSpotClear(bx, bz, 0.85)) continue;
    const onSw = isOnSidewalk(bx, bz);
    const by = onSw ? SIDEWALK_HEIGHT : sampleTerrainHeight(bx, bz, flatZones);
    const cluster = buildBoulderClusterModel(seed, scale, mats);
    cluster.position.set(bx, by, bz);
    cluster.rotation.y = rotY;
    root.add(cluster);

    if (
      bx > map.bounds.minX &&
      bx < map.bounds.maxX &&
      bz > map.bounds.minZ &&
      bz < map.bounds.maxZ
    ) {
      colliders.circles.push({ x: bx, z: bz, radius: 0.72 * scale });
    }
  }

  // Instanced Wild Grass & Scrub Tufts (single draw call across tree roots, lots, curb borders & hills)
  const grassGeo = createGrassTuftGeometry();
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x333b29,
    roughness: 0.96,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  localDisposables.push(grassGeo, grassMat);

  const grassTransforms: { x: number; y: number; z: number; rot: number; sx: number; sy: number }[] = [];
  const pushGrass = (gx: number, gz: number, rot: number, sc: number, syMul = 1) => {
    if (!isSpotClear(gx, gz, 0.25)) return;
    const onSw = isOnSidewalk(gx, gz);
    const gy = onSw ? SIDEWALK_HEIGHT : sampleTerrainHeight(gx, gz, flatZones);
    grassTransforms.push({ x: gx, y: gy, z: gz, rot, sx: sc, sy: sc * syMul });
  };

  // Ring grass clusters around placed trees
  for (let ti = 0; ti < placedTrees.length; ti++) {
    const t = placedTrees[ti];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + ti * 0.7;
      const dist = 0.65 + ((ti + k) % 3) * 0.35;
      pushGrass(
        t.x + Math.cos(a) * dist,
        t.z + Math.sin(a) * dist,
        a + 0.5,
        0.85 + ((ti + k) % 3) * 0.2,
        1.0
      );
    }
  }

  // Natural scrub scattered along vacant lots, fence lines, and perimeter berms
  for (let i = 0; i < 120; i++) {
    const h1 = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
    const h2 = Math.sin(i * 78.233 + 1.913) * 24634.6345;
    const u = h1 - Math.floor(h1);
    const v = h2 - Math.floor(h2);
    const gx = (u - 0.5) * 116;
    const gz = (v - 0.5) * 116;
    pushGrass(gx, gz, u * Math.PI * 2, 0.75 + v * 0.65, 0.85 + (i % 4) * 0.15);
  }

  if (grassTransforms.length > 0) {
    const grassMesh = new THREE.InstancedMesh(grassGeo, grassMat, grassTransforms.length);
    grassMesh.receiveShadow = true;
    grassMesh.castShadow = false;
    const _gMat = new THREE.Matrix4();
    const _gPos = new THREE.Vector3();
    const _gQuat = new THREE.Quaternion();
    const _gScale = new THREE.Vector3();
    for (let i = 0; i < grassTransforms.length; i++) {
      const g = grassTransforms[i];
      _gPos.set(g.x, g.y, g.z);
      _gQuat.setFromAxisAngle(_yAxis, g.rot);
      _gScale.set(g.sx, g.sy, g.sx);
      _gMat.compose(_gPos, _gQuat, _gScale);
      grassMesh.setMatrixAt(i, _gMat);
    }
    grassMesh.instanceMatrix.needsUpdate = true;
    detailDecorGroup.add(grassMesh);
  }

  return {
    root,
    detailDecorGroup,
    colliders,
    interactables,
    flickerLights,
    streetLampLights,
    porchLights,
    interiorLights,
    streetLampPoolMat: lightPoolMat,
    windowLightShaftMat: intMats.lightShaft,
    syncShopDisplayStock: (stock: InventoryState, shopLevel?: number) => {
      if (typeof shopLevel === 'number') {
        activeShopLevel = shopLevel;
      }
      for (const d of shelfDisplays) {
        d.syncStock(stock, activeShopLevel);
      }
    },
    syncShopProgression: (state: ShopProgressionStateInput) => {
      activeShopLevel = state.shopLevel;
      for (const p of shopProgressions) {
        p.syncState(state);
      }
      for (const d of shelfDisplays) {
        d.syncStock(state.shopStock, activeShopLevel);
      }
    },
    dispose: () => {
      for (const d of localDisposables) {
        d.dispose();
      }
    },
  };
}
