import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { ASSET_REGISTRY, AssetManifestEntry } from '../assets/models/assetRegistry';

export interface CachedGltfAsset {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  hasSkinnedMesh: boolean;
}

export class AssetManager {
  private gltfLoader: GLTFLoader;
  private modelCache = new Map<string, CachedGltfAsset>();
  private inFlight = new Map<string, Promise<CachedGltfAsset | null>>();
  private loadErrors = new Map<string, string>();

  constructor() {
    this.gltfLoader = new GLTFLoader();
  }

  /**
   * Instantiates a 3D asset container. Uses the procedural fallback immediately,
   * and if a `gltfUrl` is configured in ASSET_REGISTRY for `assetId`, loads
   * the external GLB/GLTF model and hot-swaps it in seamlessly.
   */
  public instantiateAsset(
    assetId: string,
    fallbackBuilder: () => THREE.Group,
    castShadow = true,
    receiveShadow = true
  ): THREE.Group {
    const container = new THREE.Group();
    container.name = assetId;

    const entry = ASSET_REGISTRY[assetId];
    if (!entry?.gltfUrl) {
      container.add(fallbackBuilder());
      return container;
    }

    const url = entry.gltfUrl;
    const cached = this.modelCache.get(url);
    if (cached) {
      container.add(
        this.prepareClone(
          cached,
          entry.scale ?? 1,
          entry.yOffset ?? 0,
          entry.rotationY ?? 0,
          castShadow,
          receiveShadow
        )
      );
      return container;
    }

    // Mount temporary fallback while external GLB streams in
    const fallback = fallbackBuilder();
    container.add(fallback);

    void this.loadExternalGltfAsset(url).then((loaded) => {
      if (!loaded) return;
      container.remove(fallback);
      container.add(
        this.prepareClone(
          loaded,
          entry.scale ?? 1,
          entry.yOffset ?? 0,
          entry.rotationY ?? 0,
          castShadow,
          receiveShadow
        )
      );
    });

    return container;
  }

  public getCachedAsset(url: string): CachedGltfAsset | null {
    return this.modelCache.get(url) ?? null;
  }

  public getLastLoadError(url: string): string | null {
    return this.loadErrors.get(url) ?? null;
  }

  public clonePreparedAsset(
    url: string,
    entry?: AssetManifestEntry,
    castShadow = true,
    receiveShadow = true
  ): { root: THREE.Group; animations: THREE.AnimationClip[] } | null {
    const cached = this.modelCache.get(url);
    if (!cached) return null;
    const root = this.prepareClone(
      cached,
      entry?.scale ?? 1,
      entry?.yOffset ?? 0,
      entry?.rotationY ?? 0,
      castShadow,
      receiveShadow
    );
    return { root, animations: cached.animations };
  }

  public async loadExternalGltf(url: string): Promise<THREE.Group | null> {
    const asset = await this.loadExternalGltfAsset(url);
    return asset ? asset.scene : null;
  }

  public async loadExternalGltfAsset(url: string): Promise<CachedGltfAsset | null> {
    const existing = this.modelCache.get(url);
    if (existing) return existing;

    const pending = this.inFlight.get(url);
    if (pending) return pending;

    this.loadErrors.delete(url);

    const promise = new Promise<CachedGltfAsset | null>((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          let hasSkinnedMesh = false;
          gltf.scene.traverse((child) => {
            if ((child as THREE.SkinnedMesh).isSkinnedMesh) {
              hasSkinnedMesh = true;
            }
          });
          const asset: CachedGltfAsset = {
            scene: gltf.scene,
            animations: gltf.animations ?? [],
            hasSkinnedMesh,
          };
          this.modelCache.set(url, asset);
          this.inFlight.delete(url);
          resolve(asset);
        },
        undefined,
        (err) => {
          const reason =
            err instanceof Error
              ? err.message
              : typeof err === 'string'
                ? err
                : 'Failed to fetch or parse GLB/GLTF asset';
          this.loadErrors.set(url, reason);
          console.error(`AssetManager: Could not load GLTF "${url}": ${reason}`, err);
          this.inFlight.delete(url);
          resolve(null);
        }
      );
    });

    this.inFlight.set(url, promise);
    return promise;
  }

  private prepareClone(
    source: CachedGltfAsset,
    scale: number,
    yOffset: number,
    rotationY: number,
    castShadow: boolean,
    receiveShadow: boolean
  ): THREE.Group {
    const clone = source.hasSkinnedMesh
      ? (SkeletonUtils.clone(source.scene) as THREE.Group)
      : source.scene.clone(true);
    clone.scale.setScalar(scale);
    clone.position.y = yOffset;
    clone.rotation.y = rotationY;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = castShadow;
        child.receiveShadow = receiveShadow;
      }
    });
    return clone;
  }

  public dispose(): void {
    this.modelCache.clear();
    this.inFlight.clear();
    this.loadErrors.clear();
  }
}
