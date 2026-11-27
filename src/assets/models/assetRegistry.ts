export interface AssetManifestEntry {
  /** Optional URL to an external .glb or .gltf model (e.g. '/assets/models/sedan.glb'). */
  gltfUrl?: string;
  /** Optional uniform scale multiplier applied when loading external GLTF/GLB assets. */
  scale?: number;
  /** Optional vertical ground offset in meters. */
  yOffset?: number;
  /** Optional rotation offset around Y axis (radians). */
  rotationY?: number;
}

/**
 * Central Asset Registry for Last Shop.
 * To swap any procedural prototype object with an external GLB/GLTF asset
 * (from Fab, Blender, etc.), set `gltfUrl` for the matching key below.
 */
export const ASSET_REGISTRY: Record<string, AssetManifestEntry> = {
  'building.last_shop': {},
  'building.apartment': {},
  'building.pharmacy': {},
  'building.garage': {},
  'building.diner': {},
  'building.warehouse': {},
  'building.enterable.last_shop': {},
  'building.enterable.corner_store': {},
  'building.enterable.storage': {},
  'building.enterable.house': {},
  'building.enterable.diner': {},
  'building.enterable.garage': {},
  'building.enterable.police': {},
  'building.enterable.clinic': {},
  'building.enterable.lab': {},
  'vehicle.sedan': {
    gltfUrl: '/src/assets/models/passenger_car_pack.glb',
  },
  'vehicle.taxi': {
    gltfUrl: '/src/assets/models/passenger_car_pack.glb',
  },
  'vehicle.pickup': {
    gltfUrl: '/src/assets/models/passenger_car_pack.glb',
  },
  'vehicle.van': {
    gltfUrl: '/src/assets/models/passenger_car_pack.glb',
  },
  'prop.street_lamp': {},
  'prop.street_sign': {},
  'prop.dumpster': {},
  'prop.crate': {},
  'prop.trash': {},
  'prop.barrier': {},
  'prop.rubble': {},
  'prop.shrub': {},
  'prop.hydrant': {},
  'prop.worktable': {},
  'prop.shopping_cart': {},
  'prop.quarantine_sign': {},
  'prop.sandbag': {},
  'prop.hazard_cones': {},
  'prop.survivor_camp': {},
  'prop.blood_scuffle': {},
  'prop.oil_slick': {},
  'resource.canned_food': {},
  'resource.water_bottle': {},
  'resource.scrap_metal': {},
  'resource.wood': {},
  'resource.medical_supplies': {},
  'key.key': {},
  'key.keycard': {},
  'interactable.chainlink_gate': {},
  'interactable.wood_gate': {},
  'interactable.door_wood': {},
  'interactable.door_metal': {},
  'interactable.supply_case': {},
  'interactable.tool_chest': {},
  'interactable.cabinet': {},
  'interactable.drawer': {},
  'interactable.storage_box': {},
  'interactable.med_cabinet': {},
  'interactable.shop_register': {},
  'interactable.shop_storage': {},
  'deco.sign': {},
  'deco.floor': {},
  'deco.lighting': {},
  'deco.table': {},
  'deco.shelves': {},
  'deco.fridge': {},
  'shop.expansion_wing': {},
  'shop.storage_rack': {},
  'enemy.zombie': {
    gltfUrl: '/src/assets/models/zombie-glb.glb',
    scale: 1.36,
    yOffset: 0.014,
    rotationY: Math.PI,
  },
  'player.survivor': {
    gltfUrl: '/src/assets/models/c8ab20b8b539e27cabe59928e7abff79.glb',
    scale: 1.78,
    yOffset: 0,
    rotationY: Math.PI,
  },
  'npc.customer': {},
  'npc.survivor': {},
  'npc.employee_shopkeeper': {},
  'npc.employee_guard': {},
  'npc.employee_storage': {},
  'npc.employee_collector': {},
  'weapon.melee_pipe': {},
  'story.radio': {},
  'story.document': {},
  'story.cache': {},
  'story.relay': {},
};
