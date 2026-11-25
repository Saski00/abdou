export type GameScreenState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export type ScreenOrientationMode = 'auto' | 'portrait' | 'landscape';

export type DayPhase = 'Dawn' | 'Morning' | 'Afternoon' | 'Sunset' | 'Night';

export type WeatherKind = 'clear' | 'rain' | 'fog';

export type LocationDangerLevel = 'safe' | 'low' | 'moderate' | 'high';

export type WorldRegionId =
  | 'main_street'
  | 'residential_district'
  | 'commercial_district'
  | 'industrial_zone'
  | 'medical_district'
  | 'police_station'
  | 'military_checkpoint'
  | 'research_facility';

export type ResourceId =
  | 'canned_food'
  | 'water_bottle'
  | 'scrap_metal'
  | 'wood'
  | 'medical_supplies';

export type InventoryState = Record<ResourceId, number>;

export interface InteractionPrompt {
  id: string;
  name: string;
  actionLabel: string;
  kind:
    | 'resource'
    | 'door'
    | 'container'
    | 'shop_counter'
    | 'shop_storage'
    | 'customer'
    | 'survivor'
    | 'employee'
    | 'story_object'
    | 'key'
    | 'vehicle'
    | 'workbench'
    | 'examine'
    | 'bed';
  amount?: number;
}

export type MissionCategory = 'main' | 'side';

export type MissionStatus = 'locked' | 'available' | 'active' | 'completed' | 'failed';

export type ObjectiveType =
  | 'enter_zone'
  | 'interact_story_object'
  | 'collect_resource'
  | 'search_container'
  | 'open_door'
  | 'talk_survivor'
  | 'recruit_survivor'
  | 'kill_zombies'
  | 'shop_stock_count'
  | 'shop_storage_item'
  | 'shop_sale_count'
  | 'shop_level'
  | 'deliver_items'
  | 'clear_surge';

export interface MissionObjectiveSummary {
  id: string;
  description: string;
  type: ObjectiveType;
  current: number;
  target: number;
  completed: boolean;
  optional?: boolean;
}

export interface MissionRewardSummary {
  money?: number;
  resources?: Partial<InventoryState>;
  clueTitle?: string;
  unlockText?: string;
}

export interface MissionSummary {
  id: string;
  order: number;
  category: MissionCategory;
  chapterLabel: string;
  title: string;
  description: string;
  status: MissionStatus;
  tracked: boolean;
  failureReason?: string | null;
  objectives: MissionObjectiveSummary[];
  rewards: MissionRewardSummary;
  rewardsClaimed: boolean;
  targetZoneId?: string;
}

export interface StoryClueSummary {
  id: string;
  title: string;
  source: string;
  body: string;
  discoveredDay: number;
}

export interface StoryObjectInspectionData {
  id: string;
  title: string;
  subtitle: string;
  body: string;
  category: 'radio' | 'document' | 'relay' | 'cache';
  actionLabel?: string;
  actionDisabledReason?: string;
  requiresResources?: Partial<InventoryState>;
  alreadyActivated: boolean;
}

export interface MissionSnapshot {
  missions: MissionSummary[];
  trackedMissionId: string | null;
  trackedMission: MissionSummary | null;
  clues: StoryClueSummary[];
  mainCompletedCount: number;
  mainTotalCount: number;
  sideCompletedCount: number;
  sideTotalCount: number;
  endingCompleted: boolean;
  endingSeen: boolean;
  hasSaveData: boolean;
}

export type ShopModalTab = 'counter' | 'transfer' | 'storage' | 'upgrades' | 'customers' | 'staff';

export type EmployeeProfession =
  | 'shopkeeper'
  | 'guard'
  | 'storage_worker'
  | 'resource_collector';

export type EmployeeStatus =
  | 'idle'
  | 'working'
  | 'patrolling'
  | 'engaging'
  | 'gathering'
  | 'unpaid';

export interface WorldSurvivorSummary {
  id: string;
  name: string;
  locationLabel: string;
  dialogue: string;
  storyRemark?: string;
  needDescription: string;
  preferredProfession: EmployeeProfession;
  costMoney: number;
  costResources: Partial<InventoryState>;
  recruited: boolean;
}

export interface EmployeeSummary {
  id: string;
  name: string;
  profession: EmployeeProfession;
  professionLabel: string;
  status: EmployeeStatus;
  statusLabel: string;
  health: number;
  maxHealth: number;
  salary: number;
  taskLabel: string;
  recruitedDay: number;
  unpaidReason: string | null;
}

export interface StaffSnapshot {
  employees: EmployeeSummary[];
  worldSurvivors: WorldSurvivorSummary[];
  employeeCapacity: number;
  activeGuardCount: number;
  maxGuards: number;
  activeShopkeeperCount: number;
  upcomingSalaryTotal: number;
  salaryIntervalSeconds: number;
  nextSalaryInSeconds: number;
  unpaidCount: number;
  lastSalaryNotice: string | null;
}

export interface ShopLevelConfig {
  level: number;
  name: string;
  description: string;
  upgradeCost: number;
  customerCapacity: number;
  employeeCapacity: number;
  baseStorageCapacity: number;
  shelfDisplaySlotsPerItem: number;
  benefits: string[];
}

export interface StorageUpgradeConfig {
  tier: number;
  id: string;
  name: string;
  description: string;
  cost: number;
  capacityBonus: number;
}

export interface ShopDecorationConfig {
  id: string;
  name: string;
  description: string;
  cost: number;
  category: 'Signage' | 'Lighting' | 'Display' | 'Equipment' | 'Interior';
}

export interface ShopBusinessStats {
  totalRevenue: number;
  totalItemsSold: number;
  customersServed: number;
  currentShopLevel: number;
  currentStockValue: number;
  totalMoneyAvailable: number;
}

export type CustomerAIState =
  | 'approaching'
  | 'entering'
  | 'browsing'
  | 'going_to_checkout'
  | 'purchasing'
  | 'leaving'
  | 'despawned';

export interface ActiveCustomerSummary {
  id: string;
  name: string;
  state: CustomerAIState;
  statusLabel: string;
  desiredItemName: string | null;
  desiredQuantity: number;
  budget: number;
}

export interface CustomerSaleRecord {
  id: number;
  customerName: string;
  resourceId: ResourceId;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalRevenue: number;
  timestampLabel: string;
}

export interface ShopTransactionRecord {
  id: number;
  kind: 'sale' | 'transfer' | 'upgrade' | 'salary' | 'staff' | 'mission' | 'error';
  source?: 'manual' | 'customer';
  customerName?: string;
  resourceId?: ResourceId;
  itemName?: string;
  quantity?: number;
  unitPrice?: number;
  moneyDelta: number;
  message: string;
  timestampLabel: string;
}

export interface ShopSnapshot {
  money: number;
  shopLevel: number;
  shopLevelName: string;
  maxShopLevel: number;
  storageTier: number;
  maxStorageTier: number;
  storageCapacity: number;
  customerCapacity: number;
  employeeCapacity: number;
  trafficBonusPct: number;
  ownedDecorations: string[];
  shopManualOpen: boolean;
  shopAcceptingCustomers: boolean;
  shopStatusReason: string;
  shopStock: InventoryState;
  shopStorage: InventoryState;
  totalStockItems: number;
  totalStorageItems: number;
  totalSalesCount: number;
  totalRevenueEarned: number;
  customerSalesCount: number;
  customerItemsSold: number;
  customerRevenueEarned: number;
  recentCustomerSales: CustomerSaleRecord[];
  activeCustomers: ActiveCustomerSummary[];
  stats: ShopBusinessStats;
  lastTransaction: ShopTransactionRecord | null;
}

export interface GuidanceHintSummary {
  id: string;
  title: string;
  message: string;
}

export interface FeedbackToast {
  id: number;
  text: string;
  tone: 'resource' | 'world' | 'warning';
}

export interface GameSettings {
  masterVolume: number;
  muted: boolean;
  mouseSensitivity: number;
  shadowsEnabled: boolean;
  lightingQuality: 'atmospheric' | 'performance';
  flashlightOn: boolean;
  touchControls: TouchControlsMode;
  screenOrientation: ScreenOrientationMode;
  dayLengthSeconds: number;
}

export interface HudSnapshot {
  health: number;
  maxHealth: number;
  hunger: number;
  maxHunger: number;
  thirst: number;
  maxThirst: number;
  energy: number;
  maxEnergy: number;
  isResting: boolean;
  stamina: number;
  maxStamina: number;
  isExhausted: boolean;
  isSprinting: boolean;
  day: number;
  formattedTime: string;
  dayPhaseLabel: DayPhase;
  weather: WeatherKind;
  weatherLabel: string;
  flashlightOn: boolean;
  pointerLocked: boolean;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  insideShop: boolean;
  isSafeHaven: boolean;
  currentLocationId: string | null;
  currentLocationName: string | null;
  currentLocationSubtitle: string | null;
  currentLocationDanger: LocationDangerLevel | null;
  currentRegionId: WorldRegionId | null;
  currentRegionName: string | null;
  discoveredLocationIds: string[];
  discoveredRegionIds: WorldRegionId[];
  collectedKeyIds: string[];
  guidanceHint: GuidanceHintSummary | null;
  contextTitle: string | null;
  contextMessage: string | null;
  interactionPrompt: InteractionPrompt | null;
  inventory: InventoryState;
  totalInventoryItems: number;
  packCapacity: number;
  money: number;
  shop: ShopSnapshot;
  staff: StaffSnapshot;
  missions: MissionSnapshot;
  latestToast: FeedbackToast | null;
  damagePulseId: number;
  attackPulseId: number;
  inActiveCombat: boolean;
  weaponLabel: string;
  zombiesDefeated: number;
  deathReason: string | null;
}
