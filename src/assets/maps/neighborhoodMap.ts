export interface RoadConfig {
  x: number;
  z: number;
  w: number;
  d: number;
  orientation: 'x' | 'z';
  roadKind?: 'main' | 'side' | 'alley' | 'parking';
}

export interface SidewalkConfig {
  x: number;
  z: number;
  w: number;
  d: number;
}

export interface BuildingConfig {
  id: string;
  assetId: string;
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  style: 'last_shop' | 'apartment' | 'pharmacy' | 'garage' | 'diner' | 'warehouse';
  doorSide: 'south' | 'north' | 'east' | 'west';
}

export interface VehicleConfig {
  id: string;
  assetId: string;
  kind: 'sedan' | 'taxi' | 'pickup' | 'van';
  x: number;
  z: number;
  rotationY: number;
  colorHex: number;
}

export interface StreetLampConfig {
  id: string;
  assetId: string;
  x: number;
  z: number;
  rotationY: number;
  lit: boolean;
  pointLight?: boolean;
}

export interface FenceConfig {
  id: string;
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  kind: 'chainlink' | 'wood';
}

export interface PropConfig {
  id: string;
  assetId: string;
  kind:
    | 'dumpster'
    | 'crate'
    | 'trash'
    | 'barrier'
    | 'rubble'
    | 'shrub'
    | 'hydrant'
    | 'worktable'
    | 'street_sign'
    | 'shopping_cart'
    | 'hazard_cones'
    | 'quarantine_sign'
    | 'sandbag'
    | 'survivor_camp'
    | 'blood_scuffle'
    | 'oil_slick';
  x: number;
  z: number;
  rotationY: number;
  colliderW: number;
  colliderD: number;
  colliderRadius: number;
  shape: 'rect' | 'circle';
  solid: boolean;
  onSidewalk?: boolean;
}

export interface ResourcePickupConfig {
  id: string;
  resourceId: 'canned_food' | 'water_bottle' | 'scrap_metal' | 'wood' | 'medical_supplies';
  amount: number;
  x: number;
  z: number;
  rotationY: number;
  onSidewalk?: boolean;
  surfaceOffsetY?: number;
}

export interface GateInteractableConfig {
  id: string;
  name: string;
  assetId: string;
  kind: 'chainlink' | 'wood';
  x1: number;
  z1: number;
  x2: number;
  z2: number;
  openSwingAngle: number;
  lockedKeyId?: string;
  lockedHint?: string;
}

export interface ContainerInteractableConfig {
  id: string;
  name: string;
  assetId: string;
  kind: 'supply_case' | 'tool_chest';
  x: number;
  z: number;
  rotationY: number;
  onSidewalk?: boolean;
  requiresToolResource?: 'scrap_metal' | 'wood';
  lockedToolHint?: string;
  loot?: {
    resourceId: 'canned_food' | 'water_bottle' | 'scrap_metal' | 'wood' | 'medical_supplies';
    amount: number;
  };
}

export interface ContextZoneConfig {
  id: string;
  x: number;
  z: number;
  radius: number;
  title: string;
  message: string;
}

export interface NeighborhoodMapData {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  playerSpawn: { x: number; z: number; yaw: number };
  roads: RoadConfig[];
  sidewalks: SidewalkConfig[];
  buildings: BuildingConfig[];
  vehicles: VehicleConfig[];
  lamps: StreetLampConfig[];
  fences: FenceConfig[];
  props: PropConfig[];
  resources: ResourcePickupConfig[];
  gates: GateInteractableConfig[];
  containers: ContainerInteractableConfig[];
  contextZones: ContextZoneConfig[];
}

export const SIDEWALK_HEIGHT = 0.16;

export const NEIGHBORHOOD_MAP: NeighborhoodMapData = {
  bounds: { minX: -50, maxX: 50, minZ: -51, maxZ: 51 },
  playerSpawn: { x: -11.5, z: -4.5, yaw: 0.48 },

  roads: [
    // East-West Main Boulevard
    { x: 0, z: 0, w: 140, d: 14, orientation: 'x', roadKind: 'main' },
    // North-South Central Avenue
    { x: 0, z: 0, w: 14, d: 140, orientation: 'z', roadKind: 'main' },
    // Perimeter streets
    { x: 0, z: -33, w: 140, d: 10, orientation: 'x', roadKind: 'main' },
    { x: 0, z: 34.5, w: 140, d: 9, orientation: 'x', roadKind: 'main' },
    { x: -41.5, z: 0, w: 9, d: 140, orientation: 'z', roadKind: 'main' },
    { x: 42.5, z: 0, w: 9, d: 140, orientation: 'z', roadKind: 'main' },

    // Side Alleys & Parking Areas (Phase 14 connected urban layout)
    { x: -22.8, z: 18.5, w: 2.8, d: 23, orientation: 'z', roadKind: 'alley' },
    { x: 22.8, z: -17.5, w: 3.2, d: 21, orientation: 'z', roadKind: 'alley' },
    { x: 14.1, z: -24.0, w: 14.2, d: 8.0, orientation: 'x', roadKind: 'parking' },
    { x: 15.75, z: 25.25, w: 17.5, d: 9.5, orientation: 'x', roadKind: 'parking' },
    { x: -29.0, z: -44.0, w: 16.0, d: 12.0, orientation: 'x', roadKind: 'parking' },
    { x: -33.5, z: 44.5, w: 7.0, d: 11.0, orientation: 'z', roadKind: 'parking' },
    { x: 11.5, z: 44.5, w: 9.0, d: 11.0, orientation: 'z', roadKind: 'parking' },
  ],

  sidewalks: [
    // NW block (The Last Shop & Mercer Flats)
    { x: -22, z: -17.5, w: 30, d: 21 },
    // NE block split cleanly around Freight Alley & Vale Rear Parking
    { x: 14.1, z: -13.5, w: 14.2, d: 13 },
    { x: 31.2, z: -17.5, w: 13.6, d: 21 },
    // SW block split cleanly around Maple Alley
    { x: -30.6, z: 18.5, w: 12.8, d: 23 },
    { x: -14.2, z: 18.5, w: 14.4, d: 23 },
    // SE block split cleanly around Industrial Service Bay
    { x: 15.75, z: 13.75, w: 17.5, d: 13.5 },
    { x: 31.25, z: 18.5, w: 13.5, d: 23 },
    // Outer North District Pads (North of North St, flanking NW Evac Lot)
    { x: -14, z: -44.5, w: 14, d: 13 },
    { x: 22.5, z: -44.5, w: 31, d: 13 },
    // Outer South District Pads (South of South St: Police Precinct & Mercy Clinic)
    { x: -18.5, z: 45, w: 23, d: 12 },
    { x: 27, z: 45, w: 22, d: 12 },
    // Far Outer Visual Framing Blocks
    { x: -22, z: -59, w: 30, d: 16 },
    { x: 22.5, z: -59, w: 31, d: 16 },
    { x: -22, z: 59, w: 30, d: 16 },
    { x: 22.5, z: 59, w: 31, d: 16 },
    { x: -59, z: -17.5, w: 24, d: 21 },
    { x: 59, z: -17.5, w: 24, d: 21 },
    { x: -59, z: 18.5, w: 24, d: 23 },
    { x: 59, z: 18.5, w: 24, d: 23 },
  ],

  buildings: [
    // NW Block background apartments
    {
      id: 'mercer_flats',
      assetId: 'building.apartment',
      x: -29.5,
      z: -20.5,
      w: 12,
      d: 10,
      h: 8.8,
      style: 'apartment',
      doorSide: 'south',
    },
    // Outer skyline framing structures (pushed outside playable perimeter)
    {
      id: 'skyline_n1',
      assetId: 'building.apartment',
      x: -16,
      z: -59,
      w: 16,
      d: 10,
      h: 11,
      style: 'apartment',
      doorSide: 'south',
    },
    {
      id: 'skyline_n2',
      assetId: 'building.warehouse',
      x: 20,
      z: -59,
      w: 18,
      d: 12,
      h: 9.5,
      style: 'warehouse',
      doorSide: 'south',
    },
    {
      id: 'skyline_s1',
      assetId: 'building.apartment',
      x: -16,
      z: 59,
      w: 16,
      d: 10,
      h: 10,
      style: 'apartment',
      doorSide: 'north',
    },
    {
      id: 'skyline_s2',
      assetId: 'building.warehouse',
      x: 22,
      z: 59,
      w: 18,
      d: 12,
      h: 9,
      style: 'warehouse',
      doorSide: 'north',
    },
    {
      id: 'skyline_w1',
      assetId: 'building.apartment',
      x: -58,
      z: -16,
      w: 12,
      d: 15,
      h: 10,
      style: 'apartment',
      doorSide: 'east',
    },
    {
      id: 'skyline_e1',
      assetId: 'building.warehouse',
      x: 59,
      z: 16,
      w: 12,
      d: 16,
      h: 9,
      style: 'warehouse',
      doorSide: 'west',
    },
  ],

  vehicles: [
    // Abandoned taxi in central intersection
    { id: 'v_taxi', assetId: 'vehicle.taxi', kind: 'taxi', x: 2.2, z: -1.8, rotationY: 0.45, colorHex: 0xb48224 },
    // Wrecked sedan along Main Blvd west
    { id: 'v_sedan1', assetId: 'vehicle.sedan', kind: 'sedan', x: -24.5, z: 3.2, rotationY: -1.48, colorHex: 0x475569 },
    // Pickup angled on Main Blvd east
    { id: 'v_pickup1', assetId: 'vehicle.pickup', kind: 'pickup', x: 14.2, z: -3.2, rotationY: 1.92, colorHex: 0x5c3a2e },
    // Delivery van near pharmacy
    { id: 'v_van1', assetId: 'vehicle.van', kind: 'van', x: 26.5, z: 2.8, rotationY: -1.62, colorHex: 0x64748b },
    // Wrecked sedan outside Redline Auto
    { id: 'v_garage1', assetId: 'vehicle.sedan', kind: 'sedan', x: 13.5, z: 5.8, rotationY: 1.52, colorHex: 0x7f1d1d },
    // North Central Ave pileup
    { id: 'v_north1', assetId: 'vehicle.pickup', kind: 'pickup', x: -2.4, z: -18.5, rotationY: 0.18, colorHex: 0x3f4d43 },
    // South Central Ave
    { id: 'v_south1', assetId: 'vehicle.taxi', kind: 'taxi', x: 2.6, z: 19.5, rotationY: 3.02, colorHex: 0x9c7222 },
    // Phase 14 District Vehicles
    { id: 'v_evac_van', assetId: 'vehicle.van', kind: 'van', x: -29.0, z: -43.5, rotationY: 0.35, colorHex: 0x52606d },
    { id: 'v_police_car', assetId: 'vehicle.sedan', kind: 'sedan', x: -33.5, z: 43.2, rotationY: 0.08, colorHex: 0x1e293b },
    { id: 'v_clinic_amb', assetId: 'vehicle.van', kind: 'van', x: 11.5, z: 43.4, rotationY: -0.06, colorHex: 0xd1d5db },
    { id: 'v_mil_truck', assetId: 'vehicle.pickup', kind: 'pickup', x: 3.4, z: -33.2, rotationY: -1.35, colorHex: 0x365314 },
  ],

  lamps: [
    { id: 'l_shop_w', assetId: 'prop.street_lamp', x: -22.5, z: -7.5, rotationY: 0, lit: true },
    { id: 'l_shop_e', assetId: 'prop.street_lamp', x: -8.5, z: -7.5, rotationY: 0, lit: true, pointLight: true },
    { id: 'l_ne_c', assetId: 'prop.street_lamp', x: 8.5, z: -7.5, rotationY: 0, lit: true, pointLight: true },
    { id: 'l_ne_e', assetId: 'prop.street_lamp', x: 26, z: -7.5, rotationY: 0, lit: false },
    { id: 'l_sw_c', assetId: 'prop.street_lamp', x: -8.5, z: 7.5, rotationY: Math.PI, lit: true, pointLight: true },
    { id: 'l_se_c', assetId: 'prop.street_lamp', x: 8.5, z: 7.5, rotationY: Math.PI, lit: true },
    { id: 'l_n_ave', assetId: 'prop.street_lamp', x: -7.5, z: -22, rotationY: Math.PI * 0.5, lit: true },
    { id: 'l_s_ave', assetId: 'prop.street_lamp', x: 7.5, z: 22, rotationY: -Math.PI * 0.5, lit: false },
    { id: 'l_police', assetId: 'prop.street_lamp', x: -14.2, z: 39.2, rotationY: 0, lit: true, pointLight: true },
    { id: 'l_clinic', assetId: 'prop.street_lamp', x: 17.5, z: 39.2, rotationY: 0, lit: true, pointLight: true },
    { id: 'l_lab_gate', assetId: 'prop.street_lamp', x: 26.5, z: -37.8, rotationY: Math.PI, lit: true, pointLight: true },
  ],

  fences: [
    // Fenced vacant lot next to Last Shop (with wide pedestrian gap on south side)
    { id: 'f_lot1', x1: -35, z1: -14.5, x2: -22, z2: -14.5, kind: 'chainlink' },
    { id: 'f_lot2', x1: -35, z1: -14.5, x2: -35, z2: -8, kind: 'chainlink' },
    { id: 'f_lot3', x1: -35, z1: -8, x2: -30.5, z2: -8, kind: 'chainlink' },
    { id: 'f_lot4', x1: -26.5, z1: -8, x2: -22, z2: -8, kind: 'chainlink' },
    { id: 'f_lot5', x1: -22, z1: -14.5, x2: -22, z2: -8, kind: 'chainlink' },

    // Scrap yard SE behind Redline Auto
    { id: 'f_sy1', x1: 26, z1: 10, x2: 30, z2: 10, kind: 'wood' },
    { id: 'f_sy2', x1: 33.5, z1: 10, x2: 36.5, z2: 10, kind: 'wood' },
    { id: 'f_sy3', x1: 36.5, z1: 10, x2: 36.5, z2: 26, kind: 'wood' },
    { id: 'f_sy4', x1: 26, z1: 26, x2: 36.5, z2: 26, kind: 'wood' },
    { id: 'f_sy5', x1: 26, z1: 10, x2: 26, z2: 26, kind: 'wood' },

    // Research Facility fenced perimeter (gate at x: 29.2..32.8, z: -38.2)
    { id: 'f_res_w', x1: 20, z1: -49.2, x2: 20, z2: -38.2, kind: 'chainlink' },
    { id: 'f_res_n', x1: 20, z1: -49.2, x2: 38, z2: -49.2, kind: 'chainlink' },
    { id: 'f_res_e', x1: 38, z1: -49.2, x2: 38, z2: -38.2, kind: 'chainlink' },
    { id: 'f_res_sw', x1: 20, z1: -38.2, x2: 29.2, z2: -38.2, kind: 'chainlink' },
    { id: 'f_res_se', x1: 32.8, z1: -38.2, x2: 38, z2: -38.2, kind: 'chainlink' },

    // Perimeter containment fences along far edges (soft visual boundary)
    { id: 'f_edge_w', x1: -49.2, z1: -49, x2: -49.2, z2: 49, kind: 'chainlink' },
    { id: 'f_edge_e', x1: 49.2, z1: -49, x2: 49.2, z2: 49, kind: 'chainlink' },
  ],

  props: [
    // Outside Last Shop (keep front door clear!)
    { id: 'p_crate_s1', assetId: 'prop.crate', kind: 'crate', x: -20.2, z: -8.6, rotationY: 0.2, colliderW: 1.05, colliderD: 1.05, colliderRadius: 0.6, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_dump_s1', assetId: 'prop.dumpster', kind: 'dumpster', x: -9.2, z: -13.5, rotationY: Math.PI * 0.5, colliderW: 1.3, colliderD: 2.0, colliderRadius: 1.1, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_trash_s1', assetId: 'prop.trash', kind: 'trash', x: -21.5, z: -10.5, rotationY: 0.6, colliderW: 1, colliderD: 1, colliderRadius: 0.55, shape: 'circle', solid: false, onSidewalk: true },

    // Hydrants
    { id: 'p_hyd1', assetId: 'prop.hydrant', kind: 'hydrant', x: -7.8, z: -10.5, rotationY: 0, colliderW: 0.5, colliderD: 0.5, colliderRadius: 0.28, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_hyd2', assetId: 'prop.hydrant', kind: 'hydrant', x: 7.8, z: -10.5, rotationY: 0, colliderW: 0.5, colliderD: 0.5, colliderRadius: 0.28, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_hyd3', assetId: 'prop.hydrant', kind: 'hydrant', x: -8.2, z: 39.6, rotationY: 0, colliderW: 0.5, colliderD: 0.5, colliderRadius: 0.28, shape: 'circle', solid: true, onSidewalk: true },

    // Concrete Roadblock Barriers (passable around sides)
    { id: 'p_bar1', assetId: 'prop.barrier', kind: 'barrier', x: -3.2, z: -24.5, rotationY: 0.15, colliderW: 2.25, colliderD: 0.72, colliderRadius: 1.1, shape: 'rect', solid: true },
    { id: 'p_bar2', assetId: 'prop.barrier', kind: 'barrier', x: 2.8, z: -24.8, rotationY: -0.18, colliderW: 2.25, colliderD: 0.72, colliderRadius: 1.1, shape: 'rect', solid: true },
    { id: 'p_bar3', assetId: 'prop.barrier', kind: 'barrier', x: 34, z: 3.4, rotationY: 1.45, colliderW: 2.25, colliderD: 0.72, colliderRadius: 1.1, shape: 'rect', solid: true },
    { id: 'p_bar_mil', assetId: 'prop.barrier', kind: 'barrier', x: -3.8, z: -34.2, rotationY: 0.22, colliderW: 2.25, colliderD: 0.72, colliderRadius: 1.1, shape: 'rect', solid: true },
    { id: 'p_bar_lab', assetId: 'prop.barrier', kind: 'barrier', x: 25.0, z: -36.5, rotationY: 0.08, colliderW: 2.25, colliderD: 0.72, colliderRadius: 1.1, shape: 'rect', solid: true },

    // Dumpsters & Crates around blocks / alleys
    { id: 'p_dump2', assetId: 'prop.dumpster', kind: 'dumpster', x: 22.8, z: -11.5, rotationY: 0.1, colliderW: 2.0, colliderD: 1.3, colliderRadius: 1.1, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_dump3', assetId: 'prop.dumpster', kind: 'dumpster', x: -22.8, z: 12.5, rotationY: 0, colliderW: 2.0, colliderD: 1.3, colliderRadius: 1.1, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_crate2', assetId: 'prop.crate', kind: 'crate', x: 30, z: 16, rotationY: 0.4, colliderW: 1.05, colliderD: 1.05, colliderRadius: 0.6, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_crate3', assetId: 'prop.crate', kind: 'crate', x: 31.3, z: 16.4, rotationY: -0.2, colliderW: 1.05, colliderD: 1.05, colliderRadius: 0.6, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_crate_mil', assetId: 'prop.crate', kind: 'crate', x: 5.2, z: -30.5, rotationY: 0.2, colliderW: 1.05, colliderD: 1.05, colliderRadius: 0.6, shape: 'rect', solid: true },
    { id: 'p_crate_lab', assetId: 'prop.crate', kind: 'crate', x: 22.4, z: -41.5, rotationY: 0.35, colliderW: 1.05, colliderD: 1.05, colliderRadius: 0.6, shape: 'rect', solid: true, onSidewalk: true },

    // Rubble & Shrubs
    { id: 'p_rub1', assetId: 'prop.rubble', kind: 'rubble', x: -28, z: -11.5, rotationY: 0.3, colliderW: 1.5, colliderD: 1.5, colliderRadius: 0.8, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_rub2', assetId: 'prop.rubble', kind: 'rubble', x: 4.5, z: -14, rotationY: 1.1, colliderW: 1.5, colliderD: 1.5, colliderRadius: 0.8, shape: 'circle', solid: true },
    { id: 'p_shrub1', assetId: 'prop.shrub', kind: 'shrub', x: -32.5, z: -11, rotationY: 0, colliderW: 1.2, colliderD: 1.2, colliderRadius: 0.65, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_shrub2', assetId: 'prop.shrub', kind: 'shrub', x: -24, z: -12, rotationY: 0.8, colliderW: 1.2, colliderD: 1.2, colliderRadius: 0.65, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_shrub3', assetId: 'prop.shrub', kind: 'shrub', x: 28.5, z: 22.5, rotationY: 1.4, colliderW: 1.2, colliderD: 1.2, colliderRadius: 0.65, shape: 'circle', solid: true, onSidewalk: true },

    // Trash clusters
    { id: 'p_trash2', assetId: 'prop.trash', kind: 'trash', x: 9.8, z: -9.2, rotationY: 1.2, colliderW: 1, colliderD: 1, colliderRadius: 0.55, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_trash3', assetId: 'prop.trash', kind: 'trash', x: -9.8, z: 9.2, rotationY: 0.3, colliderW: 1, colliderD: 1, colliderRadius: 0.55, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_trash4', assetId: 'prop.trash', kind: 'trash', x: 24.5, z: 9.5, rotationY: 2.1, colliderW: 1, colliderD: 1, colliderRadius: 0.55, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_trash_evac', assetId: 'prop.trash', kind: 'trash', x: -23.5, z: -41.5, rotationY: 0.7, colliderW: 1, colliderD: 1, colliderRadius: 0.55, shape: 'circle', solid: false, onSidewalk: false },

    // Porch & sidewalk worktables holding scavenged items
    { id: 'p_wt_shop', assetId: 'prop.worktable', kind: 'worktable', x: -18.8, z: -8.7, rotationY: 0, colliderW: 1.6, colliderD: 0.88, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_wt_pharm', assetId: 'prop.worktable', kind: 'worktable', x: 12.6, z: -8.7, rotationY: 0, colliderW: 1.6, colliderD: 0.88, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_wt_diner', assetId: 'prop.worktable', kind: 'worktable', x: -13.2, z: 8.8, rotationY: 0, colliderW: 1.6, colliderD: 0.88, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_wt_bay', assetId: 'prop.worktable', kind: 'worktable', x: 11.4, z: 24.2, rotationY: Math.PI * 0.5, colliderW: 0.88, colliderD: 1.6, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: false },

    // Street Signs (Crossroads Navigation)
    { id: 'p_sign_nw', assetId: 'prop.street_sign', kind: 'street_sign', x: -7.8, z: -7.8, rotationY: 0, colliderW: 0.3, colliderD: 0.3, colliderRadius: 0.2, shape: 'circle', solid: true, onSidewalk: true },
    { id: 'p_sign_se', assetId: 'prop.street_sign', kind: 'street_sign', x: 7.8, z: 7.8, rotationY: Math.PI, colliderW: 0.3, colliderD: 0.3, colliderRadius: 0.2, shape: 'circle', solid: true, onSidewalk: true },

    // Abandoned Shopping Carts
    { id: 'p_cart_shop', assetId: 'prop.shopping_cart', kind: 'shopping_cart', x: -12.8, z: -8.5, rotationY: 0.65, colliderW: 0.68, colliderD: 0.95, colliderRadius: 0.5, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_cart_vale', assetId: 'prop.shopping_cart', kind: 'shopping_cart', x: 10.6, z: -9.1, rotationY: -0.95, colliderW: 0.68, colliderD: 0.95, colliderRadius: 0.5, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_cart_road', assetId: 'prop.shopping_cart', kind: 'shopping_cart', x: 7.4, z: -1.8, rotationY: 2.1, colliderW: 0.68, colliderD: 0.95, colliderRadius: 0.5, shape: 'rect', solid: true, onSidewalk: false },

    // Quarantine Signs, Sandbags & Hazard Cones (Storytelling)
    { id: 'p_qsign_north', assetId: 'prop.quarantine_sign', kind: 'quarantine_sign', x: -4.9, z: -22.2, rotationY: 0.24, colliderW: 1.75, colliderD: 0.3, colliderRadius: 0.85, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_qsign_vale', assetId: 'prop.quarantine_sign', kind: 'quarantine_sign', x: 21.9, z: -9.4, rotationY: -0.45, colliderW: 1.75, colliderD: 0.3, colliderRadius: 0.85, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_qsign_lab', assetId: 'prop.quarantine_sign', kind: 'quarantine_sign', x: 35.2, z: -37.2, rotationY: -0.35, colliderW: 1.75, colliderD: 0.3, colliderRadius: 0.85, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_sand_north1', assetId: 'prop.sandbag', kind: 'sandbag', x: 3.4, z: -22.7, rotationY: -0.18, colliderW: 2.2, colliderD: 0.5, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_sand_north2', assetId: 'prop.sandbag', kind: 'sandbag', x: -1.4, z: -26.8, rotationY: 0.08, colliderW: 2.2, colliderD: 0.5, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_sand_mil', assetId: 'prop.sandbag', kind: 'sandbag', x: -4.2, z: -31.8, rotationY: 0.14, colliderW: 2.2, colliderD: 0.5, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: false },
    { id: 'p_sand_police', assetId: 'prop.sandbag', kind: 'sandbag', x: -26.2, z: 39.35, rotationY: -0.12, colliderW: 2.2, colliderD: 0.5, colliderRadius: 0.9, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_cones_taxi', assetId: 'prop.hazard_cones', kind: 'hazard_cones', x: -0.9, z: -3.2, rotationY: 0.4, colliderW: 0.9, colliderD: 0.7, colliderRadius: 0.45, shape: 'circle', solid: false, onSidewalk: false },
    { id: 'p_cones_garage', assetId: 'prop.hazard_cones', kind: 'hazard_cones', x: 18.4, z: 9.2, rotationY: 1.2, colliderW: 0.9, colliderD: 0.7, colliderRadius: 0.45, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_cones_north', assetId: 'prop.hazard_cones', kind: 'hazard_cones', x: 4.9, z: -23.1, rotationY: 0.2, colliderW: 0.9, colliderD: 0.7, colliderRadius: 0.45, shape: 'circle', solid: false, onSidewalk: false },
    { id: 'p_cones_clinic', assetId: 'prop.hazard_cones', kind: 'hazard_cones', x: 19.2, z: 39.4, rotationY: 0.6, colliderW: 0.9, colliderD: 0.7, colliderRadius: 0.45, shape: 'circle', solid: false, onSidewalk: true },

    // Survivor Camps & Evac Shelters
    { id: 'p_camp_mercer', assetId: 'prop.survivor_camp', kind: 'survivor_camp', x: -32.2, z: -13.5, rotationY: 0.25, colliderW: 1.9, colliderD: 1.9, colliderRadius: 1.0, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_camp_lot', assetId: 'prop.survivor_camp', kind: 'survivor_camp', x: -11.5, z: 24.5, rotationY: -0.7, colliderW: 1.9, colliderD: 1.9, colliderRadius: 1.0, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_camp_yard', assetId: 'prop.survivor_camp', kind: 'survivor_camp', x: 29.8, z: 21.8, rotationY: 1.55, colliderW: 1.9, colliderD: 1.9, colliderRadius: 1.0, shape: 'rect', solid: true, onSidewalk: true },
    { id: 'p_camp_evac', assetId: 'prop.survivor_camp', kind: 'survivor_camp', x: -33.2, z: -47.2, rotationY: 0.4, colliderW: 1.9, colliderD: 1.9, colliderRadius: 1.0, shape: 'rect', solid: true, onSidewalk: false },

    // Ground Storytelling Decals (no collider)
    { id: 'p_decal_rb', assetId: 'prop.blood_scuffle', kind: 'blood_scuffle', x: 1.1, z: -22.6, rotationY: 0.5, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: false },
    { id: 'p_decal_vale', assetId: 'prop.blood_scuffle', kind: 'blood_scuffle', x: 19.3, z: -8.6, rotationY: 1.8, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_decal_clinic', assetId: 'prop.blood_scuffle', kind: 'blood_scuffle', x: 15.2, z: 41.2, rotationY: 1.1, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: false },
    { id: 'p_decal_oil_auto', assetId: 'prop.oil_slick', kind: 'oil_slick', x: 14.5, z: 10.6, rotationY: 0.3, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: true },
    { id: 'p_decal_oil_taxi', assetId: 'prop.oil_slick', kind: 'oil_slick', x: 2.5, z: -2.0, rotationY: 0.9, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: false },
    { id: 'p_decal_oil_bay', assetId: 'prop.oil_slick', kind: 'oil_slick', x: 17.5, z: 25.0, rotationY: 0.4, colliderW: 1, colliderD: 1, colliderRadius: 0.5, shape: 'circle', solid: false, onSidewalk: false },
  ],

  resources: [
    // Last Shop porch table & yard
    { id: 'res_food_shop', resourceId: 'canned_food', amount: 1, x: -19.1, z: -8.65, rotationY: 0.3, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_water_shop', resourceId: 'water_bottle', amount: 1, x: -18.4, z: -8.75, rotationY: -0.4, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_wood_shop', resourceId: 'wood', amount: 2, x: -9.3, z: -11.4, rotationY: 0.25, onSidewalk: true },

    // Vacant Lot, Mercer Flats Camp & NW Evac Lot
    { id: 'res_scrap_lot', resourceId: 'scrap_metal', amount: 2, x: -26.2, z: -11.8, rotationY: 0.7, onSidewalk: true },
    { id: 'res_wood_lot', resourceId: 'wood', amount: 2, x: -31.2, z: -12.6, rotationY: -0.45, onSidewalk: true },
    { id: 'res_food_mercer_camp', resourceId: 'canned_food', amount: 1, x: -33.6, z: -14.8, rotationY: 0.35, onSidewalk: true },
    { id: 'res_water_south_camp', resourceId: 'water_bottle', amount: 2, x: -12.8, z: 23.0, rotationY: -0.25, onSidewalk: true },
    { id: 'res_food_evac', resourceId: 'canned_food', amount: 2, x: -25.4, z: -46.2, rotationY: 0.4, onSidewalk: false },

    // Central intersection, Roadblock & Military Checkpoint
    { id: 'res_scrap_taxi', resourceId: 'scrap_metal', amount: 2, x: 0.3, z: -2.4, rotationY: 1.1, onSidewalk: false },
    { id: 'res_water_taxi', resourceId: 'water_bottle', amount: 1, x: 4.1, z: -1.4, rotationY: 0.5, onSidewalk: false },
    { id: 'res_food_north', resourceId: 'canned_food', amount: 1, x: -4.2, z: -19.2, rotationY: -0.6, onSidewalk: false },
    { id: 'res_scrap_north', resourceId: 'scrap_metal', amount: 2, x: 0.1, z: -23.2, rotationY: 0.2, onSidewalk: false },
    { id: 'res_med_mil', resourceId: 'medical_supplies', amount: 1, x: 5.2, z: -32.2, rotationY: -0.35, onSidewalk: false },

    // Vale Pharmacy table & Delivery Van
    { id: 'res_med_pharm', resourceId: 'medical_supplies', amount: 2, x: 12.25, z: -8.7, rotationY: 0.18, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_water_pharm', resourceId: 'water_bottle', amount: 2, x: 13.0, z: -8.75, rotationY: -0.35, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_water_van', resourceId: 'water_bottle', amount: 2, x: 26.8, z: 4.5, rotationY: 0.9, onSidewalk: false },

    // Starlight Diner table & west sedan
    { id: 'res_food_diner', resourceId: 'canned_food', amount: 2, x: -13.5, z: 8.8, rotationY: 0.4, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_water_diner', resourceId: 'water_bottle', amount: 1, x: -12.8, z: 8.85, rotationY: -0.2, onSidewalk: true, surfaceOffsetY: 0.78 },
    { id: 'res_scrap_sedan', resourceId: 'scrap_metal', amount: 1, x: -23.1, z: 4.8, rotationY: 0.85, onSidewalk: false },

    // Redline Auto, Industrial Service Bay & SE Scrap Yard behind wood gate
    { id: 'res_med_garage', resourceId: 'medical_supplies', amount: 1, x: 22.8, z: 10.0, rotationY: -0.4, onSidewalk: true },
    { id: 'res_scrap_bay', resourceId: 'scrap_metal', amount: 2, x: 11.4, z: 24.2, rotationY: 0.2, onSidewalk: false, surfaceOffsetY: 0.78 },
    { id: 'res_scrap_yard', resourceId: 'scrap_metal', amount: 3, x: 29.8, z: 13.8, rotationY: 0.3, onSidewalk: true },
    { id: 'res_wood_yard', resourceId: 'wood', amount: 3, x: 33.4, z: 14.2, rotationY: 0.65, onSidewalk: true },

    // Clinic Ambulance Bay & Lab Courtyard
    { id: 'res_med_clinic_amb', resourceId: 'medical_supplies', amount: 2, x: 10.8, z: 47.4, rotationY: 0.5, onSidewalk: false },
    { id: 'res_scrap_lab_yard', resourceId: 'scrap_metal', amount: 2, x: 24.2, z: -41.5, rotationY: -0.4, onSidewalk: true },
  ],

  gates: [
    {
      id: 'gate_vacant_lot',
      name: 'Vacant Lot Gate',
      assetId: 'interactable.chainlink_gate',
      kind: 'chainlink',
      x1: -30.5,
      z1: -8.0,
      x2: -26.5,
      z2: -8.0,
      openSwingAngle: 1.45,
    },
    {
      id: 'gate_scrap_yard',
      name: 'Scrapyard Gate',
      assetId: 'interactable.wood_gate',
      kind: 'wood',
      x1: 30.0,
      z1: 10.0,
      x2: 33.5,
      z2: 10.0,
      openSwingAngle: -1.45,
    },
    {
      id: 'gate_research_compound',
      name: 'V4 Research Compound Gate',
      assetId: 'interactable.chainlink_gate',
      kind: 'chainlink',
      x1: 29.2,
      z1: -38.2,
      x2: 32.8,
      z2: -38.2,
      openSwingAngle: 1.45,
    },
  ],

  containers: [
    {
      id: 'cnt_shop_case',
      name: 'Porch Supply Case',
      assetId: 'interactable.supply_case',
      kind: 'supply_case',
      x: -11.4,
      z: -8.75,
      rotationY: 0.08,
      onSidewalk: true,
      loot: { resourceId: 'water_bottle', amount: 2 },
    },
    {
      id: 'cnt_pharm_case',
      name: 'Paramedic Field Case',
      assetId: 'interactable.supply_case',
      kind: 'supply_case',
      x: 18.4,
      z: -8.75,
      rotationY: -0.25,
      onSidewalk: true,
      loot: { resourceId: 'medical_supplies', amount: 2 },
    },
    {
      id: 'cnt_van_case',
      name: 'Delivery Cargo Box',
      assetId: 'interactable.supply_case',
      kind: 'supply_case',
      x: 23.4,
      z: 3.1,
      rotationY: 1.5,
      onSidewalk: false,
      loot: { resourceId: 'canned_food', amount: 2 },
    },
    {
      id: 'cnt_garage_chest',
      name: 'Mechanic Tool Chest',
      assetId: 'interactable.tool_chest',
      kind: 'tool_chest',
      x: 16.2,
      z: 9.4,
      rotationY: 3.05,
      onSidewalk: true,
      loot: { resourceId: 'scrap_metal', amount: 2 },
    },
    {
      id: 'cnt_evac_case',
      name: 'Evacuation Bus Locker',
      assetId: 'interactable.supply_case',
      kind: 'supply_case',
      x: -26.5,
      z: -48.0,
      rotationY: 0.15,
      onSidewalk: false,
      loot: { resourceId: 'water_bottle', amount: 2 },
    },
    {
      id: 'cnt_police_patrol',
      name: 'Cruiser Armory Case',
      assetId: 'interactable.tool_chest',
      kind: 'tool_chest',
      x: -33.6,
      z: 47.6,
      rotationY: 0.25,
      onSidewalk: false,
      loot: { resourceId: 'canned_food', amount: 2 },
    },
    {
      id: 'cnt_mil_footlocker',
      name: 'Military Checkpoint Case',
      assetId: 'interactable.supply_case',
      kind: 'supply_case',
      x: -5.4,
      z: -31.8,
      rotationY: -0.2,
      onSidewalk: false,
      requiresToolResource: 'scrap_metal',
      lockedToolHint: 'Scrap Metal (Pry Bar)',
      loot: { resourceId: 'medical_supplies', amount: 2 },
    },
  ],

  contextZones: [
    {
      id: 'cz_shop',
      x: -15.5,
      z: -8.0,
      radius: 4.5,
      title: 'The Last Shop',
      message: 'Your backup porch lantern still glows. Open the front door to step inside your shop.',
    },
    {
      id: 'cz_taxi',
      x: 2.2,
      z: -1.8,
      radius: 5.0,
      title: 'Central Intersection',
      message: 'An abandoned cab sits crooked in the crossroads, rusted from the ash.',
    },
    {
      id: 'cz_pharmacy',
      x: 15.5,
      z: -8.0,
      radius: 5.0,
      title: 'Vale Corner Store',
      message: 'Shadowed aisles and a back dispensary lie behind the front door.',
    },
    {
      id: 'cz_diner',
      x: -15.5,
      z: 8.2,
      radius: 5.0,
      title: 'Starlight Diner',
      message: 'Faded red canopy over a boarded diner—its front door opens into the dining counter and back camp exit.',
    },
    {
      id: 'cz_garage',
      x: 17.0,
      z: 9.0,
      radius: 5.5,
      title: 'Redline Auto Garage',
      message: 'Wrecked cars line the forecourt. Step through the service door into the repair bays and parts office.',
    },
    {
      id: 'cz_barricade',
      x: 0,
      z: -24.5,
      radius: 5.5,
      title: 'North Roadblock',
      message: 'Concrete Jersey barriers and military sandbags choke the northbound avenue.',
    },
    {
      id: 'cz_lot',
      x: -28.5,
      z: -11.0,
      radius: 5.0,
      title: 'Fenced Vacant Lot',
      message: 'Overgrown weeds and concrete rubble behind the shop.',
    },
    {
      id: 'cz_police',
      x: -21.5,
      z: 38.5,
      radius: 5.5,
      title: 'District 04 Police Precinct',
      message: 'Sandbags guard the precinct steps. Check the patrol lot and the locked evidence room inside.',
    },
    {
      id: 'cz_clinic',
      x: 24.0,
      z: 38.5,
      radius: 5.5,
      title: 'Mercy Field Clinic',
      message: 'An abandoned ambulance rests beside the triage canopy. Medicine and facility keycards may remain inside.',
    },
    {
      id: 'cz_research',
      x: 31.0,
      z: -37.5,
      radius: 6.0,
      title: 'V4 Bio-Containment Lab',
      message: 'Chainlink fencing seals the bio-containment compound. Expect heavy infected activity near the airlock.',
    },
    {
      id: 'cz_evac_lot',
      x: -29.0,
      z: -44.0,
      radius: 6.0,
      title: 'North Evac Parking',
      message: 'Abandoned evacuation vehicles and camp tarps sit silent north of Mercer Flats.',
    },
  ],
};

