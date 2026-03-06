# Performance Baseline

Baseline performance numbers for @react-three/native on iOS.

**Device:** iPhone 15 Pro
**Dependencies:** three@0.183, @react-three/fiber@10.0.0-alpha.2, expo-gl@55, React Native 0.83
**Date:** 2026-03-06

## FPS by Mesh Count

| Meshes | FPS (avg) | Memory | Notes |
|--------|-----------|--------|-------|
| 1 | 60 | ~20 MB | Single spinning cube (Box tab) |
| 10 | 58-60 | 25-28 MB | Grid of spinning cubes |
| 50 | 60 | 22-27 MB | |
| 100 | 57-59 | 27-41 MB | Practical limit for smooth 60fps |
| 200 | 45-50 | 30-48 MB | |
| 500 | 27-33 | 40-60 MB | |

Solid 60fps up to 100 meshes. Drops to ~48fps at 200, ~30fps at 500. Memory stays reasonable — no leaks observed (stays flat within each test). For Baunze interior scenes (typically 10-30 furniture items), performance is well within the 60fps target.

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

## Texture Decode Impact

Loading multiple textures simultaneously causes a significant FPS drop during decode. The jpeg-js and upng-js decoders are pure JavaScript running on the main thread (Hermes), so they block the render loop while decoding.

| Scenario | FPS during decode | FPS after decode | Notes |
|----------|-------------------|------------------|-------|
| 10 simultaneous JPEG/PNG loads | ~3 | 60 | Recovers fully once all decodes complete |

This is a known tradeoff of using pure JS decoders. Potential future mitigations: Web Worker offloading (if Hermes supports it), native image decode module, or staggering loads to limit concurrent decodes.

## Notes

- All meshes use `<meshStandardMaterial>` with lighting (ambientLight + pointLight)
- Stress test uses `<boxGeometry args={[0.4, 0.4, 0.4]}>` per mesh
- FPS is a rolling average over 60 frames
- expo-gl uses OpenGL ES on iOS, which adds overhead vs native Metal
- The 100-mesh threshold is the practical limit for smooth 60fps rendering
