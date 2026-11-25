import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SoundEngine } from './assets/audio/soundEngine';
import { CreditsModal } from './components/CreditsModal';
import { EndingModal } from './components/EndingModal';
import { GameCanvas, TouchEngineBridge } from './components/GameCanvas';
import { GameOverModal } from './components/GameOverModal';
import { HudOverlay } from './components/HudOverlay';
import { InventoryModal } from './components/InventoryModal';
import { MainMenu } from './components/MainMenu';
import { MapModal } from './components/MapModal';
import { MissionModal } from './components/MissionModal';
import { MobileControls } from './components/MobileControls';
import { PauseModal } from './components/PauseModal';
import { RecruitmentModal } from './components/RecruitmentModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopModal } from './components/ShopModal';
import { StoryNoteModal } from './components/StoryNoteModal';
import { DEFAULT_ECONOMY_CONFIG, createInitialShopSnapshot } from './game/economy';
import { createInitialMissionSnapshot } from './game/missionSystem';
import { createInitialInventory } from './game/resources';
import { SavedGameSummary, getSavedGameSummary, hasSavedGame } from './game/saveSystem';
import { createInitialStaffSnapshot } from './game/staffSystem';
import { DEFAULT_DAY_LENGTH_SECONDS } from './game/timeSystem';
import {
  EmployeeProfession,
  GameScreenState,
  GameSettings,
  HudSnapshot,
  ResourceId,
  ShopModalTab,
  StoryObjectInspectionData,
} from './game/types';
import { useTouchDevice } from './game/useTouchDevice';

type ActiveModal =
  | 'NONE'
  | 'SETTINGS'
  | 'CREDITS'
  | 'INVENTORY'
  | 'SHOP'
  | 'RECRUIT'
  | 'MISSIONS'
  | 'MAP'
  | 'STORY_NOTE'
  | 'ENDING';

const INITIAL_SETTINGS: GameSettings = {
  masterVolume: 0.55,
  muted: false,
  mouseSensitivity: 1.0,
  shadowsEnabled: true,
  lightingQuality: 'atmospheric',
  flashlightOn: true,
  touchControls: 'auto',
  dayLengthSeconds: DEFAULT_DAY_LENGTH_SECONDS,
};

const INITIAL_HUD: HudSnapshot = {
  health: 100,
  maxHealth: 100,
  hunger: 100,
  maxHunger: 100,
  thirst: 100,
  maxThirst: 100,
  energy: 100,
  maxEnergy: 100,
  isResting: false,
  stamina: 100,
  maxStamina: 100,
  isExhausted: false,
  isSprinting: false,
  day: 1,
  formattedTime: '08:00',
  dayPhaseLabel: 'Morning',
  weather: 'clear',
  weatherLabel: 'Clear',
  flashlightOn: true,
  pointerLocked: false,
  contextTitle: null,
  contextMessage: null,
  interactionPrompt: null,
  inventory: createInitialInventory(),
  totalInventoryItems: 0,
  packCapacity: 16,
  money: DEFAULT_ECONOMY_CONFIG.startingMoney,
  shop: createInitialShopSnapshot(DEFAULT_ECONOMY_CONFIG.startingMoney),
  staff: createInitialStaffSnapshot(1),
  missions: createInitialMissionSnapshot(false),
  latestToast: null,
  damagePulseId: 0,
  zombiesDefeated: 0,
  deathReason: null,
  playerX: -11.5,
  playerZ: -4.5,
  playerYaw: 0.48,
  insideShop: false,
  isSafeHaven: false,
  currentLocationId: null,
  currentLocationName: 'District 04 Streets',
  currentLocationSubtitle: 'Outside The Last Shop',
  currentLocationDanger: null,
  discoveredLocationIds: ['last_shop'],
  guidanceHint: null,
};

export default function App() {
  const soundEngine = useMemo(() => new SoundEngine(), []);
  const engineBridgeRef = useRef<TouchEngineBridge | null>(null);

  const [screenState, setScreenState] = useState<GameScreenState>('MENU');
  const [activeModal, setActiveModal] = useState<ActiveModal>('NONE');
  const [shopInitialTab, setShopInitialTab] = useState<ShopModalTab>('counter');
  const [recruitSurvivorId, setRecruitSurvivorId] = useState<string | null>(null);
  const [storyNoteData, setStoryNoteData] = useState<StoryObjectInspectionData | null>(null);
  const [settings, setSettings] = useState<GameSettings>(INITIAL_SETTINGS);
  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [sessionToken, setSessionToken] = useState(0);
  const [loadToken, setLoadToken] = useState(0);
  const [savedSummary, setSavedSummary] = useState<SavedGameSummary | null>(() =>
    getSavedGameSummary()
  );

  const isTouchMode = useTouchDevice(settings.touchControls);
  const isInventoryOpen = screenState === 'PLAYING' && activeModal === 'INVENTORY';
  const isShopOpen = screenState === 'PLAYING' && activeModal === 'SHOP';
  const isRecruitOpen = screenState === 'PLAYING' && activeModal === 'RECRUIT';
  const isMissionsOpen = screenState === 'PLAYING' && activeModal === 'MISSIONS';
  const isMapOpen = screenState === 'PLAYING' && activeModal === 'MAP';
  const isStoryNoteOpen = screenState === 'PLAYING' && activeModal === 'STORY_NOTE';
  const isEndingOpen = screenState === 'PLAYING' && activeModal === 'ENDING';

  useEffect(() => {
    if (screenState === 'MENU') {
      setSavedSummary(getSavedGameSummary());
    }
  }, [screenState]);

  useEffect(() => {
    if (screenState !== 'MENU' || activeModal === 'NONE') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        soundEngine.playUiClick(440);
        setActiveModal('NONE');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [screenState, activeModal, soundEngine]);

  const handlePlay = useCallback(() => {
    soundEngine.playUiClick(560);
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setHud(INITIAL_HUD);
    setSessionToken((t) => t + 1);
    setScreenState('PLAYING');
  }, [soundEngine]);

  const handleContinueSaved = useCallback(() => {
    soundEngine.playUiClick(580);
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setLoadToken((t) => t + 1);
    setScreenState('PLAYING');
  }, [soundEngine]);

  const handleGameOver = useCallback(() => {
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setScreenState('GAMEOVER');
  }, []);

  const handlePauseRequested = useCallback(() => {
    if (activeModal !== 'NONE') {
      soundEngine.playUiClick(440);
      setActiveModal('NONE');
      setRecruitSurvivorId(null);
      setStoryNoteData(null);
      return;
    }
    soundEngine.playUiClick(460);
    setScreenState((prev) => (prev === 'PLAYING' ? 'PAUSED' : 'PLAYING'));
  }, [activeModal, soundEngine]);

  const handleInventoryToggle = useCallback(() => {
    if (screenState !== 'PLAYING') return;
    soundEngine.playUiClick(500);
    setActiveModal((prev) => (prev === 'INVENTORY' ? 'NONE' : 'INVENTORY'));
  }, [screenState, soundEngine]);

  const handleMissionsToggle = useCallback(() => {
    if (screenState !== 'PLAYING') return;
    soundEngine.playUiClick(520);
    setActiveModal((prev) => (prev === 'MISSIONS' ? 'NONE' : 'MISSIONS'));
  }, [screenState, soundEngine]);

  const handleMapToggle = useCallback(() => {
    if (screenState !== 'PLAYING') return;
    soundEngine.playUiClick(540);
    setActiveModal((prev) => (prev === 'MAP' ? 'NONE' : 'MAP'));
  }, [screenState, soundEngine]);

  const handleShopRequested = useCallback(
    (tab: ShopModalTab) => {
      if (screenState !== 'PLAYING') return;
      soundEngine.playUiClick(540);
      setShopInitialTab(tab);
      setActiveModal('SHOP');
    },
    [screenState, soundEngine]
  );

  const handleSurvivorInteractRequested = useCallback(
    (survivorId: string) => {
      if (screenState !== 'PLAYING') return;
      soundEngine.playUiClick(600);
      setRecruitSurvivorId(survivorId);
      setActiveModal('RECRUIT');
    },
    [screenState, soundEngine]
  );

  const handleStoryObjectInspectRequested = useCallback(
    (data: StoryObjectInspectionData) => {
      if (screenState !== 'PLAYING') return;
      soundEngine.playUiClick(560);
      setStoryNoteData(data);
      setActiveModal('STORY_NOTE');
    },
    [screenState, soundEngine]
  );

  const handleEndingTriggered = useCallback(() => {
    soundEngine.playUiClick(660);
    setStoryNoteData(null);
    setActiveModal('ENDING');
  }, [soundEngine]);

  const handleSaveGame = useCallback(() => {
    const ok = engineBridgeRef.current?.saveCurrentGame(true) ?? false;
    if (ok) {
      soundEngine.playUiClick(580);
      setSavedSummary(getSavedGameSummary());
    }
    return ok;
  }, [soundEngine]);

  const handleLoadGame = useCallback(() => {
    soundEngine.playUiClick(560);
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setLoadToken((t) => t + 1);
    setScreenState('PLAYING');
  }, [soundEngine]);

  const handleResume = useCallback(() => {
    soundEngine.playUiClick(540);
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setScreenState('PLAYING');
  }, [soundEngine]);

  const handleReturnToMenu = useCallback(() => {
    engineBridgeRef.current?.saveCurrentGame(false);
    soundEngine.playUiClick(420);
    setActiveModal('NONE');
    setRecruitSurvivorId(null);
    setStoryNoteData(null);
    setSavedSummary(getSavedGameSummary());
    setScreenState('MENU');
  }, [soundEngine]);

  const handleToggleMute = useCallback(() => {
    soundEngine.unlock();
    setSettings((prev) => {
      const next = { ...prev, muted: !prev.muted };
      soundEngine.setSettings(next.masterVolume, next.muted);
      return next;
    });
  }, [soundEngine]);

  const handleSettingsChange = useCallback(
    (next: GameSettings) => {
      soundEngine.setSettings(next.masterVolume, next.muted);
      setSettings(next);
    },
    [soundEngine]
  );

  const handleFlashlightToggled = useCallback((on: boolean) => {
    setSettings((prev) => (prev.flashlightOn === on ? prev : { ...prev, flashlightOn: on }));
  }, []);

  const handleTouchMove = useCallback((x: number, y: number, sprint: boolean) => {
    engineBridgeRef.current?.setTouchMove(x, y, sprint);
  }, []);

  const handleTouchLookDelta = useCallback((dx: number, dy: number) => {
    engineBridgeRef.current?.addTouchLookDelta(dx, dy);
  }, []);

  const handleTouchJump = useCallback(() => {
    engineBridgeRef.current?.triggerJump();
  }, []);

  const handleTouchInteract = useCallback(() => {
    engineBridgeRef.current?.triggerInteract();
  }, []);

  const handleTouchFlashlight = useCallback(() => {
    engineBridgeRef.current?.toggleFlashlight();
  }, []);

  const handleTouchAttack = useCallback(() => {
    engineBridgeRef.current?.triggerAttack();
  }, []);

  const handleConsumeItem = useCallback((resourceId: ResourceId) => {
    engineBridgeRef.current?.consumeItem(resourceId);
  }, []);

  const handleToggleRest = useCallback(() => {
    engineBridgeRef.current?.toggleRest();
  }, []);

  const handleTransferToStock = useCallback((resourceId: ResourceId, quantity: number) => {
    engineBridgeRef.current?.transferToStock(resourceId, quantity);
  }, []);

  const handleTransferFromStock = useCallback((resourceId: ResourceId, quantity: number) => {
    engineBridgeRef.current?.transferFromStock(resourceId, quantity);
  }, []);

  const handleTransferToStorage = useCallback((resourceId: ResourceId, quantity: number) => {
    engineBridgeRef.current?.transferToStorage(resourceId, quantity);
  }, []);

  const handleTransferFromStorage = useCallback((resourceId: ResourceId, quantity: number) => {
    engineBridgeRef.current?.transferFromStorage(resourceId, quantity);
  }, []);

  const handleTransferStorageToStock = useCallback(
    (resourceId: ResourceId, quantity: number) => {
      engineBridgeRef.current?.transferStorageToStock(resourceId, quantity);
    },
    []
  );

  const handleTransferStockToStorage = useCallback(
    (resourceId: ResourceId, quantity: number) => {
      engineBridgeRef.current?.transferStockToStorage(resourceId, quantity);
    },
    []
  );

  const handleRestockFromStorage = useCallback(() => {
    engineBridgeRef.current?.restockShelvesFromStorage();
  }, []);

  const handleDismissGuidance = useCallback((hintId: string) => {
    engineBridgeRef.current?.dismissGuidanceHint(hintId);
  }, []);

  const handleSellStock = useCallback((resourceId: ResourceId, quantity: number) => {
    engineBridgeRef.current?.sellShopStock(resourceId, quantity);
  }, []);

  const handleUpgradeShopLevel = useCallback(() => {
    engineBridgeRef.current?.upgradeShopLevel();
  }, []);

  const handleUpgradeStorageTier = useCallback(() => {
    engineBridgeRef.current?.upgradeStorageTier();
  }, []);

  const handlePurchaseDecoration = useCallback((decorationId: string) => {
    engineBridgeRef.current?.purchaseDecoration(decorationId);
  }, []);

  const handleToggleShopOpen = useCallback(() => {
    engineBridgeRef.current?.toggleShopManualOpen();
  }, []);

  const handleRecruitSurvivor = useCallback(
    (survivorId: string, profession: EmployeeProfession) => {
      const ok = engineBridgeRef.current?.recruitSurvivor(survivorId, profession);
      if (ok) {
        setActiveModal('NONE');
        setRecruitSurvivorId(null);
      }
    },
    []
  );

  const handleSetEmployeeProfession = useCallback(
    (employeeId: string, profession: EmployeeProfession) => {
      engineBridgeRef.current?.setEmployeeProfession(employeeId, profession);
    },
    []
  );

  const handleDismissEmployee = useCallback((employeeId: string) => {
    engineBridgeRef.current?.dismissEmployee(employeeId);
  }, []);

  const handlePayUnpaidWages = useCallback(() => {
    engineBridgeRef.current?.payUnpaidWages();
  }, []);

  const handleTrackMission = useCallback((missionId: string | null) => {
    engineBridgeRef.current?.trackMission(missionId);
  }, []);

  const handlePerformStoryAction = useCallback((objectId: string) => {
    const nextData = engineBridgeRef.current?.performStoryObjectAction(objectId) ?? null;
    if (nextData) {
      setStoryNoteData(nextData);
    } else {
      setStoryNoteData(null);
      setActiveModal((prev) => (prev === 'STORY_NOTE' ? 'NONE' : prev));
    }
  }, []);

  const anyGameplayModalOpen =
    isInventoryOpen ||
    isShopOpen ||
    isRecruitOpen ||
    isMissionsOpen ||
    isMapOpen ||
    isStoryNoteOpen ||
    isEndingOpen;

  const activeRecruitSurvivor =
    recruitSurvivorId
      ? hud.staff.worldSurvivors.find((s) => s.id === recruitSurvivorId && !s.recruited) ?? null
      : null;

  return (
    <main className="relative w-full h-dvh overflow-hidden bg-[#121822]">
      <GameCanvas
        screenState={screenState}
        settings={settings}
        sessionToken={sessionToken}
        loadToken={loadToken}
        isTouchMode={isTouchMode}
        inventoryOpen={isInventoryOpen}
        shopOpen={isShopOpen}
        recruitOpen={isRecruitOpen}
        missionsOpen={isMissionsOpen}
        mapOpen={isMapOpen}
        storyNoteOpen={isStoryNoteOpen}
        endingOpen={isEndingOpen}
        engineBridgeRef={engineBridgeRef}
        onHudChange={setHud}
        onPauseRequested={handlePauseRequested}
        onInventoryToggleRequested={handleInventoryToggle}
        onMissionsToggleRequested={handleMissionsToggle}
        onMapToggleRequested={handleMapToggle}
        onShopRequested={handleShopRequested}
        onSurvivorInteractRequested={handleSurvivorInteractRequested}
        onStoryObjectInspectRequested={handleStoryObjectInspectRequested}
        onEndingTriggered={handleEndingTriggered}
        onFlashlightToggled={handleFlashlightToggled}
        onGameOver={handleGameOver}
        soundEngine={soundEngine}
      />

      {screenState === 'MENU' && (
        <MainMenu
          savedSummary={savedSummary}
          onContinueSaved={handleContinueSaved}
          onPlay={handlePlay}
          onOpenSettings={() => {
            soundEngine.playUiClick(500);
            setActiveModal('SETTINGS');
          }}
          onOpenCredits={() => {
            soundEngine.playUiClick(500);
            setActiveModal('CREDITS');
          }}
          hasActiveModal={activeModal !== 'NONE'}
          isTouchMode={isTouchMode}
        />
      )}

      {screenState === 'PLAYING' && isTouchMode && !anyGameplayModalOpen && (
        <MobileControls
          flashlightOn={hud.flashlightOn}
          interactionPrompt={hud.interactionPrompt}
          onMove={handleTouchMove}
          onLookDelta={handleTouchLookDelta}
          onJump={handleTouchJump}
          onInteract={handleTouchInteract}
          onAttack={handleTouchAttack}
          onToggleFlashlight={handleTouchFlashlight}
        />
      )}

      {(screenState === 'PLAYING' || screenState === 'PAUSED') && (
        <HudOverlay
          hud={hud}
          muted={settings.muted}
          isPlaying={screenState === 'PLAYING'}
          isTouchMode={isTouchMode}
          isInventoryOpen={anyGameplayModalOpen}
          isMissionsOpen={isMissionsOpen}
          isMapOpen={isMapOpen}
          onPauseClick={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
            setScreenState('PAUSED');
          }}
          onOpenInventory={handleInventoryToggle}
          onOpenMissions={handleMissionsToggle}
          onOpenMap={handleMapToggle}
          onDismissGuidance={handleDismissGuidance}
          onToggleMute={handleToggleMute}
          onConsumeItem={handleConsumeItem}
          onToggleRest={handleToggleRest}
        />
      )}

      {isInventoryOpen && (
        <InventoryModal
          hud={hud}
          isTouchMode={isTouchMode}
          onConsumeItem={handleConsumeItem}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}

      {isMissionsOpen && (
        <MissionModal
          hud={hud}
          isTouchMode={isTouchMode}
          onTrackMission={handleTrackMission}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}

      {isMapOpen && (
        <MapModal
          hud={hud}
          isTouchMode={isTouchMode}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}

      {isStoryNoteOpen && storyNoteData && (
        <StoryNoteModal
          data={storyNoteData}
          inventory={hud.inventory}
          isTouchMode={isTouchMode}
          onPerformAction={handlePerformStoryAction}
          onClose={() => {
            soundEngine.playUiClick(460);
            setStoryNoteData(null);
            setActiveModal('NONE');
          }}
        />
      )}

      {isEndingOpen && (
        <EndingModal
          hud={hud}
          onContinuePlaying={() => {
            soundEngine.playUiClick(520);
            setActiveModal('NONE');
          }}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {isShopOpen && (
        <ShopModal
          hud={hud}
          initialTab={shopInitialTab}
          isTouchMode={isTouchMode}
          onTransferToStock={handleTransferToStock}
          onTransferFromStock={handleTransferFromStock}
          onTransferToStorage={handleTransferToStorage}
          onTransferFromStorage={handleTransferFromStorage}
          onTransferStorageToStock={handleTransferStorageToStock}
          onTransferStockToStorage={handleTransferStockToStorage}
          onRestockFromStorage={handleRestockFromStorage}
          onSellStock={handleSellStock}
          onUpgradeShopLevel={handleUpgradeShopLevel}
          onUpgradeStorageTier={handleUpgradeStorageTier}
          onPurchaseDecoration={handlePurchaseDecoration}
          onToggleShopOpen={handleToggleShopOpen}
          onSetEmployeeProfession={handleSetEmployeeProfession}
          onDismissEmployee={handleDismissEmployee}
          onPayUnpaidWages={handlePayUnpaidWages}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}

      {isRecruitOpen && activeRecruitSurvivor && (
        <RecruitmentModal
          hud={hud}
          survivor={activeRecruitSurvivor}
          isTouchMode={isTouchMode}
          onRecruit={handleRecruitSurvivor}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
            setRecruitSurvivorId(null);
          }}
        />
      )}

      {screenState === 'PAUSED' && activeModal === 'NONE' && (
        <PauseModal
          hud={hud}
          isTouchMode={isTouchMode}
          hasSaveData={hasSavedGame()}
          onResume={handleResume}
          onSaveGame={handleSaveGame}
          onLoadGame={handleLoadGame}
          onOpenSettings={() => {
            soundEngine.playUiClick(500);
            setActiveModal('SETTINGS');
          }}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {screenState === 'GAMEOVER' && (
        <GameOverModal
          hud={hud}
          reason={hud.deathReason || 'You succumbed to the wasteland.'}
          onRestart={handlePlay}
          onReturnToMenu={handleReturnToMenu}
        />
      )}

      {activeModal === 'SETTINGS' && (
        <SettingsModal
          settings={settings}
          isTouchMode={isTouchMode}
          onChange={handleSettingsChange}
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}

      {activeModal === 'CREDITS' && (
        <CreditsModal
          onClose={() => {
            soundEngine.playUiClick(460);
            setActiveModal('NONE');
          }}
        />
      )}
    </main>
  );
}
