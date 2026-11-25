import { ResourceId } from '../../game/types';

export type BuildingFacing = 'south' | 'north';

export interface WallSegmentLocal {
  /** Local center X relative to building origin */
  x: number;
  /** Local center Z relative to building origin */
  z: number;
  w: number;
  d: number;
  /** Bottom Y offset from building floor (default 0) */
  y?: number;
  /** Height (defaults to building ceiling height) */
  h?: number;
  /** Whether this solid segment acts as a horizontal player collider (true for full-height & sill walls, false for headers above doors/windows) */
  solid?: boolean;
  material: 'brick' | 'concrete' | 'interior_plaster' | 'interior_wood' | 'rusted';
}

export interface WindowOpeningLocal {
  x: number;
  z: number;
  w: number;
  /** Orientation along X-wall (0) or Z-wall (Math.PI/2) */
  rotationY: number;
  castLightShaft?: boolean;
}

export interface BuildingDoorLocal {
  id: string;
  name: string;
  assetId: string;
  kind: 'wood' | 'metal';
  /** Hinge position in local building coordinates */
  hingeX: number;
  hingeZ: number;
  /** Local direction vector angle of closed door from hinge (0 = +X, Math.PI/2 = -Z, etc.) */
  baseRotationY: number;
  width: number;
  openSwingAngle: number;
}

export type FurnitureKind =
  | 'counter'
  | 'shelf'
  | 'table'
  | 'couch'
  | 'bed'
  | 'kitchen_counter'
  | 'sink_vanity'
  | 'pallet_crates'
  | 'rug'
  | 'broken_chair';

export interface BuildingFurnitureLocal {
  kind: FurnitureKind;
  x: number;
  z: number;
  rotationY: number;
  w: number;
  d: number;
  solid: boolean;
}

export type SearchContainerKind =
  | 'cabinet'
  | 'drawer'
  | 'storage_box'
  | 'med_cabinet';

export interface BuildingContainerLocal {
  id: string;
  name: string;
  assetId: string;
  kind: SearchContainerKind;
  x: number;
  z: number;
  /** Height above building floor (e.g. 1.15 for wall-mounted med cabinet, 0 for floor cabinet/box) */
  yOffset?: number;
  rotationY: number;
  solid: boolean;
  w: number;
  d: number;
  loot: {
    resourceId: ResourceId;
    amount: number;
  };
}

export interface BuildingResourceLocal {
  id: string;
  resourceId: ResourceId;
  amount: number;
  x: number;
  z: number;
  yOffset: number;
  rotationY: number;
}

export interface ShopStationLocal {
  id: string;
  name: string;
  assetId: string;
  kind: 'counter' | 'storage';
  x: number;
  z: number;
  yOffset?: number;
  rotationY: number;
  solid: boolean;
  w: number;
  d: number;
}

export interface EnterableBuildingConfig {
  id: string;
  name: string;
  assetId: string;
  archetype: 'shop' | 'store' | 'storage' | 'house';
  /** World center X and Z on the sidewalk */
  x: number;
  z: number;
  w: number;
  d: number;
  ceilingH: number;
  exteriorStyle: 'last_shop' | 'store' | 'storage' | 'house';
  floorStyle: 'wood_planks' | 'worn_tile' | 'concrete';
  interiorLightColor: number;
  interiorLightIntensity: number;
  interiorLightOffset: { x: number; y: number; z: number };
  walls: WallSegmentLocal[];
  windows: WindowOpeningLocal[];
  doors: BuildingDoorLocal[];
  furniture: BuildingFurnitureLocal[];
  containers: BuildingContainerLocal[];
  resources: BuildingResourceLocal[];
  shopStations?: ShopStationLocal[];
  shopDisplayShelf?: { x: number; z: number; rotationY: number };
}

export const ENTERABLE_BUILDINGS: EnterableBuildingConfig[] = [
  // 1. THE LAST SHOP — Small Safe-Base Convenience Shop (South entrance facing Main Blvd)
  {
    id: 'last_shop',
    name: 'The Last Shop',
    assetId: 'building.enterable.last_shop',
    archetype: 'shop',
    x: -15.5,
    z: -13.5,
    w: 11.0,
    d: 8.0,
    ceilingH: 3.4,
    exteriorStyle: 'last_shop',
    floorStyle: 'wood_planks',
    interiorLightColor: 0xffc878,
    interiorLightIntensity: 4.5,
    interiorLightOffset: { x: -0.6, y: 2.95, z: 0.4 },
    walls: [
      // North back wall split at x=-2.15 (w=1.48) for Level 3 North Annex doorway
      { x: -4.195, z: -3.88, w: 2.61, d: 0.24, material: 'brick', solid: true },
      { x: -2.15, z: -3.88, w: 1.48, d: 0.24, y: 2.38, h: 1.02, material: 'brick', solid: false },
      { x: 2.045, z: -3.88, w: 6.91, d: 0.24, material: 'brick', solid: true },
      // West side wall (full)
      { x: -5.38, z: 0, w: 0.24, d: 8.0, material: 'brick', solid: true },
      // East side wall (full)
      { x: 5.38, z: 0, w: 0.24, d: 8.0, material: 'brick', solid: true },

      // South front wall with center 1.5m doorway (x: -0.75..+0.75) & two storefront windows
      { x: -4.65, z: 3.88, w: 1.7, d: 0.24, material: 'brick', solid: true },
      { x: -2.6, z: 3.88, w: 2.4, d: 0.24, y: 0, h: 0.95, material: 'brick', solid: true }, // left window sill
      { x: -2.6, z: 3.88, w: 2.4, d: 0.24, y: 2.45, h: 0.95, material: 'brick', solid: false }, // left window header
      { x: -1.1, z: 3.88, w: 0.7, d: 0.24, material: 'brick', solid: true }, // left door pier
      { x: 0, z: 3.88, w: 1.5, d: 0.24, y: 2.38, h: 1.02, material: 'brick', solid: false }, // door header
      { x: 1.1, z: 3.88, w: 0.7, d: 0.24, material: 'brick', solid: true }, // right door pier
      { x: 2.6, z: 3.88, w: 2.4, d: 0.24, y: 0, h: 0.95, material: 'brick', solid: true }, // right window sill
      { x: 2.6, z: 3.88, w: 2.4, d: 0.24, y: 2.45, h: 0.95, material: 'brick', solid: false }, // right window header
      { x: 4.65, z: 3.88, w: 1.7, d: 0.24, material: 'brick', solid: true },

      // Interior partition separating front shop from back storeroom (doorway at x: +2.0..+3.45)
      { x: -1.65, z: -0.8, w: 7.3, d: 0.2, material: 'interior_wood', solid: true },
      { x: 4.35, z: -0.8, w: 1.85, d: 0.2, material: 'interior_wood', solid: true },
      { x: 2.725, z: -0.8, w: 1.45, d: 0.2, y: 2.38, h: 1.02, material: 'interior_wood', solid: false },
    ],
    windows: [
      { x: -2.6, z: 3.88, w: 2.4, rotationY: 0, castLightShaft: true },
      { x: 2.6, z: 3.88, w: 2.4, rotationY: 0, castLightShaft: true },
    ],
    doors: [
      {
        id: 'door_last_shop_front',
        name: 'Last Shop Front Door',
        assetId: 'interactable.door_wood',
        kind: 'wood',
        hingeX: -0.73,
        hingeZ: 3.88,
        baseRotationY: 0,
        width: 1.46,
        openSwingAngle: 1.52,
      },
      {
        id: 'door_last_shop_back',
        name: 'Storeroom Door',
        assetId: 'interactable.door_wood',
        kind: 'wood',
        hingeX: 2.0,
        hingeZ: -0.8,
        baseRotationY: 0,
        width: 1.44,
        openSwingAngle: 1.5,
      },
    ],
    furniture: [
      // Front checkout counter (west side)
      { kind: 'counter', x: -3.2, z: 1.2, rotationY: 0, w: 2.4, d: 0.8, solid: true },
      // Retail display shelf (east-center)
      { kind: 'shelf', x: 2.5, z: 1.5, rotationY: 0, w: 1.8, d: 0.58, solid: true },
      // Cozy worn rug near entrance
      { kind: 'rug', x: 0, z: 2.2, rotationY: 0, w: 2.4, d: 1.6, solid: false },
      // Back storeroom shelf & workbench table (clear of North Annex archway at x=-2.89..-1.41)
      { kind: 'shelf', x: -3.95, z: -2.8, rotationY: 0, w: 1.85, d: 0.6, solid: true },
      { kind: 'table', x: -0.35, z: -2.7, rotationY: 0, w: 1.45, d: 0.82, solid: true },
      { kind: 'pallet_crates', x: 4.1, z: -2.9, rotationY: 0.2, w: 1.1, d: 1.0, solid: true },
    ],
    containers: [
      {
        id: 'cnt_int_shop_drawer',
        name: 'Counter Drawer',
        assetId: 'interactable.drawer',
        kind: 'drawer',
        x: -1.48,
        z: 1.2,
        rotationY: 0,
        solid: true,
        w: 0.76,
        d: 0.46,
        loot: { resourceId: 'canned_food', amount: 2 },
      },
      {
        id: 'cnt_int_shop_cabinet',
        name: 'Storeroom Cabinet',
        assetId: 'interactable.cabinet',
        kind: 'cabinet',
        x: 1.1,
        z: -3.3,
        rotationY: 0,
        solid: true,
        w: 1.0,
        d: 0.56,
        loot: { resourceId: 'scrap_metal', amount: 2 },
      },
    ],
    resources: [
      { id: 'res_int_shop_food', resourceId: 'canned_food', amount: 1, x: 2.5, z: 1.5, yOffset: 1.64, rotationY: 0.2 },
      { id: 'res_int_shop_water', resourceId: 'water_bottle', amount: 1, x: -2.4, z: 1.2, yOffset: 0.96, rotationY: -0.3 },
      { id: 'res_int_shop_wood', resourceId: 'wood', amount: 2, x: -0.35, z: -2.7, yOffset: 0.78, rotationY: 0.15 },
    ],
    shopStations: [
      {
        id: 'shop_counter_main',
        name: 'Shop Counter',
        assetId: 'interactable.shop_register',
        kind: 'counter',
        x: -3.55,
        z: 1.2,
        yOffset: 0.96,
        rotationY: 0,
        solid: false,
        w: 0.65,
        d: 0.5,
      },
      {
        id: 'shop_storage_locker',
        name: 'Shop Storage Locker',
        assetId: 'interactable.shop_storage',
        kind: 'storage',
        x: 2.65,
        z: -3.35,
        yOffset: 0,
        rotationY: 0,
        solid: true,
        w: 1.0,
        d: 0.6,
      },
    ],
    shopDisplayShelf: {
      x: 2.5,
      z: 1.5,
      rotationY: 0,
    },
  },

  // 2. VALE CORNER STORE — Abandoned Convenience / Pharmacy Store (South entrance)
  {
    id: 'vale_pharmacy',
    name: 'Vale Corner Store',
    assetId: 'building.enterable.corner_store',
    archetype: 'store',
    x: 15.5,
    z: -13.5,
    w: 10.5,
    d: 8.0,
    ceilingH: 3.4,
    exteriorStyle: 'store',
    floorStyle: 'worn_tile',
    interiorLightColor: 0x9ec5e8,
    interiorLightIntensity: 3.2,
    interiorLightOffset: { x: 0, y: 2.95, z: 0.8 },
    walls: [
      // North back wall
      { x: 0, z: -3.88, w: 10.5, d: 0.24, material: 'concrete', solid: true },
      // West wall
      { x: -5.13, z: 0, w: 0.24, d: 8.0, material: 'concrete', solid: true },
      // East wall with window
      { x: 5.13, z: -2.6, w: 0.24, d: 2.8, material: 'concrete', solid: true },
      { x: 5.13, z: 0.0, w: 0.24, d: 2.2, y: 0, h: 1.0, material: 'concrete', solid: true },
      { x: 5.13, z: 0.0, w: 0.24, d: 2.2, y: 2.35, h: 1.05, material: 'concrete', solid: false },
      { x: 5.13, z: 2.55, w: 0.24, d: 2.9, material: 'concrete', solid: true },

      // South storefront wall with center 1.5m doorway & windows
      { x: -4.45, z: 3.88, w: 1.6, d: 0.24, material: 'concrete', solid: true },
      { x: -2.5, z: 3.88, w: 2.3, d: 0.24, y: 0, h: 0.95, material: 'concrete', solid: true },
      { x: -2.5, z: 3.88, w: 2.3, d: 0.24, y: 2.45, h: 0.95, material: 'concrete', solid: false },
      { x: -1.05, z: 3.88, w: 0.65, d: 0.24, material: 'concrete', solid: true },
      { x: 0, z: 3.88, w: 1.48, d: 0.24, y: 2.38, h: 1.02, material: 'concrete', solid: false },
      { x: 1.05, z: 3.88, w: 0.65, d: 0.24, material: 'concrete', solid: true },
      { x: 2.5, z: 3.88, w: 2.3, d: 0.24, y: 0, h: 0.95, material: 'concrete', solid: true },
      { x: 2.5, z: 3.88, w: 2.3, d: 0.24, y: 2.45, h: 0.95, material: 'concrete', solid: false },
      { x: 4.45, z: 3.88, w: 1.6, d: 0.24, material: 'concrete', solid: true },

      // Interior back dispensary partition (doorway at x: -2.9..-1.45)
      { x: -3.96, z: -0.9, w: 2.12, d: 0.2, material: 'interior_plaster', solid: true },
      { x: -2.175, z: -0.9, w: 1.45, d: 0.2, y: 2.38, h: 1.02, material: 'interior_plaster', solid: false },
      { x: 1.8, z: -0.9, w: 6.5, d: 0.2, material: 'interior_plaster', solid: true },
    ],
    windows: [
      { x: -2.5, z: 3.88, w: 2.3, rotationY: 0, castLightShaft: true },
      { x: 2.5, z: 3.88, w: 2.3, rotationY: 0, castLightShaft: true },
      { x: 5.13, z: 0.0, w: 2.2, rotationY: Math.PI * 0.5, castLightShaft: true },
    ],
    doors: [
      {
        id: 'door_store_front',
        name: 'Corner Store Door',
        assetId: 'interactable.door_metal',
        kind: 'metal',
        hingeX: -0.73,
        hingeZ: 3.88,
        baseRotationY: 0,
        width: 1.46,
        openSwingAngle: 1.52,
      },
      {
        id: 'door_store_back',
        name: 'Back Dispensary Door',
        assetId: 'interactable.door_wood',
        kind: 'wood',
        hingeX: -2.9,
        hingeZ: -0.9,
        baseRotationY: 0,
        width: 1.44,
        openSwingAngle: 1.5,
      },
    ],
    furniture: [
      // Store shelving aisle & checkout counter
      { kind: 'counter', x: 3.35, z: 1.6, rotationY: Math.PI * 0.5, w: 2.2, d: 0.78, solid: true },
      { kind: 'shelf', x: -2.6, z: 1.4, rotationY: 0, w: 2.0, d: 0.58, solid: true },
      { kind: 'broken_chair', x: 4.35, z: 2.1, rotationY: 0.6, w: 0.6, d: 0.6, solid: false },
      // Back pharmacy room counter & shelf
      { kind: 'table', x: 2.2, z: -2.6, rotationY: 0, w: 1.55, d: 0.82, solid: true },
      { kind: 'shelf', x: -0.3, z: -3.2, rotationY: 0, w: 2.0, d: 0.58, solid: true },
    ],
    containers: [
      {
        id: 'cnt_int_store_drawer',
        name: 'Checkout Register Drawer',
        assetId: 'interactable.drawer',
        kind: 'drawer',
        x: 3.35,
        z: 0.0,
        rotationY: -Math.PI * 0.5,
        solid: true,
        w: 0.76,
        d: 0.46,
        loot: { resourceId: 'canned_food', amount: 1 },
      },
      {
        id: 'cnt_int_store_box',
        name: 'Aisle Supply Box',
        assetId: 'interactable.storage_box',
        kind: 'storage_box',
        x: -3.9,
        z: 2.6,
        rotationY: 0.25,
        solid: true,
        w: 0.82,
        d: 0.54,
        loot: { resourceId: 'water_bottle', amount: 2 },
      },
      {
        id: 'cnt_int_store_med',
        name: 'Dispensary Medical Cabinet',
        assetId: 'interactable.med_cabinet',
        kind: 'med_cabinet',
        x: 4.88,
        z: -2.3,
        yOffset: 1.05,
        rotationY: -Math.PI * 0.5,
        solid: false,
        w: 0.62,
        d: 0.26,
        loot: { resourceId: 'medical_supplies', amount: 2 },
      },
    ],
    resources: [
      { id: 'res_int_store_water', resourceId: 'water_bottle', amount: 1, x: -2.6, z: 1.4, yOffset: 0.95, rotationY: 0.3 },
      { id: 'res_int_store_med', resourceId: 'medical_supplies', amount: 1, x: 2.2, z: -2.6, yOffset: 0.78, rotationY: -0.2 },
    ],
  },

  // 3. DEPOT 04 STORAGE — Small Abandoned Storage Building (South entrance)
  {
    id: 'depot_04',
    name: 'Depot 04 Storage',
    assetId: 'building.enterable.storage',
    archetype: 'storage',
    x: 29.5,
    z: -16.5,
    w: 9.5,
    d: 9.0,
    ceilingH: 3.5,
    exteriorStyle: 'storage',
    floorStyle: 'concrete',
    interiorLightColor: 0x94a3b8,
    interiorLightIntensity: 2.8,
    interiorLightOffset: { x: 0, y: 3.0, z: 0.5 },
    walls: [
      // North back wall
      { x: 0, z: -4.38, w: 9.5, d: 0.24, material: 'rusted', solid: true },
      // West wall with narrow high window
      { x: -4.63, z: -2.4, w: 0.24, d: 4.2, material: 'rusted', solid: true },
      { x: -4.63, z: 0.6, w: 0.24, d: 1.8, y: 0, h: 1.35, material: 'rusted', solid: true },
      { x: -4.63, z: 0.6, w: 0.24, d: 1.8, y: 2.4, h: 1.1, material: 'rusted', solid: false },
      { x: -4.63, z: 2.95, w: 0.24, d: 3.1, material: 'rusted', solid: true },
      // East wall
      { x: 4.63, z: 0, w: 0.24, d: 9.0, material: 'rusted', solid: true },

      // South front wall with center 1.5m doorway
      { x: -2.75, z: 4.38, w: 4.0, d: 0.24, material: 'rusted', solid: true },
      { x: 0, z: 4.38, w: 1.5, d: 0.24, y: 2.38, h: 1.12, material: 'rusted', solid: false },
      { x: 2.75, z: 4.38, w: 4.0, d: 0.24, material: 'rusted', solid: true },

      // Interior tool cage partition in back-right corner (doorway at x: +1.28..+2.72, z: -0.8)
      { x: 0.3, z: -2.6, w: 0.2, d: 3.6, material: 'concrete', solid: true },
      { x: 0.84, z: -0.8, w: 0.88, d: 0.2, material: 'concrete', solid: true },
      { x: 2.0, z: -0.8, w: 1.45, d: 0.2, y: 2.38, h: 1.12, material: 'concrete', solid: false },
      { x: 3.62, z: -0.8, w: 1.82, d: 0.2, material: 'concrete', solid: true },
    ],
    windows: [
      { x: -4.63, z: 0.6, w: 1.8, rotationY: Math.PI * 0.5, castLightShaft: true },
    ],
    doors: [
      {
        id: 'door_depot_front',
        name: 'Storage Shed Door',
        assetId: 'interactable.door_metal',
        kind: 'metal',
        hingeX: -0.73,
        hingeZ: 4.38,
        baseRotationY: 0,
        width: 1.46,
        openSwingAngle: 1.52,
      },
      {
        id: 'door_depot_cage',
        name: 'Tool Room Door',
        assetId: 'interactable.door_metal',
        kind: 'metal',
        hingeX: 1.28,
        hingeZ: -0.8,
        baseRotationY: 0,
        width: 1.44,
        openSwingAngle: -1.5,
      },
    ],
    furniture: [
      { kind: 'shelf', x: -3.4, z: -3.5, rotationY: 0, w: 2.0, d: 0.6, solid: true },
      { kind: 'table', x: -3.2, z: 1.2, rotationY: Math.PI * 0.5, w: 1.55, d: 0.82, solid: true },
      { kind: 'pallet_crates', x: 3.3, z: 2.5, rotationY: -0.15, w: 1.1, d: 1.0, solid: true },
      { kind: 'shelf', x: 3.7, z: -3.6, rotationY: 0, w: 1.8, d: 0.58, solid: true },
    ],
    containers: [
      {
        id: 'cnt_int_depot_locker',
        name: 'Storage Metal Cabinet',
        assetId: 'interactable.cabinet',
        kind: 'cabinet',
        x: 1.3,
        z: -3.7,
        rotationY: 0,
        solid: true,
        w: 1.0,
        d: 0.56,
        loot: { resourceId: 'scrap_metal', amount: 3 },
      },
      {
        id: 'cnt_int_depot_box',
        name: 'Cargo Storage Box',
        assetId: 'interactable.storage_box',
        kind: 'storage_box',
        x: -3.5,
        z: -1.4,
        rotationY: 0.3,
        solid: true,
        w: 0.82,
        d: 0.54,
        loot: { resourceId: 'wood', amount: 2 },
      },
      {
        id: 'cnt_int_depot_drawer',
        name: 'Tool Bench Drawer',
        assetId: 'interactable.drawer',
        kind: 'drawer',
        x: -3.2,
        z: 2.65,
        rotationY: Math.PI * 0.5,
        solid: true,
        w: 0.76,
        d: 0.46,
        loot: { resourceId: 'scrap_metal', amount: 2 },
      },
    ],
    resources: [
      { id: 'res_int_depot_scrap', resourceId: 'scrap_metal', amount: 2, x: -3.2, z: 1.2, yOffset: 0.78, rotationY: 0.4 },
      { id: 'res_int_depot_wood', resourceId: 'wood', amount: 2, x: -1.6, z: -3.2, yOffset: 0, rotationY: -0.2 },
    ],
  },

  // 4. ABANDONED HOUSE — Small Residential House on SW Block (North entrance facing Main Blvd)
  {
    id: 'abandoned_house',
    name: 'Abandoned House',
    assetId: 'building.enterable.house',
    archetype: 'house',
    x: -29.5,
    z: 18.0,
    w: 10.0,
    d: 8.5,
    ceilingH: 3.3,
    exteriorStyle: 'house',
    floorStyle: 'wood_planks',
    interiorLightColor: 0xb7cff0,
    interiorLightIntensity: 3.1,
    interiorLightOffset: { x: -0.5, y: 2.85, z: -0.4 },
    walls: [
      // South back wall (full)
      { x: 0, z: 4.13, w: 10.0, d: 0.24, material: 'brick', solid: true },
      // West wall (full)
      { x: -4.88, z: 0, w: 0.24, d: 8.5, material: 'brick', solid: true },
      // East wall with window
      { x: 4.88, z: -2.55, w: 0.24, d: 3.4, material: 'brick', solid: true },
      { x: 4.88, z: 0.2, w: 0.24, d: 2.1, y: 0, h: 1.0, material: 'brick', solid: true },
      { x: 4.88, z: 0.2, w: 0.24, d: 2.1, y: 2.35, h: 0.95, material: 'brick', solid: false },
      { x: 4.88, z: 2.75, w: 0.24, d: 3.0, material: 'brick', solid: true },

      // North front wall facing Main Blvd (center 1.5m doorway + two windows)
      { x: -4.25, z: -4.13, w: 1.5, d: 0.24, material: 'brick', solid: true },
      { x: -2.45, z: -4.13, w: 2.1, d: 0.24, y: 0, h: 0.98, material: 'brick', solid: true },
      { x: -2.45, z: -4.13, w: 2.1, d: 0.24, y: 2.38, h: 0.92, material: 'brick', solid: false },
      { x: -1.08, z: -4.13, w: 0.65, d: 0.24, material: 'brick', solid: true },
      { x: 0, z: -4.13, w: 1.5, d: 0.24, y: 2.38, h: 0.92, material: 'brick', solid: false },
      { x: 1.08, z: -4.13, w: 0.65, d: 0.24, material: 'brick', solid: true },
      { x: 2.45, z: -4.13, w: 2.1, d: 0.24, y: 0, h: 0.98, material: 'brick', solid: true },
      { x: 2.45, z: -4.13, w: 2.1, d: 0.24, y: 2.38, h: 0.92, material: 'brick', solid: false },
      { x: 4.25, z: -4.13, w: 1.5, d: 0.24, material: 'brick', solid: true },

      // Interior Bathroom / Bedroom room partition in SE corner (doorway at x: +0.75..+2.2, z: +0.9)
      { x: 0.65, z: 2.5, w: 0.2, d: 3.2, material: 'interior_plaster', solid: true },
      { x: 1.475, z: 0.9, w: 1.45, d: 0.2, y: 2.38, h: 0.92, material: 'interior_plaster', solid: false },
      { x: 3.48, z: 0.9, w: 2.56, d: 0.2, material: 'interior_plaster', solid: true },
    ],
    windows: [
      { x: -2.45, z: -4.13, w: 2.1, rotationY: 0, castLightShaft: true },
      { x: 2.45, z: -4.13, w: 2.1, rotationY: 0, castLightShaft: true },
      { x: 4.88, z: 0.2, w: 2.1, rotationY: Math.PI * 0.5, castLightShaft: true },
    ],
    doors: [
      {
        id: 'door_house_front',
        name: 'House Front Door',
        assetId: 'interactable.door_wood',
        kind: 'wood',
        hingeX: 0.73,
        hingeZ: -4.13,
        baseRotationY: Math.PI,
        width: 1.46,
        openSwingAngle: 1.52,
      },
      {
        id: 'door_house_bath',
        name: 'Bedroom & Bath Door',
        assetId: 'interactable.door_wood',
        kind: 'wood',
        hingeX: 2.2,
        hingeZ: 0.9,
        baseRotationY: Math.PI,
        width: 1.44,
        openSwingAngle: -1.5,
      },
    ],
    furniture: [
      // Kitchen counter along west wall
      { kind: 'kitchen_counter', x: -4.1, z: -1.4, rotationY: Math.PI * 0.5, w: 2.6, d: 0.78, solid: true },
      // Dining table in main room
      { kind: 'table', x: -2.0, z: -1.6, rotationY: 0, w: 1.55, d: 0.82, solid: true },
      { kind: 'broken_chair', x: -1.6, z: -0.7, rotationY: 0.4, w: 0.55, d: 0.55, solid: false },
      // Living area couch & rug (east side)
      { kind: 'couch', x: 3.6, z: -1.5, rotationY: -Math.PI * 0.5, w: 2.1, d: 0.9, solid: true },
      { kind: 'rug', x: -1.8, z: 2.1, rotationY: 0, w: 2.6, d: 2.0, solid: false },
      // Bed in south-west area
      { kind: 'bed', x: -3.5, z: 2.6, rotationY: 0, w: 1.5, d: 2.1, solid: true },
      // Bathroom sink vanity inside enclosed south-east room
      { kind: 'sink_vanity', x: 3.9, z: 3.3, rotationY: Math.PI, w: 1.1, d: 0.65, solid: true },
    ],
    containers: [
      {
        id: 'cnt_int_house_kitchen',
        name: 'Kitchen Cabinet',
        assetId: 'interactable.cabinet',
        kind: 'cabinet',
        x: -4.15,
        z: 0.45,
        rotationY: Math.PI * 0.5,
        solid: true,
        w: 1.0,
        d: 0.56,
        loot: { resourceId: 'canned_food', amount: 2 },
      },
      {
        id: 'cnt_int_house_drawer',
        name: 'Bedroom Drawer',
        assetId: 'interactable.drawer',
        kind: 'drawer',
        x: -1.4,
        z: 3.55,
        rotationY: Math.PI,
        solid: true,
        w: 0.85,
        d: 0.5,
        loot: { resourceId: 'wood', amount: 2 },
      },
      {
        id: 'cnt_int_house_med',
        name: 'Bathroom Med Cabinet',
        assetId: 'interactable.med_cabinet',
        kind: 'med_cabinet',
        x: 4.64,
        z: 2.35,
        yOffset: 1.15,
        rotationY: -Math.PI * 0.5,
        solid: false,
        w: 0.62,
        d: 0.26,
        loot: { resourceId: 'medical_supplies', amount: 2 },
      },
    ],
    resources: [
      { id: 'res_int_house_food', resourceId: 'canned_food', amount: 1, x: -4.1, z: -1.4, yOffset: 0.9, rotationY: 0.3 },
      { id: 'res_int_house_water', resourceId: 'water_bottle', amount: 1, x: -2.0, z: -1.6, yOffset: 0.78, rotationY: -0.2 },
      { id: 'res_int_house_med', resourceId: 'medical_supplies', amount: 1, x: 3.9, z: 3.3, yOffset: 0.88, rotationY: 0.1 },
    ],
  },
];
