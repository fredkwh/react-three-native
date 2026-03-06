# Performance Baseline

Baseline performance numbers for @react-three/native on iOS.

**Device:** iPhone (model TBD)
**Dependencies:** three@0.183, @react-three/fiber@10.0.0-alpha.2, expo-gl@55, React Native 0.83
**Date:** 2026-03-06

## FPS by Mesh Count

| Meshes | FPS | Notes |
|--------|-----|-------|
| 1 | TBD | Single spinning cube (Box tab) |
| 10 | TBD | Grid of spinning cubes |
| 50 | TBD | |
| 100 | TBD | |
| 200 | TBD | |
| 500 | TBD | |

## Texture Decode Time

| Size | Format | Time | Notes |
|------|--------|------|-------|
| 64x64 | Procedural | TBD | Sync DataTexture creation |
| ~1024 | JPEG remote | TBD | useNativeTexture async decode |
| 2048x2048 | Procedural | TBD | Sync DataTexture creation |
| 2048x2048 | JPEG remote | TBD | useNativeTexture async decode |

## GLTF Load Time

| Model | Time | Notes |
|-------|------|-------|
| BoxTextured.glb | TBD | Simple model, 1 texture |
| DamagedHelmet.glb | TBD | Complex model, 5 PBR maps (textures render black) |

## How to Measure

1. Build the testbed: `npx expo run:ios --device`
2. **FPS:** Box tab shows single-mesh FPS in the status banner. Perf tab has mesh count selector (10-500) with live FPS display.
3. **Console logs:** Every 5 seconds, the FPS counter logs `[Perf <label>] FPS: <n>` to the console. View via Xcode console or `npx expo start` terminal.
4. **Memory:** Logged alongside FPS if `performance.memory` is available (may not be on all engines).

## Notes

- All meshes use `<meshStandardMaterial>` with lighting (ambientLight + pointLight)
- Stress test uses `<boxGeometry args={[0.4, 0.4, 0.4]}>` per mesh
- FPS is a rolling average over 60 frames
- expo-gl uses OpenGL ES on iOS, which adds overhead vs native Metal
