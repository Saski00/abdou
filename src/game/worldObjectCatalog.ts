import { ResourceId } from './types';

export interface VehicleInteractSpec {
  name: string;
  initialNote: string;
  inspectedNote: string;
  loot?: {
    resourceId: ResourceId;
    amount: number;
  };
}

export interface PropSearchSpec {
  name: string;
  searchAction: string;
  emptyAction: string;
  initialNote: string;
  inspectedNote: string;
  loot?: {
    resourceId: ResourceId;
    amount: number;
  };
  radiusOffset: number;
}

export interface PropExamineSpec {
  name: string;
  actionLabel: string;
  noteTitle: string;
  noteText: string;
  radiusOffset: number;
}

export const VEHICLE_INTERACT_SPECS: Record<string, VehicleInteractSpec> = {
  v_taxi: {
    name: 'Central Cab #412',
    initialNote: 'Glovebox holds spare hardware and a crumpled North Roadblock transit slip.',
    inspectedNote: 'Central Cab #412 — meter frozen at 09:14, doors stripped of wiring.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
  },
  v_sedan1: {
    name: 'Wrecked Grey Sedan',
    initialNote: 'Pried the trunk latch — a sealed water bottle rolled under the spare tire.',
    inspectedNote: 'Wrecked Grey Sedan — flattened tires and shattered rear glass.',
    loot: { resourceId: 'water_bottle', amount: 1 },
  },
  v_pickup1: {
    name: 'Eastside Pickup Truck',
    initialNote: 'Splintered barricade timber strapped neatly inside the truck bed.',
    inspectedNote: 'Eastside Pickup — cracked radiator, bed cleared of usable lumber.',
    loot: { resourceId: 'wood', amount: 1 },
  },
  v_van1: {
    name: 'Courier Delivery Van',
    initialNote: 'One ration tin stayed wedged beneath the overturned parcel rack.',
    inspectedNote: 'Courier Van — ash-smeared manifests scatter the empty cargo bay.',
    loot: { resourceId: 'canned_food', amount: 1 },
  },
  v_garage1: {
    name: 'Redline Tow Sedan',
    initialNote: 'Engine bay already stripped to bare cast iron by Redline mechanics.',
    inspectedNote: 'Redline Tow Sedan — bare frame left on blocks outside the service shutter.',
  },
  v_north1: {
    name: 'Roadblock Recon Pickup',
    initialNote: 'Heavy steel mounting brackets found inside the bent bed toolbox.',
    inspectedNote: 'Roadblock Recon Pickup — nose crumpled from the northern rush.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
  },
  v_south1: {
    name: 'South Ave Taxi',
    initialNote: 'Empty cab — torn Precinct evacuation flyer resting on the cracked dash.',
    inspectedNote: 'South Ave Taxi — doors unlocked, cabin picked clean days ago.',
  },
  v_evac_van: {
    name: 'Evacuation Transport Van',
    initialNote: 'Emergency transit van from Mercer Flats — tucked water bottle under the bench.',
    inspectedNote: 'Evacuation Van — hasty chalk route markings toward North Roadblock.',
    loot: { resourceId: 'water_bottle', amount: 1 },
  },
  v_police_car: {
    name: 'Patrol Cruiser #04',
    initialNote: 'Cruiser rack is empty, but heavy steel trunk hardware remains.',
    inspectedNote: 'Patrol Cruiser #04 — dead battery, Precinct radio still clicking faintly.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
  },
  v_clinic_amb: {
    name: 'Mercy Triage Ambulance',
    initialNote: 'Forced the jammed side compartment — an intact trauma pack survived inside.',
    inspectedNote: 'Mercy Triage Ambulance — oxygen cylinders depleted, triage tray empty.',
    loot: { resourceId: 'medical_supplies', amount: 1 },
  },
  v_mil_truck: {
    name: 'Military Cargo Truck',
    initialNote: 'Olive-drab transport bed held spare armor fasteners and steel plates.',
    inspectedNote: 'Military Cargo Truck — convoy orders mention V4 containment lockouts.',
    loot: { resourceId: 'scrap_metal', amount: 2 },
  },
};

export const PROP_WORKBENCH_NAMES: Record<string, string> = {
  p_wt_shop: 'Porch Worktable',
  p_wt_pharm: 'Dispensary Bench',
  p_wt_diner: 'Diner Prep Bench',
  p_wt_bay: 'Service Bay Workbench',
};

export const PROP_SEARCH_SPECS: Record<string, PropSearchSpec> = {
  p_dump_s1: {
    name: 'Alley Dumpster',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Dug past rusted tin cans — salvaged intact sheet metal.',
    inspectedNote: 'Alley Dumpster — damp ash and crushed cans, nothing left to salvage.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
    radiusOffset: 0.75,
  },
  p_dump2: {
    name: 'Vale Side Dumpster',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Picked clean — only shattered bottles and burned quarantine notices.',
    inspectedNote: 'Vale Side Dumpster — nothing usable remains inside.',
    radiusOffset: 0.75,
  },
  p_dump3: {
    name: 'Diner Rear Dumpster',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Found dry shipping pallet slats stacked behind the lid.',
    inspectedNote: 'Diner Rear Dumpster — kitchen scraps long dried out.',
    loot: { resourceId: 'wood', amount: 1 },
    radiusOffset: 0.75,
  },
  p_crate_s1: {
    name: 'Sidewalk Supply Crate',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Pried open a nailed corner — sturdy lumber planks inside.',
    inspectedNote: 'Sidewalk Supply Crate — empty packing straw inside.',
    loot: { resourceId: 'wood', amount: 1 },
    radiusOffset: 0.45,
  },
  p_crate2: {
    name: 'Scrapyard Crate',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Recovered heavy steel bolts and bracket scrap.',
    inspectedNote: 'Scrapyard Crate — stripped of usable parts.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
    radiusOffset: 0.45,
  },
  p_crate3: {
    name: 'Timber Storage Crate',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Crate already cracked open during an earlier salvage run.',
    inspectedNote: 'Timber Storage Crate — empty wooden slats.',
    radiusOffset: 0.45,
  },
  p_crate_mil: {
    name: 'Checkpoint Ration Crate',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Unsealed stencil box — one army ration tin remained at the bottom.',
    inspectedNote: 'Checkpoint Ration Crate — stenciled "D04 NORTH SECTOR — EMPTY".',
    loot: { resourceId: 'canned_food', amount: 1 },
    radiusOffset: 0.45,
  },
  p_crate_lab: {
    name: 'Lab Compound Crate',
    searchAction: 'Search',
    emptyAction: 'Inspect',
    initialNote: 'Protective foam held sterile field bandages beneath torn seals.',
    inspectedNote: 'Lab Compound Crate — bio-hazard shipping foam only.',
    loot: { resourceId: 'medical_supplies', amount: 1 },
    radiusOffset: 0.45,
  },
  p_camp_mercer: {
    name: 'Mercer Camp Tarp',
    searchAction: 'Search Camp',
    emptyAction: 'Inspect Camp',
    initialNote: 'Cold campfire ring — tucked a leftover water bottle beneath the pack.',
    inspectedNote: 'Mercer Camp — bedrolls rolled tight; someone headed toward Main Street.',
    loot: { resourceId: 'water_bottle', amount: 1 },
    radiusOffset: 0.85,
  },
  p_camp_lot: {
    name: 'Diner Back Camp',
    searchAction: 'Search Camp',
    emptyAction: 'Inspect Camp',
    initialNote: 'Ash-coated kettle and stacked firewood split near the tent poles.',
    inspectedNote: 'Diner Back Camp — chalk mark reads "SHOP OPEN WEST ON MAIN".',
    loot: { resourceId: 'wood', amount: 1 },
    radiusOffset: 0.85,
  },
  p_camp_yard: {
    name: 'Scrapyard Shelter',
    searchAction: 'Search Camp',
    emptyAction: 'Inspect Camp',
    initialNote: 'Tarp leaned against scrap panels — found loose metal fittings.',
    inspectedNote: 'Scrapyard Shelter — empty camp stove and soot-stained tarp.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
    radiusOffset: 0.85,
  },
  p_camp_evac: {
    name: 'Evac Lot Shelter',
    searchAction: 'Search Camp',
    emptyAction: 'Inspect Camp',
    initialNote: 'Found a forgotten ration tin beside an overturned folding stool.',
    inspectedNote: 'Evac Lot Shelter — evacuation bus departed before dawn.',
    loot: { resourceId: 'canned_food', amount: 1 },
    radiusOffset: 0.85,
  },
  p_cart_shop: {
    name: 'Shopfront Cart',
    searchAction: 'Check Cart',
    emptyAction: 'Inspect Cart',
    initialNote: 'Bent wire basket — a single bottle sat wedged under the child seat.',
    inspectedNote: 'Shopfront Cart — rusted wheels locked in dried ash.',
    loot: { resourceId: 'water_bottle', amount: 1 },
    radiusOffset: 0.4,
  },
  p_cart_vale: {
    name: 'Storefront Cart',
    searchAction: 'Check Cart',
    emptyAction: 'Inspect Cart',
    initialNote: 'Empty wire cart overturned beside Vale Corner Store.',
    inspectedNote: 'Storefront Cart — empty wire frame.',
    radiusOffset: 0.4,
  },
  p_cart_road: {
    name: 'Roadside Cart',
    searchAction: 'Check Cart',
    emptyAction: 'Inspect Cart',
    initialNote: 'Stranded cart full of wet newspapers — nothing worth carrying.',
    inspectedNote: 'Roadside Cart — left in the middle lane during the evacuation.',
    radiusOffset: 0.4,
  },
};

export const PROP_EXAMINE_SPECS: Record<string, PropExamineSpec> = {
  p_sign_nw: {
    name: 'North-West Street Sign',
    actionLabel: 'Read Sign',
    noteTitle: 'District 04 Crossroads',
    noteText: 'NORTH: North Roadblock & V4 Lab · WEST: The Last Shop · EAST: Vale Store · SOUTH: Precinct & Clinic.',
    radiusOffset: 0.35,
  },
  p_sign_se: {
    name: 'South-East Street Sign',
    actionLabel: 'Read Sign',
    noteTitle: 'Commercial & Industrial Signpost',
    noteText: 'NORTH: Vale Store & Depot 04 · EAST: Redline Auto & Scrap Yard · SOUTH: Mercy Clinic · WEST: Starlight Diner.',
    radiusOffset: 0.35,
  },
  p_qsign_north: {
    name: 'Quarantine Notice',
    actionLabel: 'Read Notice',
    noteTitle: 'DISTRICT 04 EVACUATION ORDER',
    noteText: 'All civilians report to North Roadblock Relay. Do NOT breach V4 Bio-Containment without Clinic access clearance.',
    radiusOffset: 0.65,
  },
  p_qsign_vale: {
    name: 'Pharmacy Advisory Board',
    actionLabel: 'Read Notice',
    noteTitle: 'MUNICIPAL SUPPLY NOTICE',
    noteText: 'Prescription stock moved to Mercy Field Clinic. Remaining first-aid kits stored in Vale back dispensary.',
    radiusOffset: 0.65,
  },
  p_qsign_lab: {
    name: 'Bio-Hazard Placard',
    actionLabel: 'Read Notice',
    noteTitle: 'V4 BIO-CONTAINMENT PROTOCOL',
    noteText: 'Level-4 Specimen Vault sealed. Access Keycard issued exclusively to Mercy Field Clinic Pharmacy lead.',
    radiusOffset: 0.65,
  },
  p_hyd1: {
    name: 'Street Hydrant',
    actionLabel: 'Test Valve',
    noteTitle: 'Municipal Water Main',
    noteText: 'Turned the valve nut — only dry air hisses back. Water pressure failed on Day 2.',
    radiusOffset: 0.3,
  },
  p_hyd2: {
    name: 'Eastside Hydrant',
    actionLabel: 'Test Valve',
    noteTitle: 'Municipal Water Main',
    noteText: 'Bone dry. Bottled water and filtered rain remain the only clean supply.',
    radiusOffset: 0.3,
  },
  p_hyd3: {
    name: 'Precinct Hydrant',
    actionLabel: 'Test Valve',
    noteTitle: 'Municipal Water Main',
    noteText: 'Valves locked shut to preserve reserve lines inside the Precinct.',
    radiusOffset: 0.3,
  },
  p_decal_rb: {
    name: 'Barricade Scuffle',
    actionLabel: 'Inspect Marks',
    noteTitle: 'Roadblock Clue',
    noteText: 'Heavy boot prints dragged toward the northern sandbags—defenders fell back in a hurry.',
    radiusOffset: 0.55,
  },
  p_decal_vale: {
    name: 'Shattered Glass Trail',
    actionLabel: 'Inspect Trail',
    noteTitle: 'Storefront Clue',
    noteText: 'Broken medical vials lead from Vale Corner Store toward Mercy Field Clinic south.',
    radiusOffset: 0.55,
  },
  p_decal_clinic: {
    name: 'Triage Drag Marks',
    actionLabel: 'Inspect Marks',
    noteTitle: 'Clinic Courtyard Clue',
    noteText: 'Gurney tracks and dropped triage tags point into Mercy Clinic’s exam wing.',
    radiusOffset: 0.55,
  },
  p_decal_oil_auto: {
    name: 'Fresh Oil Spill',
    actionLabel: 'Inspect Spill',
    noteTitle: 'Garage Forecourt',
    noteText: 'Dark hydraulic oil pooled beneath a tow rig that left tracks into Redline Auto.',
    radiusOffset: 0.55,
  },
  p_decal_oil_taxi: {
    name: 'Transmission Leak',
    actionLabel: 'Inspect Spill',
    noteTitle: 'Intersection Wreckage',
    noteText: 'Dried fluid beneath Cab #412—engine seized right across the crossroads.',
    radiusOffset: 0.55,
  },
  p_decal_oil_bay: {
    name: 'Service Bay Grease',
    actionLabel: 'Inspect Spill',
    noteTitle: 'Industrial Zone',
    noteText: 'Heavy gear grease smeared toward the unlocked Scrap Yard timber gate.',
    radiusOffset: 0.55,
  },
};

export interface FurnitureInteractSpec {
  interactKind: 'workbench' | 'bed' | 'examine';
  name: string;
  actionLabel?: string;
  noteTitle?: string;
  noteText?: string;
  radiusOffset: number;
}

export function getInteriorFurnitureInteractionSpec(
  buildingId: string,
  furnitureKind: string,
  index: number
): FurnitureInteractSpec | null {
  if (furnitureKind === 'bed') {
    return {
      interactKind: 'bed',
      name: buildingId === 'mercy_clinic' ? 'Triage Cot' : 'House Bed',
      radiusOffset: 0.85,
    };
  }
  if (buildingId === 'last_shop' && furnitureKind === 'table' && index === 4) {
    return {
      interactKind: 'workbench',
      name: 'Storeroom Workbench',
      radiusOffset: 0.75,
    };
  }
  if (buildingId === 'depot_04' && furnitureKind === 'table' && index === 1) {
    return {
      interactKind: 'workbench',
      name: 'Depot Tool Bench',
      radiusOffset: 0.75,
    };
  }
  if (buildingId === 'redline_auto' && furnitureKind === 'table' && index === 0) {
    return {
      interactKind: 'workbench',
      name: 'Mechanic Repair Bench',
      radiusOffset: 0.75,
    };
  }
  if (buildingId === 'abandoned_house' && furnitureKind === 'kitchen_counter') {
    return {
      interactKind: 'examine',
      name: 'Kitchen Faucet',
      actionLabel: 'Check Faucet',
      noteTitle: 'Dry Kitchen Tap',
      noteText: 'Rust drips once from the spout before the pipe goes completely silent.',
      radiusOffset: 0.85,
    };
  }
  if (buildingId === 'abandoned_house' && furnitureKind === 'sink_vanity') {
    return {
      interactKind: 'examine',
      name: 'Bathroom Sink',
      actionLabel: 'Check Faucet',
      noteTitle: 'Dry Vanity Tap',
      noteText: 'The tank is empty, though a spare medical cabinet hangs on the east wall.',
      radiusOffset: 0.65,
    };
  }
  return null;
}
