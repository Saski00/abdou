import { SIDEWALK_HEIGHT } from '../assets/maps/neighborhoodMap';
import {
  formatTemplate,
  getTranslations,
  tClue,
  tMission,
  tMissionObjectiveLabel,
  tResourceName,
  tStoryObject,
  tSurvivor,
} from '../i18n';
import { RESOURCE_ORDER, consumeInventoryResource } from './resources';
import {
  InventoryState,
  MissionCategory,
  MissionObjectiveSummary,
  MissionRewardSummary,
  MissionSnapshot,
  MissionStatus,
  MissionSummary,
  ObjectiveType,
  ResourceId,
  StoryClueSummary,
  StoryObjectInspectionData,
} from './types';

export interface StoryObjectConfig {
  id: string;
  name: string;
  subtitle: string;
  actionLabel: string;
  category: 'radio' | 'document' | 'relay' | 'cache';
  x: number;
  y: number;
  z: number;
  rotationY: number;
  initialBody: string;
  activatedBody?: string;
  requiresResources?: Partial<InventoryState>;
  activateActionLabel?: string;
  unlockedInMissionId?: string;
  transmitMissionId?: string;
}

const INTERIOR_Y = SIDEWALK_HEIGHT + 0.08;

export const STORY_OBJECTS: StoryObjectConfig[] = [
  {
    id: 'story_shop_radio',
    name: 'Emergency Field Radio',
    subtitle: 'Last Shop Storeroom Workbench',
    actionLabel: 'Tune',
    category: 'radio',
    x: -16.25,
    y: INTERIOR_Y + 0.78,
    z: -16.2,
    rotationY: 0.35,
    initialBody:
      'Channel 4 loops an automated District 04 relay: "...Power grid offline. Sector B quarantine breach at Vale Corner Store. Medical courier overdue. Maintain shelter and verify North Roadblock transceiver..."',
  },
  {
    id: 'story_diner_clipboard',
    name: 'Evacuation Clipboard',
    subtitle: 'Starlight Diner Porch Table',
    actionLabel: 'Read',
    category: 'document',
    x: -13.85,
    y: SIDEWALK_HEIGHT + 0.78,
    z: 8.8,
    rotationY: -0.25,
    initialBody:
      'Water-stained evacuation roster signed 04:15 on Day 0: "Bus Convoy 3 diverted north after Redline bridge buckled. Drivers saw bio-seal drums unloaded behind Vale Corner Store before the sirens cut out."',
  },
  {
    id: 'story_vale_manifest',
    name: 'Quarantine Lab Manifest',
    subtitle: 'Vale Corner Store Back Dispensary',
    actionLabel: 'Inspect',
    category: 'document',
    x: 17.2,
    y: INTERIOR_Y + 0.78,
    z: -16.1,
    rotationY: 0.22,
    initialBody:
      'Sealed Civil Response manifest stamped CLASS-V4: "Emergency batch stored in Vale back dispensary to mask cold-chain failure at Depot 04. Two canisters ruptured during the substation surge; airborne spore exposure confirmed on Main Blvd."',
  },
  {
    id: 'story_depot_ledger',
    name: 'Depot Dispatch Ledger',
    subtitle: 'Depot 04 Storage Workbench',
    actionLabel: 'Read',
    category: 'document',
    x: 26.3,
    y: INTERIOR_Y + 0.78,
    z: -15.75,
    rotationY: 0.18,
    initialBody:
      'Freight log signed by Dispatcher Reyes: "Last convoy pulled out toward North Roadblock with backup relay coils. Remaining survival crates locked inside the Depot Tool Room cage. Whoever finds this—get the North Roadblock beacon online."',
  },
  {
    id: 'story_depot_cache',
    name: 'Sealed Emergency Cache',
    subtitle: 'Depot 04 Caged Tool Room',
    actionLabel: 'Inspect',
    category: 'cache',
    x: 31.9,
    y: INTERIOR_Y,
    z: -20.0,
    rotationY: -0.3,
    initialBody:
      'Heavy-gauge civil defense locker labeled "DISTRICT 04 CONTINGENCY — TOOLS & MEDKIT". Inside rests a dry emergency capacitor pack alongside field rations.',
  },
  {
    id: 'story_house_journal',
    name: 'Dr. Vance Research Journal',
    subtitle: 'Abandoned House Living Room',
    actionLabel: 'Read',
    category: 'document',
    x: -31.95,
    y: INTERIOR_Y + 0.78,
    z: 16.4,
    rotationY: 0.4,
    initialBody:
      'Handwritten notes by Dr. Elena Vance: "The V4 pathogen loses viability in open sunlight and steady dry heat, which is why the ash-choked fog prolonged outbreak spread. An active shopkeeper hub at The Last Shop can anchor survivors—if the North Roadblock relay transmits our all-clear frequency on 148.6 MHz."',
  },
  {
    id: 'story_roadblock_log',
    name: 'Containment Field Log',
    subtitle: 'North Roadblock Checkpoint',
    actionLabel: 'Inspect',
    category: 'document',
    x: 0.2,
    y: 0,
    z: -24.2,
    rotationY: 0.15,
    initialBody:
      'Dropped checkpoint tablet: "Perimeter held until 02:30. Relay tower west of the jersey barriers lost its antenna bracket and power bus during the stampede. Needs 2 Scrap Metal and 2 Wood bracing to restore directional uplink."',
  },
  {
    id: 'story_final_relay',
    name: 'Emergency Relay Console',
    subtitle: 'North Roadblock West Curb',
    actionLabel: 'Operate',
    category: 'relay',
    x: -5.6,
    y: 0,
    z: -25.8,
    rotationY: 0.45,
    initialBody:
      'Civil Emergency Repeater Unit (148.6 MHz). The mast mount is sheared and the power housing hangs open. Repairing the housing requires 2 Scrap Metal and 2 Wood.',
    activatedBody:
      'Relay mast braced and power bus humming! Press Transmit to broadcast District 04 safe-haven coordinates across the regional valley.',
    requiresResources: { scrap_metal: 2, wood: 2 },
    activateActionLabel: 'Calibrate Relay (2 Scrap + 2 Wood)',
    unlockedInMissionId: 'm10_ashfall_beacon',
    transmitMissionId: 'm10_ashfall_beacon',
  },
  {
    id: 'story_police_blotter',
    name: 'Precinct Incident Blotter',
    subtitle: "Police Precinct Captain's Office",
    actionLabel: 'Read',
    category: 'document',
    x: -26.15,
    y: INTERIOR_Y + 0.78,
    z: 46.3,
    rotationY: 0.28,
    initialBody:
      'Shift Captain Morales logbook: "01:40 — Quarantine squad confiscated unmarked V4 containment seals from Depot 04 and locked them in our Evidence Room. Left the brass Evidence Room Key right here on my desk before rolling out to reinforce North Roadblock."',
  },
  {
    id: 'story_clinic_triage',
    name: 'Chief Medical Triage Log',
    subtitle: 'Mercy Field Clinic Exam Room',
    actionLabel: 'Read',
    category: 'document',
    x: 19.25,
    y: INTERIOR_Y + 0.78,
    z: 46.15,
    rotationY: -0.22,
    initialBody:
      'Triage clipboard signed by Dr. Patel: "V4 spore exposure spikes respiratory stress within minutes. Locked remaining sterile trauma kits—and the V4 Lab Access Keycard—inside the Clinic Pharmacy room. Pharmacy key sits beside this log."',
  },
  {
    id: 'story_lab_terminal',
    name: 'V4 Containment Archive Terminal',
    subtitle: 'Research Lab Specimen Vault',
    actionLabel: 'Inspect',
    category: 'document',
    x: 35.5,
    y: INTERIOR_Y + 0.78,
    z: -46.8,
    rotationY: 0.35,
    initialBody:
      'Battery-backed laboratory terminal: "PROJECT V4 SUMMARY — Pathogen strain stabilizes at <15% viability under sustained dry airflow and sunlight. Civil broadcast repeater on 148.6 MHz clears district shelters for organized medical relief convoys."',
  },
];

export const STORY_CLUE_DEFINITIONS: Record<
  string,
  Omit<StoryClueSummary, 'discoveredDay'>
> = {
  clue_blackout_morning: {
    id: 'clue_blackout_morning',
    title: '01 · Backup Power on the Block',
    source: 'The Last Shop',
    body: 'While the rest of District 04 went dark, your store backup inverter held steady—turning The Last Shop into the only lit shelter on the avenue.',
  },
  clue_vale_dispatch: {
    id: 'clue_vale_dispatch',
    title: '02 · The Automated Signal',
    source: 'Storeroom Field Radio',
    body: 'Channel 4 repeats a broken civil-defense warning pointing toward a quarantine shipment inside Vale Corner Store.',
  },
  clue_evac_convoy: {
    id: 'clue_evac_convoy',
    title: '03 · Starlight Diner Evacuation',
    source: 'Diner Evacuation Clipboard',
    body: 'Evacuation buses abandoned Main Boulevard before dawn after unmarked bio-seal drums were unloaded behind Vale Corner Store.',
  },
  clue_v4_leak: {
    id: 'clue_v4_leak',
    title: '04 · Origin of the Outbreak',
    source: 'Vale Back Dispensary Manifest',
    body: 'Two Class-V4 canisters ruptured during the substation blackout, releasing the fast-mutating pathogen directly into the central avenue fog.',
  },
  clue_survivor_network: {
    id: 'clue_survivor_network',
    title: '05 · Survivors Returning',
    source: 'District 04 Trade Ledger',
    body: 'Word of reliable food, clean water, and steady trade at The Last Shop is drawing scattered survivors out of hiding.',
  },
  clue_depot_shipment: {
    id: 'clue_depot_shipment',
    title: '06 · Convoy Destination',
    source: 'Depot 04 Dispatch Ledger',
    body: 'Freight crews routed the district emergency repeater equipment to the North Roadblock before losing contact.',
  },
  clue_convoy_route: {
    id: 'clue_convoy_route',
    title: '07 · Broken Checkpoint',
    source: 'North Roadblock Field Log',
    body: 'The containment garrison fell holding the northern avenue, leaving the emergency repeater crippled just shy of broadcasting.',
  },
  clue_relay_frequency: {
    id: 'clue_relay_frequency',
    title: '08 · 148.6 MHz Beacon Spec',
    source: 'Dr. Vance Research Journal',
    body: 'Dr. Vance documented the safe recovery protocol and left the 148.6 MHz all-clear carrier code for District 04.',
  },
  clue_caravan_routes: {
    id: 'clue_caravan_routes',
    title: '09 · Outbound Trade Lanes',
    source: 'Last Shop Guild Notes',
    body: 'With a Level 2+ storefront and active staff, regional supply runners can sustain District 04 indefinitely once the beacon goes live.',
  },
  clue_precinct_report: {
    id: 'clue_precinct_report',
    title: '10 · Confiscated Evidence',
    source: 'Police Precinct Blotter',
    body: 'District police flagged unmarked Class-V4 canisters hours before the blackout and sealed their evidence locker before deploying north.',
  },
  clue_clinic_triage: {
    id: 'clue_clinic_triage',
    title: '11 · Pharmacy Clearance',
    source: 'Mercy Clinic Triage Log',
    body: 'Emergency physicians recovered a V4 Bio-Containment Lab Access Keycard inside Mercy Clinic Pharmacy before evacuating.',
  },
  clue_v4_containment: {
    id: 'clue_v4_containment',
    title: '12 · V4 Pathogen Profile',
    source: 'Research Lab Specimen Vault',
    body: 'Lab archives confirm V4 spores decay rapidly in dry daylight—making The Last Shop corridor viable for long-term recovery.',
  },
};

export interface MissionObjectiveDef {
  id: string;
  description: string;
  type: ObjectiveType;
  target: number;
  optional?: boolean;
  targetId?: string;
  resourceId?: ResourceId;
}

export interface MissionDefinition {
  id: string;
  order: number;
  category: MissionCategory;
  chapterLabel: string;
  title: string;
  description: string;
  unlockAfterMissionIds?: string[];
  unlockMinShopLevel?: number;
  objectives: MissionObjectiveDef[];
  rewards: MissionRewardSummary;
  clueUnlockId?: string;
  targetZoneId?: string;
}

export const MISSION_DEFINITIONS: MissionDefinition[] = [
  {
    id: 'm1_open_doors',
    order: 1,
    category: 'main',
    chapterLabel: 'Chapter 1',
    title: 'Open the Shutters',
    targetZoneId: 'last_shop',
    description:
      'Step inside The Last Shop, use the Shop Counter Register, and stock at least 2 items on the front shelves to signal survivors.',
    objectives: [
      {
        id: 'obj_m1_enter',
        description: 'Enter The Last Shop interior',
        type: 'enter_zone',
        target: 1,
        targetId: 'last_shop',
      },
      {
        id: 'obj_m1_stock',
        description: 'Stock at least 2 items on the shop shelves',
        type: 'shop_stock_count',
        target: 2,
      },
    ],
    rewards: {
      money: 25,
      resources: { canned_food: 1 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_blackout_morning.title,
      unlockText: 'Chapter 2 & Side Mission unlocked',
    },
    clueUnlockId: 'clue_blackout_morning',
  },
  {
    id: 'm2_street_supplies',
    order: 2,
    category: 'main',
    chapterLabel: 'Chapter 2',
    title: 'First Light Scavenge',
    targetZoneId: 'central_crossroads',
    description:
      'Search abandoned street cases and gather food or water pickups around the avenue to sustain yourself and your shelves.',
    unlockAfterMissionIds: ['m1_open_doors'],
    objectives: [
      {
        id: 'obj_m2_search',
        description: 'Search containers or lockers',
        type: 'search_container',
        target: 2,
      },
      {
        id: 'obj_m2_collect',
        description: 'Collect resource pickups',
        type: 'collect_resource',
        target: 3,
      },
    ],
    rewards: {
      money: 35,
      resources: { medical_supplies: 1 },
      unlockText: 'Chapter 3 unlocked',
    },
  },
  {
    id: 'm3_static_signal',
    order: 3,
    category: 'main',
    chapterLabel: 'Chapter 3',
    title: 'The Storeroom Frequency',
    targetZoneId: 'vale_pharmacy',
    description:
      'Check the Emergency Field Radio on the workbench in your shop storeroom, then cross Central Avenue to inspect Vale Corner Store.',
    unlockAfterMissionIds: ['m2_street_supplies'],
    objectives: [
      {
        id: 'obj_m3_radio',
        description: 'Tune the Emergency Field Radio in your storeroom',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_shop_radio',
      },
      {
        id: 'obj_m3_vale',
        description: 'Enter Vale Corner Store (NE Block)',
        type: 'enter_zone',
        target: 1,
        targetId: 'vale_pharmacy',
      },
    ],
    rewards: {
      money: 40,
      resources: { canned_food: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_vale_dispatch.title,
      unlockText: 'Chapter 4 & Depot Side Mission unlocked',
    },
    clueUnlockId: 'clue_vale_dispatch',
  },
  {
    id: 'm4_diner_clues',
    order: 4,
    category: 'main',
    chapterLabel: 'Chapter 4',
    title: 'Echoes at Starlight Diner',
    targetZoneId: 'starlight_diner',
    description:
      'Thin out nearby infected on the avenue, speak with Kira on the Starlight Diner porch, and read the Evacuation Clipboard.',
    unlockAfterMissionIds: ['m3_static_signal'],
    objectives: [
      {
        id: 'obj_m4_kills',
        description: 'Defeat infected in the neighborhood',
        type: 'kill_zombies',
        target: 2,
      },
      {
        id: 'obj_m4_kira',
        description: 'Speak with Kira at Starlight Diner',
        type: 'talk_survivor',
        target: 1,
        targetId: 'surv_kira',
      },
      {
        id: 'obj_m4_clip',
        description: 'Read the Evacuation Clipboard on the diner table',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_diner_clipboard',
      },
    ],
    rewards: {
      money: 50,
      resources: { water_bottle: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_evac_convoy.title,
      unlockText: 'Chapter 5 unlocked',
    },
    clueUnlockId: 'clue_evac_convoy',
  },
  {
    id: 'm5_dispensary_secret',
    order: 5,
    category: 'main',
    chapterLabel: 'Chapter 5',
    title: 'Behind the Dispensary Door',
    targetZoneId: 'vale_pharmacy',
    description:
      'Open the interior Back Dispensary door in Vale Corner Store, inspect the Quarantine Lab Manifest, and search the medical cabinet.',
    unlockAfterMissionIds: ['m4_diner_clues'],
    objectives: [
      {
        id: 'obj_m5_door',
        description: 'Open Vale Corner Store Back Dispensary door',
        type: 'open_door',
        target: 1,
        targetId: 'door_store_back',
      },
      {
        id: 'obj_m5_manifest',
        description: 'Inspect the Quarantine Lab Manifest',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_vale_manifest',
      },
      {
        id: 'obj_m5_meds',
        description: 'Search the Dispensary Med Cabinet',
        type: 'search_container',
        target: 1,
        targetId: 'cnt_int_store_med',
        optional: true,
      },
    ],
    rewards: {
      money: 75,
      resources: { medical_supplies: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_v4_leak.title,
      unlockText: 'Chapter 6 unlocked',
    },
    clueUnlockId: 'clue_v4_leak',
  },
  {
    id: 'm6_build_sanctuary',
    order: 6,
    category: 'main',
    chapterLabel: 'Chapter 6',
    title: 'Beacon of Commerce',
    targetZoneId: 'last_shop',
    description:
      'Upgrade The Last Shop to Level 2 (Improved Store) and complete 3 sales so survivors across District 04 know the market holds.',
    unlockAfterMissionIds: ['m5_dispensary_secret'],
    objectives: [
      {
        id: 'obj_m6_level',
        description: 'Upgrade The Last Shop to Level 2',
        type: 'shop_level',
        target: 2,
      },
      {
        id: 'obj_m6_sales',
        description: 'Complete item sales at your shop',
        type: 'shop_sale_count',
        target: 3,
      },
    ],
    rewards: {
      money: 90,
      resources: { scrap_metal: 2, wood: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_survivor_network.title,
      unlockText: 'Chapter 7 unlocked',
    },
    clueUnlockId: 'clue_survivor_network',
  },
  {
    id: 'm7_voices_in_dark',
    order: 7,
    category: 'main',
    chapterLabel: 'Chapter 7',
    title: 'Allies & Freight Logs',
    targetZoneId: 'depot_04',
    description:
      'Recruit at least 1 survivor to help staff your shop, then investigate Depot 04 Storage in the NE yard and read the Dispatch Ledger.',
    unlockAfterMissionIds: ['m6_build_sanctuary'],
    objectives: [
      {
        id: 'obj_m7_recruit',
        description: 'Recruit an employee for your shop',
        type: 'recruit_survivor',
        target: 1,
      },
      {
        id: 'obj_m7_depot',
        description: 'Enter Depot 04 Storage',
        type: 'enter_zone',
        target: 1,
        targetId: 'depot_04',
      },
      {
        id: 'obj_m7_ledger',
        description: 'Read the Depot Dispatch Ledger',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_depot_ledger',
      },
    ],
    rewards: {
      money: 110,
      resources: { canned_food: 2, medical_supplies: 1 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_depot_shipment.title,
      unlockText: 'Chapter 8 unlocked',
    },
    clueUnlockId: 'clue_depot_shipment',
  },
  {
    id: 'm8_north_barricade',
    order: 8,
    category: 'main',
    chapterLabel: 'Chapter 8',
    title: 'North Roadblock Reckoning',
    targetZoneId: 'north_roadblock',
    description:
      'Approach the North Roadblock at the top of Central Avenue, clear the ambush of infected, and inspect the dropped Field Log.',
    unlockAfterMissionIds: ['m7_voices_in_dark'],
    objectives: [
      {
        id: 'obj_m8_zone',
        description: 'Reach the North Roadblock',
        type: 'enter_zone',
        target: 1,
        targetId: 'cz_barricade',
      },
      {
        id: 'obj_m8_surge',
        description: 'Clear the Roadblock Infected ambush',
        type: 'clear_surge',
        target: 2,
        targetId: 'surge_roadblock',
      },
      {
        id: 'obj_m8_log',
        description: 'Inspect the Containment Field Log',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_roadblock_log',
      },
    ],
    rewards: {
      money: 140,
      resources: { medical_supplies: 2, scrap_metal: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_convoy_route.title,
      unlockText: 'Chapter 9 unlocked',
    },
    clueUnlockId: 'clue_convoy_route',
  },
  {
    id: 'm9_house_archive',
    order: 9,
    category: 'main',
    chapterLabel: 'Chapter 9',
    title: "The Researcher's Archive",
    targetZoneId: 'abandoned_house',
    description:
      'Explore the Abandoned House in the SW block, read Dr. Vance Research Journal, and keep 2 Scrap Metal and 2 Wood in your pack for the relay repair.',
    unlockAfterMissionIds: ['m8_north_barricade'],
    objectives: [
      {
        id: 'obj_m9_house',
        description: 'Enter the Abandoned House (SW Block)',
        type: 'enter_zone',
        target: 1,
        targetId: 'abandoned_house',
      },
      {
        id: 'obj_m9_journal',
        description: 'Read Dr. Vance Research Journal',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_house_journal',
      },
      {
        id: 'obj_m9_scrap',
        description: 'Hold Scrap Metal in your pack',
        type: 'collect_resource',
        target: 2,
        resourceId: 'scrap_metal',
      },
      {
        id: 'obj_m9_wood',
        description: 'Hold Wood in your pack',
        type: 'collect_resource',
        target: 2,
        resourceId: 'wood',
      },
    ],
    rewards: {
      money: 160,
      resources: { canned_food: 2, water_bottle: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_relay_frequency.title,
      unlockText: 'Final Chapter unlocked',
    },
    clueUnlockId: 'clue_relay_frequency',
  },
  {
    id: 'm10_ashfall_beacon',
    order: 10,
    category: 'main',
    chapterLabel: 'Chapter 10 · Finale',
    title: 'Signal Over District 04',
    targetZoneId: 'north_roadblock',
    description:
      'Return to the Emergency Relay Console at North Roadblock, deliver 2 Scrap Metal & 2 Wood to calibrate it, survive the Signal Surge, and broadcast the All-Clear.',
    unlockAfterMissionIds: ['m9_house_archive'],
    objectives: [
      {
        id: 'obj_m10_calibrate',
        description: 'Calibrate the Emergency Relay Console (2 Scrap + 2 Wood)',
        type: 'deliver_items',
        target: 1,
        targetId: 'story_final_relay',
      },
      {
        id: 'obj_m10_surge',
        description: 'Defeat the Signal Surge infected',
        type: 'clear_surge',
        target: 3,
        targetId: 'surge_relay',
      },
      {
        id: 'obj_m10_transmit',
        description: 'Transmit the 148.6 MHz Safe-Haven Beacon',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_final_relay_transmit',
      },
    ],
    rewards: {
      money: 250,
      unlockText: 'District 04 Story Ending & Endless Freeplay',
    },
  },
  // Optional Side Missions
  {
    id: 's1_maya_remedy',
    order: 101,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Water for the House',
    targetZoneId: 'abandoned_house',
    description:
      'Check on Maya inside the Abandoned House and store 2 Water Bottles inside your shop backroom locker as an emergency reserve.',
    unlockAfterMissionIds: ['m1_open_doors'],
    objectives: [
      {
        id: 'obj_s1_maya',
        description: 'Speak with Maya in the Abandoned House',
        type: 'talk_survivor',
        target: 1,
        targetId: 'surv_maya',
      },
      {
        id: 'obj_s1_store',
        description: 'Keep 2 Water Bottles in Shop Backroom Storage',
        type: 'shop_storage_item',
        target: 2,
        resourceId: 'water_bottle',
      },
    ],
    rewards: {
      money: 65,
      resources: { canned_food: 2 },
    },
  },
  {
    id: 's2_depot_sweep',
    order: 102,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Inside the Freight Cage',
    targetZoneId: 'depot_04',
    description:
      'Break into the chained Tool Room Cage inside Depot 04 Storage and inspect the Sealed Emergency Cache inside.',
    unlockAfterMissionIds: ['m3_static_signal'],
    objectives: [
      {
        id: 'obj_s2_door',
        description: 'Open Depot 04 Tool Room Cage Door',
        type: 'open_door',
        target: 1,
        targetId: 'door_depot_cage',
      },
      {
        id: 'obj_s2_cache',
        description: 'Inspect the Sealed Emergency Cache',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_depot_cache',
      },
      {
        id: 'obj_s2_ledger',
        description: 'Read the Depot Dispatch Ledger',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_depot_ledger',
        optional: true,
      },
    ],
    rewards: {
      money: 85,
      resources: { scrap_metal: 3, medical_supplies: 1 },
    },
  },
  {
    id: 's3_trade_boom',
    order: 103,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Lifeline for District 04',
    targetZoneId: 'last_shop',
    description:
      'Grow The Last Shop into a reliable survivor hub by completing 5 sales and employing 2 active staff members.',
    unlockAfterMissionIds: ['m5_dispensary_secret'],
    objectives: [
      {
        id: 'obj_s3_sales',
        description: 'Complete total shop item sales',
        type: 'shop_sale_count',
        target: 5,
      },
      {
        id: 'obj_s3_staff',
        description: 'Employ 2 staff members at your shop',
        type: 'recruit_survivor',
        target: 2,
      },
      {
        id: 'obj_s3_stock',
        description: 'Keep at least 6 total items stocked on shelves',
        type: 'shop_stock_count',
        target: 6,
        optional: true,
      },
    ],
    rewards: {
      money: 150,
      resources: { medical_supplies: 2, water_bottle: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_caravan_routes.title,
    },
    clueUnlockId: 'clue_caravan_routes',
  },
  {
    id: 's4_precinct_evidence',
    order: 104,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Precinct Evidence Locker',
    targetZoneId: 'police_precinct',
    description:
      "Search the District 04 Police Precinct south of Main Blvd, read Captain Morales's blotter, and grab the Evidence Room Key to unlock the seized locker.",
    unlockAfterMissionIds: ['m2_street_supplies'],
    objectives: [
      {
        id: 'obj_s4_enter',
        description: 'Enter District 04 Police Precinct',
        type: 'enter_zone',
        target: 1,
        targetId: 'police_precinct',
      },
      {
        id: 'obj_s4_blotter',
        description: 'Read the Precinct Incident Blotter',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_police_blotter',
      },
      {
        id: 'obj_s4_door',
        description: 'Unlock & open the Evidence Locker Door',
        type: 'open_door',
        target: 1,
        targetId: 'door_police_evidence',
      },
    ],
    rewards: {
      money: 95,
      resources: { canned_food: 2, scrap_metal: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_precinct_report.title,
    },
    clueUnlockId: 'clue_precinct_report',
  },
  {
    id: 's5_clinic_triage',
    order: 105,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Clinic Triage & Pharmacy',
    targetZoneId: 'mercy_clinic',
    description:
      'Investigate Mercy Field Clinic in the Medical District, recover the Pharmacy Key from the Triage Room, and unlock the pharmacy for rare medical stores & the V4 Lab Keycard.',
    unlockAfterMissionIds: ['m4_diner_clues'],
    objectives: [
      {
        id: 'obj_s5_enter',
        description: 'Enter Mercy Field Clinic',
        type: 'enter_zone',
        target: 1,
        targetId: 'mercy_clinic',
      },
      {
        id: 'obj_s5_log',
        description: 'Read the Chief Medical Triage Log',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_clinic_triage',
      },
      {
        id: 'obj_s5_door',
        description: 'Unlock & open the Clinic Pharmacy Door',
        type: 'open_door',
        target: 1,
        targetId: 'door_clinic_pharmacy',
      },
    ],
    rewards: {
      money: 115,
      resources: { medical_supplies: 2, water_bottle: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_clinic_triage.title,
      unlockText: 'Research Facility Lab Mission unlocked',
    },
    clueUnlockId: 'clue_clinic_triage',
  },
  {
    id: 's6_containment_lab',
    order: 106,
    category: 'side',
    chapterLabel: 'Side Mission',
    title: 'Inside the V4 Lab Vault',
    targetZoneId: 'research_lab',
    description:
      'Use the V4 Lab Access Keycard from Mercy Clinic Pharmacy to enter the gated Research Facility in the northeast, unlock the Specimen Vault, and inspect its archive terminal.',
    unlockAfterMissionIds: ['s5_clinic_triage'],
    objectives: [
      {
        id: 'obj_s6_enter',
        description: 'Enter V4 Bio-Containment Lab',
        type: 'enter_zone',
        target: 1,
        targetId: 'research_lab',
      },
      {
        id: 'obj_s6_vault',
        description: 'Unlock & open the V4 Specimen Vault Door',
        type: 'open_door',
        target: 1,
        targetId: 'door_lab_vault',
      },
      {
        id: 'obj_s6_terminal',
        description: 'Inspect the V4 Containment Archive Terminal',
        type: 'interact_story_object',
        target: 1,
        targetId: 'story_lab_terminal',
      },
    ],
    rewards: {
      money: 180,
      resources: { medical_supplies: 3, scrap_metal: 2 },
      clueTitle: STORY_CLUE_DEFINITIONS.clue_v4_containment.title,
    },
    clueUnlockId: 'clue_v4_containment',
  },
];

export interface MissionRuntimeContext {
  day: number;
  inventory: InventoryState;
  shopStock: InventoryState;
  shopStorage: InventoryState;
  shopLevel: number;
  totalSalesCount: number;
  employeeCount: number;
  zombiesDefeated: number;
  visitedZones: string[];
  openedDoors: string[];
  searchedContainers: string[];
  collectedResourceCount: number;
  talkedSurvivors: string[];
  inspectedStoryObjects: string[];
  activatedStoryObjects: string[];
  surgeKills: Record<string, number>;
}

export type MissionEvent =
  | { type: 'enter_zone'; zoneId: string }
  | { type: 'collect_resource'; resourceId: ResourceId; amount: number }
  | { type: 'search_container'; containerId: string }
  | { type: 'open_door'; doorId: string }
  | { type: 'talk_survivor'; survivorId: string }
  | { type: 'recruit_survivor'; employeeCount: number }
  | { type: 'kill_zombie'; surgeId?: string }
  | { type: 'interact_story_object'; objectId: string; mode: 'inspect' | 'calibrate' | 'transmit' }
  | { type: 'shop_sync' };

export interface SerializedMissionState {
  version: number;
  trackedMissionId: string | null;
  statuses: Record<string, MissionStatus>;
  claimedRewardIds: string[];
  discoveredClues: { id: string; discoveredDay: number }[];
  visitedZones: string[];
  talkedSurvivors: string[];
  inspectedStoryObjects: string[];
  activatedStoryObjects: string[];
  collectedResourceCount: number;
  surgeSpawned: Record<string, boolean>;
  surgeKills: Record<string, number>;
  endingCompleted: boolean;
  endingSeen: boolean;
}

export interface MissionProcessOutcome {
  newlyCompletedMissions: MissionDefinition[];
  newlyUnlockedMissions: MissionDefinition[];
  newlyDiscoveredClues: StoryClueSummary[];
  rewardGrants: {
    missionId: string;
    missionTitle: string;
    money: number;
    resources: Partial<InventoryState>;
  }[];
  triggerSurgeId: 'surge_roadblock' | 'surge_relay' | null;
  endingJustCompleted: boolean;
}

export function getSurvivorStoryRemark(
  survivorId: string,
  completedMissionIds: ReadonlySet<string>,
  endingCompleted: boolean
): string {
  const remarks = tSurvivor(survivorId).storyRemarks;
  if (endingCompleted) {
    return remarks.endingCompleted;
  }

  const missionCheckMap: Record<string, string> = {
    surv_kira: 'm4_diner_clues',
    surv_soren: 'm5_dispensary_secret',
    surv_dante: 'm7_voices_in_dark',
    surv_maya: 'm9_house_archive',
    surv_toby: 'm8_north_barricade',
  };
  const gateId = missionCheckMap[survivorId];
  if (gateId && completedMissionIds.has(gateId)) {
    return remarks.afterMission;
  }
  return remarks.beforeMission;
}

export class MissionSystem {
  private statuses = new Map<string, MissionStatus>();
  private claimedRewardIds = new Set<string>();
  private discoveredClues = new Map<string, StoryClueSummary>();
  private visitedZones = new Set<string>();
  private talkedSurvivors = new Set<string>();
  private inspectedStoryObjects = new Set<string>();
  private activatedStoryObjects = new Set<string>();
  private collectedResourceCount = 0;
  private surgeSpawned = new Map<string, boolean>();
  private surgeKills = new Map<string, number>();
  private trackedMissionId: string | null = 'm1_open_doors';
  public endingCompleted = false;
  public endingSeen = false;

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.statuses.clear();
    this.claimedRewardIds.clear();
    this.discoveredClues.clear();
    this.visitedZones.clear();
    this.talkedSurvivors.clear();
    this.inspectedStoryObjects.clear();
    this.activatedStoryObjects.clear();
    this.collectedResourceCount = 0;
    this.surgeSpawned.clear();
    this.surgeKills.clear();
    this.endingCompleted = false;
    this.endingSeen = false;

    for (const def of MISSION_DEFINITIONS) {
      this.statuses.set(
        def.id,
        def.id === 'm1_open_doors' ? 'active' : 'locked'
      );
    }
    this.trackedMissionId = 'm1_open_doors';
  }

  public getCompletedMissionIdSet(): Set<string> {
    const out = new Set<string>();
    for (const [id, st] of this.statuses.entries()) {
      if (st === 'completed') out.add(id);
    }
    return out;
  }

  public getStatus(missionId: string): MissionStatus {
    return this.statuses.get(missionId) ?? 'locked';
  }

  public isStoryObjectInspected(id: string): boolean {
    return this.inspectedStoryObjects.has(id);
  }

  public isStoryObjectActivated(id: string): boolean {
    return this.activatedStoryObjects.has(id);
  }

  public hasSurgeSpawned(surgeId: string): boolean {
    return this.surgeSpawned.get(surgeId) === true;
  }

  public markSurgeSpawned(surgeId: string): void {
    this.surgeSpawned.set(surgeId, true);
  }

  public getVisitedZones(): string[] {
    return Array.from(this.visitedZones);
  }

  public getTalkedSurvivors(): string[] {
    return Array.from(this.talkedSurvivors);
  }

  public getInspectedStoryObjects(): string[] {
    return Array.from(this.inspectedStoryObjects);
  }

  public getActivatedStoryObjects(): string[] {
    return Array.from(this.activatedStoryObjects);
  }

  public getCollectedResourceCount(): number {
    return this.collectedResourceCount;
  }

  public getSurgeKills(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [k, v] of this.surgeKills.entries()) out[k] = v;
    return out;
  }

  public trackMission(missionId: string | null): void {
    if (!missionId) {
      this.trackedMissionId = null;
      return;
    }
    const st = this.statuses.get(missionId);
    if (st === 'available' || st === 'active') {
      if (st === 'available') {
        this.statuses.set(missionId, 'active');
      }
      this.trackedMissionId = missionId;
    }
  }

  public buildStoryInspectionData(
    objectId: string,
    inventory: InventoryState
  ): StoryObjectInspectionData | null {
    const cfg = STORY_OBJECTS.find((o) => o.id === objectId);
    if (!cfg) return null;

    const objLoc = tStoryObject(cfg.id);
    const relayMsg = getTranslations().gameMessages.storyRelay;
    const alreadyActivated = this.activatedStoryObjects.has(objectId);
    if (cfg.id === 'story_final_relay') {
      const m10Status = this.getStatus('m10_ashfall_beacon');
      const surgeKills = this.surgeKills.get('surge_relay') ?? 0;

      if (m10Status === 'completed') {
        return {
          id: cfg.id,
          title: objLoc.name,
          subtitle: objLoc.subtitle,
          body: relayMsg.completedBody,
          category: cfg.category,
          alreadyActivated: true,
        };
      }

      if (m10Status === 'locked') {
        return {
          id: cfg.id,
          title: objLoc.name,
          subtitle: objLoc.subtitle,
          body: objLoc.body,
          category: cfg.category,
          actionDisabledReason: relayMsg.lockedDisabledReason,
          alreadyActivated: false,
        };
      }

      if (!alreadyActivated) {
        const missing: string[] = [];
        for (const resId of RESOURCE_ORDER) {
          const req = cfg.requiresResources?.[resId] ?? 0;
          if (req > 0 && (inventory[resId] ?? 0) < req) {
            missing.push(
              formatTemplate(relayMsg.needItemCount, {
                req,
                name: tResourceName(resId, req),
                have: inventory[resId] ?? 0,
              })
            );
          }
        }
        return {
          id: cfg.id,
          title: objLoc.name,
          subtitle: objLoc.subtitle,
          body: objLoc.body,
          category: cfg.category,
          actionLabel: objLoc.activateActionLabel ?? cfg.activateActionLabel,
          actionDisabledReason:
            missing.length > 0
              ? formatTemplate(relayMsg.needInPackTemplate, { items: missing.join(' & ') })
              : undefined,
          requiresResources: cfg.requiresResources,
          alreadyActivated: false,
        };
      }

      // Already calibrated -> check surge clear before transmit
      if (surgeKills < 3) {
        const baseText = objLoc.activatedBody ?? objLoc.body;
        return {
          id: cfg.id,
          title: objLoc.name,
          subtitle: objLoc.subtitle,
          body: formatTemplate(relayMsg.surgeWarningBody, {
            base: baseText,
            rem: 3 - surgeKills,
          }),
          category: cfg.category,
          actionDisabledReason: formatTemplate(relayMsg.surgeDisabledReason, {
            kills: surgeKills,
          }),
          alreadyActivated: true,
        };
      }

      return {
        id: cfg.id,
        title: objLoc.name,
        subtitle: objLoc.subtitle,
        body: objLoc.activatedBody ?? objLoc.body,
        category: cfg.category,
        actionLabel: relayMsg.transmitActionLabel,
        alreadyActivated: true,
      };
    }

    return {
      id: cfg.id,
      title: objLoc.name,
      subtitle: objLoc.subtitle,
      body: objLoc.body,
      category: cfg.category,
      alreadyActivated: this.inspectedStoryObjects.has(objectId),
    };
  }

  public canDeliverRelayMaterials(objectId: string, inventory: InventoryState): boolean {
    const cfg = STORY_OBJECTS.find((o) => o.id === objectId);
    if (!cfg || !cfg.requiresResources) return false;
    if (this.activatedStoryObjects.has(objectId)) return false;
    for (const resId of RESOURCE_ORDER) {
      const req = cfg.requiresResources[resId] ?? 0;
      if (req > 0 && (inventory[resId] ?? 0) < req) return false;
    }
    return true;
  }

  public consumeRelayMaterials(objectId: string, inventory: InventoryState): InventoryState {
    const cfg = STORY_OBJECTS.find((o) => o.id === objectId);
    if (!cfg || !cfg.requiresResources) return inventory;
    let next = { ...inventory };
    for (const resId of RESOURCE_ORDER) {
      const req = cfg.requiresResources[resId] ?? 0;
      if (req > 0) {
        next = consumeInventoryResource(next, resId, req);
      }
    }
    return next;
  }

  public recordEvent(
    event: MissionEvent,
    ctx: MissionRuntimeContext
  ): MissionProcessOutcome {
    if (event.type === 'enter_zone') {
      this.visitedZones.add(event.zoneId);
    } else if (event.type === 'collect_resource') {
      this.collectedResourceCount += Math.max(1, event.amount);
    } else if (event.type === 'talk_survivor') {
      this.talkedSurvivors.add(event.survivorId);
    } else if (event.type === 'kill_zombie') {
      if (event.surgeId) {
        const cur = this.surgeKills.get(event.surgeId) ?? 0;
        this.surgeKills.set(event.surgeId, cur + 1);
      }
    } else if (event.type === 'interact_story_object') {
      this.inspectedStoryObjects.add(event.objectId);
      if (event.mode === 'calibrate') {
        this.activatedStoryObjects.add(event.objectId);
      } else if (event.mode === 'transmit') {
        this.inspectedStoryObjects.add(`${event.objectId}_transmit`);
      }
    }

    // Recompute ctx snapshot fields with mission internal sets
    const mergedCtx: MissionRuntimeContext = {
      ...ctx,
      visitedZones: Array.from(new Set([...ctx.visitedZones, ...this.visitedZones])),
      talkedSurvivors: Array.from(new Set([...ctx.talkedSurvivors, ...this.talkedSurvivors])),
      inspectedStoryObjects: Array.from(
        new Set([...ctx.inspectedStoryObjects, ...this.inspectedStoryObjects])
      ),
      activatedStoryObjects: Array.from(
        new Set([...ctx.activatedStoryObjects, ...this.activatedStoryObjects])
      ),
      collectedResourceCount: Math.max(ctx.collectedResourceCount, this.collectedResourceCount),
      surgeKills: { ...ctx.surgeKills, ...this.getSurgeKills() },
    };

    const outcome: MissionProcessOutcome = {
      newlyCompletedMissions: [],
      newlyUnlockedMissions: [],
      newlyDiscoveredClues: [],
      rewardGrants: [],
      triggerSurgeId: null,
      endingJustCompleted: false,
    };

    // Story surge trigger checks
    if (
      this.getStatus('m8_north_barricade') === 'active' &&
      mergedCtx.visitedZones.includes('cz_barricade') &&
      !this.hasSurgeSpawned('surge_roadblock')
    ) {
      this.markSurgeSpawned('surge_roadblock');
      outcome.triggerSurgeId = 'surge_roadblock';
    }

    if (
      event.type === 'interact_story_object' &&
      event.objectId === 'story_final_relay' &&
      event.mode === 'calibrate' &&
      !this.hasSurgeSpawned('surge_relay')
    ) {
      this.markSurgeSpawned('surge_relay');
      outcome.triggerSurgeId = 'surge_relay';
    }

    // Iteratively unlock and complete missions (supports chained evaluations safely)
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;

      // 1. Check unlocks
      for (const def of MISSION_DEFINITIONS) {
        if (this.getStatus(def.id) !== 'locked') continue;
        const depsMet =
          !def.unlockAfterMissionIds ||
          def.unlockAfterMissionIds.every((id) => this.getStatus(id) === 'completed');
        const shopMet = !def.unlockMinShopLevel || mergedCtx.shopLevel >= def.unlockMinShopLevel;
        if (depsMet && shopMet) {
          const nextStatus: MissionStatus = def.category === 'main' ? 'active' : 'available';
          this.statuses.set(def.id, nextStatus);
          outcome.newlyUnlockedMissions.push(def);
          if (def.category === 'main') {
            this.trackedMissionId = def.id;
          }
          changed = true;
        }
      }

      // 2. Check completions on active or available missions
      for (const def of MISSION_DEFINITIONS) {
        const st = this.getStatus(def.id);
        if (st !== 'active' && st !== 'available') continue;

        const summaries = this.evaluateObjectives(def, mergedCtx);
        const primaryDone = summaries
          .filter((o) => !o.optional)
          .every((o) => o.completed);

        if (primaryDone) {
          this.statuses.set(def.id, 'completed');
          outcome.newlyCompletedMissions.push(def);
          changed = true;

          if (!this.claimedRewardIds.has(def.id)) {
            this.claimedRewardIds.add(def.id);
            const missionLoc = tMission(def.id);
            outcome.rewardGrants.push({
              missionId: def.id,
              missionTitle: missionLoc.title,
              money: def.rewards.money ?? 0,
              resources: def.rewards.resources ?? {},
            });
          }

          if (def.clueUnlockId && !this.discoveredClues.has(def.clueUnlockId)) {
            const clueDef = STORY_CLUE_DEFINITIONS[def.clueUnlockId];
            if (clueDef) {
              const clueLoc = tClue(clueDef.id);
              const clue: StoryClueSummary = {
                ...clueDef,
                title: clueLoc.title,
                source: clueLoc.source,
                body: clueLoc.body,
                discoveredDay: Math.max(1, mergedCtx.day),
              };
              this.discoveredClues.set(clue.id, clue);
              outcome.newlyDiscoveredClues.push(clue);
            }
          }

          if (def.id === 'm10_ashfall_beacon' && !this.endingCompleted) {
            this.endingCompleted = true;
            outcome.endingJustCompleted = true;
          }
        }
      }

      if (!changed) break;
    }

    // Ensure trackedMissionId points to an active/available mission if possible
    const trackedStatus = this.trackedMissionId ? this.statuses.get(this.trackedMissionId) : null;
    if (trackedStatus !== 'active' && trackedStatus !== 'available') {
      const nextMain = MISSION_DEFINITIONS.find(
        (d) =>
          d.category === 'main' &&
          (this.getStatus(d.id) === 'active' || this.getStatus(d.id) === 'available')
      );
      const nextSide = MISSION_DEFINITIONS.find(
        (d) =>
          d.category === 'side' &&
          (this.getStatus(d.id) === 'active' || this.getStatus(d.id) === 'available')
      );
      this.trackedMissionId = nextMain?.id ?? nextSide?.id ?? null;
    }

    return outcome;
  }

  public evaluateObjectives(
    def: MissionDefinition,
    ctx: MissionRuntimeContext
  ): MissionObjectiveSummary[] {
    const isCompleted = this.getStatus(def.id) === 'completed';

    return def.objectives.map((obj) => {
      const desc = tMissionObjectiveLabel(def.id, obj.id, obj.description);
      if (isCompleted) {
        return {
          id: obj.id,
          description: desc,
          type: obj.type,
          current: obj.target,
          target: obj.target,
          completed: true,
          optional: obj.optional,
        };
      }

      let current = 0;
      switch (obj.type) {
        case 'enter_zone':
          current = obj.targetId && ctx.visitedZones.includes(obj.targetId) ? 1 : 0;
          break;
        case 'interact_story_object':
          current =
            obj.targetId && ctx.inspectedStoryObjects.includes(obj.targetId) ? 1 : 0;
          break;
        case 'deliver_items':
          current =
            obj.targetId && ctx.activatedStoryObjects.includes(obj.targetId) ? 1 : 0;
          break;
        case 'collect_resource':
          if (obj.resourceId) {
            current = Math.max(0, ctx.inventory[obj.resourceId] ?? 0);
          } else {
            current = ctx.collectedResourceCount;
          }
          break;
        case 'search_container':
          if (obj.targetId) {
            current = ctx.searchedContainers.includes(obj.targetId) ? 1 : 0;
          } else {
            current = ctx.searchedContainers.length;
          }
          break;
        case 'open_door':
          current = obj.targetId && ctx.openedDoors.includes(obj.targetId) ? 1 : 0;
          break;
        case 'talk_survivor':
          current = obj.targetId && ctx.talkedSurvivors.includes(obj.targetId) ? 1 : 0;
          break;
        case 'recruit_survivor':
          current = ctx.employeeCount;
          break;
        case 'kill_zombies':
          current = ctx.zombiesDefeated;
          break;
        case 'clear_surge':
          current = obj.targetId ? ctx.surgeKills[obj.targetId] ?? 0 : 0;
          break;
        case 'shop_stock_count': {
          let total = 0;
          for (const id of RESOURCE_ORDER) total += Math.max(0, ctx.shopStock[id] ?? 0);
          current = total;
          break;
        }
        case 'shop_storage_item':
          if (obj.resourceId) {
            current = Math.max(0, ctx.shopStorage[obj.resourceId] ?? 0);
          }
          break;
        case 'shop_sale_count':
          current = ctx.totalSalesCount;
          break;
        case 'shop_level':
          current = ctx.shopLevel;
          break;
      }

      const clampedCurrent = Math.min(obj.target, Math.max(0, current));
      return {
        id: obj.id,
        description: desc,
        type: obj.type,
        current: clampedCurrent,
        target: obj.target,
        completed: clampedCurrent >= obj.target,
        optional: obj.optional,
      };
    });
  }

  public getSnapshot(ctx: MissionRuntimeContext, hasSaveData: boolean): MissionSnapshot {
    const missions: MissionSummary[] = MISSION_DEFINITIONS.map((def) => {
      const status = this.getStatus(def.id);
      const missionLoc = tMission(def.id);
      return {
        id: def.id,
        order: def.order,
        category: def.category,
        chapterLabel: missionLoc.chapterLabel,
        title: missionLoc.title,
        description: missionLoc.description,
        status,
        tracked: this.trackedMissionId === def.id,
        objectives: this.evaluateObjectives(def, ctx),
        rewards: def.rewards,
        rewardsClaimed: this.claimedRewardIds.has(def.id),
        targetZoneId: def.targetZoneId,
      };
    });

    const trackedMission =
      missions.find((m) => m.id === this.trackedMissionId) ?? null;

    const mainMissions = missions.filter((m) => m.category === 'main');
    const sideMissions = missions.filter((m) => m.category === 'side');

    const localizedClues: StoryClueSummary[] = Array.from(this.discoveredClues.values()).map((c) => {
      const clueLoc = tClue(c.id);
      return {
        ...c,
        title: clueLoc.title,
        source: clueLoc.source,
        body: clueLoc.body,
      };
    });

    return {
      missions,
      trackedMissionId: this.trackedMissionId,
      trackedMission,
      clues: localizedClues,
      mainCompletedCount: mainMissions.filter((m) => m.status === 'completed').length,
      mainTotalCount: mainMissions.length,
      sideCompletedCount: sideMissions.filter((m) => m.status === 'completed').length,
      sideTotalCount: sideMissions.length,
      endingCompleted: this.endingCompleted,
      endingSeen: this.endingSeen,
      hasSaveData,
    };
  }

  public exportState(): SerializedMissionState {
    const statuses: Record<string, MissionStatus> = {};
    for (const [k, v] of this.statuses.entries()) statuses[k] = v;
    const surgeSpawned: Record<string, boolean> = {};
    for (const [k, v] of this.surgeSpawned.entries()) surgeSpawned[k] = v;

    return {
      version: 1,
      trackedMissionId: this.trackedMissionId,
      statuses,
      claimedRewardIds: Array.from(this.claimedRewardIds),
      discoveredClues: Array.from(this.discoveredClues.values()).map((c) => ({
        id: c.id,
        discoveredDay: c.discoveredDay,
      })),
      visitedZones: Array.from(this.visitedZones),
      talkedSurvivors: Array.from(this.talkedSurvivors),
      inspectedStoryObjects: Array.from(this.inspectedStoryObjects),
      activatedStoryObjects: Array.from(this.activatedStoryObjects),
      collectedResourceCount: this.collectedResourceCount,
      surgeSpawned,
      surgeKills: this.getSurgeKills(),
      endingCompleted: this.endingCompleted,
      endingSeen: this.endingSeen,
    };
  }

  public importState(raw: Partial<SerializedMissionState> | undefined): void {
    this.reset();
    if (!raw || typeof raw !== 'object') return;

    if (raw.statuses && typeof raw.statuses === 'object') {
      for (const def of MISSION_DEFINITIONS) {
        const s = raw.statuses[def.id];
        if (s === 'locked' || s === 'available' || s === 'active' || s === 'completed' || s === 'failed') {
          this.statuses.set(def.id, s);
        }
      }
    }

    if (Array.isArray(raw.claimedRewardIds)) {
      for (const id of raw.claimedRewardIds) {
        if (typeof id === 'string') this.claimedRewardIds.add(id);
      }
    }

    if (Array.isArray(raw.discoveredClues)) {
      for (const entry of raw.discoveredClues) {
        if (!entry || typeof entry.id !== 'string') continue;
        const clueDef = STORY_CLUE_DEFINITIONS[entry.id];
        if (clueDef) {
          this.discoveredClues.set(clueDef.id, {
            ...clueDef,
            discoveredDay: Math.max(1, Math.floor(entry.discoveredDay || 1)),
          });
        }
      }
    }

    if (Array.isArray(raw.visitedZones)) {
      raw.visitedZones.forEach((z) => typeof z === 'string' && this.visitedZones.add(z));
    }
    if (Array.isArray(raw.talkedSurvivors)) {
      raw.talkedSurvivors.forEach((s) => typeof s === 'string' && this.talkedSurvivors.add(s));
    }
    if (Array.isArray(raw.inspectedStoryObjects)) {
      raw.inspectedStoryObjects.forEach(
        (s) => typeof s === 'string' && this.inspectedStoryObjects.add(s)
      );
    }
    if (Array.isArray(raw.activatedStoryObjects)) {
      raw.activatedStoryObjects.forEach(
        (s) => typeof s === 'string' && this.activatedStoryObjects.add(s)
      );
    }
    if (typeof raw.collectedResourceCount === 'number' && Number.isFinite(raw.collectedResourceCount)) {
      this.collectedResourceCount = Math.max(0, Math.floor(raw.collectedResourceCount));
    }
    if (raw.surgeSpawned && typeof raw.surgeSpawned === 'object') {
      for (const [k, v] of Object.entries(raw.surgeSpawned)) {
        if (v) this.surgeSpawned.set(k, true);
      }
    }
    if (raw.surgeKills && typeof raw.surgeKills === 'object') {
      for (const [k, v] of Object.entries(raw.surgeKills)) {
        if (typeof v === 'number' && Number.isFinite(v)) {
          this.surgeKills.set(k, Math.max(0, Math.floor(v)));
        }
      }
    }

    this.endingCompleted = Boolean(raw.endingCompleted);
    this.endingSeen = Boolean(raw.endingSeen);

    if (typeof raw.trackedMissionId === 'string' && this.statuses.has(raw.trackedMissionId)) {
      this.trackedMissionId = raw.trackedMissionId;
    } else if (raw.trackedMissionId === null) {
      this.trackedMissionId = null;
    }
  }
}

export function createInitialMissionSnapshot(hasSaveData = false): MissionSnapshot {
  const sys = new MissionSystem();
  const emptyInv: InventoryState = {
    canned_food: 0,
    water_bottle: 0,
    scrap_metal: 0,
    wood: 0,
    medical_supplies: 0,
  };
  return sys.getSnapshot(
    {
      day: 1,
      inventory: emptyInv,
      shopStock: emptyInv,
      shopStorage: emptyInv,
      shopLevel: 1,
      totalSalesCount: 0,
      employeeCount: 0,
      zombiesDefeated: 0,
      visitedZones: [],
      openedDoors: [],
      searchedContainers: [],
      collectedResourceCount: 0,
      talkedSurvivors: [],
      inspectedStoryObjects: [],
      activatedStoryObjects: [],
      surgeKills: {},
    },
    hasSaveData
  );
}
