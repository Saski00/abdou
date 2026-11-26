import {
  DayPhase,
  EmployeeProfession,
  EmployeeStatus,
  LocationDangerLevel,
  MissionCategory,
  ResourceId,
  WeatherKind,
  WorldEventCategory,
  WorldRegionId,
} from '../game/types';

export type GameLanguage = 'en' | 'ar';
export type TextDirection = 'ltr' | 'rtl';

export interface ResourceTranslation {
  name: string;
  pluralName: string;
  description: string;
  purposeHint: string;
  categoryLabel: string;
  rarityLabel: string;
  consumeActionLabel?: string;
}

export interface RecipeTranslation {
  name: string;
  description: string;
}

export interface ShopLevelTranslation {
  name: string;
  description: string;
  perkSummary: string;
  benefits: string[];
}

export interface StorageTierTranslation {
  name: string;
  description: string;
  perkSummary: string;
}

export interface DecorationTranslation {
  name: string;
  description: string;
  category: string;
}

export interface ProfessionTranslation {
  label: string;
  shortLabel: string;
  shortDesc: string;
  defaultTaskLabel: string;
}

export interface SurvivorTranslation {
  name: string;
  locationLabel: string;
  dialogue: string;
  needDescription: string;
  storyRemarks: {
    endingCompleted: string;
    afterMission: string;
    beforeMission: string;
  };
}

export interface MissionTranslation {
  chapterLabel: string;
  title: string;
  description: string;
  objectiveLabels: Record<string, string>;
  unlockText?: string;
}

export interface ClueTranslation {
  title: string;
  source: string;
  body: string;
}

export interface StoryObjectTranslation {
  name: string;
  subtitle: string;
  actionLabel: string;
  body: string;
  activatedBody?: string;
  activateActionLabel?: string;
}

export interface WorldRegionTranslation {
  name: string;
  subtitle: string;
  description: string;
  mapShortLabel: string;
}

export interface WorldLocationTranslation {
  name: string;
  shortName: string;
  subtitle: string;
  lootFocus: string;
  description: string;
  discoveryRewardLabel?: string;
}

export interface ContextZoneTranslation {
  title: string;
  message: string;
}

export interface VehicleTranslation {
  name: string;
  lootMessage: string;
  emptyMessage: string;
  alreadySearchedMessage: string;
}

export interface SearchPropTranslation {
  name: string;
  searchAction: string;
  emptyAction: string;
  initialNote: string;
  inspectedNote: string;
}

export interface ExaminePropTranslation {
  name: string;
  actionLabel: string;
  noteTitle: string;
  noteText: string;
}

export interface FurnitureTranslation {
  name: string;
  actionLabel?: string;
  noteTitle?: string;
  noteText?: string;
}

export interface GuidanceHintTranslation {
  title: string;
  message: string;
  touchMessage?: string;
}

export interface WorldEventChoiceTranslation {
  label: string;
  hint?: string;
  outcomeToast: string;
}

export interface WorldEventItemTranslation {
  title: string;
  description: string;
  interactName?: string;
  interactAction?: string;
  choices?: Record<string, WorldEventChoiceTranslation>;
}

export interface TranslationCatalog {
  lang: GameLanguage;
  dir: TextDirection;
  meta: {
    appTitle: string;
    appDescription: string;
    languageName: string;
  };
  common: {
    close: string;
    back: string;
    cancel: string;
    confirm: string;
    save: string;
    load: string;
    saved: string;
    free: string;
    active: string;
    completed: string;
    locked: string;
    unlocked: string;
    discovered: string;
    unexplored: string;
    safe: string;
    open: string;
    closed: string;
    none: string;
    done: string;
    max: string;
    today: string;
    dayLabel: string;
    dayNumberShort: string;
    cycleSuffix: string;
    lvlShort: string;
    hpShort: string;
    escHint: string;
    itemCountUnit: string;
  };
  bearings: {
    HERE: string;
    N: string;
    NE: string;
    E: string;
    SE: string;
    S: string;
    SW: string;
    W: string;
    NW: string;
  };
  dayPhases: Record<DayPhase, string>;
  weathers: Record<WeatherKind, string>;
  dangerLevels: Record<LocationDangerLevel, string>;
  missionCategories: Record<MissionCategory, string>;
  mainMenu: {
    badge: string;
    title: string;
    subtitle: string;
    continueGame: string;
    continueSubline: string; // "Day {day} · {time} · {money} · Lv {level}"
    playGame: string;
    newGame: string;
    settings: string;
    credits: string;
    keyHintEnter: string;
    controlsFooterTouch: string;
    controlsFooterDesktop: string;
    languageLabel: string;
  };
  gameCanvas: {
    contextLostTitle: string;
    contextLostBody: string;
  };
  settingsModal: {
    title: string;
    viewMeta: string; // "View: {orientation} ({w}×{h})"
    orientationLandscape: string;
    orientationPortrait: string;
    orientationAuto: string;
    closeAria: string;
    languageSectionTitle: string;
    languageSectionDesc: string;
    languageEnglish: string;
    languageArabic: string;
    masterVolumeLabel: string;
    ambientVolumeLabel: string;
    sfxVolumeLabel: string;
    musicVolumeLabel: string;
    dialogueVolumeLabel: string;
    horrorAudioLabel: string;
    horrorAudioDesc: string;
    horrorFull: string;
    horrorReduced: string;
    horrorOff: string;
    mutedLabel: string;
    lookSensLabel: string;
    screenOrientationLabel: string;
    screenOrientationDesc: string;
    orientationHintAuto: string;
    orientationHintLocked: string; // "Screen locked to {mode} mode."
    orientationHintSaved: string;
    touchControlsLabel: string;
    touchControlsDesc: string;
    touchAuto: string;
    touchOn: string;
    touchOff: string;
    audioEffectsLabel: string;
    audioEffectsDesc: string;
    enabledLabel: string;
    shadowsLabel: string;
    shadowsDesc: string;
    onLabel: string;
    offLabel: string;
    fogLabel: string;
    fogDesc: string;
    fogAtmospheric: string;
    fogPerformance: string;
    dayLengthLabel: string;
    dayLengthDesc: string;
    dayMinutesShort: string; // "{min}m"
    controlsHeadingTouch: string;
    controlsHeadingDesktop: string;
    touchControlRows: { label: string; value: string }[];
    desktopControlRows: { label: string; value: string }[];
    doneBtn: string;
  };
  pauseModal: {
    title: string;
    subtitleFormat: string; // "Day {day} · {time} · {weather}"
    resumeBtn: string;
    saveGameBtn: string;
    savedNotice: string; // "Saved (Day {day} · {time})"
    saveUnavailable: string;
    loadLastSaveBtn: string;
    settingsBtn: string;
    mainMenuBtn: string;
    footerTouch: string;
    footerDesktop: string;
  };
  creditsModal: {
    title: string;
    closeAria: string;
    gameName: string;
    tagline: string;
    rowEngineLabel: string;
    rowEngineValue: string;
    rowAssetLabel: string;
    rowAssetValue: string;
    rowAudioLabel: string;
    rowAudioValue: string;
    closeBtn: string;
  };
  gameOverModal: {
    title: string;
    fallbackReason: string;
    survivedLabel: string;
    survivedValue: string; // "Day {day} · {time}"
    infectedDefeatedLabel: string;
    suppliesCarriedLabel: string;
    suppliesCarriedValue: string; // "{count} items"
    weatherLabel: string;
    restartBtn: string;
    mainMenuBtn: string;
  };
  endingModal: {
    badge: string;
    title: string;
    body: string;
    statDaysSurvived: string;
    statDayValue: string; // "Day {day}"
    statShopLevel: string;
    statLvValue: string; // "Lv {level}"
    statCashBalance: string;
    statTotalRevenue: string;
    statShopStaff: string;
    statHiredValue: string; // "{count} Hired"
    statStoryClues: string;
    statLoggedValue: string; // "{count} Logged"
    mainStoryCompleteBanner: string; // "Main Story Complete ({done}/{total}). District 04 remains open—keep growing your store, finishing side missions, and managing staff."
    saveAndMenuBtn: string;
    continueExploringBtn: string;
  };
  hud: {
    tapKeyLabel: string;
    hpShort: string;
    sprintStaminaAria: string; // "Sprint stamina {pct}%"
    healBtn: string; // "Heal ({qty})"
    starvingLabel: string;
    lowFoodLabel: string;
    hungryLabel: string;
    eatSuffix: string; // "· Eat"
    dehydratedLabel: string;
    lowWaterLabel: string;
    thirstyLabel: string;
    drinkSuffix: string; // "· Drink"
    tiredRestLabel: string; // "Tired {pct}% · Rest"
    restingEnergyStand: string; // "Resting {pct}% · {action}"
    standUpTouch: string;
    standDesktop: string;
    lightOnShort: string;
    lightOffShort: string;
    dayPrefix: string; // "Day {day}"
    mapAria: string;
    missionsAria: string;
    inventoryAria: string;
    muteAria: string;
    unmuteAria: string;
    pauseAria: string;
    objectiveAria: string;
    dismissHintAria: string;
    desktopControlsBanner: string;
    defaultLocationStreets: string;
    defaultLocationOutsideShop: string;
  };
  mobileControls: {
    lookAreaAria: string;
    joystickAria: string;
    flashlightOnAria: string;
    flashlightOffAria: string;
    meleeAttackAria: string;
    attackLabel: string;
    jumpAria: string;
    jumpLabel: string;
  };
  inventoryModal: {
    title: string;
    closeAria: string;
    headerSubtitle: string; // "Pack {used}/{cap} · Cash {money} · Shop Lv {level}"
    packWord: string;
    cashWord: string;
    shopLvWord: string;
    tabAll: string;
    tabConsumables: string;
    tabMedical: string;
    tabMaterials: string;
    tabGear: string;
    safeHavenLabel: string;
    standUpBtn: string;
    restNowBtn: string;
    healthLabel: string;
    hungerLabel: string;
    thirstLabel: string;
    energyLabel: string;
    staminaInline: string; // "{cond} · Stamina {pct}%"
    condCritical: string;
    condInjured: string;
    condHealthy: string;
    condStarving: string;
    condHungry: string;
    condWellFed: string;
    condDehydrated: string;
    condThirsty: string;
    condHydrated: string;
    condResting: string;
    condExhausted: string;
    condTired: string;
    condRested: string;
    payrollOverdueBanner: string; // "Shop Payroll Overdue: {count} staff unpaid (settle at Shop Counter)"
    fullBtn: string;
    equippedMeleeSub: string; // "Equipped melee · {count} infected cleared"
    readyBadge: string;
    tacticalFlashlightTitle: string;
    flashlightBeamActive: string;
    flashlightStealthOff: string;
    turnOffBtn: string;
    turnOnBtn: string;
    keysAccessTitle: string;
    keysFoundCount: string; // "{count}/3 Found"
    noKeysHint: string;
    keyHints: Record<string, { label: string; hint: string }>;
    footerTouch: string;
    footerDesktop: string;
    closeBtn: string;
  };
  workbenchModal: {
    defaultTitle: string;
    closeAria: string;
    headerStats: string; // "Pack {used}/{cap} · Wood {wood} · Scrap {scrap}"
    outputBadge: string; // "+{qty} {item} (Pack {owned})"
    craftBtn: string;
    footerTouch: string;
    footerDesktop: string;
    closeBtn: string;
  };
  storyNoteModal: {
    closeAria: string;
    needHaveQty: string; // "Need {req} (Have {have})"
    footerTouch: string;
    footerDesktop: string;
    closeBtn: string;
  };
  shopModal: {
    title: string;
    closeAria: string;
    subtitleLine: string; // "Safe Haven · Lv {level} ({name}) · {status}"
    shopOpenToggle: string;
    shopClosedToggle: string;
    cashBalanceLabel: string;
    shopTrafficLabel: string;
    packStorageLabel: string;
    shelfRevenueLabel: string;
    tablistAria: string;
    tabSell: string;
    tabShelves: string; // "Shelves ({used}/{cap})"
    tabStorage: string; // "Storage {used}/{cap}"
    tabUpgrades: string;
    tabSales: string; // "Sales ({count})"
    tabStaff: string; // "Staff ({count}/{cap})"
    shopExpansionHeader: string; // "Shop Expansion · Level {level} of {max}"
    capSummary: string; // "Cap: {customers} Visitors · {pack} Pack · +{pct}% Traffic"
    nextLevelHeading: string; // "Next: Level {level} — {name}"
    nextLevelPerksExtra: string;
    upgradeBtn: string; // "Upgrade · {cost}"
    maxShopExpansionBanner: string;
    backroomStorageHeader: string; // "Backroom Storage Racks · Tier {tier}/{max}"
    capacityItemsLabel: string; // "Capacity: {used} / {cap} items"
    slotsFreeLabel: string; // "{free} slots free"
    plusCapacityTag: string; // "(+{bonus} capacity)"
    installBtn: string; // "Install · {cost}"
    maxStorageBanner: string;
    decorationsHeading: string; // "Shop Decorations ({owned}/{total})"
    decorationsPerksHint: string;
    installedBtn: string;
    buyBtn: string; // "Buy · {cost}"
    businessStatsHeading: string;
    statTotalRevenue: string;
    statTotalItemsSold: string;
    statCustomersServed: string;
    statCurrentShopLevel: string;
    statShelfStockValue: string;
    statAvailableFunds: string;
    activeVisitorsHeading: string; // "Active Visitors ({count}/{cap})"
    noVisitorsOpen: string;
    noVisitorsClosed: string;
    budgetLabel: string; // "Budget {amount}"
    prefers: string; // "Prefers {item}"
    recentSalesHeading: string;
    completedCountLabel: string; // "{count} completed"
    noSalesRecorded: string;
    staffCapacityLabel: string;
    hiredRatio: string; // "{count} / {cap} Hired"
    activeGuardsLabel: string;
    maxRatio: string; // "{count} / {max} Max"
    upcomingPayrollLabel: string;
    payrollInSeconds: string; // "in {sec}s"
    perCycleText: string;
    unpaidPausedHeadline: string; // "{count} employee(s) paused due to insufficient funds"
    unpaidPausedSubtext: string;
    payOverdueWagesBtn: string;
    noEmployeesTitle: string;
    noEmployeesDesc: string;
    hiredDayMeta: string; // "{task} · Hired Day {day}"
    salaryCycleMeta: string; // "{salary}/cycle"
    hpRatioMeta: string; // "HP {hp}/{max}"
    dismissAria: string; // "Dismiss {name}"
    dismissBtn: string;
    staffLimitReachedBanner: string; // "Staff limit reached ({count}/{cap}). Upgrade to Lv {nextLevel} for {nextCap} slots."
    upgradesShortcutBtn: string;
    storageCapBarLabel: string; // "Storage Capacity: {used} / {cap}"
    spaceLeftLabel: string; // "{free} space left"
    storageFullShort: string;
    expandBtn: string;
    transferBannerText: string;
    restockAllFromStorageBtn: string; // "Restock All from Storage ({count})"
    emptyShelvesTitle: string;
    emptyShelvesDesc: string;
    restockFromStorageBtn: string;
    manageShelvesBtn: string;
    shelfCountBadge: string; // "Shelf {count}"
    sellItemMeta: string; // "{cat} · {rarity} · Sell {price} ea"
    sellBtnPayout: string; // "Sell · +{amount}"
    outOfStockBtn: string;
    packWord: string;
    shelfWord: string;
    storedWord: string;
    sellWord: string;
    shelfAddBtn: string; // "Shelf +{qty}"
    takeBtn: string; // "Take {qty}"
    storeAddBtn: string; // "Store +{qty}"
    fromShelfBtn: string;
    footerTouch: string;
    footerDesktop: string;
    closeBtn: string;
  };
  recruitmentModal: {
    closeAria: string;
    preferredSubtitle: string; // "{loc} · Preferred: {role}"
    termsHeading: string;
    staffCountLabel: string; // "Shop Staff: {count} / {cap}"
    advancePayLabel: string;
    costHaveAmount: string; // "{cost} (Have {have})"
    needHaveQty: string; // "Need {req} (Have {have})"
    assignProfessionHeading: string;
    guardsCountLabel: string; // "Guards {count}/{max}"
    guardCapReachedDesc: string; // "Guard cap reached ({max} max)"
    salaryPerCycle: string; // "{salary}/cycle"
    footerTouch: string;
    footerDesktop: string;
    laterBtn: string;
    recruitBtn: string;
  };
  missionModal: {
    headerTitle: string;
    headerSummary: string; // "Story {mainDone}/{mainTotal} · Side {sideDone}/{sideTotal} · Clues {clues}"
    beaconOnlineSuffix: string; // " · Beacon Online"
    closeAria: string;
    tabMainStory: string;
    tabSideMissions: string;
    tabStoryClues: string;
    noCluesTitle: string;
    noCluesDesc: string;
    completedBadge: string;
    lockedBadge: string;
    trackedBadge: string;
    activeBadge: string;
    doneBadge: string;
    signalBearingDist: string; // "Signal {bearing} · {dist}m"
    knownBearingDist: string; // "{name} ({bearing} {dist}m)"
    lockedChapterTitle: string;
    lockedChapterDesc: string;
    trackBtn: string;
    trackingBtn: string;
    optionalPrefix: string; // "Optional: "
    rewardsPrefix: string; // "Rewards:"
    clueRewardPrefix: string; // "Clue: {title}"
    footerTouch: string;
    footerDesktop: string;
    closeBtn: string;
  };
  mapModal: {
    title: string;
    closeAria: string;
    chartedRatio: string; // "{done}/{total} Charted"
    dayTimeWeather: string; // "Day {day} {time} ({phase} · {weather})"
    roadLabels: {
      mainBlvd: string;
      northSt: string;
      southSt: string;
      centralAve: string;
      mapleAlley: string;
      freightAlley: string;
    };
    trackedLeadAria: string;
    yourPosAria: string;
    leadBearingDist: string; // "Lead · {bearing} {dist}m"
    distMeters: string; // "{dist}m"
    compassLabel: string;
    compactShop: string;
    compactCharted: string;
    compactBlock: string;
    catSafeBase: string;
    catInterior: string;
    catLandmark: string;
    discoveryBonusClaimed: string; // "Discovery Bonus Claimed: {label}"
    trackedLeadHeader: string; // "Tracked Lead · {chapter}"
    areasHeader: string; // "Areas ({done}/{total} Regions)"
    unexploredCount: string; // "{count} Unexplored"
    allMapped: string;
    footerTouch: string;
    footerDesktop: string;
    keysRatio: string; // "{count}/3 Keys"
    closeBtn: string;
  };
  gameMessages: {
    actions: {
      close: string;
      open: string;
      unlock: string;
      checkLock: string;
      lootRemaining: string;
      search: string;
      pryOpen: string;
      collect: string;
      pickUp: string;
      use: string;
      manage: string;
      serve: string;
      talkTo: string;
      greet: string;
      standUpFrom: string;
      restOn: string;
      examine: string;
    };
    prompts: {
      lockedSuffix: string; // "{name} (Locked)"
      emptySuffix: string; // "{name} (Empty)"
      searchedSuffix: string; // "{name} (Searched)"
      needsKeySuffix: string; // "{name} (Needs {hint})"
      needsToolSuffix: string; // "{name} (Needs {tool})"
      customerRoleTag: string; // "{name} ({status})"
      survivorRoleTag: string; // "{name} (Survivor)"
      employeeRoleTag: string; // "{name} ({role})"
      pressToPrefix: string;
    };
    storyRelay: {
      completedBody: string;
      lockedDisabledReason: string;
      needInPackTemplate: string; // "Need {items} in pack"
      needItemCount: string; // "{req} {name} (have {have})"
      surgeWarningBody: string; // "{base} Warning: The calibration whine attracted infected nearby—clear all {rem} remaining Signal Surge infected before transmitting!"
      surgeDisabledReason: string; // "Defeat Signal Surge infected ({kills}/3 cleared)"
      transmitActionLabel: string;
    };
    toasts: {
      unlockedWithKey: string;
      unlockedSimple: string; // "Unlocked {door}"
      lockedNeedKey: string;
      lockedRequiresDash: string; // "Locked — Requires {hint}"
      pickedUpKey: string;
      alreadyLooted: string;
      packFull: string;
      packFullOverflowHere: string; // "{label} · Pack full ({rem} left here)"
      itemPackFull: string; // "{name}: Pack full ({used}/{cap}) — store or sell supplies first"
      itemPackFullStock: string; // "{name}: Pack full ({used}/{cap}) — stock or store supplies first"
      itemPackFullPartial: string; // "{name}: {label} · Pack full ({rem} left)"
      itemContainerPartial: string; // "{name}: {pry}{label} · Pack full ({rem} still inside)"
      itemCollectedLabel: string; // "{name}: {pry}{label}"
      itemEmpty: string; // "{name}: Empty"
      itemClosed: string; // "{name}: Closed"
      itemAlreadySearched: string; // "{name}: Already searched"
      doorOpened: string; // "Opened {door}"
      doorClosed: string; // "Closed {door}"
      doorStepClear: string; // "Step clear of {door} to close it"
      pryPrefix: string;
      collectedItems: string;
      foundItems: string;
      containerPartial: string;
      nothingUsableLeft: string;
      lockedNeedTool: string;
      priedOpenFound: string;
      priedOpenEmpty: string;
      alreadySearched: string;
      inspectedNothingMore: string;
      searchedNothingUsable: string;
      propPartial: string;
      propEmptyNote: string;
      vehicleNothing: string;
      collectedWorldResource: string;
      restedRecovering: string;
      stoodUp: string;
      cannotCraftUnknown: string;
      craftMissingMaterial: string;
      craftPackFull: string;
      craftedSuccess: string;
      consumeNothingLeft: string;
      consumeAlreadyFull: string;
      consumeAteFood: string;
      consumeDrankWater: string;
      consumeUsedMed: string;
      consumeCantUse: string;
      restStopped: string;
      restStarted: string;
      restNeedSafeArea: string;
      weatherClearMsg: string;
      weatherOvercastMsg: string;
      weatherRainMsg: string;
      needRelayMaterials: string;
      relayCalibrated: string;
      movedStoredToShelves: string;
      storageEmpty: string;
      shopOpenedToast: string;
      shopClosedToast: string;
      infectedDefeated: string;
      hitInfected: string;
      swingMissed: string;
      attackedByInfected: string;
      noSaveFound: string;
      freshInfectedNewDay: string;
      discoveredLocation: string;
      packFullPartialReward: string;
      packFullCacheLeft: string;
      discoveredRegion: string;
      enteringRegion: string;
      objectiveComplete: string;
      signalSurgeToast: string;
      ambushSurgeToast: string;
      missionCompletedToast: string;
      introTitle: string;
      introTouchMsg: string;
      introDesktopMsg: string;
      loadedTitle: string;
      loadedFallbackMsg: string;
      customerThanksPurchased: string;
      customerGreetingOpen: string;
      customerBrowsing: string;
      customerLeaving: string;
      guardDefeatedInfected: string;
      guardRetreated: string;
      unpaidWagesNotice: string;
      payrollPaidNotice: string;
      dayEndedFreeplay: string;
    };
    economy: {
      needRecruitFee: string;
      recruitedLogWithFee: string;
      recruitedLog: string;
      recruitedAsLog: string;
      insufficientSalary: string;
      paidSalary: string;
      nothingToDeposit: string;
      storageFullLog: string;
      collectorStoredLog: string;
      alreadyMaxLevel: string;
      needUpgradeMoney: string;
      upgradedShopLog: string;
      alreadyMaxStorage: string;
      needStorageMoney: string;
      installedStorageLog: string;
      unknownDecoration: string;
      decorationAlreadyInstalled: string;
      needDecorationMoney: string;
      installedDecorationLog: string;
      shopOpenedLog: string;
      shopClosedLog: string;
      invalidSpend: string;
      insufficientFunds: string;
      selectAtLeastOneStock: string;
      notEnoughInPack: string;
      stockedShelfLog: string;
      selectAtLeastOneTake: string;
      onlyInStock: string;
      packFullDetailed: string;
      returnedToPackLog: string;
      selectAtLeastOneStore: string;
      storageFullDetailed: string;
      storedBackroomLog: string;
      selectAtLeastOneRetrieve: string;
      onlyInStorage: string;
      retrievedFromStorageLog: string;
      selectAtLeastOneMoveShelf: string;
      movedStorageToStockLog: string;
      selectAtLeastOneMoveStorage: string;
      movedStockToStorageLog: string;
      selectAtLeastOneSell: string;
      cannotSellStock: string;
      customerBoughtLog: string;
      manualSoldLog: string;
      shopStatusOpen: string;
      shopStatusClosedOwner: string;
      shopStatusAfterHours: string;
    };
    staff: {
      alreadyRecruited: string;
      staffLimitReached: string;
      guardLimitReached: string;
      needMoneyToRecruit: string;
      needResourceToRecruit: string;
      survivorNotFound: string;
      cannotRecruit: string;
      joinedShopMsg: string;
      employeeNotFound: string;
      alreadyAssigned: string;
      reassignedMsg: string;
      dismissedMsg: string;
      allWagesPaid: string;
      paidUnpaidCount: string;
      stillUnpaidCount: string;
      wagesChecked: string;
      statusLabels: Record<EmployeeStatus, string>;
      taskRecovering: string;
      taskEngaging: string;
      taskUnpaid: string;
      taskStorageFull: string;
      taskScavengingCountdown: string;
      taskStockedShelf: string;
      taskStoredExcess: string;
      taskCollectorStored: string;
      unpaidReasonNeeds: string;
      wildSurvivorBadge: string;
    };
    customerStatuses: {
      heading: string;
      walking: string;
      entering: string;
      atDoor: string;
      browsing: string;
      inspecting: string;
      atCheckout: string;
      assisted: string;
      leaving: string;
      shopClosed: string;
      entranceUnreachable: string;
      doorBlocked: string;
      entranceBlocked: string;
      nothingInStock: string;
      nothingInBudget: string;
      itemSoldOut: string;
      counterUnreachable: string;
      soldOut: string;
      buyingItem: string;
      switchingItem: string;
      boughtItem: string;
    };
    survival: {
      hungerNoticeCritical: string;
      thirstNoticeCritical: string;
      exhaustedNotice: string;
      deathStarvation: string;
      deathDehydration: string;
      deathInfected: string;
      deathFallback: string;
    };
    locationsFallback: {
      buildingInterior: string;
      abandonedShelter: string;
      streetsSuffix: string;
      weaponSteelPipe: string;
      districtDefault: string;
      districtSurvivor: string;
      defaultCustomerName: string;
    };
  };
  customers: Record<string, string>;
  resources: Record<ResourceId, ResourceTranslation>;
  recipes: Record<string, RecipeTranslation>;
  shopLevels: Record<number, ShopLevelTranslation>;
  storageTiers: Record<number, StorageTierTranslation>;
  decorations: Record<string, DecorationTranslation>;
  professions: Record<EmployeeProfession, ProfessionTranslation>;
  survivors: Record<string, SurvivorTranslation>;
  missions: Record<string, MissionTranslation>;
  clues: Record<string, ClueTranslation>;
  storyObjects: Record<string, StoryObjectTranslation>;
  regions: Record<WorldRegionId, WorldRegionTranslation>;
  locations: Record<string, WorldLocationTranslation>;
  contextZones: Record<string, ContextZoneTranslation>;
  doors: Record<string, string>;
  lockedHints: Record<string, string>;
  containers: Record<string, string>;
  keys: Record<string, string>;
  shopStations: Record<string, string>;
  vehicles: Record<string, VehicleTranslation>;
  workbenches: Record<string, string>;
  searchProps: Record<string, SearchPropTranslation>;
  examineProps: Record<string, ExaminePropTranslation>;
  furniture: Record<string, FurnitureTranslation>;
  guidanceHints: Record<string, GuidanceHintTranslation>;
  worldEvents: {
    categories: Record<WorldEventCategory, string>;
    ui: {
      respondBtn: string;
      approachHint: string; // "Approach ({bearing} {dist}m)"
      secondsLeft: string; // "{sec}s"
      cardHint: string;
      dismissBtn: string;
      closeAria: string;
      needItemDisabled: string; // "Need {qty} {item}"
      needMoneyDisabled: string; // "Need {amount}"
      packFullDisabled: string;
      noiseLoud: string;
      noiseAudible: string;
      goodwillBadge: string; // "Goodwill Lv {level}"
      mapPinLabel: string; // "Event · {title}"
      mapPinDist: string; // "{bearing} {dist}m"
    };
    anchors: Record<string, string>;
    toasts: {
      signalExpired: string;
      traderDeparted: string;
      encounterExpired: string;
      cacheExpired: string;
      prowlerNearbyCue: string;
      noiseAttractsCue: string;
      perimeterWarningCue: string;
      goodwillDiscountNotice: string; // "Survivor goodwill increased (-${discount} recruit fees)"
      packFullPartialEvent: string;
      silhouetteVanishedCue: string;
    };
    events: Record<string, WorldEventItemTranslation>;
  };
}
