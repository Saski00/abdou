# 3D Models Directory (`Last Shop`)

Drop external `.glb` or `.gltf` models (for example from Fab, Sketchfab, or Blender exports) into `public/assets/models/` and map their `assetId` in `src/assets/models/assetRegistry.ts`.

When a `gltfUrl` is registered for an `assetId`, `AssetManager` automatically loads the GLB/GLTF scene, normalizes shadows and scale, and replaces the procedural fallback mesh without touching gameplay or collision logic.
