import { ENTERABLE_BUILDINGS } from '../assets/maps/buildingLayouts';
import { LocationDangerLevel } from './types';

export type LocationCategory = 'safe_base' | 'building' | 'landmark' | 'district';

export interface WorldLocationDef {
  id: string;
  name: string;
  shortName: string;
  subtitle: string;
  category: LocationCategory;
  dangerLevel: LocationDangerLevel;
  lootFocus: string;
  x: number;
  z: number;
  w?: number;
  d?: number;
  discoveryRadius: number;
  description: string;
}

const shopB = ENTERABLE_BUILDINGS.find((b) => b.id === 'last_shop')!;
const valeB = ENTERABLE_BUILDINGS.find((b) => b.id === 'vale_pharmacy')!;
const depotB = ENTERABLE_BUILDINGS.find((b) => b.id === 'depot_04')!;
const houseB = ENTERABLE_BUILDINGS.find((b) => b.id === 'abandoned_house')!;

export const WORLD_LOCATIONS: WorldLocationDef[] = [
  {
    id: 'last_shop',
    name: 'The Last Shop',
    shortName: 'Last Shop',
    subtitle: 'Safe Haven & Storefront',
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
    category: 'district',
    dangerLevel: 'moderate',
    lootFocus: 'Street · Food & Scrap',
    x: 0,
    z: 0,
    discoveryRadius: 10.5,
    description:
      'The heart of District 04 where Main Blvd meets Central Ave. Watch for roaming infected near stalled vehicles.',
  },
  {
    id: 'vale_pharmacy',
    name: 'Vale Corner Store',
    shortName: 'Vale Store',
    subtitle: 'Quarantine Breach Site',
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
  },
  {
    id: 'depot_04',
    name: 'Depot 04 Storage',
    shortName: 'Depot 04',
    subtitle: 'Freight & Contingency Yard',
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
  },
  {
    id: 'abandoned_house',
    name: 'Abandoned Residence',
    shortName: 'Residence',
    subtitle: 'Dr. Vance Quarter',
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
  },
  {
    id: 'starlight_diner',
    name: 'Starlight Diner',
    shortName: 'Diner',
    subtitle: 'Evacuation Staging Porch',
    category: 'landmark',
    dangerLevel: 'low',
    lootFocus: 'Food · Water & Survivor',
    x: -15.5,
    z: 13.5,
    w: 11,
    d: 8.5,
    discoveryRadius: 10.0,
    description:
      'A shuttered roadside diner where evacuation buses staged before the blackout. Survivors still shelter near the porch.',
  },
  {
    id: 'redline_auto',
    name: 'Redline Auto Garage',
    shortName: 'Redline Auto',
    subtitle: 'Repair Bay & Yard',
    category: 'landmark',
    dangerLevel: 'moderate',
    lootFocus: 'Scrap Metal & Survivor',
    x: 17.0,
    z: 15.0,
    w: 12,
    d: 9,
    discoveryRadius: 10.5,
    description:
      'A cluttered neighborhood mechanic shop with oil drums, salvaged car parts, and a locked tool chest.',
  },
  {
    id: 'mercer_flats',
    name: 'Mercer Flats',
    shortName: 'Mercer Flats',
    subtitle: 'West Residential Block',
    category: 'landmark',
    dangerLevel: 'low',
    lootFocus: 'Food · Wood & Water',
    x: -29.5,
    z: -20.5,
    w: 12,
    d: 10,
    discoveryRadius: 11.0,
    description:
      'Brick apartment block west of The Last Shop with makeshift evacuation camp gear along the sidewalk.',
  },
  {
    id: 'north_roadblock',
    name: 'North Roadblock',
    shortName: 'Roadblock',
    subtitle: 'Containment & Relay Tower',
    category: 'landmark',
    dangerLevel: 'high',
    lootFocus: 'Relay Tower · High Risk',
    x: 0,
    z: -24.5,
    discoveryRadius: 10.5,
    description:
      'Civil defense perimeter blocking the northern avenue. Houses the damaged 148.6 MHz Emergency Relay Console.',
  },
  {
    id: 'vacant_lot',
    name: 'South Diner Camp',
    shortName: 'Diner Camp',
    subtitle: 'Makeshift Camp & Alley',
    category: 'landmark',
    dangerLevel: 'low',
    lootFocus: 'Water & Wood',
    x: -11.5,
    z: 24.5,
    discoveryRadius: 10.0,
    description:
      'A sheltered tarp camp behind Starlight Diner where fleeing survivors left fire rings and bottled water.',
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
