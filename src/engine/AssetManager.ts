import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ASSET_REGISTRY } from '../assets/models/assetRegistry';

export class AssetManager {
  private gltfLoader: GLTFLoader;
  private modelCache = new Map<string, THREE.Group>();
  private inFlight = new Map<string, Promise<THREE.Group | null>>();

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
      container.add(this.prepareClone(cached, entry.scale ?? 1, entry.yOffset ?? 0, entry.rotationY ?? 0, castShadow, receiveShadow));
      return container;
    }

    // Mount temporary fallback while external GLB streams in
    const fallback = fallbackBuilder();
    container.add(fallback);

    void this.loadExternalGltf(url).then((loaded) => {
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

  public async loadExternalGltf(url: string): Promise<THREE.Group | null> {
    const existing = this.modelCache.get(url);
    if (existing) return existing;

    const pending = this.inFlight.get(url);
    if (pending) return pending;

    const promise = new Promise<THREE.Group | null>((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          this.modelCache.set(url, gltf.scene);
          this.inFlight.delete(url);
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`AssetManager: Could not load GLTF "${url}", keeping procedural fallback.`, err);
          this.inFlight.delete(url);
          resolve(null);
        }
      );
    });

    this.inFlight.set(url, promise);
    return promise;
  }

  private prepareClone(
    source: THREE.Group,
    scale: number,
    yOffset: number,
    rotationY: number,
    castShadow: boolean,
    receiveShadow: boolean
  ): THREE.Group {
    const clone = source.clone(true);
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
  }
}
