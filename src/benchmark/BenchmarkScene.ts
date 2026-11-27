import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  buildProceduralStaffModel,
  createStaffSharedGeometries,
  StaffCharacterRig,
  StaffSharedGeometries,
} from '../assets/models/staffModel';
import {
  buildProceduralZombieModel,
  createZombieSharedGeometries,
  ZombieRig,
  ZombieSharedGeometries,
} from '../assets/models/zombieModel';
import {
  BenchmarkCharacterInstance,
  buildBenchmarkHuman,
  buildBenchmarkMaterialPlinth,
  buildBenchmarkZombie,
  MaterialCalibrationStage,
} from './benchmarkModels';
import { BenchmarkTextureBundle, createBenchmarkTextureBundle } from './benchmarkTextures';

export type BenchmarkLightingMode = 'neutral' | 'horror';
export type BenchmarkCameraPreset =
  | 'turnaround'
  | 'closeup_face'
  | 'closeup_body'
  | 'gameplay';
export type BenchmarkQualityMode = 'desktop' | 'mobile';
export type BenchmarkSubjectMode =
  | 'both'
  | 'human'
  | 'zombie'
  | 'materials'
  | 'compare_ingame';

export interface BenchmarkState {
  lighting: BenchmarkLightingMode;
  camera: BenchmarkCameraPreset;
  quality: BenchmarkQualityMode;
  subject: BenchmarkSubjectMode;
  wireframe: boolean;
}

export interface BenchmarkGeometryStats {
  humanTriangles: number;
  zombieTriangles: number;
  humanSkinnedVertices: number;
  zombieSkinnedVertices: number;
  boneCount: number;
  skinnedMeshCount: number;
  hasVertexNormals: boolean;
  hasCustomUVs: boolean;
  hasVertexAO: boolean;
  hasNormalMaps: boolean;
  hasRoughnessMaps: boolean;
  hasMetalnessMaps: boolean;
  hasAoMaps: boolean;
  hasPhysicalPbr: boolean;
}

export interface BenchmarkTelemetry {
  fps: number;
  frameTimeMs: number;
  triangles: number;
  drawCalls: number;
  geometries: number;
  textures: number;
  materialCount: number;
  estimatedGpuMb: number;
  jsHeapMb: number | null;
  pixelRatio: number;
  viewportWidth: number;
  viewportHeight: number;
  shadowMapRes: number;
  isSoftwareGl: boolean;
  rendererLabel: string;
  geometryStats: BenchmarkGeometryStats;
}

function detectWebGLInfo(): { isSoftware: boolean; rendererLabel: string } {
  try {
    const gl = document.createElement('canvas').getContext('webgl2');
    if (!gl) return { isSoftware: true, rendererLabel: 'Unavailable' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || 'WebGL2');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { isSoftware, rendererLabel: gpu };
  } catch {
    return { isSoftware: false, rendererLabel: 'WebGL2' };
  }
}

function countGroupTriangles(root: THREE.Object3D): number {
  let tris = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !mesh.visible || !mesh.geometry) return;
    const g = mesh.geometry;
    if (g.index) {
      tris += Math.floor(g.index.count / 3);
    } else if (g.attributes.position) {
      tris += Math.floor(g.attributes.position.count / 3);
    }
  });
  return tris;
}

function countVisibleMaterials(root: THREE.Object3D): number {
  const mats = new Set<THREE.Material>();
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh || !obj.visible) return;
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => mats.add(m));
    } else if (mesh.material) {
      mats.add(mesh.material);
    }
  });
  return mats.size;
}

export class BenchmarkScene {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private envTarget: THREE.WebGLRenderTarget;
  private pmrem: THREE.PMREMGenerator;

  private textures: BenchmarkTextureBundle;
  private human: BenchmarkCharacterInstance;
  private zombie: BenchmarkCharacterInstance;
  private plinth: MaterialCalibrationStage;

  // Optional current-game baseline models for honest side-by-side comparison
  private legacyStaffGeos: StaffSharedGeometries;
  private legacyZombieGeos: ZombieSharedGeometries;
  private legacyHuman: { group: THREE.Group; rig: StaffCharacterRig };
  private legacyZombie: { group: THREE.Group; rig: ZombieRig };

  private stageGroup = new THREE.Group();
  private floorMesh: THREE.Mesh;
  private backdropMesh: THREE.Mesh;
  private floorGeo: THREE.CylinderGeometry;
  private backdropGeo: THREE.CylinderGeometry;
  private floorMat: THREE.MeshStandardMaterial;
  private backdropMat: THREE.MeshStandardMaterial;

  // Studio & Horror lights
  private keyLight: THREE.DirectionalLight;
  private fillLight: THREE.HemisphereLight;
  private rimLight: THREE.SpotLight;
  private horrorAccentLight: THREE.PointLight;
  private fog: THREE.FogExp2;

  private state: BenchmarkState = {
    lighting: 'horror',
    camera: 'turnaround',
    quality: 'desktop',
    subject: 'both',
    wireframe: false,
  };

  // Smooth camera orbit / preset interpolation (orbitYaw = 0 faces -Z character fronts)
  private orbitYaw = 0.20;
  private orbitPitch = 0.06;
  private orbitZoom = 1.0;
  private isDragging = false;
  private lastPtrX = 0;
  private lastPtrY = 0;
  private camPosCurrent = new THREE.Vector3(-0.6, 1.35, -3.0);
  private camTargetCurrent = new THREE.Vector3(0, 1.0, 0);
  private camPosGoal = new THREE.Vector3(-0.6, 1.35, -3.0);
  private camTargetGoal = new THREE.Vector3(0, 1.0, 0);
  private fovGoal = 44;

  private isSoftwareGl: boolean;
  private rendererLabel: string;
  private disposed = false;
  private frameId = 0;
  private lastTime = 0;
  private elapsed = 0;
  private frameTimes: number[] = [];
  private lastTelemetryTime = 0;
  private resizeObserver: ResizeObserver | null = null;
  private geometryStats: BenchmarkGeometryStats;

  private onTelemetry: (t: BenchmarkTelemetry) => void;
  private onContextLost: (lost: boolean) => void;

  constructor(
    container: HTMLElement,
    onTelemetry: (t: BenchmarkTelemetry) => void,
    onContextLost: (lost: boolean) => void
  ) {
    this.container = container;
    this.onTelemetry = onTelemetry;
    this.onContextLost = onContextLost;

    const info = detectWebGLInfo();
    this.isSoftwareGl = info.isSoftware;
    this.rendererLabel = info.rendererLabel;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const w = Math.max(320, container.clientWidth || window.innerWidth);
    const h = Math.max(240, container.clientHeight || window.innerHeight);
    this.renderer.setSize(w, h);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c0f14);
    this.fog = new THREE.FogExp2(0x0c0f14, 0.045);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(44, w / h, 0.08, 60);
    this.camera.position.copy(this.camPosCurrent);
    this.camera.lookAt(this.camTargetCurrent);

    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envTarget = this.pmrem.fromScene(roomEnv, 0.04);
    roomEnv.dispose();
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.28;

    // 1. Textures (512x512 multi-channel PBR)
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.textures = createBenchmarkTextureBundle(this.isSoftwareGl ? 256 : 512, maxAniso);

    // 2. Stage Floor & Dark Matte Studio Cyclorama
    this.floorGeo = new THREE.CylinderGeometry(5.5, 5.5, 0.14, 48);
    this.floorMat = new THREE.MeshStandardMaterial({
      color: 0x5d626a,
      map: this.textures.stageFloor.map,
      normalMap: this.textures.stageFloor.normalMap,
      normalScale: new THREE.Vector2(0.8, 0.8),
      roughnessMap: this.textures.stageFloor.roughnessMap,
      roughness: 0.9,
      metalness: 0.06,
      aoMap: this.textures.stageFloor.aoMap,
    });
    this.floorMesh = new THREE.Mesh(this.floorGeo, this.floorMat);
    this.floorMesh.position.y = -0.07;
    this.floorMesh.receiveShadow = true;

    this.backdropGeo = new THREE.CylinderGeometry(7.5, 7.5, 5.5, 32, 1, true);
    this.backdropMat = new THREE.MeshStandardMaterial({
      color: 0x161a22,
      roughness: 0.96,
      metalness: 0.02,
      side: THREE.BackSide,
    });
    this.backdropMesh = new THREE.Mesh(this.backdropGeo, this.backdropMat);
    this.backdropMesh.position.y = 2.6;
    this.stageGroup.add(this.floorMesh, this.backdropMesh);
    this.scene.add(this.stageGroup);

    // 3. Test 1 & Test 2 & Test 4 Models
    this.human = buildBenchmarkHuman(this.textures);
    this.zombie = buildBenchmarkZombie(this.textures);
    this.plinth = buildBenchmarkMaterialPlinth(this.textures);

    this.scene.add(this.human.root, this.zombie.root, this.plinth.group);

    // 4. Optional Current In-Game Baseline Models (for honest comparison)
    this.legacyStaffGeos = createStaffSharedGeometries();
    this.legacyZombieGeos = createZombieSharedGeometries();
    this.legacyHuman = buildProceduralStaffModel(this.legacyStaffGeos, {
      variant: 0,
      kind: 'survivor',
      survivorId: 'surv_toby',
      name: 'Current Game Human',
      subtitle: 'Rigid Segments',
    });
    this.legacyZombie = buildProceduralZombieModel(this.legacyZombieGeos, 0, 'walker', 1.0);
    this.legacyHuman.group.visible = false;
    this.legacyZombie.group.visible = false;
    this.scene.add(this.legacyHuman.group, this.legacyZombie.group);

    // 5. Three-Point Lighting Rig (characters face -Z)
    this.fillLight = new THREE.HemisphereLight(0x6c7c92, 0x1a1715, 0.42);
    this.scene.add(this.fillLight);

    this.keyLight = new THREE.DirectionalLight(0xd8e0eb, 1.55);
    this.keyLight.position.set(-2.2, 3.6, -2.6);
    this.keyLight.castShadow = !this.isSoftwareGl;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    this.keyLight.shadow.camera.near = 0.5;
    this.keyLight.shadow.camera.far = 12;
    this.keyLight.shadow.camera.left = -2.6;
    this.keyLight.shadow.camera.right = 2.6;
    this.keyLight.shadow.camera.top = 2.6;
    this.keyLight.shadow.camera.bottom = -1.2;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.022;
    this.scene.add(this.keyLight);

    this.rimLight = new THREE.SpotLight(0xa37652, 4.4, 10, Math.PI * 0.28, 0.65, 1.4);
    this.rimLight.position.set(2.2, 2.5, 2.2);
    this.rimLight.target.position.set(0, 1.1, 0);
    this.scene.add(this.rimLight, this.rimLight.target);

    this.horrorAccentLight = new THREE.PointLight(0x883b2c, 1.15, 5.5, 1.8);
    this.horrorAccentLight.position.set(1.3, 0.9, -1.35);
    this.scene.add(this.horrorAccentLight);

    // Compute exact audited geometry capability telemetry
    const countVerts = (meshes: THREE.SkinnedMesh[]) =>
      meshes.reduce((acc, m) => acc + (m.geometry.attributes.position?.count ?? 0), 0);

    const sampleMat = this.human.materials[0];
    this.geometryStats = {
      humanTriangles: countGroupTriangles(this.human.root),
      zombieTriangles: countGroupTriangles(this.zombie.root),
      humanSkinnedVertices: countVerts(this.human.skinnedMeshes),
      zombieSkinnedVertices: countVerts(this.zombie.skinnedMeshes),
      boneCount: this.human.rig.bones.length,
      skinnedMeshCount: this.human.skinnedMeshes.length + this.zombie.skinnedMeshes.length,
      hasVertexNormals: Boolean(this.human.geometries[0]?.attributes.normal),
      hasCustomUVs: Boolean(this.human.geometries[0]?.attributes.uv),
      hasVertexAO: Boolean(this.human.geometries[0]?.attributes.color),
      hasNormalMaps: Boolean(sampleMat?.normalMap),
      hasRoughnessMaps: Boolean(sampleMat?.roughnessMap),
      hasMetalnessMaps: Boolean(sampleMat?.metalnessMap),
      hasAoMaps: Boolean(sampleMat?.aoMap),
      hasPhysicalPbr: sampleMat instanceof THREE.MeshPhysicalMaterial,
    };

    this.applyState(this.state);
    this.bindEvents();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  public getState(): BenchmarkState {
    return { ...this.state };
  }

  public updateState(partial: Partial<BenchmarkState>): void {
    const prevCamera = this.state.camera;
    const prevSubject = this.state.subject;
    const next: BenchmarkState = { ...this.state, ...partial };
    this.state = next;
    if (partial.camera && partial.camera !== prevCamera) {
      this.orbitYaw = partial.camera === 'closeup_face' ? 0.12 : 0.20;
      this.orbitPitch = 0.04;
      this.orbitZoom = 1.0;
    } else if (partial.subject && partial.subject !== prevSubject) {
      this.orbitZoom = 1.0;
    }
    this.applyState(next);
  }

  private applyState(s: BenchmarkState): void {
    // 1. Quality / Device Profile (Test 5.5 + Test 6)
    const isMobileSim = s.quality === 'mobile';
    const targetDpr = this.isSoftwareGl
      ? 1
      : isMobileSim
        ? 1
        : Math.min(window.devicePixelRatio || 1, 1.75);
    this.renderer.setPixelRatio(targetDpr);

    const shadowEnabled = !this.isSoftwareGl;
    this.renderer.shadowMap.enabled = shadowEnabled;
    this.keyLight.castShadow = shadowEnabled;
    const shadowRes = shadowEnabled ? (isMobileSim ? 512 : 2048) : 0;
    if (shadowEnabled && this.keyLight.shadow.mapSize.x !== shadowRes) {
      this.keyLight.shadow.mapSize.set(shadowRes, shadowRes);
      this.keyLight.shadow.map?.dispose();
      this.keyLight.shadow.map = null;
    }

    // 2. Lighting Mode (Test 5.1 Neutral vs Test 5.2 Horror Cinematic)
    if (s.lighting === 'neutral') {
      this.scene.background = new THREE.Color(0x3a414a);
      this.fog.color.setHex(0x3a414a);
      this.fog.density = 0.014;
      this.backdropMat.color.setHex(0x3a414a);
      this.keyLight.color.setHex(0xf2f0eb);
      this.keyLight.intensity = 1.65;
      this.keyLight.position.set(-2.0, 3.6, -3.2);
      this.fillLight.color.setHex(0xc8d2de);
      this.fillLight.groundColor.setHex(0x46423d);
      this.fillLight.intensity = 0.85;
      this.rimLight.intensity = 1.2;
      this.horrorAccentLight.intensity = 0.0;
      this.scene.environmentIntensity = 0.42;
    } else {
      this.scene.background = new THREE.Color(0x0b0e13);
      this.fog.color.setHex(0x0b0e13);
      this.fog.density = 0.05;
      this.backdropMat.color.setHex(0x11151d);
      this.keyLight.color.setHex(0x9fb6d1);
      this.keyLight.intensity = 1.45;
      this.keyLight.position.set(-2.2, 3.7, -2.4);
      this.fillLight.color.setHex(0x3a4a61);
      this.fillLight.groundColor.setHex(0x141110);
      this.fillLight.intensity = 0.34;
      this.rimLight.intensity = 4.6;
      this.horrorAccentLight.intensity = 1.25;
      this.scene.environmentIntensity = 0.22;
    }

    // 3. Subject Placement & Visibility (all models face -Z toward camera)
    this.human.root.visible = false;
    this.zombie.root.visible = false;
    this.plinth.group.visible = false;
    this.legacyHuman.group.visible = false;
    this.legacyZombie.group.visible = false;

    if (s.subject === 'both') {
      this.human.root.visible = true;
      this.zombie.root.visible = true;
      this.plinth.group.visible = true;
      this.human.root.position.set(-0.56, 0, 0);
      this.human.root.rotation.y = -0.18;
      this.zombie.root.position.set(0.56, 0, 0);
      this.zombie.root.rotation.y = 0.20;
      this.plinth.group.position.set(0, 0, 1.35);
    } else if (s.subject === 'human') {
      this.human.root.visible = true;
      this.human.root.position.set(0, 0, 0);
      this.human.root.rotation.y = -0.12;
    } else if (s.subject === 'zombie') {
      this.zombie.root.visible = true;
      this.zombie.root.position.set(0, 0, 0);
      this.zombie.root.rotation.y = 0.14;
    } else if (s.subject === 'materials') {
      this.plinth.group.visible = true;
      this.plinth.group.position.set(0, 0.35, 0);
    } else if (s.subject === 'compare_ingame') {
      this.human.root.visible = true;
      this.zombie.root.visible = true;
      this.legacyHuman.group.visible = true;
      this.legacyZombie.group.visible = true;
      // Left-to-Right (+X to -X from -Z camera): Skinned Human, Legacy Human, Skinned Zombie, Legacy Zombie
      this.human.root.position.set(1.05, 0, -0.08);
      this.human.root.rotation.y = 0.10;
      this.legacyHuman.group.position.set(0.38, 0, 0.12);
      this.legacyHuman.group.rotation.y = 0.10;

      this.zombie.root.position.set(-0.42, 0, -0.08);
      this.zombie.root.rotation.y = -0.10;
      this.legacyZombie.group.position.set(-1.10, 0, 0.12);
      this.legacyZombie.group.rotation.y = -0.10;
    }

    // 4. Wireframe Topology Inspection
    const applyWire = (root: THREE.Object3D, wire: boolean) => {
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if ('wireframe' in m) {
            (m as THREE.MeshStandardMaterial).wireframe = wire;
          }
        }
      });
    };
    applyWire(this.human.root, s.wireframe);
    applyWire(this.zombie.root, s.wireframe);
    applyWire(this.legacyHuman.group, s.wireframe);
    applyWire(this.legacyZombie.group, s.wireframe);
    applyWire(this.plinth.group, s.wireframe);

    // 5. Camera Target Framing
    this.updateCameraGoal();
  }

  private updateCameraGoal(): void {
    const s = this.state;
    const isSingle = s.subject === 'human' || s.subject === 'zombie';
    const isMats = s.subject === 'materials';
    const isCompare = s.subject === 'compare_ingame';
    const portraitScale =
      this.camera.aspect < 0.85
        ? THREE.MathUtils.clamp(0.85 / Math.max(0.35, this.camera.aspect), 1.0, 1.55)
        : 1.0;

    if (isMats) {
      this.camTargetGoal.set(0, 0.85, 0);
      this.fovGoal = s.camera === 'closeup_face' ? 32 : 42;
      const dist = (s.camera === 'closeup_face' ? 1.55 : 2.35) * portraitScale * this.orbitZoom;
      this.setOrbitPos(dist, 0.25);
      return;
    }

    if (s.camera === 'closeup_face') {
      const ty = s.subject === 'zombie' ? 1.50 : 1.59;
      const tz = s.subject === 'zombie' ? -0.16 : -0.02;
      this.camTargetGoal.set(0, ty, tz);
      this.fovGoal = 30;
      const dist = (isSingle ? 0.72 : isCompare ? 1.75 : 1.45) * (isSingle ? 1.0 : portraitScale) * this.orbitZoom;
      this.setOrbitPos(dist, 0.04);
    } else if (s.camera === 'closeup_body') {
      this.camTargetGoal.set(0, 1.12, -0.05);
      this.fovGoal = 36;
      const dist = (isSingle ? 1.30 : isCompare ? 2.25 : 1.90) * (isSingle ? 1.0 : portraitScale) * this.orbitZoom;
      this.setOrbitPos(dist, 0.06);
    } else if (s.camera === 'gameplay') {
      // Exact Last Shop FirstPersonController eye height (1.68m) & 68deg gameplay FOV facing front
      this.camTargetGoal.set(0, 1.24, 0);
      this.fovGoal = 68;
      this.camPosGoal.set(
        -Math.sin(this.orbitYaw * 0.4) * 0.45,
        1.68,
        -3.1 * portraitScale * this.orbitZoom
      );
    } else {
      this.camTargetGoal.set(0, 0.96, 0);
      this.fovGoal = 44;
      const dist = (isSingle ? 2.55 : isCompare ? 3.55 : 3.05) * (isSingle ? 1.0 : portraitScale) * this.orbitZoom;
      this.setOrbitPos(dist, 0.12);
    }
  }

  private setOrbitPos(dist: number, basePitchOffset: number): void {
    const pitch = THREE.MathUtils.clamp(this.orbitPitch + basePitchOffset, -0.35, 0.72);
    const cosP = Math.cos(pitch);
    // Offset azimuth by PI so orbitYaw = 0 views the -Z front face
    const yaw = Math.PI + this.orbitYaw;
    this.camPosGoal.set(
      this.camTargetGoal.x + Math.sin(yaw) * cosP * dist,
      this.camTargetGoal.y + Math.sin(pitch) * dist,
      this.camTargetGoal.z + Math.cos(yaw) * cosP * dist
    );
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.isDragging = true;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastPtrX;
    const dy = e.clientY - this.lastPtrY;
    this.lastPtrX = e.clientX;
    this.lastPtrY = e.clientY;
    this.orbitYaw -= dx * 0.008;
    this.orbitPitch = THREE.MathUtils.clamp(this.orbitPitch + dy * 0.005, -0.45, 0.65);
    this.updateCameraGoal();
  };

  private onPointerUp = (): void => {
    this.isDragging = false;
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    this.orbitZoom = THREE.MathUtils.clamp(this.orbitZoom + e.deltaY * 0.0008, 0.55, 1.85);
    this.updateCameraGoal();
  };

  private onResize = (): void => {
    if (this.disposed) return;
    const w = Math.max(320, this.container.clientWidth || window.innerWidth);
    const h = Math.max(240, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.updateCameraGoal();
  };

  private onLost = (e: Event): void => {
    e.preventDefault();
    this.onContextLost(true);
  };

  private onRestored = (): void => {
    this.onContextLost(false);
  };

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    dom.addEventListener('wheel', this.onWheel, { passive: false });
    dom.addEventListener('webglcontextlost', this.onLost);
    dom.addEventListener('webglcontextrestored', this.onRestored);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResize);
      this.resizeObserver.observe(this.container);
    }
    window.addEventListener('resize', this.onResize);
  }

  private loop = (now: number): void => {
    if (this.disposed) return;
    this.frameId = requestAnimationFrame(this.loop);

    const rawDt = Math.min(0.1, Math.max(0.001, (now - this.lastTime) / 1000));
    this.lastTime = now;
    this.elapsed += rawDt;

    this.frameTimes.push(rawDt * 1000);
    if (this.frameTimes.length > 30) this.frameTimes.shift();

    // Animate skeletal rigs
    if (this.human.root.visible) this.human.animate(this.elapsed);
    if (this.zombie.root.visible) this.zombie.animate(this.elapsed);

    // Smooth camera interpolation
    const dampT = 1 - Math.exp(-9 * rawDt);
    this.camPosCurrent.lerp(this.camPosGoal, dampT);
    this.camTargetCurrent.lerp(this.camTargetGoal, dampT);
    this.camera.position.copy(this.camPosCurrent);
    this.camera.lookAt(this.camTargetCurrent);
    if (Math.abs(this.camera.fov - this.fovGoal) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.fovGoal, dampT);
      this.camera.updateProjectionMatrix();
    }

    this.renderer.render(this.scene, this.camera);

    // Publish real renderer telemetry every 250ms
    if (now - this.lastTelemetryTime > 250) {
      this.lastTelemetryTime = now;
      const avgMs =
        this.frameTimes.reduce((a, b) => a + b, 0) / Math.max(1, this.frameTimes.length);
      const fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
      const info = this.renderer.info;
      const w = this.renderer.domElement.width;
      const h = this.renderer.domElement.height;
      const perfMem = (performance as Performance & {
        memory?: { usedJSHeapSize: number };
      }).memory;
      const jsHeapMb = perfMem ? +(perfMem.usedJSHeapSize / (1024 * 1024)).toFixed(1) : null;
      const texRes = this.isSoftwareGl ? 256 : 512;
      const renderedTris = info.render.triangles + Math.floor(info.render.lines / 3);
      // Rough RGBA texture + vertex buffer estimate
      const estimatedGpuMb = +(
        (info.memory.textures * texRes * texRes * 4 * 1.33) / (1024 * 1024) +
        (renderedTris * 3 * 48) / (1024 * 1024)
      ).toFixed(1);

      this.onTelemetry({
        fps,
        frameTimeMs: +avgMs.toFixed(1),
        triangles: renderedTris,
        drawCalls: info.render.calls,
        geometries: info.memory.geometries,
        textures: info.memory.textures,
        materialCount: countVisibleMaterials(this.scene),
        estimatedGpuMb,
        jsHeapMb,
        pixelRatio: +this.renderer.getPixelRatio().toFixed(2),
        viewportWidth: w,
        viewportHeight: h,
        shadowMapRes: this.renderer.shadowMap.enabled ? this.keyLight.shadow.mapSize.x : 0,
        isSoftwareGl: this.isSoftwareGl,
        rendererLabel: this.rendererLabel,
        geometryStats: this.geometryStats,
      });
    }
  };

  public dispose(): void {
    this.disposed = true;
    if (this.frameId) cancelAnimationFrame(this.frameId);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    dom.removeEventListener('wheel', this.onWheel);
    dom.removeEventListener('webglcontextlost', this.onLost);
    dom.removeEventListener('webglcontextrestored', this.onRestored);
    window.removeEventListener('resize', this.onResize);
    this.resizeObserver?.disconnect();

    this.human.dispose();
    this.zombie.dispose();
    this.plinth.dispose();
    this.legacyHuman.rig.dispose();
    this.legacyZombie.rig.dispose();
    this.legacyStaffGeos.dispose();
    this.legacyZombieGeos.dispose();
    this.floorGeo.dispose();
    this.backdropGeo.dispose();
    this.floorMat.dispose();
    this.backdropMat.dispose();
    this.textures.dispose();
    this.envTarget.dispose();
    this.pmrem.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
