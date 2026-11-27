import * as THREE from 'three';
import { mergeCharacterParts } from '../assets/models/characterGeometryKit';
import {
  StaffCharacterRig,
  StaffSharedGeometries,
  animateStaffRig,
  buildProceduralStaffModel,
  createStaffSharedGeometries,
  updateStaffRigNameTag,
} from '../assets/models/staffModel';
import { getCustomerSurfaceHeight } from '../game/customerAI';
import {
  ActiveWorldEventInstance,
  WORLD_EVENT_BY_ID,
} from '../game/worldEvents';
import { getLanguage, getTranslations } from '../i18n';
import { WorldEventInteractTarget } from './InteractionManager';
import { WorldColliders } from './WorldBuilder';

export class WorldEventManager {
  private root = new THREE.Group();
  private sharedGeos: StaffSharedGeometries;

  // Pooled crate / distress beacon assembly
  private propGroup = new THREE.Group();
  private crateMesh: THREE.Mesh;
  private beaconRod: THREE.Mesh;
  private beaconTip: THREE.Mesh;
  private ringMesh: THREE.Mesh;
  private crateGeo: THREE.BoxGeometry;
  private crateLidGeo: THREE.BoxGeometry;
  private rodGeo: THREE.CylinderGeometry;
  private tipGeo: THREE.CylinderGeometry;
  private ringGeo: THREE.RingGeometry;
  private crateMat: THREE.MeshStandardMaterial;
  private rodMat: THREE.MeshStandardMaterial;
  private tipMat: THREE.MeshStandardMaterial;
  private ringMat: THREE.MeshBasicMaterial;

  // Pooled NPC rigs (reused cleanly via visibility toggle)
  private npcSurvivor: { group: THREE.Group; rig: StaffCharacterRig };
  private npcTrader: { group: THREE.Group; rig: StaffCharacterRig };

  // Pooled Shadow Silhouette Apparition (zero shadow cost, smoothly faded)
  private silhouetteGroup = new THREE.Group();
  private silhouetteGeo: THREE.BufferGeometry;
  private silhouetteMat: THREE.MeshBasicMaterial;
  private silhouetteOpacity = 0;
  private silhouetteGazeTimer = 0;
  private silhouetteDissolving = false;
  private silhouetteDissolveNotified = false;

  private currentInstanceId: string | null = null;
  private currentLang = getLanguage();
  private lastTaggedKey = '';
  private currentWorldEvent: ActiveWorldEventInstance | null = null;
  private groundedY = 0.16;

  constructor(scene: THREE.Scene) {
    scene.add(this.root);
    this.sharedGeos = createStaffSharedGeometries();

    // 1. Pooled Crate + Grounded Field Transceiver / Lantern Housing (zero floating arcade gems/rings)
    this.crateGeo = new THREE.BoxGeometry(0.76, 0.52, 0.58);
    this.crateLidGeo = new THREE.BoxGeometry(0.8, 0.09, 0.62);
    this.rodGeo = new THREE.CylinderGeometry(0.024, 0.032, 0.94, 8);
    this.tipGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.14, 10);
    this.ringGeo = new THREE.RingGeometry(0.55, 0.72, 16);
    this.ringGeo.rotateX(-Math.PI * 0.5);

    this.crateMat = new THREE.MeshStandardMaterial({
      color: 0x544030,
      roughness: 0.92,
      metalness: 0.08,
    });
    this.rodMat = new THREE.MeshStandardMaterial({
      color: 0x2f353d,
      roughness: 0.68,
      metalness: 0.55,
    });
    this.tipMat = new THREE.MeshStandardMaterial({
      color: 0x807257,
      emissive: 0x52452f,
      emissiveIntensity: 0.35,
      roughness: 0.38,
      metalness: 0.2,
    });
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x475569,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.crateMesh = new THREE.Mesh(this.crateGeo, this.crateMat);
    this.crateMesh.position.y = 0.26;
    this.crateMesh.castShadow = true;
    this.crateMesh.receiveShadow = true;

    const lid = new THREE.Mesh(this.crateLidGeo, this.rodMat);
    lid.position.y = 0.27;
    this.crateMesh.add(lid);

    this.beaconRod = new THREE.Mesh(this.rodGeo, this.rodMat);
    this.beaconRod.position.y = 0.47;
    this.beaconRod.castShadow = true;

    this.beaconTip = new THREE.Mesh(this.tipGeo, this.tipMat);
    this.beaconTip.position.y = 0.62;
    this.beaconTip.castShadow = true;

    this.ringMesh = new THREE.Mesh(this.ringGeo, this.ringMat);
    this.ringMesh.position.y = 0.035;
    this.ringMesh.visible = false;

    this.propGroup.add(this.crateMesh, this.beaconRod, this.beaconTip, this.ringMesh);
    this.propGroup.visible = false;
    this.root.add(this.propGroup);

    // 2. Pooled Event Survivor & Trader NPCs
    const t = getTranslations();
    this.npcSurvivor = buildProceduralStaffModel(this.sharedGeos, {
      variant: 3,
      kind: 'survivor',
      name: t.worldEvents.categories.survivor,
      subtitle: t.worldEvents.ui.respondBtn,
    });
    this.npcSurvivor.group.visible = false;
    this.root.add(this.npcSurvivor.group);

    this.npcTrader = buildProceduralStaffModel(this.sharedGeos, {
      variant: 0,
      kind: 'employee',
      profession: 'shopkeeper',
      name: t.worldEvents.categories.shop,
      subtitle: t.worldEvents.ui.respondBtn,
    });
    this.npcTrader.group.visible = false;
    this.root.add(this.npcTrader.group);

    // 3. Pooled Shadow Silhouette Apparition (single merged organic humanoid figure, no shadows)
    const silHead = this.sharedGeos.headHuman.clone();
    silHead.scale(0.95, 1.06, 0.95);
    silHead.translate(0, 1.50, 0);
    const silTorso = this.sharedGeos.torsoSlim.clone();
    silTorso.translate(0, 0.95, 0);
    const silPelvis = this.sharedGeos.pelvis.clone();
    silPelvis.translate(0, 0.91, 0);
    const silArmL = this.sharedGeos.upperArm.clone();
    silArmL.rotateZ(-0.08);
    silArmL.translate(-0.195, 1.41, 0);
    const silForeL = this.sharedGeos.forearm.clone();
    silForeL.rotateX(0.14);
    silForeL.translate(-0.217, 1.13, 0);
    const silArmR = this.sharedGeos.upperArm.clone();
    silArmR.rotateZ(0.08);
    silArmR.translate(0.195, 1.41, 0);
    const silForeR = this.sharedGeos.forearm.clone();
    silForeR.rotateX(0.14);
    silForeR.translate(0.217, 1.13, 0);
    const silThighL = this.sharedGeos.thigh.clone();
    silThighL.translate(-0.095, 0.91, 0);
    const silShinL = this.sharedGeos.shinBoot.clone();
    silShinL.translate(-0.095, 0.49, 0);
    const silThighR = this.sharedGeos.thigh.clone();
    silThighR.translate(0.095, 0.91, 0);
    const silShinR = this.sharedGeos.shinBoot.clone();
    silShinR.translate(0.095, 0.49, 0);
    this.silhouetteGeo = mergeCharacterParts(
      [
        silHead,
        silTorso,
        silPelvis,
        silArmL,
        silForeL,
        silArmR,
        silForeR,
        silThighL,
        silShinL,
        silThighR,
        silShinR,
      ],
      false
    );
    this.silhouetteMat = new THREE.MeshBasicMaterial({
      color: 0x05070c,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });

    const silMesh = new THREE.Mesh(this.silhouetteGeo, this.silhouetteMat);
    this.silhouetteGroup.add(silMesh);
    this.silhouetteGroup.visible = false;
    this.root.add(this.silhouetteGroup);
  }

  public sync(
    activeEvent: ActiveWorldEventInstance | null,
    colliders: WorldColliders,
    elapsedTime: number,
    playerX: number,
    playerZ: number,
    dt = 0.016,
    playerYaw = 0,
    onSilhouetteVanished?: () => void
  ): void {
    this.currentWorldEvent = activeEvent;
    if (!activeEvent) {
      this.propGroup.visible = false;
      this.npcSurvivor.group.visible = false;
      this.npcTrader.group.visible = false;
      this.silhouetteGroup.visible = false;
      this.silhouetteOpacity = 0;
      this.silhouetteGazeTimer = 0;
      this.silhouetteDissolving = false;
      this.silhouetteDissolveNotified = false;
      this.currentInstanceId = null;
      return;
    }

    const def = WORLD_EVENT_BY_ID[activeEvent.eventId];
    if (!def || def.visualKind === 'none') {
      this.propGroup.visible = false;
      this.npcSurvivor.group.visible = false;
      this.npcTrader.group.visible = false;
      this.silhouetteGroup.visible = false;
      return;
    }

    if (this.currentInstanceId !== activeEvent.instanceId) {
      this.currentInstanceId = activeEvent.instanceId;
      this.groundedY = getCustomerSurfaceHeight(activeEvent.x, activeEvent.z, colliders);
      this.silhouetteOpacity = 0;
      this.silhouetteGazeTimer = 0;
      this.silhouetteDissolving = false;
      this.silhouetteDissolveNotified = false;
    }

    const y = this.groundedY;
    const dist = Math.hypot(playerX - activeEvent.x, playerZ - activeEvent.z);

    if (def.visualKind === 'silhouette') {
      this.propGroup.visible = false;
      this.npcSurvivor.group.visible = false;
      this.npcTrader.group.visible = false;
      this.silhouetteGroup.visible = true;
      this.silhouetteGroup.position.set(activeEvent.x, y, activeEvent.z);
      const faceYaw = Math.atan2(playerX - activeEvent.x, playerZ - activeEvent.z);
      this.silhouetteGroup.rotation.y = faceYaw;

      // Check player gaze toward silhouette (-sin(yaw), -cos(yaw) is Three.js FPS forward vector)
      if (!this.silhouetteDissolving) {
        if (dist < 11.5) {
          this.silhouetteDissolving = true;
        } else if (dist < 32) {
          const dirX = (activeEvent.x - playerX) / dist;
          const dirZ = (activeEvent.z - playerZ) / dist;
          const fwdX = -Math.sin(playerYaw);
          const fwdZ = -Math.cos(playerYaw);
          const dot = dirX * fwdX + dirZ * fwdZ;
          if (dot > 0.92) {
            this.silhouetteGazeTimer += dt;
            if (this.silhouetteGazeTimer >= 0.85) {
              this.silhouetteDissolving = true;
            }
          } else {
            this.silhouetteGazeTimer = Math.max(0, this.silhouetteGazeTimer - dt * 0.5);
          }
        }
      }

      if (this.silhouetteDissolving) {
        this.silhouetteOpacity = Math.max(0, this.silhouetteOpacity - dt * 1.45);
        this.silhouetteMat.opacity = this.silhouetteOpacity;
        if (this.silhouetteOpacity <= 0.02 && !this.silhouetteDissolveNotified) {
          this.silhouetteDissolveNotified = true;
          this.silhouetteGroup.visible = false;
          onSilhouetteVanished?.();
        }
      } else {
        const pulse = 0.66 + 0.08 * Math.sin(elapsedTime * 1.6);
        this.silhouetteOpacity = Math.min(pulse, this.silhouetteOpacity + dt * 0.75);
        this.silhouetteMat.opacity = this.silhouetteOpacity;
      }
      return;
    }

    this.silhouetteGroup.visible = false;

    if (def.visualKind === 'crate' || def.visualKind === 'beacon') {
      this.npcSurvivor.group.visible = false;
      this.npcTrader.group.visible = false;
      this.propGroup.visible = true;
      this.propGroup.position.set(activeEvent.x, y, activeEvent.z);

      const isBeacon = def.visualKind === 'beacon';
      this.crateMesh.visible = !isBeacon;
      this.beaconRod.visible = isBeacon;
      this.beaconTip.visible = true;
      // Rest physically on top of the mast or crate lid (no spinning floating diamond)
      this.beaconTip.position.y = isBeacon ? 0.98 : 0.62;
      this.beaconTip.rotation.y = 0.25;
      this.tipMat.color.setHex(isBeacon ? 0x5c6b78 : 0x7a684b);
      this.tipMat.emissive.setHex(isBeacon ? 0x3b4d5e : 0x523f25);
      this.tipMat.emissiveIntensity = isBeacon
        ? 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(elapsedTime * 3.5))
        : 0.22;
      this.ringMesh.visible = false;
      return;
    }

    // NPC visual (survivor or wandering trader)
    this.propGroup.visible = false;
    const isTrader = def.visualKind === 'npc_trader';
    const activeNpc = isTrader ? this.npcTrader : this.npcSurvivor;
    const inactiveNpc = isTrader ? this.npcSurvivor : this.npcTrader;
    inactiveNpc.group.visible = false;
    activeNpc.group.visible = true;

    const yaw = Math.atan2(-(playerX - activeEvent.x), -(playerZ - activeEvent.z));
    activeNpc.group.position.set(activeEvent.x, y, activeEvent.z);
    activeNpc.group.rotation.y = yaw;

    const lang = getLanguage();
    const tagKey = `${activeEvent.instanceId}:${lang}`;
    if (this.lastTaggedKey !== tagKey) {
      this.lastTaggedKey = tagKey;
      this.currentLang = lang;
      const t = getTranslations();
      const title = t.worldEvents.events[def.id]?.title ?? def.id;
      const badge = t.worldEvents.categories[def.category];
      updateStaffRigNameTag(
        activeNpc.rig,
        title.length > 22 ? `${title.slice(0, 20)}…` : title,
        badge,
        isTrader ? '#9c8763' : '#8596a8'
      );
    }

    if (activeNpc.rig.labelSprite) {
      activeNpc.rig.labelSprite.visible = dist < 5.5;
    }

    animateStaffRig(activeNpc.rig, {
      status: isTrader ? 'working' : 'survivor',
      walkCycle: elapsedTime * 1.1,
      isMoving: false,
      dt,
    });
  }

  public refreshLocalization(): void {
    this.currentLang = getLanguage();
    this.lastTaggedKey = '';
  }

  public getInteractTargets(): WorldEventInteractTarget[] {
    if (!this.currentWorldEvent) return [];
    const def = WORLD_EVENT_BY_ID[this.currentWorldEvent.eventId];
    if (
      !def ||
      def.visualKind === 'none' ||
      def.visualKind === 'silhouette' ||
      def.choices.length === 0
    ) {
      return [];
    }
    const t = getTranslations();
    const title = t.worldEvents.events[def.id]?.title ?? def.id;
    return [
      {
        kind: 'world_event',
        id: this.currentWorldEvent.eventId,
        name: title,
        actionLabel: t.worldEvents.ui.respondBtn,
        x: this.currentWorldEvent.x,
        y: this.groundedY,
        z: this.currentWorldEvent.z,
      },
    ];
  }

  public dispose(): void {
    this.root.remove(this.propGroup);
    this.root.remove(this.npcSurvivor.group);
    this.root.remove(this.npcTrader.group);
    this.root.remove(this.silhouetteGroup);
    this.npcSurvivor.rig.dispose();
    this.npcTrader.rig.dispose();
    this.crateGeo.dispose();
    this.crateLidGeo.dispose();
    this.rodGeo.dispose();
    this.tipGeo.dispose();
    this.ringGeo.dispose();
    this.crateMat.dispose();
    this.rodMat.dispose();
    this.tipMat.dispose();
    this.ringMat.dispose();
    this.silhouetteGeo.dispose();
    this.silhouetteMat.dispose();
    this.sharedGeos.dispose();
  }
}
