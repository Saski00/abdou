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
    initialNote: 'Cruiser shotgun rack is empty, but trunk hardware remains. Dash tag notes: "Evidence Key locked inside Captain Morales office."',
    inspectedNote: 'Patrol Cruiser #04 — dead battery, Precinct radio still clicking faintly.',
    loot: { resourceId: 'scrap_metal', amount: 1 },
  },
  v_clinic_amb: {
    name: 'Mercy Triage Ambulance',
    initialNote: 'Forced the jammed side compartment — an intact trauma pack survived. Triage clipboard points to the Clinic Exam Wing for Pharmacy keys.',
    inspectedNote: 'Mercy Triage Ambulance — oxygen cylinders depleted, triage tray empty.',
    loot: { resourceId: 'medical_supplies', amount: 1 },
  },
  v_mil_truck: {
    name: 'Military Cargo Truck',
    initialNote: 'Olive-drab transport bed held spare armor fasteners and steel plates. Convoy manifest mentions V4 containment lockouts.',
    inspectedNote: 'Military Cargo Truck — tailgate bent open, spare crates cleared.',
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
  p_trash_evac: {
    name: 'Abandoned Evac Bags',
    searchAction: 'Search Bags',
    emptyAction: 'Inspect Bags',
    initialNote: 'Rummaged through soaked evacuation duffel bags — found an unopened bottle of water.',
    inspectedNote: 'Abandoned Evac Bags — luggage tags from Mercer Flats, picked clean.',
    loot: { resourceId: 'water_bottle', amount: 1 },
    radiusOffset: 0.5,
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
  p_bar1: {
    name: 'Northbound Concrete Barrier',
    actionLabel: 'Examine',
    noteTitle: 'Roadblock Line',
    noteText: 'Chipped Jersey barriers stenciled "SECTOR A HOLD LINE". Bullet gouges face south toward Main Blvd.',
    radiusOffset: 0.9,
  },
  p_bar_mil: {
    name: 'Checkpoint Blast Barrier',
    actionLabel: 'Examine',
    noteTitle: 'Military Checkpoint',
    noteText: 'Heavy reinforced barrier protecting the North St patrol post and emergency supply footlocker.',
    radiusOffset: 0.9,
  },
  p_bar_lab: {
    name: 'Lab Gate Barrier',
    actionLabel: 'Examine',
    noteTitle: 'Containment Perimeter',
    noteText: 'Bio-containment blockade stamped "V4 CLEARANCE ONLY". Guard post abandoned during lockdown.',
    radiusOffset: 0.9,
  },
  p_sand_north1: {
    name: 'Roadblock Sandbags',
    actionLabel: 'Inspect',
    noteTitle: 'Checkpoint Fighting Position',
    noteText: 'Torn sandbags and spent brass casings scattered around the emergency relay tower.',
    radiusOffset: 0.85,
  },
  p_sand_mil: {
    name: 'North Patrol Sandbags',
    actionLabel: 'Inspect',
    noteTitle: 'Patrol Bunker',
    noteText: 'Chalk tally marks count days until radio batteries died. The 148.6 MHz repeater still has intact wiring.',
    radiusOffset: 0.85,
  },
  p_sand_police: {
    name: 'Precinct Sandbags',
    actionLabel: 'Inspect',
    noteTitle: 'Precinct Perimeter',
    noteText: 'Officers stacked sandbags across South St before retreating inside to lock the Evidence Room.',
    radiusOffset: 0.85,
  },
  p_rub1: {
    name: 'Collapsed Brick Rubble',
    actionLabel: 'Examine',
    noteTitle: 'Vacant Lot Ruins',
    noteText: 'Crumbled brick from an old corner wall—good source of loose wood and scrap around the fenced lot.',
    radiusOffset: 0.75,
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
  if (buildingId === 'starlight_diner' && furnitureKind === 'kitchen_counter') {
    return {
      interactKind: 'workbench',
      name: 'Diner Kitchen Prep Station',
      radiusOffset: 0.85,
    };
  }

  // Meaningful interior environmental storytelling & facility checks
  if (buildingId === 'last_shop') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Front Checkout Counter',
        actionLabel: 'Check',
        noteTitle: 'Last Shop Counter',
        noteText: 'Polished timber counter and ledger tray. Interact with the brass register to manage shop stock, prices, and upgrades.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'shelf' && index === 1) {
      return {
        interactKind: 'examine',
        name: 'Retail Display Shelf',
        actionLabel: 'Inspect',
        noteTitle: 'Storefront Display',
        noteText: 'Display shelves update automatically as you stock food, water, scrap, wood, and medical supplies at the counter.',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'shelf' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Storeroom Rack',
        actionLabel: 'Inspect',
        noteTitle: 'Backroom Reserve Rack',
        noteText: 'Extra storage brackets line the west wall—upgrade Storage Tiers at the counter to expand reserve capacity.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'vale_pharmacy') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Vale Checkout Counter',
        actionLabel: 'Inspect',
        noteTitle: 'Abandoned Register',
        noteText: 'Cash drawer was emptied before lockdown, leaving behind stamped quarantine clinic transfer slips.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'shelf' && index === 1) {
      return {
        interactKind: 'examine',
        name: 'Picked-Over Aisle Shelf',
        actionLabel: 'Inspect',
        noteTitle: 'Store Aisle',
        noteText: 'Empty medicine cartons litter the bottom rack. Most emergency stock was locked inside the back dispensary.',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'table' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Dispensary Prep Table',
        actionLabel: 'Inspect',
        noteTitle: 'Vale Dispensary',
        noteText: 'Stainless tray stained with antiseptic and courier packing tape from Depot 04.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'depot_04') {
    if (furnitureKind === 'shelf' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Freight Inventory Rack',
        actionLabel: 'Inspect',
        noteTitle: 'Depot Freight Racks',
        noteText: 'Heavy steel racking stamped "MUNICIPAL CONTINGENCY STOCK".',
        radiusOffset: 0.8,
      };
    }
    if (furnitureKind === 'pallet_crates' && index === 2) {
      return {
        interactKind: 'examine',
        name: 'Strapped Freight Pallets',
        actionLabel: 'Inspect',
        noteTitle: 'Northbound Cargo',
        noteText: 'Barcoded crates addressed to North Roadblock Relay Maintenance—only heavy straps remain.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'abandoned_house') {
    if (furnitureKind === 'kitchen_counter') {
      return {
        interactKind: 'examine',
        name: 'Kitchen Faucet',
        actionLabel: 'Check',
        noteTitle: 'Dry Kitchen Tap',
        noteText: 'Rust drips once from the spout before the pipe goes completely silent.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'sink_vanity') {
      return {
        interactKind: 'examine',
        name: 'Bathroom Sink',
        actionLabel: 'Check',
        noteTitle: 'Dry Vanity Tap',
        noteText: 'The tank is empty, though a spare medical cabinet hangs on the east wall.',
        radiusOffset: 0.65,
      };
    }
    if (furnitureKind === 'table' && index === 1) {
      return {
        interactKind: 'examine',
        name: 'Dining Table',
        actionLabel: 'Inspect',
        noteTitle: 'Dr. Vance Quarter',
        noteText: 'Folded frequency charts and half-finished coffee mugs left in haste.',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'couch' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Worn Living Couch',
        actionLabel: 'Search',
        noteTitle: 'Living Room',
        noteText: 'Torn cushions and a wool blanket—no supplies tucked underneath.',
        radiusOffset: 0.85,
      };
    }
  }

  if (buildingId === 'starlight_diner') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Diner Service Counter',
        actionLabel: 'Inspect',
        noteTitle: 'Starlight Counter',
        noteText: 'Cracked chrome stools and cold coffee carafes—check the menu board and pantry cabinet in back.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'table' && index === 1) {
      return {
        interactKind: 'examine',
        name: 'Diner Booth Table',
        actionLabel: 'Inspect',
        noteTitle: 'Evacuation Staging Booth',
        noteText: 'Scratched into the laminate: "Back kitchen exit leads straight to South Diner Camp."',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'shelf' && index === 4) {
      return {
        interactKind: 'examine',
        name: 'Pantry Supply Shelf',
        actionLabel: 'Inspect',
        noteTitle: 'Diner Pantry',
        noteText: 'Wire racks picked bare except for the locked Pantry Cabinet and backroom crate.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'redline_auto') {
    if (furnitureKind === 'pallet_crates' && index === 1) {
      return {
        interactKind: 'examine',
        name: 'Auto Parts Pallets',
        actionLabel: 'Inspect',
        noteTitle: 'Garage Stock',
        noteText: 'Alternator housings and timber shipping skids stacked beside the rear Service Bay exit.',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'table' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Parts Office Desk',
        actionLabel: 'Inspect',
        noteTitle: 'Redline Parts Office',
        noteText: 'Work orders list armored plate welds for Military Checkpoint trucks.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'police_precinct') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Precinct Booking Desk',
        actionLabel: 'Inspect',
        noteTitle: 'Precinct Reception',
        noteText: 'Shattered safety glass over the dispatch desk. Evidence Room requires Captain Morales’s key.',
        radiusOffset: 0.9,
      };
    }
    if (furnitureKind === 'table' && index === 3) {
      return {
        interactKind: 'examine',
        name: "Captain's Desk",
        actionLabel: 'Inspect',
        noteTitle: 'Captain Morales Office',
        noteText: 'Seizure logs and patrol rosters—Evidence Locker sits across the hall to the east.',
        radiusOffset: 0.8,
      };
    }
    if (furnitureKind === 'shelf' && index === 4) {
      return {
        interactKind: 'examine',
        name: 'Seized Evidence Rack',
        actionLabel: 'Inspect',
        noteTitle: 'Evidence Storage',
        noteText: 'Tagged property bins sealed before the blackout.',
        radiusOffset: 0.75,
      };
    }
  }

  if (buildingId === 'mercy_clinic') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Clinic Triage Desk',
        actionLabel: 'Inspect',
        noteTitle: 'Mercy Clinic Triage',
        noteText: 'Patient intake clipboards and an emergency key note pointing toward the Triage Exam Wing.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'table' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Triage Exam Table',
        actionLabel: 'Inspect',
        noteTitle: 'Exam Wing',
        noteText: 'Sterile trays and patient charts documenting early Class-V4 fever cases.',
        radiusOffset: 0.8,
      };
    }
    if (furnitureKind === 'counter' && index === 4) {
      return {
        interactKind: 'examine',
        name: 'Pharmacy Dispensary Counter',
        actionLabel: 'Inspect',
        noteTitle: 'Clinic Pharmacy',
        noteText: 'Refrigerated medical bins and V4 Research Lab clearance logs.',
        radiusOffset: 0.85,
      };
    }
  }

  if (buildingId === 'research_lab') {
    if (furnitureKind === 'counter' && index === 0) {
      return {
        interactKind: 'examine',
        name: 'Decontamination Console',
        actionLabel: 'Inspect',
        noteTitle: 'Bio-Lab Airlock',
        noteText: 'Airlock pressure gauges reading ZERO—backup power failed weeks ago.',
        radiusOffset: 0.85,
      };
    }
    if (furnitureKind === 'shelf' && index === 2) {
      return {
        interactKind: 'examine',
        name: 'Observation Log Shelf',
        actionLabel: 'Inspect',
        noteTitle: 'Lab Observation Room',
        noteText: 'Binders labeled "ASHFALL PARTICULATE & V4 CONTAINMENT" line the wall.',
        radiusOffset: 0.75,
      };
    }
    if (furnitureKind === 'table' && index === 3) {
      return {
        interactKind: 'examine',
        name: 'Specimen Vault Bench',
        actionLabel: 'Inspect',
        noteTitle: 'V4 Specimen Vault',
        noteText: 'Reinforced stainless containment bench beside the V4 Archive Terminal.',
        radiusOffset: 0.8,
      };
    }
  }

  return null;
}
