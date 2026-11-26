import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from '../assets/audio/soundEngine';
import { ENTERABLE_BUILDINGS } from '../assets/maps/buildingLayouts';
import { NEIGHBORHOOD_MAP } from '../assets/maps/neighborhoodMap';
import { createMaterialPalette } from '../assets/models/proceduralModels';
import { createProceduralTextureSet } from '../assets/textures/proceduralTextures';
import {
  RESOURCE_ORDER,
  addInventoryResource,
  addInventoryResourceCapped,
  createInitialInventory,
  createStarterInventory,
  getPackCapacity,
  getTotalInventoryItems,
} from '../game/resources';
import { ShopEconomySystem, formatMoney } from '../game/economy';
import {
  MissionEvent,
  MissionProcessOutcome,
  MissionRuntimeContext,
  MissionSystem,
} from '../game/missionSystem';
import {
  CURRENT_SAVE_VERSION,
  SavedGameData,
  hasSavedGame,
  loadGameFromStorage,
  saveGameToStorage,
} from '../game/saveSystem';
import { SurvivalSystem } from '../game/survivalSystem';
import { DEFAULT_DAY_LENGTH_SECONDS, TimeSystem } from '../game/timeSystem';
import {
  EmployeeProfession,
  GameScreenState,
  GameSettings,
  HudSnapshot,
  LocationDangerLevel,
  ResourceId,
  ShopModalTab,
  StoryObjectInspectionData,
  WorldRegionId,
} from '../game/types';
import { WeatherSystem } from '../game/weatherSystem';
import { GuidanceSystem } from '../game/guidanceSystem';
import { craftWorkbenchRecipe as runWorkbenchRecipe } from '../game/craftingSystem';
import { computeResponsiveCameraFov } from '../game/responsiveLayout';
import {
  WORLD_EVENT_BY_ID,
  WorldEventChoiceOutcome,
  WorldEventSystem,
  WorldEventTriggerSideEffects,
} from '../game/worldEvents';
import {
  LOCATION_BY_ID,
  REGION_BY_ID,
  getLocalizedLocation,
  getLocalizedRegion,
  getLocationAtPosition,
  getRegionAtPosition,
} from '../game/worldLocations';
import {
  formatTpl,
  getLanguage,
  getTranslations,
  setLanguage,
  tContextZone,
  tDayPhase,
  tMission,
  tResource,
  tWeaponLabel,
} from '../i18n';
import { AssetManager } from './AssetManager';
import { AtmosphereManager } from './AtmosphereManager';
import { CustomerManager } from './CustomerManager';
import { FirstPersonController } from './FirstPersonController';
import { InteractionManager } from './InteractionManager';
import { StaffManager } from './StaffManager';
import { BuiltWorld, buildNeighborhoodWorld } from './WorldBuilder';
import { WorldEventManager } from './WorldEventManager';
import { ZombieManager } from './ZombieManager';

export interface Engine3DCallbacks {
  onHudChange: (hud: HudSnapshot) => void;
  onPauseRequested: () => void;
  onInventoryToggleRequested: () => void;
  onMissionsToggleRequested: () => void;
  onMapToggleRequested: () => void;
  onShopRequested: (tab: ShopModalTab) => void;
  onWorkbenchRequested: (workbenchName: string) => void;
  onSurvivorInteractRequested: (survivorId: string) => void;
  onStoryObjectInspectRequested: (data: StoryObjectInspectionData) => void;
  onWorldEventPromptRequested?: (eventId: string) => void;
  onEndingTriggered: () => void;
  onFlashlightToggled: (on: boolean) => void;
  onGameOver: (reason: string) => void;
  onContextLost: (lost: boolean) => void;
}

const _menuTarget = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class Game3DEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTarget: THREE.WebGLRenderTarget;

  private isSoftwareGl: boolean;
  private sound: SoundEngine;
  private callbacks: Engine3DCallbacks;
  private settings: GameSettings;
  private screenState: GameScreenState = 'MENU';

  private textures: ReturnType<typeof createProceduralTextureSet>;
  private materials: ReturnType<typeof createMaterialPalette>;
  private assets: AssetManager;
  private world: BuiltWorld;
  private atmosphere: AtmosphereManager;
  private timeSystem: TimeSystem;
  private weatherSystem: WeatherSystem;
  private survival: SurvivalSystem;
  private economy: ShopEconomySystem;
  private controller: FirstPersonController;
  private interactions: InteractionManager;
  private customers: CustomerManager;
  private zombies: ZombieManager;
  private staff: StaffManager;
  private worldEventManager: WorldEventManager;
  private missions = new MissionSystem();
  private guidance = new GuidanceSystem();
  private worldEvents = new WorldEventSystem();

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private flashlight: THREE.SpotLight;
  private flashlightTarget: THREE.Object3D;

  private ashPoints: THREE.Points;
  private ashPositions: Float32Array;
  private ashMat: THREE.PointsMaterial;

  private frameId = 0;
  private resizeRafId = 0;
  private resizeObserver: ResizeObserver | null = null;
  private disposed = false;
  private lastTime = 0;
  private elapsedTime = 0;
  private audioAtmoTimer = 0;
  private autosaveTimer = 0;

  private isTouchMode = false;
  private pointerLocked = false;
  private inventoryOpen = false;
  private shopOpen = false;
  private recruitOpen = false;
  private missionsOpen = false;
  private mapOpen = false;
  private storyNoteOpen = false;
  private workbenchOpen = false;
  private worldEventOpen = false;
  private endingOpen = false;
  private activeContextTitle: string | null = null;
  private activeContextMessage: string | null = null;
  private contextTimer = 0;
  private zoneCooldowns = new Map<string, number>();
  private discoveredLocationIds = new Set<string>(['last_shop']);
  private discoveredRegionIds = new Set<WorldRegionId>(['main_street']);
  private claimedDiscoveryRewardIds = new Set<string>(['last_shop']);
  private currentLocationId: string | null = null;
  private lastRegionId: WorldRegionId | null = 'main_street';
  private insideShop = false;
  private lastShopChimeAt = -99;
  private lastHudKey = '';
  private damagePulseId = 0;
  private attackPulseId = 0;
  private recentCombatTimer = 0;
  private moveNoiseCooldown = 0;
  private noiseLevel = 0;
  private lastInteractAtMs = 0;
  private lastSalesSnapshotCount = 0;
  private lastReplenishDay = 1;

  private playerDistanceMoved = 0;
  private lastTrackedX = NEIGHBORHOOD_MAP.playerSpawn.x;
  private lastTrackedZ = NEIGHBORHOOD_MAP.playerSpawn.z;
  private inventoryOpenedCount = 0;
  private mapOpenedCount = 0;
  private missionsOpenedCount = 0;
  private hasAttacked = false;
  private hasConsumed = false;

  private birdTimer = 11;
  private creakTimer = 8;
  private waterDripTimer = 7;
  private metalGroanTimer = 14;
  private distantGroanTimer = 9;
  private ambientWorldEventTimer = 28;
  private uncannySilenceTimer = 0;
  private flashlightFlickerTimer = 0;
  private heartbeatCooldown = 0;
  private tensionLevel = 0;
  private ashPerfCounter = 0;

  constructor(
    container: HTMLElement,
    initialSettings: GameSettings,
    sound: SoundEngine,
    callbacks: Engine3DCallbacks
  ) {
    this.container = container;
    this.settings = { ...initialSettings };
    setLanguage(this.settings.language);
    this.sound = sound;
    this.sound.setSettings(initialSettings.masterVolume, initialSettings.muted, {
      ambientVolume: initialSettings.ambientVolume,
      sfxVolume: initialSettings.sfxVolume,
      musicVolume: initialSettings.musicVolume,
      dialogueVolume: initialSettings.dialogueVolume,
      horrorAudioLevel: initialSettings.horrorAudioLevel,
    });
    this.callbacks = callbacks;

    this.isSoftwareGl = detectSoftwareWebGL();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)
    );
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && this.settings.shadowsEnabled;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = Math.max(320, container.clientWidth || window.innerWidth);
    const height = Math.max(240, container.clientHeight || window.innerHeight);
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const skyColor = 0x121822;
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog = new THREE.FogExp2(skyColor, 0.022);

    this.camera = new THREE.PerspectiveCamera(
      computeResponsiveCameraFov(width, height, 72),
      width / height,
      0.1,
      160
    );

    // Procedural Studio Environment Map for realistic PBR metal/glass reflections
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.45;
    pmrem.dispose();

    // Low-cost Atmospheric Lighting Rig
    this.hemiLight = new THREE.HemisphereLight(0x7c92b0, 0x24211e, 0.78);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffdcb8, 1.35);
    this.sunLight.position.set(28, 34, 22);
    this.sunLight.castShadow = !this.isSoftwareGl && this.settings.shadowsEnabled;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    const d = 38;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 95;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Player Flashlight mounted to camera (shadowless for low-end GPU speed)
    this.flashlight = new THREE.SpotLight(0xfff1d6, 18, 28, Math.PI * 0.2, 0.55, 1.6);
    this.flashlightTarget = new THREE.Object3D();
    this.flashlightTarget.position.set(0, -0.05, -10);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlightTarget);
    this.flashlight.position.set(0.18, -0.14, -0.1);
    this.flashlight.target = this.flashlightTarget;
    this.flashlight.visible = this.settings.flashlightOn;
    this.scene.add(this.camera);

    // Build Procedural Textures, Materials, and 3D Neighborhood World
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createProceduralTextureSet(maxAniso);
    this.materials = createMaterialPalette(this.textures);
    this.assets = new AssetManager();
    this.world = buildNeighborhoodWorld(
      NEIGHBORHOOD_MAP,
      this.textures,
      this.materials,
      this.assets
    );
    this.scene.add(this.world.root);

    this.timeSystem = new TimeSystem(
      initialSettings.dayLengthSeconds || DEFAULT_DAY_LENGTH_SECONDS
    );
    this.weatherSystem = new WeatherSystem();
    this.survival = new SurvivalSystem();
    this.economy = new ShopEconomySystem();
    this.atmosphere = new AtmosphereManager(
      this.scene,
      this.sunLight,
      this.hemiLight,
      this.materials,
      this.world
    );

    // Lightweight drifting ash particles
    const ashCount = 160;
    this.ashPositions = new Float32Array(ashCount * 3);
    for (let i = 0; i < ashCount; i++) {
      this.ashPositions[i * 3] = (Math.random() - 0.5) * 92;
      this.ashPositions[i * 3 + 1] = 0.4 + Math.random() * 8;
      this.ashPositions[i * 3 + 2] = (Math.random() - 0.5) * 92;
    }
    const ashGeo = new THREE.BufferGeometry();
    ashGeo.setAttribute('position', new THREE.BufferAttribute(this.ashPositions, 3));
    this.ashMat = new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 0.08,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });
    this.ashPoints = new THREE.Points(ashGeo, this.ashMat);
    this.ashPoints.frustumCulled = false;
    this.scene.add(this.ashPoints);

    // First-Person Player Controller
    this.controller = new FirstPersonController(
      this.camera,
      this.renderer.domElement,
      this.sound,
      (locked) => {
        this.pointerLocked = locked;
        this.emitHud(true);
      }
    );
    this.controller.spawnAt(
      NEIGHBORHOOD_MAP.playerSpawn.x,
      NEIGHBORHOOD_MAP.playerSpawn.z,
      NEIGHBORHOOD_MAP.playerSpawn.yaw,
      this.world.colliders
    );
    this.interactions = new InteractionManager(
      this.scene,
      this.world.interactables,
      this.sound,
      (stationKind) => {
        this.callbacks.onShopRequested(stationKind === 'storage' ? 'storage' : 'counter');
      }
    );
    this.interactions.setPackCapacityProvider(() => getPackCapacity(this.economy.getShopLevel()));
    this.customers = new CustomerManager(
      this.scene,
      this.assets,
      this.world,
      this.economy,
      this.interactions,
      this.sound
    );
    this.interactions.setCustomerInteractionProvider(
      () => this.customers.getInteractTargets(),
      (customerId) => {
        this.customers.handlePlayerInteract(customerId);
        this.emitHud(true);
      }
    );
    this.zombies = new ZombieManager(
      this.scene,
      this.camera,
      this.assets,
      this.world.colliders,
      this.sound
    );
    this.staff = new StaffManager(
      this.scene,
      this.assets,
      this.world,
      this.economy,
      this.interactions,
      this.zombies,
      this.sound
    );
    this.worldEventManager = new WorldEventManager(this.scene);
    this.interactions.setWorldEventInteractionProvider(
      () => this.worldEventManager.getInteractTargets(),
      (eventId) => {
        this.openActiveWorldEventPrompt(eventId);
      }
    );
    this.interactions.setSurvivorInteractionProvider(
      () => this.staff.getSurvivorInteractTargets(),
      (survivorId) => {
        this.processMissionEvent({ type: 'talk_survivor', survivorId });
        this.callbacks.onSurvivorInteractRequested(survivorId);
        this.emitHud(true);
      }
    );
    this.interactions.setEmployeeInteractionProvider(
      () => this.staff.getEmployeeInteractTargets(),
      (employeeId) => {
        const emp = this.staff.system.employees.find((e) => e.id === employeeId);
        if (emp) {
          this.processMissionEvent({ type: 'talk_survivor', survivorId: emp.survivorId });
        }
        this.callbacks.onShopRequested('staff');
        this.emitHud(true);
      }
    );
    this.interactions.setStoryEventCallbacks({
      onResourceCollected: (resourceId, amount) => {
        this.processMissionEvent({ type: 'collect_resource', resourceId, amount });
      },
      onContainerSearched: (containerId) => {
        this.processMissionEvent({ type: 'search_container', containerId });
      },
      onDoorOpened: (doorId) => {
        this.processMissionEvent({ type: 'open_door', doorId });
      },
      onStoryObjectInteract: (objectId) => {
        this.handleStoryObjectInteract(objectId);
      },
    });
    this.interactions.setEnvironmentCallbacks({
      onWorkbenchOpened: (workbenchName) => {
        this.callbacks.onWorkbenchRequested(workbenchName);
      },
      onExamineNote: (title, message) => {
        this.showContextMessage(title, message, 5.2);
      },
      onBedRestToggle: () => {
        this.toggleRest();
      },
      isRestingProvider: () => this.survival.isResting,
    });

    // Set initial scenic twilight atmosphere for menu
    this.timeSystem.setHour(17.9, 1);
    this.atmosphere.update(
      0.016,
      0,
      this.timeSystem.getSnapshot(),
      this.weatherSystem.getSnapshot(),
      this.camera.position.x,
      this.camera.position.z,
      this.settings.lightingQuality
    );

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
  }

  public startLoop(): void {
    this.lastTime = performance.now();
    const tick = () => {
      if (this.disposed) return;

      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      this.update(dt);
      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private isModalBlockingInput(): boolean {
    return (
      this.inventoryOpen ||
      this.shopOpen ||
      this.recruitOpen ||
      this.missionsOpen ||
      this.mapOpen ||
      this.storyNoteOpen ||
      this.workbenchOpen ||
      this.worldEventOpen ||
      this.endingOpen
    );
  }

  public setScreenState(next: GameScreenState): void {
    this.screenState = next;
    this.controller.clearInputs();
    if (next === 'PLAYING') {
      this.sound.unlock();
      this.sound.startAmbience();
      this.sound.setAmbienceActive(true);
      this.flashlight.visible = this.settings.flashlightOn;
      this.zombies.setFirstPersonWeaponVisible(!this.isModalBlockingInput());
    } else {
      this.sound.setAmbienceActive(false);
      this.controller.exitPointerLock();
      this.zombies.setFirstPersonWeaponVisible(false);
    }
    this.emitHud(true);
  }

  public startNewSession(isTouchMode = false): void {
    this.isTouchMode = isTouchMode;
    this.timeSystem.reset();
    this.weatherSystem.reset('clear');
    this.survival.reset();
    this.economy.reset();
    this.missions.reset();
    this.guidance.reset();
    this.worldEvents.reset();
    this.audioAtmoTimer = 0;
    this.autosaveTimer = 0;
    this.damagePulseId = 0;
    this.attackPulseId = 0;
    this.recentCombatTimer = 0;
    this.moveNoiseCooldown = 0;
    this.noiseLevel = 0;
    this.lastSalesSnapshotCount = 0;
    this.inventoryOpen = false;
    this.shopOpen = false;
    this.recruitOpen = false;
    this.missionsOpen = false;
    this.mapOpen = false;
    this.storyNoteOpen = false;
    this.workbenchOpen = false;
    this.worldEventOpen = false;
    this.endingOpen = false;
    this.zoneCooldowns.clear();
    this.discoveredLocationIds = new Set(['last_shop']);
    this.discoveredRegionIds = new Set(['main_street']);
    this.claimedDiscoveryRewardIds = new Set(['last_shop']);
    this.currentLocationId = null;
    this.lastRegionId = 'main_street';
    this.insideShop = false;
    this.lastShopChimeAt = -99;
    this.playerDistanceMoved = 0;
    this.lastTrackedX = NEIGHBORHOOD_MAP.playerSpawn.x;
    this.lastTrackedZ = NEIGHBORHOOD_MAP.playerSpawn.z;
    this.inventoryOpenedCount = 0;
    this.mapOpenedCount = 0;
    this.missionsOpenedCount = 0;
    this.hasAttacked = false;
    this.hasConsumed = false;
    this.birdTimer = 10;
    this.creakTimer = 8;
    this.distantGroanTimer = 9;
    this.ambientWorldEventTimer = 26;
    this.interactions.reset();
    this.interactions.inventory = createStarterInventory();
    this.lastReplenishDay = 1;
    this.customers.reset();
    this.syncWorldShopProgression();
    this.zombies.reset();
    this.staff.reset();
    this.staff.system.setGoodwillLevel(0);
    this.worldEventManager.sync(
      null,
      this.world.colliders,
      this.elapsedTime,
      NEIGHBORHOOD_MAP.playerSpawn.x,
      NEIGHBORHOOD_MAP.playerSpawn.z
    );
    this.controller.spawnAt(
      NEIGHBORHOOD_MAP.playerSpawn.x,
      NEIGHBORHOOD_MAP.playerSpawn.z,
      NEIGHBORHOOD_MAP.playerSpawn.yaw,
      this.world.colliders
    );
    this.setScreenState('PLAYING');
    if (!isTouchMode) {
      this.controller.requestPointerLock();
    }
    const t = getTranslations();
    this.showContextMessage(
      t.gameMessages.toasts.introTitle,
      isTouchMode
        ? t.gameMessages.toasts.introTouchMsg
        : t.gameMessages.toasts.introDesktopMsg,
      6.5
    );
    this.emitHud(true);
  }

  public saveCurrentGame(showToast = true): boolean {
    if (this.screenState !== 'PLAYING' && this.screenState !== 'PAUSED') {
      return false;
    }
    const t = getTranslations();
    const timeSnap = this.timeSystem.getSnapshot();
    const ctx = this.buildMissionContext();
    const missionSnap = this.missions.getSnapshot(ctx, true);
    const activeTitle =
      missionSnap.trackedMission?.title ??
      (this.missions.endingCompleted
        ? t.gameMessages.toasts.loadedFallbackMsg
        : t.gameMessages.locationsFallback.districtDefault);

    const payload: SavedGameData = {
      version: CURRENT_SAVE_VERSION,
      savedAtIso: new Date().toISOString(),
      day: timeSnap.day,
      formattedTime: timeSnap.formattedTime,
      activeMissionId: missionSnap.trackedMissionId ?? null,
      activeMissionTitle: activeTitle,
      player: {
        x: this.controller.position.x,
        z: this.controller.position.z,
        yaw: this.controller.yaw,
        pitch: this.controller.pitch,
      },
      inventory: { ...this.interactions.inventory },
      survival: this.survival.exportState(),
      timeWeather: {
        day: this.timeSystem.day,
        timeOfDay: this.timeSystem.timeOfDay,
        weather: this.weatherSystem.targetWeather,
      },
      economy: this.economy.exportState(),
      staff: this.staff.system.exportState(),
      world: this.interactions.exportWorldState(),
      zombies: this.zombies.exportState(),
      missions: this.missions.exportState(),
      discoveredLocationIds: Array.from(this.discoveredLocationIds),
      discoveredRegionIds: Array.from(this.discoveredRegionIds),
      claimedDiscoveryRewardIds: Array.from(this.claimedDiscoveryRewardIds),
      guidance: this.guidance.exportState(),
      worldEvents: this.worldEvents.exportState(),
    };

    const ok = saveGameToStorage(payload);
    if (ok && showToast) {
      this.interactions.pushToast(
        formatTpl(t.gameMessages.toasts.dayEndedFreeplay, {
          day: timeSnap.day,
          time: timeSnap.formattedTime,
        }),
        'resource',
        2.4
      );
      this.emitHud(true);
    }
    return ok;
  }

  public loadSavedGame(isTouchMode = false): boolean {
    const t = getTranslations();
    const saved = loadGameFromStorage();
    if (!saved) {
      this.interactions.pushToast(t.gameMessages.toasts.noSaveFound, 'warning', 2.4);
      this.emitHud(true);
      return false;
    }

    this.isTouchMode = isTouchMode;
    this.inventoryOpen = false;
    this.shopOpen = false;
    this.recruitOpen = false;
    this.missionsOpen = false;
    this.mapOpen = false;
    this.storyNoteOpen = false;
    this.workbenchOpen = false;
    this.worldEventOpen = false;
    this.endingOpen = false;
    this.zoneCooldowns.clear();
    this.audioAtmoTimer = 0;
    this.autosaveTimer = 0;
    this.damagePulseId = 0;
    this.attackPulseId = 0;
    this.recentCombatTimer = 0;
    this.moveNoiseCooldown = 0;
    this.noiseLevel = 0;

    this.timeSystem.setHour(
      (saved.timeWeather?.timeOfDay ?? 8 / 24) * 24,
      saved.timeWeather?.day ?? saved.day ?? 1
    );
    this.weatherSystem.setWeather(saved.timeWeather?.weather ?? 'clear', true);
    this.survival.importState(saved.survival);
    this.economy.importState(saved.economy);
    this.lastSalesSnapshotCount = this.economy.getSnapshot().totalSalesCount;
    this.lastReplenishDay = this.timeSystem.day;
    this.interactions.restoreWorldState(saved.world, saved.inventory);
    this.customers.reset();
    this.syncWorldShopProgression();
    this.zombies.importState(saved.zombies);
    this.staff.system.importState(saved.staff, this.world.colliders);
    this.worldEvents.importState(saved.worldEvents);
    this.staff.system.setGoodwillLevel(this.worldEvents.survivorGoodwill);
    this.staff.syncAfterLoad();
    this.missions.importState(saved.missions);
    this.guidance.importState(saved.guidance);
    this.worldEventManager.sync(
      this.worldEvents.activeEvent,
      this.world.colliders,
      this.elapsedTime,
      saved.player?.x ?? NEIGHBORHOOD_MAP.playerSpawn.x,
      saved.player?.z ?? NEIGHBORHOOD_MAP.playerSpawn.z
    );

    this.discoveredLocationIds = new Set(['last_shop']);
    if (Array.isArray(saved.discoveredLocationIds)) {
      for (const id of saved.discoveredLocationIds) {
        if (LOCATION_BY_ID[id]) this.discoveredLocationIds.add(id);
      }
    }
    for (const zId of this.missions.getVisitedZones()) {
      if (LOCATION_BY_ID[zId]) this.discoveredLocationIds.add(zId);
    }
    this.discoveredRegionIds = new Set(['main_street']);
    if (Array.isArray(saved.discoveredRegionIds)) {
      for (const rId of saved.discoveredRegionIds) {
        if (REGION_BY_ID[rId]) this.discoveredRegionIds.add(rId);
      }
    }
    for (const locId of this.discoveredLocationIds) {
      const def = LOCATION_BY_ID[locId];
      if (def) this.discoveredRegionIds.add(def.regionId);
    }
    this.claimedDiscoveryRewardIds = new Set(['last_shop']);
    if (Array.isArray(saved.claimedDiscoveryRewardIds)) {
      for (const id of saved.claimedDiscoveryRewardIds) {
        if (LOCATION_BY_ID[id]) this.claimedDiscoveryRewardIds.add(id);
      }
    } else {
      for (const id of this.discoveredLocationIds) {
        this.claimedDiscoveryRewardIds.add(id);
      }
    }

    const px = saved.player?.x ?? NEIGHBORHOOD_MAP.playerSpawn.x;
    const pz = saved.player?.z ?? NEIGHBORHOOD_MAP.playerSpawn.z;
    this.lastTrackedX = px;
    this.lastTrackedZ = pz;
    this.playerDistanceMoved = 10;
    this.insideShop = this.checkInsideLastShop(px, pz);
    const loadedLoc = getLocationAtPosition(px, pz);
    this.currentLocationId = loadedLoc?.id ?? (this.insideShop ? 'last_shop' : null);
    this.lastRegionId = loadedLoc ? loadedLoc.regionId : getRegionAtPosition(px, pz).id;
    this.discoveredRegionIds.add(this.lastRegionId);

    this.controller.spawnAt(
      px,
      pz,
      saved.player?.yaw ?? NEIGHBORHOOD_MAP.playerSpawn.yaw,
      this.world.colliders,
      saved.player?.pitch ?? -0.04
    );
    this.controller.health = this.survival.health;

    this.setScreenState('PLAYING');
    if (!isTouchMode) {
      this.controller.requestPointerLock();
    }
    const timeSnap = this.timeSystem.getSnapshot();
    const localizedMissionTitle =
      (saved.activeMissionId ? tMission(saved.activeMissionId)?.title : null) ??
      saved.activeMissionTitle ??
      t.gameMessages.toasts.loadedFallbackMsg;
    this.showContextMessage(
      formatTpl(t.gameMessages.toasts.loadedTitle, {
        day: timeSnap.day,
        time: timeSnap.formattedTime,
      }),
      localizedMissionTitle,
      4.5
    );
    this.emitHud(true);
    return true;
  }

  public setInventoryOpen(open: boolean): void {
    this.inventoryOpen = open;
    if (open) {
      this.inventoryOpenedCount += 1;
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setShopOpen(open: boolean): void {
    this.shopOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setRecruitOpen(open: boolean): void {
    this.recruitOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setMissionsOpen(open: boolean): void {
    this.missionsOpen = open;
    if (open) {
      this.missionsOpenedCount += 1;
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setMapOpen(open: boolean): void {
    this.mapOpen = open;
    if (open) {
      this.mapOpenedCount += 1;
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public dismissGuidanceHint(hintId: string): void {
    this.guidance.dismissHint(hintId);
    this.sound.playUiClick(460);
    this.emitHud(true);
  }

  public setStoryNoteOpen(open: boolean): void {
    this.storyNoteOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setWorkbenchOpen(open: boolean): void {
    this.workbenchOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public setWorldEventOpen(open: boolean): void {
    this.worldEventOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public openActiveWorldEventPrompt(eventId?: string): void {
    if (this.screenState !== 'PLAYING') return;
    const active = this.worldEvents.activeEvent;
    if (!active) return;
    if (eventId && active.eventId !== eventId) return;
    const def = WORLD_EVENT_BY_ID[active.eventId];
    if (!def || def.choices.length === 0) return;

    this.sound.unlock();
    this.sound.playUiClick(580);
    this.callbacks.onWorldEventPromptRequested?.(active.eventId);
    this.emitHud(true);
  }

  public dismissWorldEventBanner(): void {
    this.worldEvents.dismissBanner();
    this.sound.playUiClick(440);
    this.emitHud(true);
  }

  public resolveWorldEventChoice(choiceId: string): boolean {
    if (this.screenState !== 'PLAYING') return false;
    const timeSnap = this.timeSystem.getSnapshot();
    const outcome = this.worldEvents.resolveChoice(choiceId, {
      money: this.economy.getMoney(),
      inventory: this.interactions.inventory,
      packCapacity: getPackCapacity(this.economy.getShopLevel()),
    });
    if (!outcome) return false;

    if (!outcome.ok) {
      this.sound.playUiClick(340);
      this.interactions.pushToast(outcome.toast.text, outcome.toast.tone, 2.5);
      this.emitHud(true);
      return false;
    }

    this.applyWorldEventChoiceOutcome(outcome, timeSnap.formattedTime, timeSnap.nightFactor);
    return true;
  }

  private applyWorldEventChoiceOutcome(
    outcome: WorldEventChoiceOutcome,
    timeLabel: string,
    nightFactor: number
  ): void {
    this.interactions.inventory = outcome.nextInventory;
    if (outcome.moneyDelta !== 0) {
      this.economy.applyWorldEventMoneyDelta(outcome.moneyDelta, outcome.toast.text, timeLabel);
    }

    if (outcome.goodwillDelta > 0) {
      this.staff.system.setGoodwillLevel(this.worldEvents.survivorGoodwill);
    }

    const px = this.controller.position.x;
    const pz = this.controller.position.z;
    if (outcome.noiseEvent) {
      this.zombies.emitNoise(
        {
          x: outcome.noiseEvent.x,
          z: outcome.noiseEvent.z,
          radius: outcome.noiseEvent.radius,
          source: 'interact',
        },
        nightFactor
      );
      this.raiseNoiseLevel(Math.min(100, outcome.noiseEvent.radius * 5.2));
    }
    if (outcome.alertZombiesRadius && outcome.alertZombiesRadius > 0) {
      this.zombies.redirectStreetZombies(
        outcome.noiseEvent?.x ?? px,
        outcome.noiseEvent?.z ?? pz,
        2,
        outcome.alertZombiesRadius
      );
    }

    this.playWorldEventSoundCue(outcome.soundCue);

    if (outcome.goodwillDelta > 0) {
      const discount = Math.min(10, this.worldEvents.survivorGoodwill * 5);
      const t = getTranslations();
      const goodwillMsg = formatTpl(t.worldEvents.toasts.goodwillDiscountNotice, { discount });
      this.interactions.pushToast(`${outcome.toast.text} · ${goodwillMsg}`, outcome.toast.tone, 3.4);
    } else {
      this.interactions.pushToast(outcome.toast.text, outcome.toast.tone, 3.0);
    }

    this.worldEventManager.sync(
      this.worldEvents.activeEvent,
      this.world.colliders,
      this.elapsedTime,
      px,
      pz
    );
    this.emitHud(true);
  }

  private playWorldEventSoundCue(
    cue:
      | 'pickup'
      | 'cash'
      | 'radio'
      | 'creak'
      | 'thud'
      | 'groan'
      | 'bell'
      | 'radio_cutoff'
      | 'knock'
      | 'apparition'
      | undefined
  ): void {
    if (!cue) return;
    switch (cue) {
      case 'pickup':
        this.sound.playPickup();
        break;
      case 'cash':
        this.sound.playCashRegister();
        break;
      case 'radio':
        this.sound.playRadioPing();
        break;
      case 'creak':
        this.sound.playWoodCreak();
        break;
      case 'thud':
        this.sound.playDistantThud(false);
        break;
      case 'groan':
        this.sound.playZombieGroan();
        break;
      case 'bell':
        this.sound.playShopBell();
        break;
      case 'radio_cutoff':
        this.sound.playRadioStaticCutoff();
        break;
      case 'knock':
        this.sound.playBuildingKnock();
        break;
      case 'apparition':
        this.sound.playApparitionSting();
        break;
    }
  }

  private raiseNoiseLevel(amount: number): void {
    this.noiseLevel = Math.max(this.noiseLevel, Math.min(100, amount));
  }

  public craftWorkbenchRecipe(recipeId: string): boolean {
    if (this.screenState !== 'PLAYING') return false;
    this.sound.unlock();
    this.sound.startAmbience();
    const cap = getPackCapacity(this.economy.getShopLevel());
    const res = runWorkbenchRecipe(recipeId, this.interactions.inventory, cap);
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.sound.playStockTransfer();
      this.zombies.emitNoise({
        x: this.controller.position.x,
        z: this.controller.position.z,
        radius: 8.5,
        source: 'interact',
      });
      this.raiseNoiseLevel(54);
    } else {
      this.sound.playUiClick(340);
    }
    this.interactions.pushToast(res.message, res.tone, 2.5);
    this.emitHud(true);
    return res.ok;
  }

  public setEndingOpen(open: boolean): void {
    this.endingOpen = open;
    if (open) {
      this.controller.clearInputs();
      this.controller.exitPointerLock();
    } else if (this.missions.endingCompleted && !this.missions.endingSeen) {
      this.missions.endingSeen = true;
      this.saveCurrentGame(false);
    }
    this.zombies.setFirstPersonWeaponVisible(
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
    this.emitHud(true);
  }

  public trackMission(missionId: string | null): void {
    this.missions.trackMission(missionId);
    this.sound.playUiClick(520);
    this.emitHud(true);
  }

  public performStoryObjectAction(objectId: string): StoryObjectInspectionData | null {
    if (objectId !== 'story_final_relay') return null;

    const alreadyCalibrated = this.missions.isStoryObjectActivated('story_final_relay');
    if (!alreadyCalibrated) {
      const t = getTranslations();
      if (!this.missions.canDeliverRelayMaterials('story_final_relay', this.interactions.inventory)) {
        this.sound.playUiClick(360);
        this.interactions.pushToast(t.gameMessages.toasts.needRelayMaterials, 'warning', 2.4);
        return this.missions.buildStoryInspectionData('story_final_relay', this.interactions.inventory);
      }
      this.interactions.inventory = this.missions.consumeRelayMaterials(
        'story_final_relay',
        this.interactions.inventory
      );
      this.sound.playStockTransfer();
      this.interactions.pushToast(t.gameMessages.toasts.relayCalibrated, 'resource', 3.4);
      this.processMissionEvent({
        type: 'interact_story_object',
        objectId: 'story_final_relay',
        mode: 'calibrate',
      });
      this.emitHud(true);
      return null; // close note so player can immediately fight the Signal Surge!
    }

    // Calibrated & surge cleared -> Transmit
    const surgeKills = this.missions.getSurgeKills().surge_relay ?? 0;
    if (surgeKills < 3) {
      this.sound.playUiClick(360);
      return this.missions.buildStoryInspectionData('story_final_relay', this.interactions.inventory);
    }

    this.sound.playCashRegister();
    this.processMissionEvent({
      type: 'interact_story_object',
      objectId: 'story_final_relay',
      mode: 'transmit',
    });
    this.emitHud(true);
    return null;
  }

  private handleStoryObjectInteract(objectId: string): void {
    const data = this.missions.buildStoryInspectionData(
      objectId,
      this.interactions.inventory
    );
    if (!data) return;

    if (objectId !== 'story_final_relay') {
      this.processMissionEvent({
        type: 'interact_story_object',
        objectId,
        mode: 'inspect',
      });
    }

    const refreshed =
      this.missions.buildStoryInspectionData(objectId, this.interactions.inventory) ?? data;
    this.callbacks.onStoryObjectInspectRequested(refreshed);
    this.emitHud(true);
  }

  public recruitSurvivor(survivorId: string, profession: EmployeeProfession): boolean {
    if (this.screenState !== 'PLAYING') return false;
    const snap = this.timeSystem.getSnapshot();
    const res = this.staff.recruitSurvivor(
      survivorId,
      profession,
      snap.day,
      snap.formattedTime,
      this.interactions.inventory
    );
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.processMissionEvent({
        type: 'recruit_survivor',
        employeeCount: this.staff.system.employees.length,
      });
    }
    this.emitHud(true);
    return res.ok;
  }

  public setEmployeeProfession(employeeId: string, profession: EmployeeProfession): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    this.staff.setEmployeeProfession(employeeId, profession, timeLabel);
    this.emitHud(true);
  }

  public dismissEmployee(employeeId: string): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    this.staff.dismissEmployee(employeeId, timeLabel);
    this.emitHud(true);
  }

  public payUnpaidWagesNow(): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    this.staff.payUnpaidWagesNow(timeLabel);
    this.emitHud(true);
  }

  public transferToStock(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferInventoryToStock(
      this.interactions.inventory,
      resourceId,
      quantity,
      timeLabel
    );
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'resource', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public transferFromStock(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferStockToInventory(
      this.interactions.inventory,
      resourceId,
      quantity,
      timeLabel,
      getPackCapacity(this.economy.getShopLevel())
    );
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'world', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public transferToStorage(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferInventoryToStorage(
      this.interactions.inventory,
      resourceId,
      quantity,
      timeLabel
    );
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'world', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public transferFromStorage(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferStorageToInventory(
      this.interactions.inventory,
      resourceId,
      quantity,
      timeLabel,
      getPackCapacity(this.economy.getShopLevel())
    );
    if (res.ok) {
      this.interactions.inventory = res.nextInventory;
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'world', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public transferStorageToStock(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferStorageToStock(resourceId, quantity, timeLabel);
    if (res.ok) {
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'resource', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public transferStockToStorage(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.transferStockToStorage(resourceId, quantity, timeLabel);
    if (res.ok) {
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playStockTransfer();
      this.interactions.pushToast(res.record.message, 'world', 2.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public restockShelvesFromStorage(): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const storage = this.economy.getShopStorage();
    let movedTotal = 0;

    for (const id of RESOURCE_ORDER) {
      const qty = Math.max(0, storage[id] ?? 0);
      if (qty <= 0) continue;
      const res = this.economy.transferStorageToStock(id, qty, timeLabel);
      if (res.ok) movedTotal += qty;
    }

    const t = getTranslations();
    if (movedTotal > 0) {
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playStockTransfer();
      this.interactions.pushToast(
        formatTpl(t.gameMessages.toasts.movedStoredToShelves, { count: movedTotal }),
        'resource',
        2.5
      );
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(t.gameMessages.toasts.storageEmpty, 'warning', 2.2);
    }
    this.emitHud(true);
  }

  public sellShopStock(resourceId: ResourceId, quantity: number): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.sellStockItem(resourceId, quantity, timeLabel);
    if (res.ok) {
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
      this.sound.playCashRegister();
      this.interactions.pushToast(res.record.message, 'resource', 2.5);
      this.lastSalesSnapshotCount = this.economy.getSnapshot().totalSalesCount;
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.3);
    }
    this.emitHud(true);
  }

  public upgradeShopLevel(): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.upgradeShopLevel(timeLabel);
    if (res.ok) {
      this.syncWorldShopProgression();
      this.sound.playCashRegister();
      this.interactions.pushToast(res.record.message, 'resource', 3.2);
      this.processMissionEvent({ type: 'shop_sync' });
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.4);
    }
    this.emitHud(true);
  }

  public upgradeStorageTier(): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.upgradeStorageTier(timeLabel);
    if (res.ok) {
      this.syncWorldShopProgression();
      this.sound.playCashRegister();
      this.interactions.pushToast(res.record.message, 'resource', 2.8);
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.4);
    }
    this.emitHud(true);
  }

  public purchaseDecoration(decorationId: string): void {
    if (this.screenState !== 'PLAYING') return;
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const res = this.economy.purchaseDecoration(decorationId, timeLabel);
    if (res.ok) {
      this.syncWorldShopProgression();
      this.sound.playCashRegister();
      this.interactions.pushToast(res.record.message, 'resource', 2.6);
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.record.message, 'warning', 2.4);
    }
    this.emitHud(true);
  }

  private syncWorldShopProgression(): void {
    this.world.syncShopProgression({
      shopLevel: this.economy.getShopLevel(),
      storageTier: this.economy.getStorageTier(),
      ownedDecorations: this.economy.getOwnedDecorations(),
      shopStock: this.economy.getShopStock(),
    });
  }

  public toggleShopManualOpen(): void {
    if (this.screenState !== 'PLAYING') return;
    const t = getTranslations();
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;
    const next = !this.economy.isShopManualOpen();
    this.economy.setShopManualOpen(next, timeLabel);
    this.sound.playUiClick(next ? 560 : 420);
    this.interactions.pushToast(
      next ? t.gameMessages.toasts.shopOpenedToast : t.gameMessages.toasts.shopClosedToast,
      'world',
      2.4
    );
    this.emitHud(true);
  }

  public triggerInteract(): void {
    if (this.screenState !== 'PLAYING' || this.isModalBlockingInput()) return;
    const nowMs = performance.now();
    if (nowMs - this.lastInteractAtMs < 180) return;
    this.lastInteractAtMs = nowMs;

    this.sound.unlock();
    this.sound.startAmbience();
    const target = this.interactions.targeted;
    const targetKind = target?.kind;
    const wasAlreadySearched =
      (target?.kind === 'vehicle' || target?.kind === 'searchable_prop') && target.searched;
    const wasLockedContainer =
      target?.kind === 'container' && Boolean(target.requiresToolResource) && !target.unlocked;

    if (this.interactions.interact()) {
      const emitsPhysicalNoise =
        targetKind === 'door' ||
        targetKind === 'container' ||
        targetKind === 'resource' ||
        ((targetKind === 'vehicle' || targetKind === 'searchable_prop') && !wasAlreadySearched);
      if (emitsPhysicalNoise) {
        if (wasLockedContainer) {
          this.sound.playWoodCreak();
        }
        this.zombies.emitNoise(
          {
            x: this.controller.position.x,
            z: this.controller.position.z,
            radius: wasLockedContainer ? 15.5 : 12.5,
            source: 'interact',
          },
          this.timeSystem.getSnapshot().nightFactor
        );
        this.raiseNoiseLevel(wasLockedContainer ? 92 : 68);
      }
      this.emitHud(true);
    } else if (this.interactions.latestToast) {
      this.emitHud(true);
    }
  }

  public triggerAttack(): void {
    if (this.screenState !== 'PLAYING' || this.isModalBlockingInput()) return;
    this.sound.unlock();
    this.sound.startAmbience();
    const { triggered, result, killedSurgeId } = this.zombies.triggerPlayerAttack(
      this.controller.position.x,
      this.controller.position.z,
      this.controller.yaw,
      this.timeSystem.getSnapshot().nightFactor
    );
    if (!triggered || !result) return;

    this.hasAttacked = true;
    this.attackPulseId += 1;
    this.recentCombatTimer = 2.8;
    this.raiseNoiseLevel(82);
    const t = getTranslations();
    if (result.killed) {
      this.interactions.pushToast(t.gameMessages.toasts.infectedDefeated, 'resource', 2.2);
      this.processMissionEvent({ type: 'kill_zombie', surgeId: killedSurgeId });
    } else if (result.hit) {
      this.interactions.pushToast(
        formatTpl(t.gameMessages.toasts.hitInfected, { dmg: result.damageDealt }),
        'resource',
        1.8
      );
    } else {
      this.interactions.pushToast(t.gameMessages.toasts.swingMissed, 'world', 1.4);
    }
    this.emitHud(true);
  }

  public setTouchMove(x: number, y: number, sprint: boolean): void {
    if (this.screenState !== 'PLAYING' || this.isModalBlockingInput()) return;
    this.sound.unlock();
    this.sound.startAmbience();
    this.controller.setTouchMove(x, y, sprint);
  }

  public addTouchLookDelta(dx: number, dy: number): void {
    if (this.screenState !== 'PLAYING' || this.isModalBlockingInput()) return;
    this.sound.unlock();
    this.sound.startAmbience();
    this.controller.addTouchLookDelta(dx, dy);
  }

  public triggerTouchJump(): void {
    if (this.screenState !== 'PLAYING' || this.isModalBlockingInput()) return;
    this.sound.unlock();
    this.sound.startAmbience();
    this.controller.triggerJump();
  }

  public toggleFlashlight(): void {
    const blockedByOtherModal = this.isModalBlockingInput() && !this.inventoryOpen;
    if (this.screenState !== 'PLAYING' || blockedByOtherModal) return;
    const next = !this.settings.flashlightOn;
    this.settings.flashlightOn = next;
    this.flashlight.visible = next;
    this.sound.playFlashlightClick(next);
    this.callbacks.onFlashlightToggled(next);
    this.emitHud(true);
  }

  public consumeItem(resourceId: ResourceId): void {
    if (this.screenState !== 'PLAYING') return;
    this.sound.unlock();
    this.sound.startAmbience();
    const res = this.survival.consumeItem(resourceId, this.interactions.inventory);
    if (res.consumed) {
      this.hasConsumed = true;
      this.interactions.inventory = res.nextInventory;
      this.controller.health = this.survival.health;
      if (res.soundKind) {
        this.sound.playConsume(res.soundKind);
      }
    } else {
      this.sound.playUiClick(360);
    }
    this.interactions.pushToast(res.message, res.tone, 2.5);
    this.emitHud(true);
  }

  public toggleRest(): void {
    const blockedByOtherModal = this.isModalBlockingInput() && !this.inventoryOpen;
    if (this.screenState !== 'PLAYING' || blockedByOtherModal) return;
    this.sound.unlock();
    this.sound.startAmbience();
    const res = this.survival.toggleRest();
    this.sound.playRestToggle(res.isResting);
    this.interactions.pushToast(res.message, 'world', 2.2);
    this.emitHud(true);
  }

  public resetToMenu(): void {
    this.inventoryOpen = false;
    this.shopOpen = false;
    this.recruitOpen = false;
    this.missionsOpen = false;
    this.mapOpen = false;
    this.storyNoteOpen = false;
    this.workbenchOpen = false;
    this.worldEventOpen = false;
    this.endingOpen = false;
    this.activeContextTitle = null;
    this.activeContextMessage = null;
    this.contextTimer = 0;
    this.noiseLevel = 0;
    this.uncannySilenceTimer = 0;
    this.flashlightFlickerTimer = 0;
    this.tensionLevel = 0;
    this.worldEvents.reset();
    this.worldEventManager.sync(null, this.world.colliders, this.elapsedTime, 0, 0);
    this.timeSystem.setHour(17.9, 1);
    this.weatherSystem.reset('clear');
    this.setScreenState('MENU');
    this.emitHud(true);
  }

  public updateSettings(next: GameSettings): void {
    const prevLang = this.settings.language;
    this.settings = { ...next };
    setLanguage(next.language);
    if (next.language !== prevLang) {
      this.staff.refreshLocalization();
      this.worldEventManager.refreshLocalization();
    }
    this.sound.setSettings(next.masterVolume, next.muted, {
      ambientVolume: next.ambientVolume,
      sfxVolume: next.sfxVolume,
      musicVolume: next.musicVolume,
      dialogueVolume: next.dialogueVolume,
      horrorAudioLevel: next.horrorAudioLevel,
    });
    this.controller.setSensitivity(next.mouseSensitivity);
    this.timeSystem.setDayLengthSeconds(
      next.dayLengthSeconds || DEFAULT_DAY_LENGTH_SECONDS
    );
    this.flashlight.visible = next.flashlightOn && this.screenState === 'PLAYING';
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && next.shadowsEnabled;
    this.sunLight.castShadow = !this.isSoftwareGl && next.shadowsEnabled;
    this.emitHud(true);
  }

  private showContextMessage(title: string, message: string, duration = 5.5): void {
    this.activeContextTitle = title;
    this.activeContextMessage = message;
    this.contextTimer = duration;
  }

  private checkInsideLastShop(px: number, pz: number): boolean {
    const shop = ENTERABLE_BUILDINGS[0];
    if (!shop) return false;
    return (
      Math.abs(px - shop.x) <= shop.w * 0.5 - 0.15 &&
      Math.abs(pz - shop.z) <= shop.d * 0.5 - 0.15
    );
  }

  private isPlayerIndoors(px: number, pz: number): boolean {
    for (const fl of this.world.colliders.floors) {
      if (fl.active === false) continue;
      if (px >= fl.minX && px <= fl.maxX && pz >= fl.minZ && pz <= fl.maxZ) {
        return true;
      }
    }
    return false;
  }

  private update(dt: number): void {
    this.elapsedTime += dt;
    const isPerfMode = this.settings.lightingQuality === 'performance';

    if (this.screenState === 'MENU') {
      this.updateAshParticles(dt, 0.25, isPerfMode);
      // Smooth 3D cinematic orbit overlooking the Last Shop & twilight intersection
      const t = this.elapsedTime * 0.14;
      this.camera.position.set(
        -5.5 + Math.sin(t) * 6.5,
        4.2 + Math.cos(t * 0.7) * 0.5,
        2.5 + Math.cos(t) * 4.5
      );
      _menuTarget.set(-14.5, 2.4, -12.5);
      this.camera.lookAt(_menuTarget);
      this.flashlight.visible = false;
      this.atmosphere.update(
        dt,
        this.elapsedTime,
        this.timeSystem.getSnapshot(),
        this.weatherSystem.getSnapshot(),
        this.camera.position.x,
        this.camera.position.z,
        this.settings.lightingQuality
      );
      return;
    }

    if (this.screenState === 'PAUSED' || this.screenState === 'GAMEOVER') {
      return;
    }

    // PLAYING
    const modalBlocked = this.isModalBlockingInput();
    this.flashlight.visible = this.settings.flashlightOn;
    this.zombies.setFirstPersonWeaponVisible(!modalBlocked);
    const moveInputActive = !modalBlocked && this.controller.hasMovementIntent();
    if (!modalBlocked) {
      this.controller.update(dt, this.world.colliders, {
        canSprint: this.survival.canSprint(),
        isResting: this.survival.isResting,
      });
    }

    const indoors = this.isPlayerIndoors(
      this.controller.position.x,
      this.controller.position.z
    );
    const jumpCount = modalBlocked ? 0 : this.controller.consumeJumpCount();
    const isMoving = !modalBlocked && this.controller.isActivelyMoving();
    const isSprinting = !modalBlocked && this.controller.isSprinting;

    this.timeSystem.update(dt);
    this.weatherSystem.update(dt);
    const timeSnap = this.timeSystem.getSnapshot();
    const weatherSnap = this.weatherSystem.getSnapshot();

    if (timeSnap.day > this.lastReplenishDay) {
      this.lastReplenishDay = timeSnap.day;
      const respawned = this.zombies.replenishStreetZombiesOnNewDay(
        timeSnap.day,
        this.controller.position.x,
        this.controller.position.z
      );
      if (respawned > 0) {
        this.interactions.pushToast(
          formatTpl(getTranslations().gameMessages.toasts.freshInfectedNewDay, {
            day: timeSnap.day,
          }),
          'world',
          3.0
        );
      }
    }

    const survivalNotice = this.survival.update(dt, {
      isMoving,
      isSprinting,
      jumpCount,
      isIndoors: indoors,
      moveInputActive,
      isSafeHaven: this.insideShop,
      nightFactor: timeSnap.nightFactor,
      rainIntensity: weatherSnap.rainIntensity,
    });

    // Emit lightweight movement/jump noise events for zombies & smooth HUD noise decay
    this.noiseLevel = Math.max(0, this.noiseLevel - 28 * dt);
    if (jumpCount > 0) {
      this.raiseNoiseLevel(68);
      this.zombies.emitNoise(
        {
          x: this.controller.position.x,
          z: this.controller.position.z,
          radius: 11.5,
          source: 'jump',
        },
        timeSnap.nightFactor,
        weatherSnap.rainIntensity
      );
    }
    this.moveNoiseCooldown = Math.max(0, this.moveNoiseCooldown - dt);
    if (isMoving && this.moveNoiseCooldown <= 0) {
      this.moveNoiseCooldown = isSprinting ? 0.36 : 0.62;
      this.raiseNoiseLevel(isSprinting ? 58 : 24);
      this.zombies.emitNoise(
        {
          x: this.controller.position.x,
          z: this.controller.position.z,
          radius: isSprinting ? 14.5 : 6.5,
          source: isSprinting ? 'sprint' : 'walk',
        },
        timeSnap.nightFactor,
        weatherSnap.rainIntensity
      );
    }

    const staffStep = this.staff.update(
      dt,
      timeSnap.formattedTime,
      this.controller.position.x,
      this.controller.position.z
    );
    for (const killedSurgeId of staffStep.killedSurgeIds) {
      this.processMissionEvent({ type: 'kill_zombie', surgeId: killedSurgeId });
    }
    if (staffStep.stockChanged || staffStep.storageChanged) {
      this.processMissionEvent({ type: 'shop_sync' });
    }

    this.customers.update(
      dt,
      timeSnap.timeOfDay * 24,
      timeSnap.formattedTime,
      this.controller.position.x,
      this.controller.position.z,
      this.staff.system.getActiveShopkeeperCount()
    );
    const currentSalesCount = this.economy.getSnapshot().totalSalesCount;
    if (currentSalesCount !== this.lastSalesSnapshotCount) {
      this.lastSalesSnapshotCount = currentSalesCount;
      this.processMissionEvent({ type: 'shop_sync' });
    }

    const zombieTick = this.zombies.update(
      dt,
      this.controller.position.x,
      this.controller.position.z,
      this.survival.isDead(),
      isMoving,
      isSprinting,
      timeSnap.nightFactor,
      this.settings.flashlightOn,
      {
        rainIntensity: weatherSnap.rainIntensity,
        isFoggy: weatherSnap.weather === 'fog',
        playerSafe: this.insideShop,
        day: timeSnap.day,
      }
    );

    if (this.recentCombatTimer > 0) {
      this.recentCombatTimer = Math.max(0, this.recentCombatTimer - dt);
    }

    if (zombieTick.playerDamage > 0) {
      const t = getTranslations();
      const dealt = this.survival.takeDamage(
        zombieTick.playerDamage,
        t.gameMessages.survival.deathInfected
      );
      if (dealt > 0) {
        this.damagePulseId += 1;
        this.recentCombatTimer = 3.5;
        this.flashlightFlickerTimer = Math.max(this.flashlightFlickerTimer, 0.6);
        this.controller.triggerDamageFlinch(Math.min(1.2, dealt / 14));
        this.interactions.pushToast(
          formatTpl(t.gameMessages.toasts.attackedByInfected, { dmg: Math.round(dealt) }),
          'warning',
          2.2
        );
      }
    } else if (survivalNotice) {
      if (!this.interactions.latestToast || survivalNotice.tone === 'warning') {
        this.interactions.pushToast(survivalNotice.text, survivalNotice.tone, 3.2);
      }
    }

    this.controller.health = this.survival.health;

    if (this.survival.isDead()) {
      this.screenState = 'GAMEOVER';
      this.controller.clearInputs();
      this.controller.exitPointerLock();
      this.sound.setAmbienceActive(false);
      this.zombies.setFirstPersonWeaponVisible(false);
      this.callbacks.onGameOver(
        this.survival.deathReason || getTranslations().gameMessages.survival.deathFallback
      );
      this.emitHud(true);
      return;
    }

    const px = this.controller.position.x;
    const pz = this.controller.position.z;
    const stepMoved = Math.hypot(px - this.lastTrackedX, pz - this.lastTrackedZ);
    if (stepMoved > 0.001 && stepMoved < 5.0) {
      this.playerDistanceMoved += stepMoved;
    }
    this.lastTrackedX = px;
    this.lastTrackedZ = pz;

    const wasInsideShop = this.insideShop;
    this.insideShop = this.checkInsideLastShop(px, pz);
    if (!wasInsideShop && this.insideShop && this.elapsedTime - this.lastShopChimeAt > 3.5) {
      this.lastShopChimeAt = this.elapsedTime;
      this.sound.playShopBell();
    }

    const t = getTranslations();
    const loc = getLocationAtPosition(px, pz);
    this.currentLocationId = loc?.id ?? (this.insideShop ? 'last_shop' : null);
    let forceHudFromDiscovery = false;
    let justDiscoveredLocation = false;
    if (loc && !this.discoveredLocationIds.has(loc.id)) {
      this.discoveredLocationIds.add(loc.id);
      this.discoveredRegionIds.add(loc.regionId);
      const locLocalized = getLocalizedLocation(loc.id) ?? loc;
      const regionDef = getLocalizedRegion(loc.regionId);
      let rewardText = '';
      let discoveryOverflow = false;
      if (loc.discoveryReward && !this.claimedDiscoveryRewardIds.has(loc.id)) {
        this.claimedDiscoveryRewardIds.add(loc.id);
        let anyAdded = false;
        const rewardLabel = locLocalized.discoveryReward?.label ?? loc.discoveryReward.label;
        if (loc.discoveryReward.money && loc.discoveryReward.money > 0) {
          this.economy.grantMissionReward(
            loc.discoveryReward.money,
            `${locLocalized.name} (+${formatMoney(loc.discoveryReward.money)})`,
            timeSnap.formattedTime
          );
          anyAdded = true;
        }
        if (loc.discoveryReward.resources) {
          const packCap = getPackCapacity(this.economy.getShopLevel());
          for (const id of RESOURCE_ORDER) {
            const qty = loc.discoveryReward.resources[id] ?? 0;
            if (qty > 0) {
              const addRes = addInventoryResourceCapped(
                this.interactions.inventory,
                id,
                qty,
                packCap
              );
              this.interactions.inventory = addRes.nextInventory;
              if (addRes.added > 0) anyAdded = true;
              if (addRes.overflow > 0) discoveryOverflow = true;
            }
          }
        }
        if (anyAdded && !discoveryOverflow) {
          rewardText = ` · ${rewardLabel}`;
        } else if (anyAdded && discoveryOverflow) {
          rewardText = formatTpl(t.gameMessages.toasts.packFullPartialReward, {
            label: rewardLabel,
          });
        } else if (discoveryOverflow) {
          rewardText = t.gameMessages.toasts.packFullCacheLeft;
        }
      }
      this.interactions.pushToast(
        formatTpl(t.gameMessages.toasts.discoveredLocation, {
          loc: locLocalized.name,
          region: regionDef.name,
          reward: rewardText,
        }),
        discoveryOverflow ? 'warning' : loc.discoveryReward ? 'resource' : 'world',
        3.6
      );
      if (!this.missions.getVisitedZones().includes(loc.id)) {
        this.processMissionEvent({ type: 'enter_zone', zoneId: loc.id });
      }
      forceHudFromDiscovery = true;
      justDiscoveredLocation = true;
    }

    const activeRegionRaw = loc ? REGION_BY_ID[loc.regionId] : getRegionAtPosition(px, pz);
    const activeRegion = getLocalizedRegion(activeRegionRaw.id);
    if (activeRegion.id !== this.lastRegionId) {
      this.lastRegionId = activeRegion.id;
      const firstRegionVisit = !this.discoveredRegionIds.has(activeRegion.id);
      if (firstRegionVisit) {
        this.discoveredRegionIds.add(activeRegion.id);
        this.sound.playUiClick(580);
      }
      if (!justDiscoveredLocation) {
        this.interactions.pushToast(
          firstRegionVisit
            ? formatTpl(t.gameMessages.toasts.discoveredRegion, {
                name: activeRegion.name,
                subtitle: activeRegion.subtitle,
              })
            : formatTpl(t.gameMessages.toasts.enteringRegion, {
                name: activeRegion.name,
              }),
          'world',
          firstRegionVisit ? 3.2 : 2.1
        );
      }
      forceHudFromDiscovery = true;
    }

    if (this.uncannySilenceTimer > 0) {
      this.uncannySilenceTimer = Math.max(0, this.uncannySilenceTimer - dt);
    }
    if (this.flashlightFlickerTimer > 0) {
      this.flashlightFlickerTimer = Math.max(0, this.flashlightFlickerTimer - dt);
    }

    this.atmosphere.update(
      dt,
      this.elapsedTime,
      timeSnap,
      weatherSnap,
      px,
      pz,
      this.settings.lightingQuality
    );
    this.updateAshParticles(dt, weatherSnap.windGust, isPerfMode);
    this.ashMat.opacity = Math.max(
      0.08,
      (0.36 + weatherSnap.windGust * 0.14) * (1 - weatherSnap.rainIntensity * 0.8)
    );

    // Subtle flashlight micro-dip during power surges or impact shock (never turns off)
    const powerFlicker = this.atmosphere.getPowerFlickerIntensity();
    if (this.settings.flashlightOn && (powerFlicker > 0.05 || this.flashlightFlickerTimer > 0)) {
      const dip =
        Math.sin(this.elapsedTime * 34) * Math.cos(this.elapsedTime * 19) > 0.25 ? 0.58 : 0.94;
      this.flashlight.intensity = 18 * dip;
    } else {
      this.flashlight.intensity = 18;
    }

    // Compute smooth psychological tension level (0..1) from danger, health, darkness, and isolation
    let nearDangerScore = 0;
    for (const z of this.zombies.getAgents()) {
      if (z.state === 'dead') continue;
      const zd = Math.hypot(z.x - px, z.z - pz);
      if (zd < 16) {
        const proximity = Math.max(0, 1 - zd / 16);
        const stateWeight =
          z.state === 'chasing' || z.state === 'attacking'
            ? 0.65
            : z.state === 'alert' || z.state === 'investigating' || z.state === 'searching'
              ? 0.42
              : 0.16;
        nearDangerScore = Math.max(nearDangerScore, proximity * stateWeight + 0.18);
      }
    }
    const lowHpRatio = Math.max(0, (42 - this.survival.health) / 42);
    const highDangerZoneBoost =
      !this.insideShop &&
      (activeRegion.id === 'research_facility' ||
        activeRegion.id === 'police_station' ||
        activeRegion.id === 'military_checkpoint')
        ? 0.16
        : 0;
    let targetTension = this.insideShop
      ? lowHpRatio * 0.28
      : Math.min(
          1,
          lowHpRatio * 0.65 +
            nearDangerScore +
            (this.recentCombatTimer > 0 ? 0.26 : 0) +
            highDangerZoneBoost +
            timeSnap.nightFactor * (this.settings.flashlightOn ? 0.1 : 0.24) +
            powerFlicker * 0.18 +
            (this.uncannySilenceTimer > 0 ? 0.15 : 0)
        );
    targetTension = Math.max(0, Math.min(1, targetTension));
    this.tensionLevel += (targetTension - this.tensionLevel) * Math.min(1, dt * 2.5);

    this.heartbeatCooldown = Math.max(0, this.heartbeatCooldown - dt);
    if (
      !modalBlocked &&
      this.heartbeatCooldown <= 0 &&
      (this.survival.health <= 32 || (!this.insideShop && this.tensionLevel >= 0.64))
    ) {
      this.heartbeatCooldown = this.survival.health <= 25 ? 0.92 : 1.18;
      this.sound.playHeartbeatPulse(Math.max(this.tensionLevel, lowHpRatio));
    }

    this.audioAtmoTimer += dt;
    if (this.audioAtmoTimer >= 0.14) {
      this.audioAtmoTimer = 0;
      const distShop = Math.hypot(px + 15.5, pz + 13.5);
      const shopHum = this.insideShop ? 1.0 : Math.max(0, 1 - distShop / 11.5);
      const relayActivated = this.missions.isStoryObjectActivated('story_final_relay');
      const relayHum = relayActivated ? Math.max(0, 1 - Math.hypot(px, pz + 24.5) / 10) : 0;
      this.sound.updateAtmosphere(
        true,
        weatherSnap.rainIntensity,
        timeSnap.nightFactor,
        indoors,
        Math.max(shopHum, relayHum),
        {
          dangerFactor: this.tensionLevel,
          isSafeBase: this.insideShop,
          windGust: weatherSnap.windGust,
          silenceFactor: this.uncannySilenceTimer > 0 ? 1 : 0,
        }
      );
    }

    this.updateAmbientAudioAndWorldEvents(
      dt,
      timeSnap,
      weatherSnap,
      indoors,
      modalBlocked,
      px,
      pz,
      activeRegion.id
    );

    this.stepDynamicWorldEvents(dt, timeSnap, weatherSnap, indoors, modalBlocked, px, pz);
    this.worldEventManager.sync(
      this.worldEvents.activeEvent,
      this.world.colliders,
      this.elapsedTime,
      px,
      pz,
      dt,
      this.controller.yaw,
      () => {
        if (this.worldEvents.dissolveActiveSilhouette()) {
          this.sound.playApparitionSting();
          this.flashlightFlickerTimer = Math.max(this.flashlightFlickerTimer, 0.45);
          this.interactions.pushToast(t.worldEvents.toasts.silhouetteVanishedCue, 'world', 2.6);
        }
      }
    );

    this.interactions.update(dt, px, pz, this.controller.yaw);
    this.updateContextZones(dt);

    // Lightweight periodic autosave every ~20s of active play
    this.autosaveTimer += dt;
    if (this.autosaveTimer >= 20) {
      this.autosaveTimer = 0;
      this.saveCurrentGame(false);
    }

    this.emitHud(forceHudFromDiscovery);
  }

  private stepDynamicWorldEvents(
    dt: number,
    timeSnap: ReturnType<TimeSystem['getSnapshot']>,
    weatherSnap: ReturnType<WeatherSystem['getSnapshot']>,
    indoors: boolean,
    modalBlocked: boolean,
    px: number,
    pz: number
  ): void {
    if (modalBlocked) return;

    const loc = this.currentLocationId ? LOCATION_BY_ID[this.currentLocationId] : null;
    const region = loc ? REGION_BY_ID[loc.regionId] : getRegionAtPosition(px, pz);
    const dangerTier: LocationDangerLevel = this.insideShop
      ? 'safe'
      : loc?.dangerLevel ??
        (region.id === 'military_checkpoint' ||
        region.id === 'research_facility' ||
        region.id === 'police_station'
          ? 'high'
          : region.id === 'main_street'
            ? 'low'
            : 'moderate');

    let livingZombieCount = 0;
    let nearbyLivingZombies = 0;
    let nearbyAlertedZombies = 0;
    let inActiveCombat = this.recentCombatTimer > 0;
    for (const z of this.zombies.getAgents()) {
      if (z.state === 'dead') continue;
      livingZombieCount += 1;
      const d = Math.hypot(z.x - px, z.z - pz);
      if (d <= 22) nearbyLivingZombies += 1;
      if (
        d <= 14 &&
        (z.state === 'investigating' ||
          z.state === 'alert' ||
          z.state === 'chasing' ||
          z.state === 'searching' ||
          z.state === 'attacking')
      ) {
        nearbyAlertedZombies += 1;
      }
      if (d <= 6.8 && (z.state === 'chasing' || z.state === 'attacking' || z.state === 'alert')) {
        inActiveCombat = true;
      }
    }

    const shopSnap = this.economy.getSnapshot();
    const completedMainMissions = this.missions.getSnapshot(this.buildMissionContext(), false).mainCompletedCount;
    const unrecruitedSurvivorCount = this.staff.system.worldSurvivors.filter((s) => !s.recruited).length;

    const tickOut = this.worldEvents.step(dt, {
      playerX: px,
      playerZ: pz,
      insideShop: this.insideShop,
      isIndoors: indoors,
      currentRegionId: region.id,
      dangerTier,
      day: timeSnap.day,
      nightFactor: timeSnap.nightFactor,
      weather: weatherSnap.weather,
      health: this.survival.health,
      money: shopSnap.money,
      shopLevel: shopSnap.shopLevel,
      totalStockItems: shopSnap.totalStockItems,
      totalSalesCount: shopSnap.totalSalesCount,
      employeeCount: this.staff.system.employees.length,
      activeGuardCount: this.staff.system.getActiveGuardCount(),
      unrecruitedSurvivorCount,
      completedMainMissions,
      inActiveCombat,
      modalBlocking: modalBlocked,
      livingZombieCount,
      nearbyLivingZombies,
      nearbyAlertedZombies,
      noiseLevel: this.noiseLevel,
      inventory: this.interactions.inventory,
      packCapacity: getPackCapacity(shopSnap.shopLevel),
    });

    if (tickOut.sideEffects) {
      this.executeWorldEventSideEffects(
        tickOut.triggeredEvent?.id ?? null,
        tickOut.sideEffects,
        timeSnap.nightFactor,
        px,
        pz
      );
    }
  }

  private executeWorldEventSideEffects(
    eventId: string | null,
    fx: WorldEventTriggerSideEffects,
    nightFactor: number,
    px: number,
    pz: number
  ): void {
    if (fx.spawnProwlers) {
      this.zombies.spawnDynamicProwlers(
        fx.spawnProwlers.count,
        fx.spawnProwlers.targetX,
        fx.spawnProwlers.targetZ,
        fx.spawnProwlers.minDistanceFromPlayer,
        px,
        pz
      );
    }
    if (fx.migrateZombies) {
      this.zombies.redirectStreetZombies(
        fx.migrateZombies.targetX,
        fx.migrateZombies.targetZ,
        fx.migrateZombies.maxCount,
        fx.migrateZombies.maxSearchRadius
      );
    }
    if (fx.emitNoise) {
      this.zombies.emitNoise(
        {
          x: fx.emitNoise.x,
          z: fx.emitNoise.z,
          radius: fx.emitNoise.radius,
          source: 'interact',
        },
        nightFactor
      );
      this.raiseNoiseLevel(64);
    }
    if (fx.flashStrength && fx.flashStrength > 0) {
      this.atmosphere.triggerLightningFlash(fx.flashStrength);
    }
    if (fx.powerFlickerSeconds && fx.powerFlickerSeconds > 0) {
      this.atmosphere.triggerLocalPowerFlicker(fx.powerFlickerSeconds);
    }
    if (fx.silenceSeconds && fx.silenceSeconds > 0) {
      this.uncannySilenceTimer = Math.max(this.uncannySilenceTimer, fx.silenceSeconds);
    }
    this.playWorldEventSoundCue(fx.soundCue);

    if (fx.toast && (!this.interactions.latestToast || fx.toast.tone === 'warning')) {
      this.interactions.pushToast(fx.toast.text, fx.toast.tone, 2.8);
    }
    if (fx.openChoiceModal && eventId) {
      this.callbacks.onWorldEventPromptRequested?.(eventId);
    }
  }

  private updateAmbientAudioAndWorldEvents(
    dt: number,
    timeSnap: ReturnType<TimeSystem['getSnapshot']>,
    weatherSnap: ReturnType<WeatherSystem['getSnapshot']>,
    indoors: boolean,
    modalBlocked: boolean,
    px: number,
    pz: number,
    regionId: WorldRegionId
  ): void {
    if (modalBlocked || this.uncannySilenceTimer > 0) return;

    // 1. Daytime birds outdoors in calm weather
    this.birdTimer -= dt;
    if (this.birdTimer <= 0) {
      this.birdTimer = 14 + Math.random() * 14;
      if (!indoors && timeSnap.daylightFactor > 0.45 && weatherSnap.rainIntensity < 0.25) {
        this.sound.playBirdChirp();
      }
    }

    // 2. Dry timber creaks inside abandoned buildings
    this.creakTimer -= dt;
    if (this.creakTimer <= 0) {
      this.creakTimer = 11 + Math.random() * 11;
      if (indoors && !this.insideShop) {
        this.sound.playWoodCreak();
      }
    }

    // 2b. Subtle indoor water drips inside abandoned ruins
    this.waterDripTimer -= dt;
    if (this.waterDripTimer <= 0) {
      this.waterDripTimer = 6.5 + Math.random() * 8;
      if (indoors && !this.insideShop) {
        this.sound.playWaterDrip();
      }
    }

    // 2c. Structural metal groans or muffled building knocks in tense districts
    this.metalGroanTimer -= dt;
    if (this.metalGroanTimer <= 0) {
      this.metalGroanTimer = 14 + Math.random() * 14;
      if (indoors && !this.insideShop && Math.random() > 0.55) {
        this.sound.playBuildingKnock();
      } else if (
        !this.insideShop &&
        (regionId === 'industrial_zone' ||
          regionId === 'police_station' ||
          regionId === 'research_facility' ||
          regionId === 'military_checkpoint' ||
          weatherSnap.windGust > 0.65)
      ) {
        this.sound.playMetalGroan();
      }
    }

    // 3. Distance-attenuated zombie groans when lurking at mid-range (9-34m)
    this.distantGroanTimer -= dt;
    if (this.distantGroanTimer <= 0) {
      this.distantGroanTimer = 9 + Math.random() * 9;
      let nearest = Infinity;
      for (const z of this.zombies.getAgents()) {
        if (z.state === 'dead') continue;
        const d = Math.hypot(z.x - px, z.z - pz);
        if (d >= 9 && d <= 34 && d < nearest) {
          nearest = d;
        }
      }
      if (nearest < Infinity) {
        this.sound.playDistantZombieGroan(nearest);
      }
    }

    // 4. Lightweight ambient world events (lightning thunder / distant noise / radio squelch)
    this.ambientWorldEventTimer -= dt;
    if (this.ambientWorldEventTimer <= 0) {
      this.ambientWorldEventTimer = 34 + Math.random() * 20;
      if (weatherSnap.rainIntensity > 0.32) {
        this.atmosphere.triggerLightningFlash(0.95);
        this.sound.playDistantThud(true);
      } else if (
        Math.hypot(px + 15.5, pz + 13.5) < 12 ||
        Math.hypot(px, pz + 24.5) < 12
      ) {
        this.sound.playRadioPing();
      } else if (!this.insideShop) {
        this.sound.playDistantThud(false);
      }
    }
  }

  private buildMissionContext(): MissionRuntimeContext {
    const shopSnap = this.economy.getSnapshot();
    const timeSnap = this.timeSystem.getSnapshot();
    return {
      day: timeSnap.day,
      inventory: this.interactions.inventory,
      shopStock: shopSnap.shopStock,
      shopStorage: shopSnap.shopStorage,
      shopLevel: shopSnap.shopLevel,
      totalSalesCount: shopSnap.totalSalesCount,
      employeeCount: this.staff.system.employees.length,
      zombiesDefeated: this.zombies.zombiesDefeated,
      visitedZones: this.missions.getVisitedZones(),
      openedDoors: this.interactions.getOpenDoorIds(),
      searchedContainers: Array.from(
        new Set([
          ...this.interactions.getSearchedContainerIds(),
          ...this.interactions.getSearchedPropIds(),
        ])
      ),
      collectedResourceCount: this.missions.getCollectedResourceCount(),
      talkedSurvivors: this.missions.getTalkedSurvivors(),
      inspectedStoryObjects: this.missions.getInspectedStoryObjects(),
      activatedStoryObjects: this.missions.getActivatedStoryObjects(),
      surgeKills: this.missions.getSurgeKills(),
    };
  }

  private processMissionEvent(event: MissionEvent): void {
    const preCtx = this.buildMissionContext();
    const preSnap = this.missions.getSnapshot(preCtx, false);
    const prevCompletedObjIds = new Set(
      (preSnap.trackedMission?.objectives ?? []).filter((o) => o.completed).map((o) => o.id)
    );
    const prevTrackedId = preSnap.trackedMissionId;

    const outcome = this.missions.recordEvent(event, preCtx);
    this.applyMissionOutcome(outcome);

    if (
      outcome.newlyCompletedMissions.length === 0 &&
      !outcome.triggerSurgeId &&
      prevTrackedId
    ) {
      const postSnap = this.missions.getSnapshot(this.buildMissionContext(), false);
      if (postSnap.trackedMissionId === prevTrackedId && postSnap.trackedMission) {
        const newlyDoneObj = postSnap.trackedMission.objectives.find(
          (o) => o.completed && !prevCompletedObjIds.has(o.id)
        );
        if (newlyDoneObj) {
          this.interactions.pushToast(
            formatTpl(getTranslations().gameMessages.toasts.objectiveComplete, {
              desc: newlyDoneObj.description,
            }),
            'world',
            2.8
          );
        }
      }
    }
  }

  private applyMissionOutcome(outcome: MissionProcessOutcome): void {
    const t = getTranslations();
    const timeLabel = this.timeSystem.getSnapshot().formattedTime;

    for (const reward of outcome.rewardGrants) {
      if (reward.money > 0) {
        this.economy.grantMissionReward(
          reward.money,
          `${reward.missionTitle} (+${formatMoney(reward.money)})`,
          timeLabel
        );
      }
      for (const id of RESOURCE_ORDER) {
        const qty = reward.resources[id] ?? 0;
        if (qty > 0) {
          this.interactions.inventory = addInventoryResource(
            this.interactions.inventory,
            id,
            qty
          );
        }
      }
    }

    if (outcome.triggerSurgeId) {
      this.zombies.spawnStorySurge(
        outcome.triggerSurgeId,
        this.controller.position.x,
        this.controller.position.z
      );
      this.sound.playZombieGroan();
      this.interactions.pushToast(
        outcome.triggerSurgeId === 'surge_relay'
          ? t.gameMessages.toasts.signalSurgeToast
          : t.gameMessages.toasts.ambushSurgeToast,
        'warning',
        3.6
      );
    }

    if (outcome.newlyCompletedMissions.length > 0) {
      this.sound.playCashRegister();
      const first = outcome.newlyCompletedMissions[0];
      const rewardParts: string[] = [];
      if (first.rewards.money) rewardParts.push(`+${formatMoney(first.rewards.money)}`);
      if (first.rewards.resources) {
        for (const id of RESOURCE_ORDER) {
          const q = first.rewards.resources[id] ?? 0;
          if (q > 0) rewardParts.push(`+${q} ${tResource(id).name}`);
        }
      }
      this.interactions.pushToast(
        formatTpl(t.gameMessages.toasts.missionCompletedToast, {
          title: first.title,
          rewards: rewardParts.length ? ` (${rewardParts.join(', ')})` : '',
        }),
        'resource',
        3.6
      );

      if (outcome.newlyUnlockedMissions.length > 0) {
        const nextMain = outcome.newlyUnlockedMissions.find((m) => m.category === 'main');
        if (nextMain) {
          this.showContextMessage(
            `${nextMain.chapterLabel}: ${nextMain.title}`,
            nextMain.description,
            6.5
          );
        }
      }
      // Save milestone cleanly after mission completion & reward application
      this.saveCurrentGame(false);
    }

    if (outcome.endingJustCompleted) {
      this.saveCurrentGame(false);
      this.callbacks.onEndingTriggered();
    }
  }

  private updateAshParticles(dt: number, windGust = 0.25, perfMode = false): void {
    if (perfMode) {
      this.ashPerfCounter = (this.ashPerfCounter + 1) & 1;
      if (this.ashPerfCounter === 1) return;
      dt *= 2;
    }
    const pos = this.ashPositions;
    const len = pos.length / 3;
    const driftMult = 0.7 + windGust * 1.35;
    for (let i = 0; i < len; i++) {
      const idx = i * 3;
      pos[idx] += 0.55 * driftMult * dt;
      pos[idx + 1] -= 0.25 * dt;
      pos[idx + 2] += 0.25 * driftMult * dt;

      if (pos[idx] > 48) pos[idx] = -48;
      if (pos[idx + 2] > 48) pos[idx + 2] = -48;
      if (pos[idx + 1] < 0.2) pos[idx + 1] = 8.0;
    }
    this.ashPoints.geometry.attributes.position.needsUpdate = true;
  }

  private updateContextZones(dt: number): void {
    if (this.contextTimer > 0) {
      this.contextTimer -= dt;
      if (this.contextTimer <= 0) {
        this.activeContextTitle = null;
        this.activeContextMessage = null;
      }
    }

    const px = this.controller.position.x;
    const pz = this.controller.position.z;

    for (const b of ENTERABLE_BUILDINGS) {
      if (
        px >= b.x - b.w * 0.5 + 0.35 &&
        px <= b.x + b.w * 0.5 - 0.35 &&
        pz >= b.z - b.d * 0.5 + 0.35 &&
        pz <= b.z + b.d * 0.5 - 0.35
      ) {
        if (!this.missions.getVisitedZones().includes(b.id)) {
          this.processMissionEvent({ type: 'enter_zone', zoneId: b.id });
        }
      }
    }

    for (const cz of NEIGHBORHOOD_MAP.contextZones) {
      const dist = Math.hypot(px - cz.x, pz - cz.z);
      if (dist <= cz.radius) {
        if (!this.missions.getVisitedZones().includes(cz.id)) {
          this.processMissionEvent({ type: 'enter_zone', zoneId: cz.id });
        }
        const last = this.zoneCooldowns.get(cz.id) ?? -999;
        if (this.elapsedTime - last > 30) {
          this.zoneCooldowns.set(cz.id, this.elapsedTime);
          const czLoc = tContextZone(cz.id);
          this.showContextMessage(czLoc?.title ?? cz.title, czLoc?.message ?? cz.message, 5.2);
          break;
        }
      }
    }
  }

  private emitHud(force: boolean): void {
    const hp = Math.round(this.survival.health);
    const hunger = Math.round(this.survival.hunger);
    const thirst = Math.round(this.survival.thirst);
    const energy = Math.round(this.survival.energy);
    const stam = Math.round(this.controller.stamina);
    const prompt = this.isModalBlockingInput() ? null : this.interactions.getPrompt();
    const inv = this.interactions.inventory ?? createInitialInventory();
    const totalItems = getTotalInventoryItems(inv);
    const activeCustomers = this.customers.getActiveCustomerSummaries();
    const shopSnap = this.economy.getSnapshot(
      activeCustomers,
      this.customers.isShopAcceptingCustomers(),
      this.customers.getShopStatusReason()
    );
    const activeCustomerKey = activeCustomers
      .map((c) => `${c.id}:${c.state}:${c.statusLabel}`)
      .join(',');
    const completedSet = this.missions.getCompletedMissionIdSet();
    const staffSnap = this.staff.getSnapshot(completedSet, this.missions.endingCompleted);
    const staffKey = [
      staffSnap.employeeCapacity,
      staffSnap.nextSalaryInSeconds,
      staffSnap.unpaidCount,
      staffSnap.employees
        .map((e) => `${e.id}:${e.profession}:${e.status}:${e.health}:${e.taskLabel}`)
        .join(','),
      staffSnap.worldSurvivors.map((s) => `${s.id}:${s.recruited}`).join(','),
    ].join(';');
    const missionSnap = this.missions.getSnapshot(
      this.buildMissionContext(),
      hasSavedGame()
    );
    const missionKey = [
      missionSnap.trackedMissionId ?? '',
      missionSnap.mainCompletedCount,
      missionSnap.sideCompletedCount,
      missionSnap.clues.length,
      missionSnap.endingCompleted,
      missionSnap.endingSeen,
      missionSnap.hasSaveData,
      missionSnap.trackedMission?.objectives.map((o) => `${o.id}:${o.current}`).join(',') ?? '',
    ].join(';');
    const toast = this.interactions.latestToast;
    const timeSnap = this.timeSystem.getSnapshot();
    const weatherSnap = this.weatherSystem.getSnapshot();

    const px = this.controller.position.x;
    const pz = this.controller.position.z;
    const indoors = this.isPlayerIndoors(px, pz);
    let inActiveCombat = false;
    let nearbyZombieAlert = false;
    for (const z of this.zombies.getAgents()) {
      if (z.state === 'dead') continue;
      const dist = Math.hypot(z.x - px, z.z - pz);
      if (dist <= 6.8 && (z.state === 'chasing' || z.state === 'attacking' || z.state === 'alert')) {
        inActiveCombat = true;
        nearbyZombieAlert = true;
        break;
      }
      if (
        dist <= 13.5 &&
        (z.state === 'suspicious' ||
          z.state === 'investigating' ||
          z.state === 'alert' ||
          z.state === 'chasing' ||
          z.state === 'searching' ||
          z.state === 'attacking')
      ) {
        nearbyZombieAlert = true;
      }
    }

    const modalBlocking = this.isModalBlockingInput();
    const packCapacity = getPackCapacity(shopSnap.shopLevel);
    const guidanceHint =
      this.screenState === 'PLAYING' && !modalBlocking
        ? this.guidance.evaluate({
            playerDistanceMoved: this.playerDistanceMoved,
            insideShop: this.insideShop,
            insideAnyBuilding: indoors,
            totalCollected: this.missions.getCollectedResourceCount(),
            totalStockItems: shopSnap.totalStockItems,
            totalSalesCount: shopSnap.totalSalesCount,
            money: shopSnap.money,
            shopLevel: shopSnap.shopLevel,
            employeeCount: this.staff.system.employees.length,
            hunger,
            thirst,
            energy,
            health: hp,
            inventoryTotal: totalItems,
            packCapacity,
            inventoryOpenedCount: this.inventoryOpenedCount,
            mapOpenedCount: this.mapOpenedCount,
            missionsOpenedCount: this.missionsOpenedCount,
            nearbyZombieAlert,
            inActiveCombat,
            hasAttacked: this.hasAttacked,
            hasConsumed: this.hasConsumed,
            isTouchMode: this.isTouchMode,
            isDayNightDark: timeSnap.nightFactor >= 0.45,
            flashlightOn: this.settings.flashlightOn,
          })
        : null;

    const t = getTranslations();
    const currentLoc = this.currentLocationId ? getLocalizedLocation(this.currentLocationId) : null;
    const rawRegion = currentLoc ? REGION_BY_ID[currentLoc.regionId] : getRegionAtPosition(px, pz);
    const regionDef = getLocalizedRegion(rawRegion.id);
    const currentLocationName = currentLoc
      ? currentLoc.name
      : indoors
        ? t.gameMessages.locationsFallback.buildingInterior
        : formatTpl(t.gameMessages.locationsFallback.streetsSuffix, { region: regionDef.name });
    const currentLocationSubtitle = currentLoc
      ? currentLoc.subtitle
      : indoors
        ? t.gameMessages.locationsFallback.abandonedShelter
        : regionDef.subtitle;
    const currentLocationDanger = this.insideShop
      ? 'safe'
      : currentLoc?.dangerLevel ?? null;
    const discoveredIds = Array.from(this.discoveredLocationIds);
    const discoveredRegionIds = Array.from(this.discoveredRegionIds);
    const collectedKeyIds = this.interactions.getCollectedKeyIds();
    const collectedKeySig = collectedKeyIds.join(',');
    const quantX = Math.round(px * 2) * 0.5;
    const quantZ = Math.round(pz * 2) * 0.5;
    const quantYaw = Math.round(this.controller.yaw * 10) * 0.1;
    const noiseDisplay = Math.round(this.noiseLevel / 5) * 5;
    const activeWorldEvent = this.worldEvents.getHudBannerSummary({
      playerX: px,
      playerZ: pz,
      money: shopSnap.money,
      inventory: inv,
      packCapacity,
    });
    const activeWorldEventPin = this.worldEvents.getMapPin();

    const quantTension = Math.round(this.tensionLevel * 20) / 20;
    const effectiveCombat = inActiveCombat || this.recentCombatTimer > 0;
    const key = [
      getLanguage(),
      hp,
      hunger,
      thirst,
      energy,
      this.survival.isResting,
      stam,
      this.controller.isExhausted,
      this.controller.isSprinting,
      effectiveCombat,
      quantTension,
      this.attackPulseId,
      noiseDisplay,
      this.worldEvents.survivorGoodwill,
      activeWorldEvent?.instanceId ?? '',
      activeWorldEvent?.distanceMeters ?? -1,
      activeWorldEvent?.bearingLabel ?? '',
      activeWorldEvent?.secondsRemaining ?? -1,
      activeWorldEvent?.playerInRange ?? false,
      activeWorldEventPin?.id ?? '',
      timeSnap.day,
      timeSnap.formattedTime,
      timeSnap.phase,
      weatherSnap.weather,
      this.settings.flashlightOn,
      this.pointerLocked,
      this.activeContextTitle ?? '',
      this.activeContextMessage ?? '',
      prompt?.id ?? '',
      prompt?.actionLabel ?? '',
      inv.canned_food,
      inv.water_bottle,
      inv.medical_supplies,
      inv.wood,
      inv.scrap_metal,
      totalItems,
      packCapacity,
      shopSnap.money,
      shopSnap.shopLevel,
      shopSnap.storageTier,
      shopSnap.storageCapacity,
      shopSnap.trafficBonusPct,
      shopSnap.ownedDecorations.length,
      shopSnap.shopManualOpen,
      shopSnap.shopAcceptingCustomers,
      shopSnap.totalStockItems,
      shopSnap.totalStorageItems,
      shopSnap.totalSalesCount,
      shopSnap.totalRevenueEarned,
      shopSnap.customerSalesCount,
      shopSnap.customerRevenueEarned,
      activeCustomerKey,
      staffKey,
      missionKey,
      shopSnap.lastTransaction?.id ?? 0,
      toast?.id ?? 0,
      this.damagePulseId,
      this.zombies.zombiesDefeated,
      this.survival.deathReason ?? '',
      this.mapOpen ? quantX : 0,
      this.mapOpen ? quantZ : 0,
      this.mapOpen ? quantYaw : 0,
      this.insideShop,
      this.currentLocationId ?? '',
      currentLocationName,
      currentLocationDanger ?? '',
      regionDef.id,
      discoveredIds.length,
      discoveredRegionIds.length,
      collectedKeySig,
      guidanceHint?.id ?? '',
      guidanceHint?.message ?? '',
    ].join('|');

    if (!force && key === this.lastHudKey) return;
    this.lastHudKey = key;

    this.callbacks.onHudChange({
      health: hp,
      maxHealth: 100,
      hunger,
      maxHunger: 100,
      thirst,
      maxThirst: 100,
      energy,
      maxEnergy: 100,
      isResting: this.survival.isResting,
      stamina: stam,
      maxStamina: this.controller.maxStamina,
      isExhausted: this.controller.isExhausted,
      isSprinting: this.controller.isSprinting,
      day: timeSnap.day,
      formattedTime: timeSnap.formattedTime,
      dayPhaseLabel: tDayPhase(timeSnap.phase),
      weather: weatherSnap.weather,
      weatherLabel: weatherSnap.label,
      flashlightOn: this.settings.flashlightOn,
      pointerLocked: this.pointerLocked,
      contextTitle: this.activeContextTitle,
      contextMessage: this.activeContextMessage,
      interactionPrompt: prompt,
      inventory: inv,
      totalInventoryItems: totalItems,
      packCapacity,
      money: shopSnap.money,
      shop: shopSnap,
      staff: staffSnap,
      missions: missionSnap,
      latestToast: toast,
      damagePulseId: this.damagePulseId,
      attackPulseId: this.attackPulseId,
      inActiveCombat: effectiveCombat,
      tensionLevel: quantTension,
      weaponLabel: tWeaponLabel(),
      zombiesDefeated: this.zombies.zombiesDefeated,
      deathReason: this.survival.deathReason,
      playerX: px,
      playerZ: pz,
      playerYaw: this.controller.yaw,
      insideShop: this.insideShop,
      isSafeHaven: this.insideShop,
      currentLocationId: this.currentLocationId,
      currentLocationName,
      currentLocationSubtitle,
      currentLocationDanger,
      currentRegionId: regionDef.id,
      currentRegionName: regionDef.name,
      discoveredLocationIds: discoveredIds,
      discoveredRegionIds,
      collectedKeyIds,
      guidanceHint,
      noiseLevel: Math.round(this.noiseLevel),
      survivorGoodwill: this.worldEvents.survivorGoodwill,
      activeWorldEvent,
      activeWorldEventPin,
    });
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Escape' && !e.repeat) {
      if (this.screenState === 'PLAYING' || this.screenState === 'PAUSED') {
        this.callbacks.onPauseRequested();
        return;
      }
    }

    if (
      e.code === 'KeyI' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.shopOpen &&
      !this.recruitOpen &&
      !this.storyNoteOpen &&
      !this.workbenchOpen &&
      !this.worldEventOpen &&
      !this.endingOpen
    ) {
      e.preventDefault();
      this.callbacks.onInventoryToggleRequested();
      return;
    }

    if (
      e.code === 'KeyM' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.shopOpen &&
      !this.recruitOpen &&
      !this.storyNoteOpen &&
      !this.workbenchOpen &&
      !this.worldEventOpen &&
      !this.endingOpen
    ) {
      e.preventDefault();
      this.callbacks.onMissionsToggleRequested();
      return;
    }

    if (
      e.code === 'KeyN' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.shopOpen &&
      !this.recruitOpen &&
      !this.storyNoteOpen &&
      !this.workbenchOpen &&
      !this.worldEventOpen &&
      !this.endingOpen
    ) {
      e.preventDefault();
      this.callbacks.onMapToggleRequested();
      return;
    }

    if (
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.shopOpen &&
      !this.recruitOpen &&
      !this.storyNoteOpen &&
      !this.workbenchOpen &&
      !this.worldEventOpen &&
      !this.endingOpen
    ) {
      if (e.code === 'Digit1') {
        e.preventDefault();
        this.consumeItem('canned_food');
        return;
      }
      if (e.code === 'Digit2') {
        e.preventDefault();
        this.consumeItem('water_bottle');
        return;
      }
      if (e.code === 'Digit3') {
        e.preventDefault();
        this.consumeItem('medical_supplies');
        return;
      }
      if (e.code === 'KeyR' && !this.isModalBlockingInput()) {
        e.preventDefault();
        this.toggleRest();
        return;
      }
    }

    if (
      e.code === 'KeyQ' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.isModalBlockingInput()
    ) {
      e.preventDefault();
      this.triggerAttack();
      return;
    }

    if (
      e.code === 'KeyE' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.isModalBlockingInput()
    ) {
      e.preventDefault();
      this.triggerInteract();
      return;
    }

    if (
      e.code === 'KeyF' &&
      !e.repeat &&
      this.screenState === 'PLAYING' &&
      !this.isModalBlockingInput()
    ) {
      const next = !this.settings.flashlightOn;
      this.settings.flashlightOn = next;
      this.flashlight.visible = next;
      this.sound.playFlashlightClick(next);
      this.callbacks.onFlashlightToggled(next);
      this.emitHud(true);
      return;
    }

    this.controller.handleKeyDown(
      e,
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.controller.handleKeyUp(e);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    const isPlayingActive = this.screenState === 'PLAYING' && !this.isModalBlockingInput();
    if (isPlayingActive && e.button === 0 && this.controller.isPointerLocked()) {
      this.triggerAttack();
      return;
    }
    this.controller.handleMouseDown(e, isPlayingActive);
  };

  private handleMouseUp = (): void => {
    this.controller.handleMouseUp();
  };

  private handleMouseMove = (e: MouseEvent): void => {
    this.controller.handleMouseMove(
      e,
      this.screenState === 'PLAYING' && !this.isModalBlockingInput()
    );
  };

  private handleWindowBlur = (): void => {
    this.controller.clearInputs();
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const width = Math.max(240, this.container.clientWidth || window.innerWidth);
    const height = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(
      this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 1.75)
    );
    this.camera.aspect = width / height;
    const nextFov = computeResponsiveCameraFov(width, height, 72);
    if (Math.abs(this.camera.fov - nextFov) > 0.05) {
      this.camera.fov = nextFov;
    }
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  private handleOrientationChange = (): void => {
    this.controller.clearInputs();
    this.handleResize();
    cancelAnimationFrame(this.resizeRafId);
    this.resizeRafId = requestAnimationFrame(() => {
      this.handleResize();
    });
  };

  private handleContextLost = (e: Event): void => {
    e.preventDefault();
    this.callbacks.onContextLost(true);
  };

  private handleContextRestored = (): void => {
    this.callbacks.onContextLost(false);
  };

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationChange);
    window.visualViewport?.addEventListener('resize', this.handleResize);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    dom.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('pointerlockchange', this.controller.handlePointerLockEvent);
    dom.addEventListener('webglcontextlost', this.handleContextLost);
    dom.addEventListener('webglcontextrestored', this.handleContextRestored);
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    cancelAnimationFrame(this.resizeRafId);
    clearTimeout(this.frameId);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    const dom = this.renderer.domElement;
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('blur', this.handleWindowBlur);
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationChange);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    dom.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('pointerlockchange', this.controller.handlePointerLockEvent);
    dom.removeEventListener('webglcontextlost', this.handleContextLost);
    dom.removeEventListener('webglcontextrestored', this.handleContextRestored);

    this.controller.exitPointerLock();

    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose());
        } else {
          mesh.material?.dispose();
        }
      }
    });

    this.atmosphere.dispose();
    this.ashPoints.geometry.dispose();
    this.ashMat.dispose();
    this.worldEventManager.dispose();
    this.staff.dispose();
    this.zombies.dispose();
    this.customers.dispose();
    this.interactions.dispose();
    this.world.dispose();
    this.materials.dispose();
    this.textures.dispose();
    this.assets.dispose();
    this.envTarget.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
