export type GameScreenState = 'MENU' | 'PLAYING' | 'PAUSED' | 'GAMEOVER';

export type GameLanguage = 'en' | 'ar';

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

export type WeaponId = 'steel_pipe' | 'scrap_blade' | 'service_pistol';
export type WeaponKind = 'melee' | 'ranged';
export type HitMarkerKind = 'hit' | 'crit' | 'kill';

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
    | 'bed'
    | 'world_event';
  amount?: number;
}

export type MissionCategory = 'main' | 'side';

export type StoryActId = 'act1_shelter' | 'act2_investigation' | 'act3_convergence';

export type StoryEndingId = 'dawn_beacon' | 'truth_unsealed' | 'iron_enclave';

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
  clueId?: string;
  clueTitle?: string;
  unlockText?: string;
}

export interface MissionSummary {
  id: string;
  order: number;
  category: MissionCategory;
  actId?: StoryActId;
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

export interface StoryRelayBroadcastChoice {
  endingId: StoryEndingId;
  title: string;
  subtitle: string;
  description: string;
  unlocked: boolean;
  lockedReason?: string;
  tone: 'hope' | 'truth' | 'fortress';
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
  loggedClueTitle?: string;
  broadcastChoices?: StoryRelayBroadcastChoice[];
}

export interface SurvivorDialogueChoice {
  id: string;
  label: string;
  hint?: string;
  requiresResources?: Partial<InventoryState>;
  affordable: boolean;
  disabledReason?: string;
}

export interface SurvivorDialogueTopicView {
  topicId: string;
  stageTitle: string;
  speakerLine: string;
  choices: SurvivorDialogueChoice[];
}

export interface StoryChoiceSummary {
  choiceId: string;
  optionId: string;
  title: string;
  optionLabel: string;
  consequenceSummary: string;
  day: number;
}

export interface CharacterDossierSummary {
  id: string;
  name: string;
  locationLabel: string;
  recruited: boolean;
  employeeId?: string;
  professionLabel?: string;
  trust: number;
  trustTierLabel: string;
  bio: string;
  currentStatusNote: string;
  topicsCompleted: number;
  totalTopics: number;
  activeTopic: SurvivorDialogueTopicView | null;
}

export interface StoryEndingSummary {
  endingId: StoryEndingId;
  badge: string;
  title: string;
  body: string;
  epilogueLines: string[];
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
  characters?: CharacterDossierSummary[];
  recordedChoices?: StoryChoiceSummary[];
  selectedEndingId?: StoryEndingId | null;
  endingSummary?: StoryEndingSummary | null;
  unlockedEndingIds?: StoryEndingId[];
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
  survivorId: string;
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
  customerId?: string;
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
  customerId?: string;
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

export type HorrorAudioLevel = 'full' | 'reduced' | 'off';

export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface GameSettings {
  language: GameLanguage;
  masterVolume: number;
  ambientVolume: number;
  sfxVolume: number;
  musicVolume: number;
  dialogueVolume: number;
  horrorAudioLevel: HorrorAudioLevel;
  muted: boolean;
  mouseSensitivity: number;
  shadowsEnabled: boolean;
  lightingQuality: 'atmospheric' | 'performance';
  graphicsQuality: GraphicsQuality;
  flashlightOn: boolean;
  touchControls: TouchControlsMode;
  screenOrientation: ScreenOrientationMode;
  dayLengthSeconds: number;
}

export type WorldEventCategory =
  | 'exploration'
  | 'zombie_activity'
  | 'survivor'
  | 'shop'
  | 'atmosphere';

export type WorldEventVisualKind =
  | 'crate'
  | 'beacon'
  | 'npc_survivor'
  | 'npc_trader'
  | 'silhouette'
  | 'none';

export interface WorldEventChoiceSummary {
  id: string;
  label: string;
  hint?: string;
  affordable: boolean;
  disabledReason?: string;
  tone?: 'primary' | 'risk' | 'neutral';
}

export interface WorldEventBannerSummary {
  instanceId: string;
  eventId: string;
  category: WorldEventCategory;
  title: string;
  description: string;
  locationLabel: string;
  visualKind: WorldEventVisualKind;
  hasWorldTarget: boolean;
  targetX?: number;
  targetZ?: number;
  distanceMeters?: number;
  bearingLabel?: string;
  secondsRemaining?: number | null;
  requiresProximityToDecide: boolean;
  playerInRange: boolean;
  choices: WorldEventChoiceSummary[];
}

export interface ActiveWorldEventPin {
  id: string;
  title: string;
  category: WorldEventCategory;
  x: number;
  z: number;
  secondsRemaining: number | null;
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
  dayPhaseLabel: string;
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
  hitMarkerId: number;
  hitMarkerKind: HitMarkerKind | null;
  inActiveCombat: boolean;
  weaponId: WeaponId;
  weaponKind: WeaponKind;
  weaponLabel: string;
  unlockedWeaponIds: WeaponId[];
  magAmmo: number;
  magSize: number;
  reserveAmmo: number;
  maxReserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  attackCooldownRatio: number;
  zombiesDefeated: number;
  deathReason: string | null;
  noiseLevel: number;
  tensionLevel: number;
  survivorGoodwill: number;
  activeWorldEvent: WorldEventBannerSummary | null;
  activeWorldEventPin: ActiveWorldEventPin | null;
}
