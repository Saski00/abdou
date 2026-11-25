import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  CustomerRig,
  CustomerSharedGeometries,
  animateCustomerRig,
  buildProceduralCustomerModel,
  createCustomerSharedGeometries,
} from '../assets/models/customerModel';
import {
  CustomerAgent,
  CustomerSpawnScheduleState,
  DEFAULT_CUSTOMER_CONFIG,
  LAST_SHOP_WAYPOINTS,
  applyCustomerPurchaseOutcome,
  buildActiveCustomerSummaries,
  evaluateShopOpenStatus,
  stepCustomerSpawnSchedule,
  stepCustomersAI,
} from '../game/customerAI';
import { SHOP_ITEM_PRICES, ShopEconomySystem, formatMoney } from '../game/economy';
import { ActiveCustomerSummary } from '../game/types';
import { AssetManager } from './AssetManager';
import { CustomerInteractTarget, InteractionManager } from './InteractionManager';
import { BuiltWorld, WorldDoorInteractable } from './WorldBuilder';

interface CustomerEntityView {
  agent: CustomerAgent;
  group: THREE.Group;
  rig: CustomerRig | null;
}

export class CustomerManager {
  private root = new THREE.Group();
  private sharedGeos: CustomerSharedGeometries;
  private entities: CustomerEntityView[] = [];
  private frontDoor: WorldDoorInteractable | null = null;
  private schedule: CustomerSpawnScheduleState = {
    timer: DEFAULT_CUSTOMER_CONFIG.initialSpawnDelaySec,
    nextCustomerSeq: 1,
    lastSpawnSide: 0,
  };
  private lastAccepting = true;
  private lastStatusReason = 'Open for survivors (06:00 - 19:30)';

  constructor(
    scene: THREE.Scene,
    private assets: AssetManager,
    private world: BuiltWorld,
    private economy: ShopEconomySystem,
    private interactions: InteractionManager,
    private sound: SoundEngine
  ) {
    this.sharedGeos = createCustomerSharedGeometries();
    scene.add(this.root);

    for (const item of world.interactables) {
      if (item.kind === 'door' && item.id === 'door_last_shop_front') {
        this.frontDoor = item;
        break;
      }
    }
  }

  public reset(): void {
    this.clearEntities();
    this.schedule = {
      timer: DEFAULT_CUSTOMER_CONFIG.initialSpawnDelaySec,
      nextCustomerSeq: 1,
      lastSpawnSide: 0,
    };
    this.lastAccepting = true;
    this.lastStatusReason = 'Open for survivors (06:00 - 19:30)';
  }

  private clearEntities(): void {
    for (const ent of this.entities) {
      this.root.remove(ent.group);
      ent.rig?.dispose();
    }
    this.entities = [];
  }

  private spawnViewForAgent(agent: CustomerAgent): void {
    let rig: CustomerRig | null = null;
    const group = this.assets.instantiateAsset(
      'npc.customer',
      () => {
        const built = buildProceduralCustomerModel(this.sharedGeos, agent.profile.variant);
        rig = built.rig;
        return built.group;
      },
      true,
      true
    );
    group.position.set(agent.x, agent.y, agent.z);
    group.rotation.y = agent.yaw;
    this.root.add(group);
    this.entities.push({ agent, group, rig });
  }

  public update(
    dt: number,
    hoursFloat: number,
    timeLabel: string,
    playerX: number,
    playerZ: number,
    activeShopkeepers = 0
  ): void {
    const manualOpen = this.economy.isShopManualOpen();
    const customerConfig = {
      ...DEFAULT_CUSTOMER_CONFIG,
      maxActiveCustomers: this.economy.getCustomerCapacity(),
    };
    const status = evaluateShopOpenStatus(hoursFloat, manualOpen, customerConfig);
    this.lastAccepting = status.accepting;
    this.lastStatusReason = status.reason;

    const spawned = stepCustomerSpawnSchedule(
      this.schedule,
      this.entities.length,
      dt,
      hoursFloat,
      manualOpen,
      this.world.colliders,
      customerConfig,
      this.economy.getCustomerTrafficMultiplier()
    );
    if (spawned) {
      this.spawnViewForAgent(spawned);
    }

    if (this.entities.length === 0) {
      return;
    }

    const agents = this.entities.map((e) => e.agent);
    const frontDoorOpen = this.frontDoor ? this.frontDoor.isOpen : true;

    const stepRes = stepCustomersAI(agents, {
      dt,
      hoursFloat,
      shopManualOpen: manualOpen,
      frontDoorOpen,
      allowCustomerDoorOpen: true,
      playerX,
      playerZ,
      shopStock: this.economy.getShopStock(),
      colliders: this.world.colliders,
      prices: SHOP_ITEM_PRICES,
      config: customerConfig,
      activeShopkeepers,
    });

    if (stepRes.requestOpenFrontDoor && this.frontDoor && !this.frontDoor.isOpen) {
      this.frontDoor.isOpen = true;
      this.frontDoor.collider.active = false;
      this.sound.playDoorToggle(true);
    }

    // Execute atomic customer purchases (at most once per customer visit)
    for (const req of stepRes.purchaseRequests) {
      const ent = this.entities.find((e) => e.agent.id === req.customerId);
      if (!ent) continue;

      const res = this.economy.sellStockItem(req.resourceId, req.quantity, timeLabel, {
        source: 'customer',
        buyerName: req.customerName,
      });

      const def = SHOP_ITEM_PRICES[req.resourceId];
      const itemLabel = req.quantity === 1 ? def.displayName : def.pluralName;
      applyCustomerPurchaseOutcome(
        ent.agent,
        res.ok,
        itemLabel,
        req.quantity,
        res.earned,
        this.economy.getShopStock(),
        SHOP_ITEM_PRICES
      );

      if (res.ok) {
        this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
        const distToCounter = Math.hypot(
          playerX - LAST_SHOP_WAYPOINTS.checkoutSlots[0].x,
          playerZ - LAST_SHOP_WAYPOINTS.checkoutSlots[0].z
        );
        if (distToCounter < 36) {
          this.sound.playCashRegister();
        }
        this.interactions.pushToast(res.record.message, 'resource', 3.0);
      }
    }

    // Remove and dispose despawned NPCs cleanly
    if (stepRes.despawnedIds.length > 0) {
      const removeSet = new Set(stepRes.despawnedIds);
      const remaining: CustomerEntityView[] = [];
      for (const ent of this.entities) {
        if (removeSet.has(ent.agent.id)) {
          this.root.remove(ent.group);
          ent.rig?.dispose();
        } else {
          remaining.push(ent);
        }
      }
      this.entities = remaining;
    }

    // Sync 3D transforms & animations
    for (const ent of this.entities) {
      const a = ent.agent;
      ent.group.position.set(a.x, a.y, a.z);
      ent.group.rotation.y = a.yaw;
      if (ent.rig) {
        const isMoving = Math.hypot(a.vx, a.vz) > 0.12;
        animateCustomerRig(
          ent.rig,
          a.state,
          a.walkCycle,
          isMoving,
          a.purchaseCompleted && a.selectedPurchase !== null
        );
      }
    }
  }

  public getInteractTargets(): CustomerInteractTarget[] {
    const list: CustomerInteractTarget[] = [];
    for (const ent of this.entities) {
      const a = ent.agent;
      if (a.state === 'despawned') continue;
      list.push({
        kind: 'customer',
        id: a.id,
        name: a.profile.name,
        statusLabel: a.statusLabel,
        x: a.x,
        y: a.y,
        z: a.z,
      });
    }
    return list;
  }

  public handlePlayerInteract(customerId: string): void {
    const ent = this.entities.find((e) => e.agent.id === customerId);
    if (!ent) return;
    const a = ent.agent;
    const topPrefId = (Object.keys(a.profile.preferences) as (keyof typeof a.profile.preferences)[]).sort(
      (x, y) => a.profile.preferences[y] - a.profile.preferences[x]
    )[0];
    const prefName = SHOP_ITEM_PRICES[topPrefId].displayName;

    if (a.selectedPurchase) {
      const def = SHOP_ITEM_PRICES[a.selectedPurchase.resourceId];
      const msg = a.purchaseCompleted
        ? `${a.profile.name}: Thanks for the ${def.displayName}! (${formatMoney(a.budget)} left)`
        : `${a.profile.name}: Heading to register with ${a.selectedPurchase.quantity} ${def.displayName}`;
      this.interactions.pushToast(msg, 'world', 2.6);
      return;
    }

    this.interactions.pushToast(
      `${a.profile.name} (${a.statusLabel}) · Prefers ${prefName} · Cash ${formatMoney(a.budget)}`,
      'world',
      2.6
    );
  }

  public getActiveCustomerSummaries(): ActiveCustomerSummary[] {
    return buildActiveCustomerSummaries(
      this.entities.map((e) => e.agent),
      SHOP_ITEM_PRICES
    );
  }

  public isShopAcceptingCustomers(): boolean {
    return this.lastAccepting;
  }

  public getShopStatusReason(): string {
    return this.lastStatusReason;
  }

  public dispose(): void {
    this.clearEntities();
    this.sharedGeos.dispose();
  }
}
