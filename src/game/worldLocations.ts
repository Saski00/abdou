import { ENTERABLE_BUILDINGS } from '../assets/maps/buildingLayouts';
import { InventoryState, LocationDangerLevel, WorldRegionId } from './types';

export type LocationCategory = 'safe_base' | 'building' | 'landmark' | 'district';

export interface WorldRegionDef {
  id: WorldRegionId;
  name: string;
  subtitle: string;
  dangerTier: LocationDangerLevel;
  accentColor: string;
  description: string;
}

export const WORLD_REGIONS: WorldRegionDef[] = [
  {
    id: 'main_street',
    name: 'Main Street',
    subtitle: 'Central Trade Corridor',
    dangerTier: 'low',
    accentColor: '#f59e0b',
    description: 'The lit heart of District 04 around The Last Shop, Central Crossroads, and Starlight Diner.',
  },
  {
    id: 'residential_district',
    name: 'Residential District',
    subtitle: 'Flats, Yards & Camps',
    dangerTier: 'low',
    accentColor: '#38bdf8',
    description: 'Darkened homes, Mercer Flats, Maple Alley, and makeshift survivor evacuation camps.',
  },
  {
    id: 'commercial_district',
    name: 'Commercial District',
    subtitle: 'Storefronts & Freight Alley',
    dangerTier: 'moderate',
    accentColor: '#22c55e',
    description: 'Abandoned retail storefronts, Vale Corner Store, rear loading parking, and spilled cargo.',
  },
  {
    id: 'industrial_zone',
    name: 'Industrial Zone',
    subtitle: 'Warehouses & Service Bays',
    dangerTier: 'high',
    accentColor: '#fb923c',
    description: 'Depot 04 freight yard, Redline Auto repair bays, and fenced salvage yards packed with tools and scrap.',
  },
  {
    id: 'medical_district',
    name: 'Medical District',
    subtitle: 'Mercy Clinic & Ambulance Bay',
    dangerTier: 'moderate',
    accentColor: '#2dd4bf',
    description: 'South-east emergency triage grounds holding critical medicine and restricted facility credentials.',
  },
  {
    id: 'police_station',
    name: 'Police Station',
    subtitle: 'District 04 Precinct & Lot',
    dangerTier: 'moderate',
    accentColor: '#60a5fa',
    description: 'Sandbagged precinct headquarters, cruiser patrol lot, and locked evidence lockers.',
  },
  {
    id: 'military_checkpoint',
    name: 'Military Checkpoint',
    subtitle: 'North Roadblock & Relay',
    dangerTier: 'high',
    accentColor: '#eab308',
    description: 'Fortified civil-defense roadblock sealing North Central Avenue and guarding the 148.6 MHz Relay.',
  },
  {
    id: 'research_facility',
    name: 'Research Facility',
    subtitle: 'V4 Bio-Containment Compound',
    dangerTier: 'high',
    accentColor: '#f43f5e',
    description: 'Fenced northern bio-containment lab housing sealed V4 outbreak archives and rare supplies.',
  },
];

export const REGION_BY_ID: Record<WorldRegionId, WorldRegionDef> = Object.fromEntries(
  WORLD_REGIONS.map((r) => [r.id, r])
) as Record<WorldRegionId, WorldRegionDef>;

export function getRegionAtPosition(px: number, pz: number): WorldRegionDef {
  if (px > 11 && pz <= -29) return REGION_BY_ID.research_facility;
  if (px >= -11 && px <= 11 && pz <= -19) return REGION_BY_ID.military_checkpoint;
  if (px < 4 && pz >= 30) return REGION_BY_ID.police_station;
  if (px >= 4 && pz >= 30) return REGION_BY_ID.medical_district;
  if (
    (px >= 24.4 && pz > -29 && pz < 30) ||
    (px >= 7.5 && px < 24.4 && pz >= 7.5 && pz < 30)
  ) {
    return REGION_BY_ID.industrial_zone;
  }
  if (px >= 7.5 && px < 24.4 && pz >= -29 && pz <= -7.5) {
    return REGION_BY_ID.commercial_district;
  }
  if (
    (px <= -22 && pz <= -7.5) ||
    (px < -7.5 && pz >= 18) ||
    (px <= -22.5 && pz >= 7.5) ||
    (px <= 11 && pz <= -29)
  ) {
    return REGION_BY_ID.residential_district;
  }
  return REGION_BY_ID.main_street;
}

export interface WorldLocationDef {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  regionId: WorldRegionId;
  category: LocationCategory;
  dangerLevel: LocationDangerLevel;
  lootFocus: string;
  x: number;
  z: number;
  w?: number;
  d?: number;
  discoveryRadius: number;
  description: string;
  discoveryReward?: {
    money?: number;
    resources?: Partial<InventoryState>;
    label: string;
  };
}

const shopB = ENTERABLE_BUILDINGS.find((b) => b.id === 'last_shop')!;
const valeB = ENTERABLE_BUILDINGS.find((b) => b.id === 'vale_pharmacy')!;
const depotB = ENTERABLE_BUILDINGS.find((b) => b.id === 'depot_04')!;
const houseB = ENTERABLE_BUILDINGS.find((b) => b.id === 'abandoned_house')!;
const dinerB = ENTERABLE_BUILDINGS.find((b) => b.id === 'starlight_diner')!;
const garageB = ENTERABLE_BUILDINGS.find((b) => b.id === 'redline_auto')!;
const policeB = ENTERABLE_BUILDINGS.find((b) => b.id === 'police_precinct')!;
const clinicB = ENTERABLE_BUILDINGS.find((b) => b.id === 'mercy_clinic')!;
const labB = ENTERABLE_BUILDINGS.find((b) => b.id === 'research_lab')!;

export const WORLD_LOCATIONS: WorldLocationDef[] = [
  {
    id: 'last_shop',
    name: 'The Last Shop',
    shortName: 'Last Shop',
    subtitle: 'Safe Haven & Storefront',
    regionId: 'main_street',
    category: 'safe_base',
    dangerLevel: 'safe',
    lootFocus: 'Base · Trade & Rest',
    x: shopB.x,
    z: shopB.z,
    w: shopB.w,
    d: shopB.d,
    discoveryRadius: 8.5,
    description:
      'Your backup-powered shop and safe shelter. Stock shelves, manage storage, serve visiting survivors, and hire staff.',
  },
  {
    id: 'central_crossroads',
    name: 'Central Crossroads',
    shortName: 'Crossroads',
    subtitle: 'Main Blvd & Central Ave',
    regionId: 'main_street',
    category: 'district',
    dangerLevel: 'moderate',
    lootFocus: 'Street · Food & Scrap',
    x: 0,
    z: 0,
    discoveryRadius: 10.5,
    description:
      'The heart of District 04 where Main Blvd meets Central Ave. Watch for roaming infected near stalled vehicles.',
    discoveryReward: { money: 10, label: '+$10 Scouted Route' },
  },
  {
    id: 'starlight_diner',
    name: 'Starlight Diner',
    shortName: 'Diner',
    subtitle: 'Enterable Diner & Camp Exit',
    regionId: 'main_street',
    category: 'building',
    dangerLevel: 'low',
    lootFocus: 'Food · Water & Survivor',
    x: dinerB.x,
    z: dinerB.z,
    w: dinerB.w,
    d: dinerB.d,
    discoveryRadius: 9.5,
    description:
      'A shuttered roadside diner where evacuation buses staged. Enter through the front door to scavenge the counter and kitchen.',
    discoveryReward: { money: 15, resources: { canned_food: 1 }, label: '+$15 · +1 Canned Food' },
  },
  {
    id: 'vale_pharmacy',
    name: 'Vale Corner Store',
    shortName: 'Vale Store',
    subtitle: 'Quarantine Breach Site',
    regionId: 'commercial_district',
    category: 'building',
    dangerLevel: 'moderate',
    lootFocus: 'Meds · Food & Water',
    x: valeB.x,
    z: valeB.z,
    w: valeB.w,
    d: valeB.d,
    discoveryRadius: 8.5,
    description:
      'An overrun corner store and back dispensary. Holds medical supplies, canned goods, and Sector B quarantine records.',
    discoveryReward: { money: 20, resources: { water_bottle: 1 }, label: '+$20 · +1 Water' },
  },
  {
    id: 'depot_04',
    name: 'Depot 04 Storage',
    shortName: 'Depot 04',
    subtitle: 'Freight & Contingency Yard',
    regionId: 'industrial_zone',
    category: 'building',
    dangerLevel: 'high',
    lootFocus: 'Scrap · Wood & Contingency',
    x: depotB.x,
    z: depotB.z,
    w: depotB.w,
    d: depotB.d,
    discoveryRadius: 9.0,
    description:
      'A heavy concrete warehouse with a caged contingency tool room, dispatch ledger, scrap metal, and timber.',
    discoveryReward: { money: 25, resources: { scrap_metal: 1 }, label: '+$25 · +1 Scrap' },
  },
  {
    id: 'redline_auto',
    name: 'Redline Auto Garage',
    shortName: 'Redline Auto',
    subtitle: 'Repair Bay & Service Yard',
    regionId: 'industrial_zone',
    category: 'building',
    dangerLevel: 'moderate',
    lootFocus: 'Scrap · Wood & Parts Office',
    x: garageB.x,
    z: garageB.z,
    w: garageB.w,
    d: garageB.d,
    discoveryRadius: 10.0,
    description:
      'An enterable neighborhood mechanic bay linking Main Boulevard to the rear Industrial Service Bay and salvage yard.',
    discoveryReward: { money: 20, resources: { scrap_metal: 1 }, label: '+$20 · +1 Scrap' },
  },
  {
    id: 'abandoned_house',
    name: 'Abandoned Residence',
    shortName: 'Residence',
    subtitle: 'Dr. Vance Quarter',
    regionId: 'residential_district',
    category: 'building',
    dangerLevel: 'low',
    lootFocus: 'Water · Meds & Clues',
    x: houseB.x,
    z: houseB.z,
    w: houseB.w,
    d: houseB.d,
    discoveryRadius: 9.0,
    description:
      'A darkened timber house on the southwest block with boarded windows, domestic rooms, and research notes.',
    discoveryReward: { money: 15, resources: { water_bottle: 1 }, label: '+$15 · +1 Water' },
  },
  {
    id: 'mercer_flats',
    name: 'Mercer Flats',
    shortName: 'Mercer Flats',
    subtitle: 'West Residential Block',
    regionId: 'residential_district',
    category: 'landmark',
    dangerLevel: 'low',
    lootFocus: 'Food · Wood & Evac Lot',
    x: -29.5,
    z: -20.5,
    w: 12,
    d: 10,
    discoveryRadius: 11.0,
    description:
      'Brick apartment block west of The Last Shop with makeshift evacuation camp gear and north evac parking nearby.',
    discoveryReward: { money: 15, label: '+$15 Route Mapped' },
  },
  {
    id: 'vacant_lot',
    name: 'South Diner Camp',
    shortName: 'Diner Camp',
    subtitle: 'Makeshift Camp & Maple Alley',
    regionId: 'residential_district',
    category: 'landmark',
    dangerLevel: 'low',
    lootFocus: 'Water & Wood',
    x: -11.5,
    z: 24.5,
    discoveryRadius: 10.0,
    description:
      'A sheltered tarp camp behind Starlight Diner where fleeing survivors left fire rings and bottled water.',
    discoveryReward: { money: 15, resources: { wood: 1 }, label: '+$15 · +1 Wood' },
  },
  {
    id: 'north_roadblock',
    name: 'North Roadblock',
    shortName: 'Roadblock',
    subtitle: 'Military Checkpoint & Relay',
    regionId: 'military_checkpoint',
    category: 'landmark',
    dangerLevel: 'high',
    lootFocus: 'Relay Tower · Specialized Loot',
    x: 0,
    z: -24.5,
    discoveryRadius: 10.5,
    description:
      'Fortified military checkpoint sealing the northern avenue. Houses the damaged 148.6 MHz Emergency Relay Console.',
    discoveryReward: { money: 25, resources: { scrap_metal: 1 }, label: '+$25 · +1 Scrap' },
  },
  {
    id: 'police_precinct',
    name: 'District 04 Police Precinct',
    shortName: 'Police Precinct',
    subtitle: 'Cruiser Lot & Evidence Room',
    regionId: 'police_station',
    category: 'building',
    dangerLevel: 'moderate',
    lootFocus: 'Evidence Key · Rations & Gear',
    x: policeB.x,
    z: policeB.z,
    w: policeB.w,
    d: policeB.d,
    discoveryRadius: 10.5,
    description:
      'Sandbagged precinct station south of Main Blvd. Find the Evidence Room Key inside the Captain Office to unlock seized stock.',
    discoveryReward: { money: 25, resources: { canned_food: 1 }, label: '+$25 · +1 Food' },
  },
  {
    id: 'mercy_clinic',
    name: 'Mercy Field Clinic',
    shortName: 'Field Clinic',
    subtitle: 'Triage Ward & Locked Pharmacy',
    regionId: 'medical_district',
    category: 'building',
    dangerLevel: 'moderate',
    lootFocus: 'Medical Supplies & Lab Keycard',
    x: clinicB.x,
    z: clinicB.z,
    w: clinicB.w,
    d: clinicB.d,
    discoveryRadius: 10.5,
    description:
      'Emergency triage clinic beside the ambulance bay. Unlock its pharmacy for heavy medical stock and V4 Research Lab clearance.',
    discoveryReward: { money: 25, resources: { medical_supplies: 1 }, label: '+$25 · +1 Medkit' },
  },
  {
    id: 'research_lab',
    name: 'V4 Bio-Containment Lab',
    shortName: 'Research Lab',
    subtitle: 'Gated Compound & Specimen Vault',
    regionId: 'research_facility',
    category: 'building',
    dangerLevel: 'high',
    lootFocus: 'Rare Meds · Keycard Vault · Lore',
    x: labB.x,
    z: labB.z,
    w: labB.w,
    d: labB.d,
    discoveryRadius: 10.5,
    description:
      'Fenced late-game research facility in the northeast corner. Requires the V4 Lab Access Keycard from Mercy Clinic to open its Specimen Vault.',
    discoveryReward: { money: 40, resources: { medical_supplies: 1, scrap_metal: 1 }, label: '+$40 · +1 Med · +1 Scrap' },
  },
];

export const LOCATION_BY_ID: Record<string, WorldLocationDef> = Object.fromEntries(
  WORLD_LOCATIONS.map((loc) => [loc.id, loc])
);

export function getLocationAtPosition(px: number, pz: number): WorldLocationDef | null {
  // Check interior buildings first (exact footprints)
  for (const loc of WORLD_LOCATIONS) {
    if (loc.category === 'safe_base' || loc.category === 'building') {
      const hw = (loc.w ?? 8) * 0.5 + 0.5;
      const hd = (loc.d ?? 8) * 0.5 + 0.5;
      if (Math.abs(px - loc.x) <= hw && Math.abs(pz - loc.z) <= hd) {
        return loc;
      }
    }
  }

  // Then check landmarks & crossroads by radius (nearest wins)
  let best: WorldLocationDef | null = null;
  let bestDist = Infinity;
  for (const loc of WORLD_LOCATIONS) {
    const dist = Math.hypot(px - loc.x, pz - loc.z);
    if (dist <= loc.discoveryRadius && dist < bestDist) {
      best = loc;
      bestDist = dist;
    }
  }
  return best;
}

export function getBearingLabel(dx: number, dz: number): string {
  // In Three.js world space: -Z is North, +Z is South, +X is East, -X is West
  if (Math.hypot(dx, dz) < 0.001) return 'HERE';
  const angleRad = Math.atan2(dx, -dz);
  const deg = ((angleRad * 180) / Math.PI + 360) % 360;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(deg / 45) % 8;
  return dirs[idx];
}

