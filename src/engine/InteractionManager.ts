import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  RESOURCE_DEFINITIONS,
  addInventoryResourceCapped,
  createInitialInventory,
  formatResourceCollectedLabel,
  getTotalInventoryItems,
} from '../game/resources';
import { SavedWorldInteractablesState } from '../game/saveSystem';
import { FeedbackToast, InteractionPrompt, InventoryState, ResourceId } from '../game/types';
import { WorldInteractable } from './WorldBuilder';

const INTERACT_RANGE = 2.85;
const CLOSE_PROXIMITY_OVERRIDE = 1.25;

export interface CustomerInteractTarget {
  kind: 'customer';
  id: string;
  name: string;
  statusLabel: string;
  x: number;
  y: number;
  z: number;
}

export interface SurvivorInteractTarget {
  kind: 'survivor';
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
}

export interface EmployeeInteractTarget {
  kind: 'employee';
  id: string;
  name: string;
  professionLabel: string;
  statusLabel: string;
  x: number;
  y: number;
  z: number;
}

export type ActiveInteractTarget =
  | WorldInteractable
  | CustomerInteractTarget
  | SurvivorInteractTarget
  | EmployeeInteractTarget;

function distanceToSegment2D(
  px: number,
  pz: number,
  x1: number,
  z1: number,
  x2: number,
  z2: number
): number {
  const vx = x2 - x1;
  const vz = z2 - z1;
  const lenSq = vx * vx + vz * vz;
  if (lenSq < 0.0001) return Math.hypot(px - x1, pz - z1);
  const t = Math.max(0, Math.min(1, ((px - x1) * vx + (pz - z1) * vz) / lenSq));
  const cx = x1 + t * vx;
  const cz = z1 + t * vz;
  return Math.hypot(px - cx, pz - cz);
}

export class InteractionManager {
  public inventory: InventoryState = createInitialInventory();
  public targeted: ActiveInteractTarget | null = null;
  public latestToast: FeedbackToast | null = null;

  private toastTimer = 0;
  private nextToastId = 1;
  private lastPlayerX = 0;
  private lastPlayerZ = 0;
  private customerTargetsProvider: (() => CustomerInteractTarget[]) | null = null;
  private onCustomerInteract: ((customerId: string) => void) | null = null;
  private survivorTargetsProvider: (() => SurvivorInteractTarget[]) | null = null;
  private onSurvivorInteract: ((survivorId: string) => void) | null = null;
  private employeeTargetsProvider: (() => EmployeeInteractTarget[]) | null = null;
  private onEmployeeInteract: ((employeeId: string) => void) | null = null;
  private onResourceCollected: ((resourceId: ResourceId, amount: number) => void) | null = null;
  private onContainerSearched: ((containerId: string) => void) | null = null;
  private onDoorOpened: ((doorId: string) => void) | null = null;
  private onStoryObjectInteract: ((objectId: string) => void) | null = null;
  private packCapacityProvider: () => number = () => 16;

  // Lightweight pooled 3D visual cue meshes (only 2 meshes total, zero per-frame allocations)
  private targetRing: THREE.Mesh;
  private pulseRing: THREE.Mesh;
  private pulseMat: THREE.MeshBasicMaterial;
  private pulseAge = -1;

  constructor(
    scene: THREE.Scene,
    private interactables: WorldInteractable[],
    private sound: SoundEngine,
    private onShopStationOpened?: (stationKind: 'counter' | 'storage') => void
  ) {
    const ringGeo = new THREE.RingGeometry(0.28, 0.36, 24);
    ringGeo.rotateX(-Math.PI * 0.5);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.targetRing = new THREE.Mesh(ringGeo, ringMat);
    this.targetRing.visible = false;
    scene.add(this.targetRing);

    const pulseGeo = new THREE.RingGeometry(0.22, 0.32, 24);
    pulseGeo.rotateX(-Math.PI * 0.5);
    this.pulseMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.pulseRing = new THREE.Mesh(pulseGeo, this.pulseMat);
    this.pulseRing.visible = false;
    scene.add(this.pulseRing);
  }

  public setCustomerInteractionProvider(
    provider: () => CustomerInteractTarget[],
    onInteract: (customerId: string) => void
  ): void {
    this.customerTargetsProvider = provider;
    this.onCustomerInteract = onInteract;
  }

  public setSurvivorInteractionProvider(
    provider: () => SurvivorInteractTarget[],
    onInteract: (survivorId: string) => void
  ): void {
    this.survivorTargetsProvider = provider;
    this.onSurvivorInteract = onInteract;
  }

  public setEmployeeInteractionProvider(
    provider: () => EmployeeInteractTarget[],
    onInteract: (employeeId: string) => void
  ): void {
    this.employeeTargetsProvider = provider;
    this.onEmployeeInteract = onInteract;
  }

  public setStoryEventCallbacks(callbacks: {
    onResourceCollected: (resourceId: ResourceId, amount: number) => void;
    onContainerSearched: (containerId: string) => void;
    onDoorOpened: (doorId: string) => void;
    onStoryObjectInteract: (objectId: string) => void;
  }): void {
    this.onResourceCollected = callbacks.onResourceCollected;
    this.onContainerSearched = callbacks.onContainerSearched;
    this.onDoorOpened = callbacks.onDoorOpened;
    this.onStoryObjectInteract = callbacks.onStoryObjectInteract;
  }

  public getOpenDoorIds(): string[] {
    return this.interactables
      .filter((item) => item.kind === 'door' && item.isOpen)
      .map((item) => item.id);
  }

  public getSearchedContainerIds(): string[] {
    return this.interactables
      .filter((item) => item.kind === 'container' && item.inspected)
      .map((item) => item.id);
  }

  public exportWorldState(): SavedWorldInteractablesState {
    return {
      collectedResourceIds: this.interactables
        .filter((i) => i.kind === 'resource' && i.collected)
        .map((i) => i.id),
      openDoorIds: this.getOpenDoorIds(),
      searchedContainerIds: this.getSearchedContainerIds(),
    };
  }

  public restoreWorldState(
    worldState: Partial<SavedWorldInteractablesState> | undefined,
    inventory: InventoryState
  ): void {
    this.reset();
    if (inventory && typeof inventory === 'object') {
      this.inventory = { ...createInitialInventory(), ...inventory };
    }
    if (!worldState || typeof worldState !== 'object') return;

    const collectedSet = new Set(worldState.collectedResourceIds ?? []);
    const openDoors = new Set(worldState.openDoorIds ?? []);
    const searchedContainers = new Set(worldState.searchedContainerIds ?? []);

    for (const item of this.interactables) {
      if (item.kind === 'resource' && collectedSet.has(item.id)) {
        item.collected = true;
        item.group.visible = false;
      } else if (item.kind === 'door' && openDoors.has(item.id)) {
        item.isOpen = true;
        item.collider.active = false;
        item.pivot.rotation.y = item.openSwingAngle;
      } else if (item.kind === 'container' && searchedContainers.has(item.id)) {
        item.inspected = true;
        item.lootTaken = true;
        item.isOpen = true;
        if (item.lidPivot) {
          if (item.animKind === 'drawer') {
            item.lidPivot.position.z = 0.46;
          } else if (item.animKind === 'door') {
            item.lidPivot.rotation.y = -1.45;
          } else {
            item.lidPivot.rotation.x = -1.3;
          }
        }
      }
    }
  }

  public reset(): void {
    this.inventory = createInitialInventory();
    this.targeted = null;
    this.latestToast = null;
    this.toastTimer = 0;
    this.targetRing.visible = false;
    this.pulseRing.visible = false;
    this.pulseAge = -1;

    for (const item of this.interactables) {
      if (item.kind === 'resource') {
        item.collected = false;
        item.group.visible = true;
      } else if (item.kind === 'door') {
        item.isOpen = false;
        item.collider.active = true;
        item.pivot.rotation.y = 0;
      } else if (item.kind === 'container') {
        item.isOpen = false;
        item.inspected = false;
        item.lootTaken = false;
        if (item.lidPivot) {
          if (item.animKind === 'drawer') {
            item.lidPivot.position.z = 0.22;
          } else if (item.animKind === 'door') {
            item.lidPivot.rotation.y = 0;
          } else {
            item.lidPivot.rotation.x = 0;
          }
        }
      }
    }
  }

  public update(dt: number, playerX: number, playerZ: number, yaw: number): void {
    this.lastPlayerX = playerX;
    this.lastPlayerZ = playerZ;

    // 1. Toast expiration
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.latestToast = null;
      }
    }

    // 2. Smoothly animate doors & container lids
    for (const item of this.interactables) {
      if (item.kind === 'door') {
        const targetAngle = item.isOpen ? item.openSwingAngle : 0;
        if (Math.abs(item.pivot.rotation.y - targetAngle) > 0.002) {
          item.pivot.rotation.y = THREE.MathUtils.damp(
            item.pivot.rotation.y,
            targetAngle,
            12,
            dt
          );
        }
      } else if (item.kind === 'container' && item.lidPivot) {
        if (item.animKind === 'drawer') {
          const targetZ = item.isOpen ? 0.46 : 0.22;
          if (Math.abs(item.lidPivot.position.z - targetZ) > 0.002) {
            item.lidPivot.position.z = THREE.MathUtils.damp(
              item.lidPivot.position.z,
              targetZ,
              14,
              dt
            );
          }
        } else if (item.animKind === 'door') {
          const targetY = item.isOpen ? -1.45 : 0;
          if (Math.abs(item.lidPivot.rotation.y - targetY) > 0.002) {
            item.lidPivot.rotation.y = THREE.MathUtils.damp(
              item.lidPivot.rotation.y,
              targetY,
              14,
              dt
            );
          }
        } else {
          const targetLid = item.isOpen ? -1.3 : 0;
          if (Math.abs(item.lidPivot.rotation.x - targetLid) > 0.002) {
            item.lidPivot.rotation.x = THREE.MathUtils.damp(
              item.lidPivot.rotation.x,
              targetLid,
              14,
              dt
            );
          }
        }
      }
    }

    // 3. Pickup ring pulse animation
    if (this.pulseAge >= 0) {
      this.pulseAge += dt;
      const duration = 0.36;
      if (this.pulseAge >= duration) {
        this.pulseAge = -1;
        this.pulseRing.visible = false;
      } else {
        const t = this.pulseAge / duration;
        const scale = 1 + t * 1.9;
        this.pulseRing.scale.setScalar(scale);
        this.pulseMat.opacity = (1 - t) * 0.85;
      }
    }

    // 4. Find closest valid interactable in front of player
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    let bestItem: ActiveInteractTarget | null = null;
    let bestScore = Infinity;

    for (const item of this.interactables) {
      if (item.kind === 'resource' && item.collected) continue;

      const dist =
        item.kind === 'door'
          ? distanceToSegment2D(playerX, playerZ, item.x1, item.z1, item.x2, item.z2)
          : Math.hypot(item.x - playerX, item.z - playerZ);

      if (dist > INTERACT_RANGE) continue;

      const dx = item.x - playerX;
      const dz = item.z - playerZ;
      const len = Math.hypot(dx, dz) || 1;
      const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

      if (dist > CLOSE_PROXIMITY_OVERRIDE && dot < 0.2) continue;

      const score = dist - Math.max(0, dot) * 0.9;
      if (score < bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    if (this.customerTargetsProvider) {
      const customers = this.customerTargetsProvider();
      for (const cust of customers) {
        const dist = Math.hypot(cust.x - playerX, cust.z - playerZ);
        if (dist > INTERACT_RANGE) continue;

        const dx = cust.x - playerX;
        const dz = cust.z - playerZ;
        const len = Math.hypot(dx, dz) || 1;
        const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

        if (dist > CLOSE_PROXIMITY_OVERRIDE && dot < 0.28) continue;

        const score = dist - Math.max(0, dot) * 0.9 + 0.25;
        if (score < bestScore) {
          bestScore = score;
          bestItem = cust;
        }
      }
    }

    if (this.survivorTargetsProvider) {
      const survivors = this.survivorTargetsProvider();
      for (const surv of survivors) {
        const dist = Math.hypot(surv.x - playerX, surv.z - playerZ);
        if (dist > INTERACT_RANGE) continue;

        const dx = surv.x - playerX;
        const dz = surv.z - playerZ;
        const len = Math.hypot(dx, dz) || 1;
        const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

        if (dist > CLOSE_PROXIMITY_OVERRIDE && dot < 0.25) continue;

        const score = dist - Math.max(0, dot) * 0.9 - 0.15;
        if (score < bestScore) {
          bestScore = score;
          bestItem = surv;
        }
      }
    }

    if (this.employeeTargetsProvider) {
      const employees = this.employeeTargetsProvider();
      for (const emp of employees) {
        const dist = Math.hypot(emp.x - playerX, emp.z - playerZ);
        if (dist > INTERACT_RANGE) continue;

        const dx = emp.x - playerX;
        const dz = emp.z - playerZ;
        const len = Math.hypot(dx, dz) || 1;
        const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

        if (dist > CLOSE_PROXIMITY_OVERRIDE && dot < 0.28) continue;

        const score = dist - Math.max(0, dot) * 0.9 + 0.18;
        if (score < bestScore) {
          bestScore = score;
          bestItem = emp;
        }
      }
    }

    this.targeted = bestItem;

    if (bestItem) {
      this.targetRing.visible = true;
      this.targetRing.position.set(bestItem.x, bestItem.y + 0.02, bestItem.z);
      const ringScale =
        bestItem.kind === 'door'
          ? 1.55
          : bestItem.kind === 'container'
            ? 1.4
            : bestItem.kind === 'customer' || bestItem.kind === 'survivor' || bestItem.kind === 'employee'
              ? 1.35
              : bestItem.kind === 'shop_station'
                ? bestItem.stationKind === 'counter'
                  ? 1.15
                  : 1.45
                : bestItem.kind === 'story_object'
                  ? 1.25
                  : 1.0;
      this.targetRing.scale.setScalar(ringScale);
    } else {
      this.targetRing.visible = false;
    }
  }

  public setPackCapacityProvider(provider: () => number): void {
    this.packCapacityProvider = provider;
  }

  public interact(): boolean {
    const item = this.targeted;
    if (!item) return false;

    if (item.kind === 'resource') {
      if (item.collected) return false;
      const cap = this.packCapacityProvider();
      const addRes = addInventoryResourceCapped(
        this.inventory,
        item.resourceId,
        item.amount,
        cap
      );
      if (addRes.added <= 0) {
        this.sound.playUiClick(340);
        this.pushToast(
          `Pack full (${this.getTotalItems()}/${cap}) — store or sell items at The Last Shop`,
          'warning',
          2.8
        );
        return false;
      }

      this.inventory = addRes.nextInventory;
      this.sound.playPickup();
      this.triggerPulse(item.x, item.y + 0.04, item.z);
      this.onResourceCollected?.(item.resourceId, addRes.added);

      if (addRes.overflow > 0) {
        item.amount = addRes.overflow;
        this.pushToast(
          `${formatResourceCollectedLabel(item.resourceId, addRes.added)} · Pack full (${addRes.overflow} left here)`,
          'warning',
          3.0
        );
      } else {
        item.collected = true;
        item.group.visible = false;
        this.pushToast(formatResourceCollectedLabel(item.resourceId, addRes.added), 'resource');
        this.targeted = null;
        this.targetRing.visible = false;
      }
      return true;
    }

    if (item.kind === 'door') {
      if (item.isOpen) {
        const distToGate = distanceToSegment2D(
          this.lastPlayerX,
          this.lastPlayerZ,
          item.x1,
          item.z1,
          item.x2,
          item.z2
        );
        if (distToGate < 0.72) {
          this.pushToast(`Step clear of ${item.name} to close it`, 'world');
          return false;
        }
      }
      item.isOpen = !item.isOpen;
      item.collider.active = !item.isOpen;
      this.sound.playDoorToggle(item.isOpen);
      this.pushToast(`${item.isOpen ? 'Opened' : 'Closed'} ${item.name}`, 'world');
      if (item.isOpen) {
        this.onDoorOpened?.(item.id);
      }
      return true;
    }

    if (item.kind === 'shop_station') {
      this.sound.playUiClick(540);
      this.onShopStationOpened?.(item.stationKind);
      return true;
    }

    if (item.kind === 'story_object') {
      this.sound.playUiClick(620);
      this.onStoryObjectInteract?.(item.id);
      return true;
    }

    if (item.kind === 'customer') {
      this.sound.playUiClick(620);
      this.onCustomerInteract?.(item.id);
      return true;
    }

    if (item.kind === 'survivor') {
      this.sound.playUiClick(640);
      this.onSurvivorInteract?.(item.id);
      return true;
    }

    if (item.kind === 'employee') {
      this.sound.playUiClick(580);
      this.onEmployeeInteract?.(item.id);
      return true;
    }

    // Container
    this.sound.playContainerOpen();

    if (item.loot && !item.lootTaken) {
      const cap = this.packCapacityProvider();
      const addRes = addInventoryResourceCapped(
        this.inventory,
        item.loot.resourceId,
        item.loot.amount,
        cap
      );

      if (addRes.added <= 0) {
        item.isOpen = true;
        this.pushToast(
          `${item.name}: Pack full (${this.getTotalItems()}/${cap}) — stock or store supplies first`,
          'warning',
          3.0
        );
        return true;
      }

      this.inventory = addRes.nextInventory;
      item.isOpen = true;
      this.triggerPulse(item.x, item.y + 0.45, item.z);
      this.onResourceCollected?.(item.loot.resourceId, addRes.added);

      if (addRes.overflow > 0) {
        item.loot.amount = addRes.overflow;
        this.pushToast(
          `${item.name}: ${formatResourceCollectedLabel(item.loot.resourceId, addRes.added)} · Pack full (${addRes.overflow} still inside)`,
          'warning',
          3.0
        );
      } else {
        item.inspected = true;
        item.lootTaken = true;
        this.pushToast(
          `${item.name}: ${formatResourceCollectedLabel(item.loot.resourceId, addRes.added)}`,
          'resource'
        );
      }
      this.onContainerSearched?.(item.id);
      return true;
    }

    item.inspected = true;
    item.isOpen = !item.isOpen;
    this.pushToast(
      `${item.name}: Already searched (${item.isOpen ? 'Empty' : 'Closed'})`,
      'world'
    );
    this.onContainerSearched?.(item.id);

    return true;
  }

  public getPrompt(): InteractionPrompt | null {
    const item = this.targeted;
    if (!item) return null;

    if (item.kind === 'resource') {
      const def = RESOURCE_DEFINITIONS[item.resourceId];
      const countText = item.amount > 1 ? `${item.amount} ${def.pluralName}` : def.name;
      return {
        id: item.id,
        name: countText,
        actionLabel: 'Collect',
        kind: 'resource',
        amount: item.amount,
      };
    }

    if (item.kind === 'door') {
      return {
        id: item.id,
        name: item.name,
        actionLabel: item.isOpen ? 'Close' : 'Open',
        kind: 'door',
      };
    }

    if (item.kind === 'shop_station') {
      return {
        id: item.id,
        name: item.name,
        actionLabel: item.stationKind === 'counter' ? 'Manage' : 'Open',
        kind: item.stationKind === 'counter' ? 'shop_counter' : 'shop_storage',
      };
    }

    if (item.kind === 'story_object') {
      return {
        id: item.id,
        name: item.name,
        actionLabel: item.actionLabel,
        kind: 'story_object',
      };
    }

    if (item.kind === 'customer') {
      return {
        id: item.id,
        name: `${item.name} (${item.statusLabel})`,
        actionLabel: 'Greet',
        kind: 'customer',
      };
    }

    if (item.kind === 'survivor') {
      return {
        id: item.id,
        name: `${item.name} (Survivor)`,
        actionLabel: 'Talk / Recruit',
        kind: 'survivor',
      };
    }

    if (item.kind === 'employee') {
      return {
        id: item.id,
        name: `${item.name} (${item.professionLabel})`,
        actionLabel: 'Manage',
        kind: 'employee',
      };
    }

    return {
      id: item.id,
      name: item.name,
      actionLabel: !item.inspected
        ? 'Search'
        : item.isOpen
          ? 'Close (Empty)'
          : 'Searched (Empty)',
      kind: 'container',
    };
  }

  public getTotalItems(): number {
    return getTotalInventoryItems(this.inventory);
  }

  public dispose(): void {
    this.targetRing.geometry.dispose();
    (this.targetRing.material as THREE.Material).dispose();
    this.pulseRing.geometry.dispose();
    this.pulseMat.dispose();
  }

  private triggerPulse(x: number, y: number, z: number): void {
    this.pulseRing.position.set(x, y, z);
    this.pulseRing.scale.setScalar(1);
    this.pulseMat.opacity = 0.85;
    this.pulseRing.visible = true;
    this.pulseAge = 0;
  }

  public pushToast(
    text: string,
    tone: 'resource' | 'world' | 'warning',
    duration = 2.6
  ): void {
    this.latestToast = {
      id: this.nextToastId++,
      text,
      tone,
    };
    this.toastTimer = duration;
  }
}
