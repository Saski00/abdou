import * as THREE from 'three';
import { SoundEngine } from '../assets/audio/soundEngine';
import {
  StaffCharacterRig,
  StaffSharedGeometries,
  animateStaffRig,
  buildProceduralStaffModel,
  createStaffSharedGeometries,
  updateStaffRigProfessionVisuals,
} from '../assets/models/staffModel';
import { ShopEconomySystem } from '../game/economy';
import {
  EmployeeAgent,
  PROFESSION_CONFIGS,
  StaffSystem,
  WorldSurvivorEntity,
} from '../game/staffSystem';
import { EmployeeProfession, InventoryState, StaffSnapshot } from '../game/types';
import { AssetManager } from './AssetManager';
import {
  EmployeeInteractTarget,
  InteractionManager,
  SurvivorInteractTarget,
} from './InteractionManager';
import { BuiltWorld, WorldDoorInteractable } from './WorldBuilder';
import { ZombieManager } from './ZombieManager';

interface SurvivorEntityView {
  entity: WorldSurvivorEntity;
  group: THREE.Group;
  rig: StaffCharacterRig | null;
}

interface EmployeeEntityView {
  agent: EmployeeAgent;
  group: THREE.Group;
  rig: StaffCharacterRig | null;
}

export class StaffManager {
  public readonly system = new StaffSystem();
  private root = new THREE.Group();
  private sharedGeos: StaffSharedGeometries;
  private survivorViews: SurvivorEntityView[] = [];
  private employeeViews: EmployeeEntityView[] = [];
  private frontDoor: WorldDoorInteractable | null = null;
  private backDoor: WorldDoorInteractable | null = null;

  constructor(
    scene: THREE.Scene,
    private assets: AssetManager,
    private world: BuiltWorld,
    private economy: ShopEconomySystem,
    private interactions: InteractionManager,
    private zombies: ZombieManager,
    private sound: SoundEngine
  ) {
    this.sharedGeos = createStaffSharedGeometries();
    scene.add(this.root);

    for (const item of world.interactables) {
      if (item.kind === 'door') {
        if (item.id === 'door_last_shop_front') this.frontDoor = item;
        if (item.id === 'door_last_shop_back') this.backDoor = item;
      }
    }

    this.reset();
  }

  private clearAllViews(): void {
    for (const v of this.survivorViews) {
      this.root.remove(v.group);
      v.rig?.dispose();
    }
    this.survivorViews = [];

    for (const v of this.employeeViews) {
      this.root.remove(v.group);
      v.rig?.dispose();
    }
    this.employeeViews = [];
  }

  public reset(): void {
    this.clearAllViews();
    this.system.reset(this.world.colliders);
    this.rebuildAllViewsFromSystem();
  }

  public syncAfterLoad(): void {
    this.clearAllViews();
    this.rebuildAllViewsFromSystem();
  }

  private rebuildAllViewsFromSystem(): void {
    for (const surv of this.system.worldSurvivors) {
      if (surv.recruited) continue;
      let rig: StaffCharacterRig | null = null;
      const group = this.assets.instantiateAsset(
        'npc.survivor',
        () => {
          const built = buildProceduralStaffModel(this.sharedGeos, {
            variant: surv.variant,
            kind: 'survivor',
            name: surv.name,
            subtitle: 'Survivor · Needs Help',
          });
          rig = built.rig;
          return built.group;
        },
        true,
        true
      );
      group.position.set(surv.x, surv.y, surv.z);
      group.rotation.y = surv.yaw;
      this.root.add(group);
      this.survivorViews.push({ entity: surv, group, rig });
    }

    for (const emp of this.system.employees) {
      this.spawnEmployeeView(emp);
    }
  }

  private spawnEmployeeView(agent: EmployeeAgent): void {
    const assetKey =
      agent.profession === 'shopkeeper'
        ? 'npc.employee_shopkeeper'
        : agent.profession === 'guard'
          ? 'npc.employee_guard'
          : agent.profession === 'storage_worker'
            ? 'npc.employee_storage'
            : 'npc.employee_collector';

    let rig: StaffCharacterRig | null = null;
    const profCfg = PROFESSION_CONFIGS[agent.profession];
    const group = this.assets.instantiateAsset(
      assetKey,
      () => {
        const built = buildProceduralStaffModel(this.sharedGeos, {
          variant: agent.variant,
          kind: 'employee',
          profession: agent.profession,
          name: agent.name,
          subtitle: profCfg.shortLabel,
        });
        rig = built.rig;
        return built.group;
      },
      true,
      true
    );
    group.position.set(agent.x, agent.y, agent.z);
    group.rotation.y = agent.yaw;
    this.root.add(group);
    this.employeeViews.push({ agent, group, rig });
  }

  public recruitSurvivor(
    survivorId: string,
    profession: EmployeeProfession,
    currentDay: number,
    timeLabel: string,
    inventory: InventoryState
  ): { ok: boolean; nextInventory: InventoryState; message: string } {
    const res = this.system.recruitSurvivor(
      survivorId,
      profession,
      currentDay,
      timeLabel,
      inventory,
      this.economy,
      this.world.colliders
    );
    if (!res.ok || !res.employee) {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.message, 'warning', 2.6);
      return { ok: false, nextInventory: res.nextInventory, message: res.message };
    }

    // Remove world survivor 3D view cleanly and spawn active employee 3D view
    const idx = this.survivorViews.findIndex((v) => v.entity.id === survivorId);
    if (idx !== -1) {
      const [removed] = this.survivorViews.splice(idx, 1);
      this.root.remove(removed.group);
      removed.rig?.dispose();
    }

    this.spawnEmployeeView(res.employee);
    this.sound.playCashRegister();
    this.interactions.pushToast(res.message, 'resource', 3.0);
    return { ok: true, nextInventory: res.nextInventory, message: res.message };
  }

  public setEmployeeProfession(
    employeeId: string,
    profession: EmployeeProfession,
    timeLabel: string
  ): boolean {
    const res = this.system.setEmployeeProfession(employeeId, profession, this.economy, timeLabel);
    if (!res.ok) {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.message, 'warning', 2.5);
      return false;
    }

    const view = this.employeeViews.find((v) => v.agent.id === employeeId);
    if (view?.rig) {
      updateStaffRigProfessionVisuals(view.rig, view.agent.name, profession);
    }
    this.sound.playUiClick(560);
    this.interactions.pushToast(res.message, 'world', 2.6);
    return true;
  }

  public dismissEmployee(employeeId: string, timeLabel: string): boolean {
    const res = this.system.dismissEmployee(employeeId, this.economy, timeLabel);
    if (!res.ok) {
      this.sound.playUiClick(360);
      return false;
    }

    const idx = this.employeeViews.findIndex((v) => v.agent.id === employeeId);
    if (idx !== -1) {
      const [removed] = this.employeeViews.splice(idx, 1);
      this.root.remove(removed.group);
      removed.rig?.dispose();
    }

    this.sound.playUiClick(440);
    this.interactions.pushToast(res.message, 'world', 2.6);
    return true;
  }

  public payUnpaidWagesNow(timeLabel: string): void {
    const res = this.system.payUnpaidSalariesNow(this.economy, timeLabel);
    if (res.paidCount > 0) {
      this.sound.playCashRegister();
      this.interactions.pushToast(res.message, res.remainingUnpaid > 0 ? 'warning' : 'resource', 2.8);
    } else {
      this.sound.playUiClick(360);
      this.interactions.pushToast(res.message, res.remainingUnpaid > 0 ? 'warning' : 'world', 2.6);
    }
  }

  public update(
    dt: number,
    timeLabel: string,
    playerX: number,
    playerZ: number
  ): { killedSurgeIds: string[]; stockChanged: boolean; storageChanged: boolean } {
    const frontDoorOpen = this.frontDoor ? this.frontDoor.isOpen : true;
    const backDoorOpen = this.backDoor ? this.backDoor.isOpen : true;

    const stepRes = this.system.step({
      dt,
      timeLabel,
      playerX,
      playerZ,
      frontDoorOpen,
      backDoorOpen,
      zombies: this.zombies.getAgents(),
      economy: this.economy,
      colliders: this.world.colliders,
    });

    if (stepRes.requestOpenFrontDoor && this.frontDoor && !this.frontDoor.isOpen) {
      this.frontDoor.isOpen = true;
      this.frontDoor.collider.active = false;
      this.sound.playDoorToggle(true);
    }
    if (stepRes.requestOpenBackDoor && this.backDoor && !this.backDoor.isOpen) {
      this.backDoor.isOpen = true;
      this.backDoor.collider.active = false;
      this.sound.playDoorToggle(true);
    }

    if (stepRes.stockChanged) {
      this.world.syncShopDisplayStock(this.economy.getShopStock(), this.economy.getShopLevel());
    }

    if (stepRes.zombiesKilledByGuards > 0) {
      this.zombies.zombiesDefeated += stepRes.zombiesKilledByGuards;
      this.sound.playZombieDeath();
    }

    const distToShop = Math.hypot(playerX - -15.5, playerZ - -10.5);
    if (distToShop < 34) {
      if (stepRes.guardSwingCount > 0) {
        this.sound.playMeleeSwing();
      }
      if (stepRes.guardHitCount > 0) {
        this.sound.playMeleeHit();
      }
    }

    for (const notice of stepRes.toastNotices) {
      this.interactions.pushToast(notice.text, notice.tone, 2.8);
    }

    // Update world survivor views
    for (const v of this.survivorViews) {
      const s = v.entity;
      if (s.recruited) {
        v.group.visible = false;
        continue;
      }
      const dist = Math.hypot(playerX - s.x, playerZ - s.z);
      if (dist < 4.5) {
        const targetYaw = Math.atan2(-(playerX - s.x), -(playerZ - s.z));
        s.yaw = THREE.MathUtils.lerp(s.yaw, targetYaw, Math.min(1, dt * 3.5));
      }
      v.group.position.set(s.x, s.y, s.z);
      v.group.rotation.y = s.yaw;
      if (v.rig) {
        if (v.rig.labelSprite) {
          v.rig.labelSprite.visible = dist < 13.5;
        }
        animateStaffRig(v.rig, {
          status: 'survivor',
          walkCycle: s.animPhase,
          isMoving: false,
        });
      }
    }

    // Update hired employee views
    for (const v of this.employeeViews) {
      const a = v.agent;
      v.group.position.set(a.x, a.y, a.z);
      v.group.rotation.y = a.yaw;
      if (v.rig) {
        if (v.rig.labelSprite) {
          const dist = Math.hypot(playerX - a.x, playerZ - a.z);
          v.rig.labelSprite.visible = dist < 15.0;
        }
        const isMoving = Math.hypot(a.vx, a.vz) > 0.12;
        animateStaffRig(v.rig, {
          status: a.status,
          walkCycle: a.walkCycle,
          isMoving,
          swingTimer: a.swingTimer,
          hitFlashTimer: a.hitFlashTimer,
        });
      }
    }
    return {
      killedSurgeIds: stepRes.killedSurgeIds,
      stockChanged: stepRes.stockChanged,
      storageChanged: stepRes.storageChanged,
    };
  }

  public getSurvivorInteractTargets(): SurvivorInteractTarget[] {
    const list: SurvivorInteractTarget[] = [];
    for (const s of this.system.worldSurvivors) {
      if (s.recruited) continue;
      list.push({
        kind: 'survivor',
        id: s.id,
        name: s.name,
        x: s.x,
        y: s.y,
        z: s.z,
      });
    }
    return list;
  }

  public getEmployeeInteractTargets(): EmployeeInteractTarget[] {
    const list: EmployeeInteractTarget[] = [];
    for (const e of this.system.employees) {
      list.push({
        kind: 'employee',
        id: e.id,
        name: e.name,
        professionLabel: PROFESSION_CONFIGS[e.profession].label,
        statusLabel: e.statusLabel,
        x: e.x,
        y: e.y,
        z: e.z,
      });
    }
    return list;
  }

  public getSnapshot(
    completedMissionIds: ReadonlySet<string> = new Set(),
    endingCompleted = false
  ): StaffSnapshot {
    return this.system.getSnapshot(
      this.economy.getEmployeeCapacity(),
      completedMissionIds,
      endingCompleted
    );
  }

  public dispose(): void {
    this.clearAllViews();
    this.sharedGeos.dispose();
  }
}
