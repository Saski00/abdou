import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  addInventoryResourceCapped,
  createInitialInventory,
  formatResourceCollectedLabel,
  getTotalInventoryItems,
} from '../game/resources';
import { SavedWorldInteractablesState } from '../game/saveSystem';
import { FeedbackToast, InteractionPrompt, InventoryState, ResourceId } from '../game/types';
import {
  formatTpl,
  getTranslations,
  tContainerName,
  tDoorName,
  tExamineProp,
  tFurniture,
  tKeyName,
  tLockedHint,
  tResource,
  tResourceName,
  tSearchProp,
  tShopStationName,
  tStoryObject,
  tVehicle,
  tWorkbenchName,
} from '../i18n';
import {
  WorldContainerInteractable,
  WorldDoorInteractable,
  WorldInteractable,
} from './WorldBuilder';

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

export interface WorldEventInteractTarget {
  kind: 'world_event';
  id: string;
  name: string;
  actionLabel: string;
  x: number;
  y: number;
  z: number;
}

export type ActiveInteractTarget =
  | WorldInteractable
  | CustomerInteractTarget
  | SurvivorInteractTarget
  | EmployeeInteractTarget
  | WorldEventInteractTarget;

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
  private worldEventTargetsProvider: (() => WorldEventInteractTarget[]) | null = null;
  private onWorldEventInteract: ((eventId: string) => void) | null = null;
  private onResourceCollected: ((resourceId: ResourceId, amount: number) => void) | null = null;
  private onContainerSearched: ((containerId: string) => void) | null = null;
  private onDoorOpened: ((doorId: string) => void) | null = null;
  private onStoryObjectInteract: ((objectId: string) => void) | null = null;
  private onWorkbenchOpened: ((workbenchName: string) => void) | null = null;
  private onExamineNote: ((title: string, message: string) => void) | null = null;
  private onBedRestToggle: (() => void) | null = null;
  private isRestingProvider: () => boolean = () => false;
  private packCapacityProvider: () => number = () => 16;
  private collectedKeyIds = new Set<string>();
  private unlockedDoorIds = new Set<string>();
  private unlockedContainerIds = new Set<string>();
  private animatingSet = new Set<WorldDoorInteractable | WorldContainerInteractable>();

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

  public setWorldEventInteractionProvider(
    provider: () => WorldEventInteractTarget[],
    onInteract: (eventId: string) => void
  ): void {
    this.worldEventTargetsProvider = provider;
    this.onWorldEventInteract = onInteract;
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

  public setEnvironmentCallbacks(callbacks: {
    onWorkbenchOpened: (workbenchName: string) => void;
    onExamineNote: (title: string, message: string) => void;
    onBedRestToggle: () => void;
    isRestingProvider: () => boolean;
  }): void {
    this.onWorkbenchOpened = callbacks.onWorkbenchOpened;
    this.onExamineNote = callbacks.onExamineNote;
    this.onBedRestToggle = callbacks.onBedRestToggle;
    this.isRestingProvider = callbacks.isRestingProvider;
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

  public getSearchedPropIds(): string[] {
    return this.interactables
      .filter((item) => item.kind === 'searchable_prop' && item.searched)
      .map((item) => item.id);
  }

  public getCollectedKeyIds(): string[] {
    return Array.from(this.collectedKeyIds).sort();
  }

  public getUnlockedDoorIds(): string[] {
    return Array.from(this.unlockedDoorIds).sort();
  }

  public getUnlockedContainerIds(): string[] {
    return Array.from(this.unlockedContainerIds).sort();
  }

  public exportWorldState(): SavedWorldInteractablesState {
    return {
      collectedResourceIds: this.interactables
        .filter((i) => i.kind === 'resource' && i.collected)
        .map((i) => i.id),
      openDoorIds: this.getOpenDoorIds(),
      searchedContainerIds: this.getSearchedContainerIds(),
      collectedKeyIds: this.getCollectedKeyIds(),
      unlockedDoorIds: this.getUnlockedDoorIds(),
      unlockedContainerIds: this.getUnlockedContainerIds(),
      searchedExtraIds: this.interactables
        .filter((i) => (i.kind === 'vehicle' || i.kind === 'searchable_prop') && i.searched)
        .map((i) => i.id),
      examinedObjectIds: this.interactables
        .filter((i) => i.kind === 'examine' && i.examined)
        .map((i) => i.id),
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

    const legacyRaw = worldState as Partial<SavedWorldInteractablesState> & {
      openedContainerIds?: string[];
    };
    const collectedSet = new Set(worldState.collectedResourceIds ?? []);
    const openDoors = new Set(worldState.openDoorIds ?? []);
    const searchedContainers = new Set(
      worldState.searchedContainerIds ?? legacyRaw.openedContainerIds ?? []
    );
    const collectedKeys = new Set(worldState.collectedKeyIds ?? []);
    const unlockedDoors = new Set(worldState.unlockedDoorIds ?? []);
    const unlockedContainers = new Set(worldState.unlockedContainerIds ?? []);
    const searchedExtras = new Set(worldState.searchedExtraIds ?? []);
    const examinedIds = new Set(worldState.examinedObjectIds ?? []);

    this.collectedKeyIds = new Set(collectedKeys);
    this.unlockedDoorIds = new Set(unlockedDoors);
    this.unlockedContainerIds = new Set(unlockedContainers);

    for (const item of this.interactables) {
      if (item.kind === 'resource' && collectedSet.has(item.id)) {
        item.collected = true;
        item.group.visible = false;
      } else if (item.kind === 'key' && collectedKeys.has(item.id)) {
        item.collected = true;
        item.group.visible = false;
      } else if (item.kind === 'door') {
        if (unlockedDoors.has(item.id)) {
          item.unlocked = true;
        }
        if (openDoors.has(item.id)) {
          item.isOpen = true;
          item.unlocked = true;
          this.unlockedDoorIds.add(item.id);
          item.collider.active = false;
          item.pivot.rotation.y = item.openSwingAngle;
        }
      } else if (item.kind === 'container') {
        if (unlockedContainers.has(item.id)) {
          item.unlocked = true;
        }
        if (searchedContainers.has(item.id)) {
          item.unlocked = true;
          this.unlockedContainerIds.add(item.id);
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
      } else if (
        (item.kind === 'vehicle' || item.kind === 'searchable_prop') &&
        searchedExtras.has(item.id)
      ) {
        item.searched = true;
        item.lootTaken = true;
      } else if (item.kind === 'examine' && examinedIds.has(item.id)) {
        item.examined = true;
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
    this.collectedKeyIds.clear();
    this.unlockedDoorIds.clear();
    this.unlockedContainerIds.clear();
    this.animatingSet.clear();

    for (const item of this.interactables) {
      if (item.kind === 'resource') {
        item.collected = false;
        item.amount = item.defaultAmount;
        item.group.visible = true;
      } else if (item.kind === 'key') {
        item.collected = false;
        item.group.visible = true;
      } else if (item.kind === 'door') {
        item.isOpen = false;
        item.unlocked = !item.lockedKeyId;
        item.collider.active = true;
        item.pivot.rotation.y = 0;
      } else if (item.kind === 'container') {
        item.isOpen = false;
        item.inspected = false;
        item.lootTaken = false;
        item.unlocked = !item.requiresToolResource;
        item.loot = item.defaultLoot ? { ...item.defaultLoot } : undefined;
        if (item.lidPivot) {
          if (item.animKind === 'drawer') {
            item.lidPivot.position.z = 0.22;
          } else if (item.animKind === 'door') {
            item.lidPivot.rotation.y = 0;
          } else {
            item.lidPivot.rotation.x = 0;
          }
        }
      } else if (item.kind === 'vehicle' || item.kind === 'searchable_prop') {
        item.searched = false;
        item.lootTaken = false;
        item.loot = item.defaultLoot ? { ...item.defaultLoot } : undefined;
      } else if (item.kind === 'examine') {
        item.examined = false;
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

    // 2. Smoothly animate only active doors & container lids (zero idle loop cost)
    for (const item of this.animatingSet) {
      if (item.kind === 'door') {
        const targetAngle = item.isOpen ? item.openSwingAngle : 0;
        if (Math.abs(item.pivot.rotation.y - targetAngle) > 0.002) {
          item.pivot.rotation.y = THREE.MathUtils.damp(
            item.pivot.rotation.y,
            targetAngle,
            12,
            dt
          );
        } else {
          item.pivot.rotation.y = targetAngle;
          this.animatingSet.delete(item);
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
          } else {
            item.lidPivot.position.z = targetZ;
            this.animatingSet.delete(item);
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
          } else {
            item.lidPivot.rotation.y = targetY;
            this.animatingSet.delete(item);
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
          } else {
            item.lidPivot.rotation.x = targetLid;
            this.animatingSet.delete(item);
          }
        }
      } else {
        this.animatingSet.delete(item);
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

    // 4. Find closest valid interactable in front of player (AABB pre-filter avoids distance math for far items)
    const fwdX = -Math.sin(yaw);
    const fwdZ = -Math.cos(yaw);

    let bestItem: ActiveInteractTarget | null = null;
    let bestScore = Infinity;

    for (const item of this.interactables) {
      if (item.kind === 'resource' && item.collected) continue;
      if (item.kind === 'key' && item.collected) continue;

      const radiusOffset =
        item.kind === 'vehicle' ||
        item.kind === 'searchable_prop' ||
        item.kind === 'workbench' ||
        item.kind === 'examine' ||
        item.kind === 'bed'
          ? item.interactRadiusOffset
          : 0;
      const maxReach = item.kind === 'door' ? INTERACT_RANGE + 1.6 : INTERACT_RANGE + radiusOffset;

      const dx = item.x - playerX;
      const dz = item.z - playerZ;
      if (Math.abs(dx) > maxReach || Math.abs(dz) > maxReach) continue;

      const rawDist =
        item.kind === 'door'
          ? distanceToSegment2D(playerX, playerZ, item.x1, item.z1, item.x2, item.z2)
          : Math.hypot(dx, dz);
      const dist = Math.max(0, rawDist - radiusOffset);

      if (dist > INTERACT_RANGE) continue;

      const len = Math.hypot(dx, dz) || 1;
      const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

      const minDot = item.kind === 'vehicle' ? 0.08 : 0.2;
      if (dist > CLOSE_PROXIMITY_OVERRIDE && dot < minDot) continue;

      // Prioritize loose tabletop pickups/keys & story objects cleanly over underlying benches or furniture
      const priorityBias =
        item.kind === 'resource' || item.kind === 'key'
          ? -1.05
          : item.kind === 'story_object'
            ? -0.35
            : item.kind === 'examine'
              ? 0.3
              : item.kind === 'vehicle' || item.kind === 'workbench'
                ? 0.18
                : 0;

      const score = dist - Math.max(0, dot) * 0.9 + priorityBias;
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

    if (this.worldEventTargetsProvider) {
      const events = this.worldEventTargetsProvider();
      for (const ev of events) {
        const dist = Math.hypot(ev.x - playerX, ev.z - playerZ);
        if (dist > INTERACT_RANGE + 0.45) continue;

        const dx = ev.x - playerX;
        const dz = ev.z - playerZ;
        const len = Math.hypot(dx, dz) || 1;
        const dot = (dx / len) * fwdX + (dz / len) * fwdZ;

        if (dist > CLOSE_PROXIMITY_OVERRIDE + 0.35 && dot < 0.16) continue;

        const score = dist - Math.max(0, dot) * 0.9 - 0.25;
        if (score < bestScore) {
          bestScore = score;
          bestItem = ev;
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
          : bestItem.kind === 'vehicle'
            ? 1.7
            : bestItem.kind === 'bed'
              ? 1.45
              : bestItem.kind === 'workbench'
                ? 1.35
                : bestItem.kind === 'searchable_prop'
                  ? 1.25
                  : bestItem.kind === 'examine'
                    ? 1.15
                    : bestItem.kind === 'container'
                      ? 1.4
                      : bestItem.kind === 'customer' ||
                          bestItem.kind === 'survivor' ||
                          bestItem.kind === 'employee' ||
                          bestItem.kind === 'world_event'
                        ? 1.35
                        : bestItem.kind === 'shop_station'
                          ? bestItem.stationKind === 'counter'
                            ? 1.15
                            : 1.45
                          : bestItem.kind === 'story_object'
                            ? 1.25
                            : bestItem.kind === 'key'
                              ? 0.85
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
    const t = getTranslations();

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
          formatTpl(t.gameMessages.toasts.packFull, {
            used: this.getTotalItems(),
            cap,
          }),
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
          formatTpl(t.gameMessages.toasts.packFullOverflowHere, {
            label: formatResourceCollectedLabel(item.resourceId, addRes.added),
            rem: addRes.overflow,
          }),
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

    if (item.kind === 'key') {
      if (item.collected) return false;
      item.collected = true;
      item.group.visible = false;
      this.collectedKeyIds.add(item.id);
      this.sound.playPickup();
      this.triggerPulse(item.x, item.y + 0.04, item.z);
      this.pushToast(
        formatTpl(t.gameMessages.toasts.pickedUpKey, {
          key: tKeyName(item.id, item.name),
        }),
        'resource',
        3.0
      );
      this.targeted = null;
      this.targetRing.visible = false;
      return true;
    }

    if (item.kind === 'door') {
      const doorName = tDoorName(item.id, item.name);
      if (!item.isOpen && item.lockedKeyId && !item.unlocked) {
        if (this.collectedKeyIds.has(item.lockedKeyId)) {
          item.unlocked = true;
          this.unlockedDoorIds.add(item.id);
          item.isOpen = true;
          item.collider.active = false;
          this.animatingSet.add(item);
          this.sound.playDoorToggle(true);
          this.pushToast(
            formatTpl(t.gameMessages.toasts.unlockedSimple, { door: doorName }),
            'resource',
            2.8
          );
          this.onDoorOpened?.(item.id);
          return true;
        }
        this.sound.playUiClick(240);
        const hint = tLockedHint(item.lockedKeyId, item.lockedHint ?? item.lockedKeyId);
        this.pushToast(
          formatTpl(t.gameMessages.toasts.lockedRequiresDash, { hint }),
          'warning',
          3.2
        );
        return false;
      }

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
          this.pushToast(
            formatTpl(t.gameMessages.toasts.doorStepClear, { door: doorName }),
            'world'
          );
          return false;
        }
      }
      item.isOpen = !item.isOpen;
      item.collider.active = !item.isOpen;
      this.animatingSet.add(item);
      this.sound.playDoorToggle(item.isOpen);
      this.pushToast(
        formatTpl(
          item.isOpen ? t.gameMessages.toasts.doorOpened : t.gameMessages.toasts.doorClosed,
          { door: doorName }
        ),
        'world'
      );
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

    if (item.kind === 'workbench') {
      this.sound.playUiClick(560);
      this.onWorkbenchOpened?.(tWorkbenchName(item.id, item.name));
      return true;
    }

    if (item.kind === 'bed') {
      this.sound.playUiClick(480);
      this.onBedRestToggle?.();
      return true;
    }

    if (item.kind === 'examine') {
      item.examined = true;
      this.sound.playUiClick(500);
      const ex = tExamineProp(item.id) ?? tFurniture(item.id);
      this.onExamineNote?.(ex?.noteTitle ?? item.noteTitle, ex?.noteText ?? item.noteText);
      return true;
    }

    if (item.kind === 'vehicle' || item.kind === 'searchable_prop') {
      const vLoc = item.kind === 'vehicle' ? tVehicle(item.id) : null;
      const spLoc = item.kind === 'searchable_prop' ? tSearchProp(item.id) : null;
      const itemName = vLoc?.name ?? spLoc?.name ?? item.name;
      const initialNote = vLoc?.lootMessage ?? spLoc?.initialNote ?? item.initialNote;
      const inspectedNote =
        vLoc?.alreadySearchedMessage ?? spLoc?.inspectedNote ?? item.inspectedNote;

      if (!item.searched && item.loot && !item.lootTaken) {
        const cap = this.packCapacityProvider();
        const addRes = addInventoryResourceCapped(
          this.inventory,
          item.loot.resourceId,
          item.loot.amount,
          cap
        );
        if (addRes.added <= 0) {
          this.sound.playUiClick(340);
          this.pushToast(
            formatTpl(t.gameMessages.toasts.itemPackFull, {
              name: itemName,
              used: this.getTotalItems(),
              cap,
            }),
            'warning',
            3.0
          );
          return false;
        }

        this.inventory = addRes.nextInventory;
        this.sound.playContainerOpen();
        this.triggerPulse(item.x, item.y + 0.45, item.z);
        this.onResourceCollected?.(item.loot.resourceId, addRes.added);

        if (addRes.overflow > 0) {
          item.loot.amount = addRes.overflow;
          this.pushToast(
            formatTpl(t.gameMessages.toasts.itemPackFullPartial, {
              name: itemName,
              label: formatResourceCollectedLabel(item.loot.resourceId, addRes.added),
              rem: addRes.overflow,
            }),
            'warning',
            3.0
          );
        } else {
          item.searched = true;
          item.lootTaken = true;
          this.pushToast(
            formatTpl(t.gameMessages.toasts.itemCollectedLabel, {
              name: itemName,
              pry: '',
              label: formatResourceCollectedLabel(item.loot.resourceId, addRes.added),
            }),
            'resource'
          );
          this.onExamineNote?.(itemName, initialNote);
          if (item.kind === 'searchable_prop') {
            this.onContainerSearched?.(item.id);
          }
        }
        return true;
      }

      this.sound.playUiClick(460);
      if (!item.searched) {
        item.searched = true;
        item.lootTaken = true;
        this.onExamineNote?.(itemName, initialNote);
        this.pushToast(formatTpl(t.gameMessages.toasts.itemEmpty, { name: itemName }), 'world');
        if (item.kind === 'searchable_prop') {
          this.onContainerSearched?.(item.id);
        }
      } else {
        this.onExamineNote?.(itemName, inspectedNote);
        this.pushToast(
          formatTpl(t.gameMessages.toasts.itemAlreadySearched, { name: itemName }),
          'world'
        );
      }
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

    if (item.kind === 'world_event') {
      this.sound.playUiClick(620);
      this.onWorldEventInteract?.(item.id);
      return true;
    }

    // Container (with optional tool-pry requirement)
    const cName = tContainerName(item.id, item.name);
    let priedJustNow = false;
    if (item.requiresToolResource && !item.unlocked) {
      const hasTool = (this.inventory[item.requiresToolResource] ?? 0) > 0;
      if (!hasTool) {
        this.sound.playUiClick(240);
        const hint = tLockedHint(
          item.requiresToolResource,
          item.lockedToolHint ?? tResource(item.requiresToolResource).name
        );
        this.pushToast(
          formatTpl(t.gameMessages.toasts.lockedRequiresDash, { hint }),
          'warning',
          3.0
        );
        return false;
      }
      item.unlocked = true;
      this.unlockedContainerIds.add(item.id);
      priedJustNow = true;
    }

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
        this.animatingSet.add(item);
        this.pushToast(
          formatTpl(t.gameMessages.toasts.itemPackFullStock, {
            name: cName,
            used: this.getTotalItems(),
            cap,
          }),
          'warning',
          3.0
        );
        return true;
      }

      this.inventory = addRes.nextInventory;
      item.isOpen = true;
      this.animatingSet.add(item);
      this.triggerPulse(item.x, item.y + 0.45, item.z);
      this.onResourceCollected?.(item.loot.resourceId, addRes.added);

      const pryPrefix = priedJustNow ? t.gameMessages.toasts.pryPrefix : '';
      if (addRes.overflow > 0) {
        item.loot.amount = addRes.overflow;
        this.pushToast(
          formatTpl(t.gameMessages.toasts.itemContainerPartial, {
            name: cName,
            pry: pryPrefix,
            label: formatResourceCollectedLabel(item.loot.resourceId, addRes.added),
            rem: addRes.overflow,
          }),
          'warning',
          3.0
        );
      } else {
        item.inspected = true;
        item.lootTaken = true;
        this.pushToast(
          formatTpl(t.gameMessages.toasts.itemCollectedLabel, {
            name: cName,
            pry: pryPrefix,
            label: formatResourceCollectedLabel(item.loot.resourceId, addRes.added),
          }),
          'resource'
        );
      }
      this.onContainerSearched?.(item.id);
      return true;
    }

    item.inspected = true;
    item.isOpen = !item.isOpen;
    this.animatingSet.add(item);
    this.pushToast(
      formatTpl(
        item.isOpen ? t.gameMessages.toasts.itemEmpty : t.gameMessages.toasts.itemClosed,
        { name: cName }
      ),
      'world'
    );
    this.onContainerSearched?.(item.id);

    return true;
  }

  public getPrompt(): InteractionPrompt | null {
    const item = this.targeted;
    if (!item) return null;
    const t = getTranslations();

    if (item.kind === 'resource') {
      const unitName = tResourceName(item.resourceId, item.amount);
      const countText = item.amount > 1 ? `${item.amount} ${unitName}` : unitName;
      return {
        id: item.id,
        name: countText,
        actionLabel: t.gameMessages.actions.collect,
        kind: 'resource',
        amount: item.amount,
      };
    }

    if (item.kind === 'key') {
      return {
        id: item.id,
        name: tKeyName(item.id, item.name),
        actionLabel: t.gameMessages.actions.pickUp,
        kind: 'key',
      };
    }

    if (item.kind === 'door') {
      const doorName = tDoorName(item.id, item.name);
      if (!item.isOpen && item.lockedKeyId && !item.unlocked) {
        const hasKey = this.collectedKeyIds.has(item.lockedKeyId);
        return {
          id: item.id,
          name: hasKey
            ? doorName
            : formatTpl(t.gameMessages.prompts.lockedSuffix, { name: doorName }),
          actionLabel: hasKey ? t.gameMessages.actions.unlock : t.gameMessages.actions.checkLock,
          kind: 'door',
        };
      }
      return {
        id: item.id,
        name: doorName,
        actionLabel: item.isOpen ? t.gameMessages.actions.close : t.gameMessages.actions.open,
        kind: 'door',
      };
    }

    if (item.kind === 'shop_station') {
      return {
        id: item.id,
        name: tShopStationName(item.id, item.name),
        actionLabel:
          item.stationKind === 'counter'
            ? t.gameMessages.actions.manage
            : t.gameMessages.actions.open,
        kind: item.stationKind === 'counter' ? 'shop_counter' : 'shop_storage',
      };
    }

    if (item.kind === 'workbench') {
      return {
        id: item.id,
        name: tWorkbenchName(item.id, item.name),
        actionLabel: t.gameMessages.actions.use,
        kind: 'workbench',
      };
    }

    if (item.kind === 'bed') {
      return {
        id: item.id,
        name: tFurniture(item.id)?.name ?? item.name,
        actionLabel: this.isRestingProvider()
          ? t.gameMessages.actions.standUpFrom
          : t.gameMessages.actions.restOn,
        kind: 'bed',
      };
    }

    if (item.kind === 'examine') {
      const ex = tExamineProp(item.id) ?? tFurniture(item.id);
      return {
        id: item.id,
        name: ex?.name ?? item.name,
        actionLabel: ex?.actionLabel ?? item.actionLabel,
        kind: 'examine',
      };
    }

    if (item.kind === 'vehicle') {
      const v = tVehicle(item.id);
      const partialRemaining =
        !item.searched &&
        Boolean(item.loot && item.defaultLoot && item.loot.amount < item.defaultLoot.amount);
      return {
        id: item.id,
        name: v?.name ?? item.name,
        actionLabel: item.searched
          ? t.gameMessages.actions.examine
          : partialRemaining
            ? t.gameMessages.actions.lootRemaining
            : t.gameMessages.actions.search,
        kind: 'vehicle',
      };
    }

    if (item.kind === 'searchable_prop') {
      const sp = tSearchProp(item.id);
      const partialRemaining =
        !item.searched &&
        Boolean(item.loot && item.defaultLoot && item.loot.amount < item.defaultLoot.amount);
      return {
        id: item.id,
        name: sp?.name ?? item.name,
        actionLabel: item.searched
          ? sp?.emptyAction ?? item.emptyAction
          : partialRemaining
            ? t.gameMessages.actions.lootRemaining
            : sp?.searchAction ?? item.searchAction,
        kind: 'container',
      };
    }

    if (item.kind === 'story_object') {
      const so = tStoryObject(item.id);
      return {
        id: item.id,
        name: so?.name ?? item.name,
        actionLabel: so?.actionLabel ?? item.actionLabel,
        kind: 'story_object',
      };
    }

    if (item.kind === 'customer') {
      return {
        id: item.id,
        name: formatTpl(t.gameMessages.prompts.customerRoleTag, {
          name: item.name,
          status: item.statusLabel,
        }),
        actionLabel: t.gameMessages.actions.serve,
        kind: 'customer',
      };
    }

    if (item.kind === 'survivor') {
      return {
        id: item.id,
        name: formatTpl(t.gameMessages.prompts.survivorRoleTag, { name: item.name }),
        actionLabel: t.gameMessages.actions.talkTo,
        kind: 'survivor',
      };
    }

    if (item.kind === 'employee') {
      return {
        id: item.id,
        name: formatTpl(t.gameMessages.prompts.employeeRoleTag, {
          name: item.name,
          role: item.professionLabel,
        }),
        actionLabel: t.gameMessages.actions.manage,
        kind: 'employee',
      };
    }

    if (item.kind === 'world_event') {
      return {
        id: item.id,
        name: item.name,
        actionLabel: item.actionLabel,
        kind: 'world_event',
      };
    }

    const cName = tContainerName(item.id, item.name);
    if (item.requiresToolResource && !item.unlocked) {
      const hasTool = (this.inventory[item.requiresToolResource] ?? 0) > 0;
      const reqName = tResource(item.requiresToolResource).name;
      return {
        id: item.id,
        name: hasTool
          ? cName
          : formatTpl(t.gameMessages.prompts.needsToolSuffix, { name: cName, tool: reqName }),
        actionLabel: hasTool ? t.gameMessages.actions.pryOpen : t.gameMessages.actions.checkLock,
        kind: 'container',
      };
    }

    if (!item.inspected && !item.lootTaken) {
      const partialRemaining = Boolean(
        item.loot && item.defaultLoot && item.loot.amount < item.defaultLoot.amount
      );
      return {
        id: item.id,
        name: cName,
        actionLabel: partialRemaining
          ? t.gameMessages.actions.lootRemaining
          : t.gameMessages.actions.search,
        kind: 'container',
      };
    }

    return {
      id: item.id,
      name: formatTpl(t.gameMessages.prompts.emptySuffix, { name: cName }),
      actionLabel: item.isOpen ? t.gameMessages.actions.close : t.gameMessages.actions.open,
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
