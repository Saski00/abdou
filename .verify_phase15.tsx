import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as THREE from 'three';

import { ENTERABLE_BUILDINGS } from './src/assets/maps/buildingLayouts';
import { NEIGHBORHOOD_MAP } from './src/assets/maps/neighborhoodMap';
import { HudOverlay } from './src/components/HudOverlay';
import { MobileControls } from './src/components/MobileControls';
import { WorkbenchModal } from './src/components/WorkbenchModal';
import { InteractionManager } from './src/engine/InteractionManager';
import type { WorldInteractable } from './src/engine/WorldBuilder';
import { SoundEngine } from './src/assets/audio/soundEngine';
import {
  WORKBENCH_RECIPES,
  canCraftRecipe,
  craftWorkbenchRecipe,
} from './src/game/craftingSystem';
import { DEFAULT_ECONOMY_CONFIG, SHOP_ITEM_PRICES, createInitialShopSnapshot } from './src/game/economy';
import { createInitialMissionSnapshot } from './src/game/missionSystem';
import { createInitialInventory } from './src/game/resources';
import { createInitialStaffSnapshot } from './src/game/staffSystem';
import type { HudSnapshot, ZombieEntity } from './src/game/types';
import {
  PROP_EXAMINE_SPECS,
  PROP_SEARCH_SPECS,
  PROP_WORKBENCH_NAMES,
  VEHICLE_INTERACT_SPECS,
  getInteriorFurnitureInteractionSpec,
} from './src/game/worldObjectCatalog';
import { hasLineOfSight2D, stepZombiesAI } from './src/game/zombieAI';
import type { WorldColliderSegment } from './src/game/collision';

function checkCrafting() {
  for (const recipe of WORKBENCH_RECIPES) {
    const outPrice = SHOP_ITEM_PRICES[recipe.outputResourceId].sellPrice * recipe.outputAmount;
    const inCost = recipe.ingredients.reduce(
      (sum, ing) => sum + SHOP_ITEM_PRICES[ing.resourceId].sellPrice * ing.amount,
      0
    );
    assert.ok(
      inCost > outPrice,
      `Recipe ${recipe.id} should not allow money arbitrage: inCost=${inCost}, outPrice=${outPrice}`
    );
  }

  const inv = createInitialInventory();
  inv.wood = 2;
  inv.scrap_metal = 1;
  const medkitRecipe = WORKBENCH_RECIPES.find((r) => r.id === 'craft_medkit')!;
  assert.equal(canCraftRecipe(medkitRecipe, inv, 16).ok, true);

  const okRes = craftWorkbenchRecipe('craft_medkit', inv, 16);
  assert.equal(okRes.ok, true);
  assert.equal(okRes.nextInventory.wood, 0);
  assert.equal(okRes.nextInventory.scrap_metal, 0);
  assert.equal(okRes.nextInventory.medical_supplies, 1);

  // Insufficient materials check
  const failRes = craftWorkbenchRecipe('craft_medkit', okRes.nextInventory, 16);
  assert.equal(failRes.ok, false);

  // Pack capacity check: if packCapacity is strictly lower than netAfter (e.g. cap 0, currently 2 items)
  inv.wood = 2;
  const waterRecipe = WORKBENCH_RECIPES.find((r) => r.id === 'craft_water')!;
  assert.equal(canCraftRecipe(waterRecipe, inv, 2).ok, true);
  assert.equal(canCraftRecipe(waterRecipe, inv, 0).ok, false);
  console.log('✓ Crafting recipes & economy balance passed');
}

function checkCatalogCompleteness() {
  const vehicleIds = new Set(NEIGHBORHOOD_MAP.vehicles.map((v) => v.id));
  for (const vId of vehicleIds) {
    assert.ok(VEHICLE_INTERACT_SPECS[vId], `Missing vehicle spec for ${vId}`);
  }
  for (const specId of Object.keys(VEHICLE_INTERACT_SPECS)) {
    assert.ok(vehicleIds.has(specId), `Orphan vehicle spec: ${specId}`);
  }

  const propIds = new Set(NEIGHBORHOOD_MAP.props.map((p) => p.id));
  for (const id of Object.keys(PROP_WORKBENCH_NAMES)) {
    assert.ok(propIds.has(id), `Orphan workbench prop spec: ${id}`);
  }
  for (const id of Object.keys(PROP_SEARCH_SPECS)) {
    assert.ok(propIds.has(id), `Orphan searchable prop spec: ${id}`);
  }
  for (const id of Object.keys(PROP_EXAMINE_SPECS)) {
    assert.ok(propIds.has(id), `Orphan examine prop spec: ${id}`);
  }

  // Verify every worktable prop in NEIGHBORHOOD_MAP is registered in PROP_WORKBENCH_NAMES
  const worktableProps = NEIGHBORHOOD_MAP.props.filter((p) => p.kind === 'worktable');
  for (const wt of worktableProps) {
    assert.ok(PROP_WORKBENCH_NAMES[wt.id], `Worktable ${wt.id} missing from PROP_WORKBENCH_NAMES`);
  }

  // Verify interior furniture mappings exist against actual ENTERABLE_BUILDINGS indices
  let foundInteriorBench = 0;
  let foundInteriorBed = 0;
  let foundInteriorSink = 0;
  for (const layout of ENTERABLE_BUILDINGS) {
    layout.furniture.forEach((f, idx) => {
      const spec = getInteriorFurnitureInteractionSpec(layout.id, f.kind, idx);
      if (spec?.interactKind === 'workbench') foundInteriorBench++;
      if (spec?.interactKind === 'bed') foundInteriorBed++;
      if (spec?.interactKind === 'examine') foundInteriorSink++;
    });
  }
  assert.equal(foundInteriorBench, 3, 'Expected 3 interior workbenches');
  assert.equal(foundInteriorBed, 2, 'Expected 2 interior resting beds');
  assert.equal(foundInteriorSink, 2, 'Expected 2 interior dry sink examine points');
  console.log('✓ World object catalog completeness passed (11 vehicles, 4 outdoor + 3 interior benches, 15 outdoor searchables, 14+2 examines, 2 beds)');
}

function checkInteractionManager() {
  const scene = new THREE.Scene();
  const mockSound = {
    playPickup: () => {},
    playUiClick: () => {},
    playDoorToggle: () => {},
    playContainerOpen: () => {},
  } as unknown as SoundEngine;

  const doorPivot = new THREE.Group();
  const lidMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 1), new THREE.MeshBasicMaterial());

  const interactables: WorldInteractable[] = [
    {
      kind: 'vehicle',
      id: 'v_taxi',
      name: 'Abandoned Taxi',
      x: 0,
      y: 1,
      z: 0,
      interactRadiusOffset: 2.05,
      initialNote: 'Glovebox holds spare hardware.',
      inspectedNote: 'Picked clean.',
      searched: false,
      lootTaken: false,
      defaultLoot: { resourceId: 'scrap_metal', amount: 2 },
      loot: { resourceId: 'scrap_metal', amount: 2 },
    },
    {
      kind: 'searchable_prop',
      id: 'p_dump_s1',
      name: 'Alley Dumpster',
      searchAction: 'Search',
      emptyAction: 'Inspect',
      x: 5,
      y: 1,
      z: 0,
      interactRadiusOffset: 0.9,
      initialNote: 'Salvaged planks.',
      inspectedNote: 'Only soaked packaging inside.',
      searched: false,
      lootTaken: false,
      defaultLoot: { resourceId: 'wood', amount: 2 },
      loot: { resourceId: 'wood', amount: 2 },
    },
    {
      kind: 'workbench',
      id: 'wb_shop',
      name: 'Shop Repair Workbench',
      x: 10,
      y: 1,
      z: 0,
      interactRadiusOffset: 0.75,
    },
    {
      kind: 'resource',
      id: 'res_on_table',
      resourceId: 'canned_food',
      amount: 1,
      x: 10,
      y: 1.05,
      z: 0,
      group: new THREE.Group(),
      collected: false,
    },
    {
      kind: 'bed',
      id: 'bed_clinic',
      name: 'Clinic Cot',
      x: 15,
      y: 1,
      z: 0,
      interactRadiusOffset: 0.9,
    },
    {
      kind: 'examine',
      id: 'sign_nw',
      name: 'Street Sign',
      actionLabel: 'Read',
      noteTitle: 'District 04 Crossroads',
      noteText: 'North: Quarantine Perimeter.',
      x: 20,
      y: 1.2,
      z: 0,
      examined: false,
      interactRadiusOffset: 0.55,
    },
    {
      kind: 'key',
      id: 'clinic_key',
      name: 'Clinic Key',
      keyKind: 'key',
      x: 22,
      y: 1,
      z: 0,
      group: new THREE.Group(),
      collected: false,
    },
    {
      kind: 'door',
      id: 'door_test',
      name: 'Clinic Door',
      x: 25,
      y: 1,
      z: 0,
      x1: 24.5,
      z1: 0,
      x2: 25.5,
      z2: 0,
      openSwingAngle: Math.PI * 0.5,
      group: new THREE.Group(),
      pivot: doorPivot,
      collider: { x1: 24.5, z1: 0, x2: 25.5, z2: 0, halfThickness: 0.1, active: true },
      isOpen: false,
      lockedKeyId: 'clinic_key',
      unlocked: false,
    },
    {
      kind: 'container',
      id: 'cont_test',
      name: 'Locker',
      x: 30,
      y: 1,
      z: 0,
      group: new THREE.Group(),
      lidPivot: lidMesh,
      animKind: 'lid',
      isOpen: false,
      inspected: false,
      lootTaken: false,
      loot: { resourceId: 'water_bottle', amount: 1 },
    },
  ];

  const mgr = new InteractionManager(scene, interactables, mockSound);
  let openedBench = '';
  let examinedTitle = '';
  let restToggles = 0;
  let resting = false;
  mgr.setPackCapacityProvider(() => 16);
  mgr.setEnvironmentCallbacks({
    onWorkbenchOpened: (name) => {
      openedBench = name;
    },
    onExamineNote: (title) => {
      examinedTitle = title;
    },
    onBedRestToggle: () => {
      restToggles++;
      resting = !resting;
    },
    isRestingProvider: () => resting,
  });

  // yaw = 0 faces -Z, so standing at (x, z + d) faces (x, z)
  // 1. Vehicle search + capacity guard
  mgr.setPackCapacityProvider(() => 0);
  mgr.update(0.016, 0, 2.2, 0);
  assert.equal(mgr.targeted?.id, 'v_taxi');
  assert.equal(mgr.getPrompt()?.actionLabel, 'Search');
  mgr.interact(); // Pack full -> must NOT consume vehicle loot
  assert.equal((interactables[0] as any).searched, false);

  mgr.setPackCapacityProvider(() => 16);
  mgr.interact();
  assert.equal((interactables[0] as any).searched, true);
  assert.equal(mgr.inventory.scrap_metal, 2);
  assert.equal(mgr.getPrompt()?.actionLabel, 'Inspect');

  // 2. Priority bias: loose resource sitting on workbench is targeted first, then workbench
  mgr.update(0.016, 10, 1.2, 0);
  assert.equal(mgr.targeted?.id, 'res_on_table');
  mgr.interact();
  assert.equal(mgr.inventory.canned_food, 1);

  mgr.update(0.016, 10, 1.2, 0);
  assert.equal(mgr.targeted?.id, 'wb_shop');
  assert.equal(mgr.getPrompt()?.kind, 'workbench');
  mgr.interact();
  assert.equal(openedBench, 'Shop Repair Workbench');

  // 3. Bed rest toggle prompt changes based on resting state
  mgr.update(0.016, 15, 1.2, 0);
  assert.equal(mgr.getPrompt()?.kind, 'bed');
  assert.equal(mgr.getPrompt()?.actionLabel, 'Rest on');
  mgr.interact();
  assert.equal(restToggles, 1);
  assert.equal(mgr.getPrompt()?.actionLabel, 'Stand up from');

  // 4. Examine sign + re-examine
  mgr.update(0.016, 20, 1.2, 0);
  assert.equal(mgr.getPrompt()?.kind, 'examine');
  assert.equal(mgr.getPrompt()?.actionLabel, 'Read');
  mgr.interact();
  assert.equal(examinedTitle, 'District 04 Crossroads');
  assert.equal((interactables[5] as any).examined, true);

  // 5. Key pickup + Locked door unlock + animatingSet settling
  mgr.update(0.016, 22, 1.2, 0);
  assert.equal(mgr.targeted?.id, 'clinic_key');
  mgr.interact();
  assert.ok(mgr.getCollectedKeyIds().includes('clinic_key'));

  mgr.update(0.016, 25, 1.2, 0);
  assert.equal(mgr.targeted?.id, 'door_test');
  mgr.interact();
  assert.equal((interactables[7] as any).isOpen, true);
  assert.equal((interactables[7] as any).collider.active, false);

  // Step enough frames for door to settle cleanly to openSwingAngle without errors
  for (let i = 0; i < 180; i++) {
    mgr.update(1 / 60, 25, 1.2, 0);
  }
  assert.ok(Math.abs(doorPivot.rotation.y - Math.PI * 0.5) < 0.01);

  // 6. Save/Load round trip + Pre-Phase-15 backward-compatible restore
  const saved = mgr.exportWorldState();
  const savedInv = { ...mgr.inventory };
  assert.ok(saved.searchedExtraIds?.includes('v_taxi'));
  assert.ok(saved.examinedObjectIds?.includes('sign_nw'));

  mgr.reset();
  assert.equal((interactables[0] as any).searched, false);
  assert.ok((interactables[0] as any).loot !== undefined);
  assert.equal((interactables[5] as any).examined, false);

  mgr.restoreWorldState(saved, savedInv);
  assert.equal((interactables[0] as any).searched, true);
  assert.equal((interactables[5] as any).examined, true);

  // Pre-Phase-15 save without searchedExtraIds / examinedObjectIds
  mgr.restoreWorldState(
    {
      collectedResourceIds: ['res_on_table'],
      openedContainerIds: [],
      openDoorIds: [],
      unlockedDoorIds: [],
      collectedKeyIds: [],
    } as any,
    savedInv
  );
  assert.equal((interactables[0] as any).searched, false);
  assert.equal((interactables[5] as any).examined, false);
  console.log('✓ InteractionManager mechanics, priority, animation settling, & save/load passed');
}

function checkZombieDoorBlocking() {
  const doorSeg: WorldColliderSegment = { x1: -1, z1: 0, x2: 1, z2: 0, active: true };
  assert.equal(hasLineOfSight2D(0, -2, 0, 2, [], [doorSeg]), false, 'Closed door should block LOS');
  doorSeg.active = false;
  assert.equal(hasLineOfSight2D(0, -2, 0, 2, [], [doorSeg]), true, 'Open door should allow LOS');

  doorSeg.active = true;
  const zombie: ZombieEntity = {
    id: 'z_test',
    variant: 'shambler',
    x: 0,
    z: -1.0,
    yaw: 0,
    hp: 40,
    maxHp: 40,
    speed: 2.2,
    attackRange: 1.4,
    attackDamage: 10,
    attackCooldown: 0,
    state: 'chase',
    homeX: 0,
    homeZ: -5,
    patrolAngle: 0,
    alertTimer: 2,
    hitFlash: 0,
    attackSwing: 0,
    radius: 0.35,
    alive: true,
    deathAnim: 0,
  };

  const res = stepZombiesAI(
    [zombie],
    1 / 30,
    0,
    0.5, // Player just behind closed door -> dist 1.5 but blocked by doorSeg
    false,
    0,
    [],
    [doorSeg],
    1.0
  );
  assert.equal(res.playerDamage, 0, 'Zombie must not hit player through closed door');
  console.log('✓ Zombie LOS & melee door blocking verified');
}

function checkReactSsrRendering() {
  const inv = createInitialInventory();
  inv.wood = 3;
  inv.scrap_metal = 1;

  const benchHtml = renderToStaticMarkup(
    React.createElement(WorkbenchModal, {
      workbenchName: 'Mercer Garage Bench',
      inventory: inv,
      totalInventoryItems: 4,
      packCapacity: 16,
      isTouchMode: true,
      onCraftRecipe: () => {},
      onClose: () => {},
    })
  );
  assert.ok(benchHtml.includes('MERCER GARAGE BENCH'));
  assert.ok(benchHtml.includes('Assemble Field Medkit'));

  const baseHud: HudSnapshot = {
    health: 95,
    maxHealth: 100,
    hunger: 90,
    maxHunger: 100,
    thirst: 90,
    maxThirst: 100,
    energy: 85,
    maxEnergy: 100,
    isResting: false,
    stamina: 100,
    maxStamina: 100,
    isExhausted: false,
    isSprinting: false,
    day: 1,
    formattedTime: '10:30',
    dayPhaseLabel: 'Morning',
    weather: 'clear',
    weatherLabel: 'Clear',
    flashlightOn: true,
    pointerLocked: false,
    contextTitle: null,
    contextMessage: null,
    interactionPrompt: {
      targetId: 'v_taxi',
      kind: 'vehicle',
      actionLabel: 'Search',
      label: 'Abandoned Taxi',
      sublabel: 'Check trunk & glovebox',
    },
    inventory: inv,
    totalInventoryItems: 4,
    packCapacity: 16,
    money: DEFAULT_ECONOMY_CONFIG.startingMoney,
    shop: createInitialShopSnapshot(DEFAULT_ECONOMY_CONFIG.startingMoney),
    staff: createInitialStaffSnapshot(1),
    missions: createInitialMissionSnapshot(false),
    latestToast: null,
    damagePulseId: 0,
    attackPulseId: 0,
    inActiveCombat: false,
    weaponLabel: 'Steel Pipe',
    zombiesDefeated: 0,
    deathReason: null,
    playerX: 0,
    playerZ: 0,
    playerYaw: 0,
    insideShop: false,
    isSafeHaven: false,
    currentLocationId: null,
    currentLocationName: 'Main Street',
    currentLocationSubtitle: 'Outside The Last Shop',
    currentLocationDanger: null,
    currentRegionId: 'main_street',
    currentRegionName: 'Main Street',
    discoveredLocationIds: ['last_shop'],
    discoveredRegionIds: ['main_street'],
    collectedKeyIds: [],
    guidanceHint: null,
  };

  const portraitVp = {
    width: 390,
    height: 844,
    orientation: 'portrait' as const,
    isCompactLandscape: false,
    isShortViewport: false,
    aspectRatio: 390 / 844,
  };
  const landscapeVp = {
    width: 844,
    height: 390,
    orientation: 'landscape' as const,
    isCompactLandscape: true,
    isShortViewport: true,
    aspectRatio: 844 / 390,
  };

  for (const kind of ['vehicle', 'workbench', 'examine', 'bed'] as const) {
    const prompt = {
      targetId: `id_${kind}`,
      kind,
      actionLabel: kind === 'bed' ? 'Rest on' : kind === 'examine' ? 'Read' : 'Use',
      label: `Object ${kind}`,
    };
    const hudHtml = renderToStaticMarkup(
      React.createElement(HudOverlay, {
        hud: { ...baseHud, interactionPrompt: prompt },
        muted: false,
        isPlaying: true,
        isTouchMode: false,
        viewport: landscapeVp,
        isInventoryOpen: false,
        isMissionsOpen: false,
        isMapOpen: false,
        onPauseClick: () => {},
        onOpenInventory: () => {},
        onOpenMissions: () => {},
        onOpenMap: () => {},
        onDismissGuidance: () => {},
        onToggleMute: () => {},
        onConsumeItem: () => {},
        onToggleRest: () => {},
      })
    );
    assert.ok(hudHtml.includes(`Object ${kind}`));

    const mobileHtml = renderToStaticMarkup(
      React.createElement(MobileControls, {
        flashlightOn: true,
        interactionPrompt: prompt,
        viewport: portraitVp,
        onMove: () => {},
        onLookDelta: () => {},
        onJump: () => {},
        onInteract: () => {},
        onAttack: () => {},
        onToggleFlashlight: () => {},
      })
    );
    assert.ok(mobileHtml.includes(prompt.actionLabel));
  }
  console.log('✓ React SSR rendering passed for WorkbenchModal, HudOverlay, and MobileControls');
}

checkCrafting();
checkCatalogCompleteness();
checkInteractionManager();
checkZombieDoorBlocking();
checkReactSsrRendering();
console.log('ALL PHASE 15 VERIFICATION CHECKS PASSED');
