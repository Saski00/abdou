import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { SoundEngine } from '../assets/audio/soundEngine';
import { Game3DEngine } from '../engine/Game3DEngine';
import {
  EmployeeProfession,
  GameScreenState,
  GameSettings,
  HudSnapshot,
  ResourceId,
  ShopModalTab,
  StoryObjectInspectionData,
} from '../game/types';
import { useI18n } from '../i18n';

export interface TouchEngineBridge {
  setTouchMove: (x: number, y: number, sprint: boolean) => void;
  addTouchLookDelta: (dx: number, dy: number) => void;
  triggerJump: () => void;
  triggerInteract: () => void;
  triggerAttack: () => void;
  toggleFlashlight: () => void;
  consumeItem: (resourceId: ResourceId) => void;
  toggleRest: () => void;
  transferToStock: (resourceId: ResourceId, quantity: number) => void;
  transferFromStock: (resourceId: ResourceId, quantity: number) => void;
  transferToStorage: (resourceId: ResourceId, quantity: number) => void;
  transferFromStorage: (resourceId: ResourceId, quantity: number) => void;
  transferStorageToStock: (resourceId: ResourceId, quantity: number) => void;
  transferStockToStorage: (resourceId: ResourceId, quantity: number) => void;
  restockShelvesFromStorage: () => void;
  sellShopStock: (resourceId: ResourceId, quantity: number) => void;
  upgradeShopLevel: () => void;
  upgradeStorageTier: () => void;
  purchaseDecoration: (decorationId: string) => void;
  toggleShopManualOpen: () => void;
  recruitSurvivor: (survivorId: string, profession: EmployeeProfession) => boolean;
  setEmployeeProfession: (employeeId: string, profession: EmployeeProfession) => void;
  dismissEmployee: (employeeId: string) => void;
  payUnpaidWages: () => void;
  trackMission: (missionId: string | null) => void;
  performStoryObjectAction: (objectId: string) => StoryObjectInspectionData | null;
  craftWorkbenchRecipe: (recipeId: string) => boolean;
  dismissGuidanceHint: (hintId: string) => void;
  saveCurrentGame: (showToast?: boolean) => boolean;
}

interface GameCanvasProps {
  screenState: GameScreenState;
  settings: GameSettings;
  sessionToken: number;
  loadToken: number;
  isTouchMode: boolean;
  inventoryOpen: boolean;
  shopOpen: boolean;
  recruitOpen: boolean;
  missionsOpen: boolean;
  mapOpen: boolean;
  storyNoteOpen: boolean;
  workbenchOpen: boolean;
  endingOpen: boolean;
  engineBridgeRef: MutableRefObject<TouchEngineBridge | null>;
  onHudChange: (hud: HudSnapshot) => void;
  onPauseRequested: () => void;
  onInventoryToggleRequested: () => void;
  onMissionsToggleRequested: () => void;
  onMapToggleRequested: () => void;
  onShopRequested: (tab: ShopModalTab) => void;
  onSurvivorInteractRequested: (survivorId: string) => void;
  onStoryObjectInspectRequested: (data: StoryObjectInspectionData) => void;
  onWorkbenchRequested: (workbenchName: string) => void;
  onEndingTriggered: () => void;
  onFlashlightToggled: (on: boolean) => void;
  onGameOver: (reason: string) => void;
  soundEngine: SoundEngine;
}

export function GameCanvas({
  screenState,
  settings,
  sessionToken,
  loadToken,
  isTouchMode,
  inventoryOpen,
  shopOpen,
  recruitOpen,
  missionsOpen,
  mapOpen,
  storyNoteOpen,
  workbenchOpen,
  endingOpen,
  engineBridgeRef,
  onHudChange,
  onPauseRequested,
  onInventoryToggleRequested,
  onMissionsToggleRequested,
  onMapToggleRequested,
  onShopRequested,
  onSurvivorInteractRequested,
  onStoryObjectInspectRequested,
  onWorkbenchRequested,
  onEndingTriggered,
  onFlashlightToggled,
  onGameOver,
  soundEngine,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<Game3DEngine | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const { dir, t } = useI18n();

  const callbacksRef = useRef({
    onHudChange,
    onPauseRequested,
    onInventoryToggleRequested,
    onMissionsToggleRequested,
    onMapToggleRequested,
    onShopRequested,
    onSurvivorInteractRequested,
    onStoryObjectInspectRequested,
    onWorkbenchRequested,
    onEndingTriggered,
    onFlashlightToggled,
    onGameOver,
    isTouchMode,
  });
  callbacksRef.current = {
    onHudChange,
    onPauseRequested,
    onInventoryToggleRequested,
    onMissionsToggleRequested,
    onMapToggleRequested,
    onShopRequested,
    onSurvivorInteractRequested,
    onStoryObjectInspectRequested,
    onWorkbenchRequested,
    onEndingTriggered,
    onFlashlightToggled,
    onGameOver,
    isTouchMode,
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const engine = new Game3DEngine(container, settings, soundEngine, {
      onHudChange: (hud) => callbacksRef.current.onHudChange(hud),
      onPauseRequested: () => callbacksRef.current.onPauseRequested(),
      onInventoryToggleRequested: () => callbacksRef.current.onInventoryToggleRequested(),
      onMissionsToggleRequested: () => callbacksRef.current.onMissionsToggleRequested(),
      onMapToggleRequested: () => callbacksRef.current.onMapToggleRequested(),
      onShopRequested: (tab) => callbacksRef.current.onShopRequested(tab),
      onSurvivorInteractRequested: (survivorId) =>
        callbacksRef.current.onSurvivorInteractRequested(survivorId),
      onStoryObjectInspectRequested: (data) =>
        callbacksRef.current.onStoryObjectInspectRequested(data),
      onWorkbenchRequested: (workbenchName) =>
        callbacksRef.current.onWorkbenchRequested(workbenchName),
      onEndingTriggered: () => callbacksRef.current.onEndingTriggered(),
      onFlashlightToggled: (on) => callbacksRef.current.onFlashlightToggled(on),
      onGameOver: (reason) => callbacksRef.current.onGameOver(reason),
      onContextLost: (lost) => setContextLost(lost),
    });

    engineRef.current = engine;
    engineBridgeRef.current = {
      setTouchMove: (x, y, sprint) => engine.setTouchMove(x, y, sprint),
      addTouchLookDelta: (dx, dy) => engine.addTouchLookDelta(dx, dy),
      triggerJump: () => engine.triggerTouchJump(),
      triggerInteract: () => engine.triggerInteract(),
      triggerAttack: () => engine.triggerAttack(),
      toggleFlashlight: () => engine.toggleFlashlight(),
      consumeItem: (resourceId) => engine.consumeItem(resourceId),
      toggleRest: () => engine.toggleRest(),
      transferToStock: (resourceId, quantity) => engine.transferToStock(resourceId, quantity),
      transferFromStock: (resourceId, quantity) => engine.transferFromStock(resourceId, quantity),
      transferToStorage: (resourceId, quantity) => engine.transferToStorage(resourceId, quantity),
      transferFromStorage: (resourceId, quantity) => engine.transferFromStorage(resourceId, quantity),
      transferStorageToStock: (resourceId, quantity) =>
        engine.transferStorageToStock(resourceId, quantity),
      transferStockToStorage: (resourceId, quantity) =>
        engine.transferStockToStorage(resourceId, quantity),
      restockShelvesFromStorage: () => engine.restockShelvesFromStorage(),
      sellShopStock: (resourceId, quantity) => engine.sellShopStock(resourceId, quantity),
      upgradeShopLevel: () => engine.upgradeShopLevel(),
      upgradeStorageTier: () => engine.upgradeStorageTier(),
      purchaseDecoration: (decorationId) => engine.purchaseDecoration(decorationId),
      toggleShopManualOpen: () => engine.toggleShopManualOpen(),
      recruitSurvivor: (survivorId, profession) => engine.recruitSurvivor(survivorId, profession),
      setEmployeeProfession: (employeeId, profession) =>
        engine.setEmployeeProfession(employeeId, profession),
      dismissEmployee: (employeeId) => engine.dismissEmployee(employeeId),
      payUnpaidWages: () => engine.payUnpaidWagesNow(),
      trackMission: (missionId) => engine.trackMission(missionId),
      performStoryObjectAction: (objectId) => engine.performStoryObjectAction(objectId),
      craftWorkbenchRecipe: (recipeId) => engine.craftWorkbenchRecipe(recipeId),
      dismissGuidanceHint: (hintId) => engine.dismissGuidanceHint(hintId),
      saveCurrentGame: (showToast = true) => engine.saveCurrentGame(showToast),
    };

    engine.startLoop();

    return () => {
      engineBridgeRef.current = null;
      engine.dispose();
      engineRef.current = null;
    };
    // Initialize Three.js engine once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEngine]);

  useEffect(() => {
    engineRef.current?.updateSettings(settings);
  }, [settings]);

  useEffect(() => {
    engineRef.current?.setInventoryOpen(inventoryOpen);
  }, [inventoryOpen]);

  useEffect(() => {
    engineRef.current?.setShopOpen(shopOpen);
  }, [shopOpen]);

  useEffect(() => {
    engineRef.current?.setRecruitOpen(recruitOpen);
  }, [recruitOpen]);

  useEffect(() => {
    engineRef.current?.setMissionsOpen(missionsOpen);
  }, [missionsOpen]);

  useEffect(() => {
    engineRef.current?.setMapOpen(mapOpen);
  }, [mapOpen]);

  useEffect(() => {
    engineRef.current?.setStoryNoteOpen(storyNoteOpen);
  }, [storyNoteOpen]);

  useEffect(() => {
    engineRef.current?.setWorkbenchOpen(workbenchOpen);
  }, [workbenchOpen]);

  useEffect(() => {
    engineRef.current?.setEndingOpen(endingOpen);
  }, [endingOpen]);

  useEffect(() => {
    if (screenState === 'MENU') {
      engineRef.current?.resetToMenu();
    } else {
      engineRef.current?.setScreenState(screenState);
    }
  }, [screenState]);

  useEffect(() => {
    if (sessionToken > 0) {
      engineRef.current?.startNewSession(callbacksRef.current.isTouchMode);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (loadToken > 0) {
      engineRef.current?.loadSavedGame(callbacksRef.current.isTouchMode);
    }
  }, [loadToken]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#121822]">
      <div
        ref={mountRef}
        className="w-full h-full touch-none"
        aria-label={t.meta.appTitle}
      />
      {contextLost && (
        <div
          dir={dir}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e14]/95 px-6 text-center"
        >
          <div className="max-w-sm">
            <h2 className="font-display text-2xl font-bold text-stone-100 mb-2">
              {t.gameCanvas.contextLostTitle}
            </h2>
            <p className="text-sm text-stone-400">
              {t.gameCanvas.contextLostBody}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
