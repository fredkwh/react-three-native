# Roadmap

## Phase 1 — Alpha Publish

**Goal:** Publishable `@react-three/native@10.0.0-alpha.1` that covers basic 3D rendering on iOS.

### Remaining Work

- [ ] **GLTF loading** — `GLTFLoader` uses `FileLoader` (polyfilled) + `TextureLoader` (polyfilled). Verify a `.glb` file loads end-to-end. May need `DRACOLoader` wasm shim or fallback.
- [ ] **Android verification** — Run full testbed on a physical Android device. Known risk: Android Release Mode asset unpacking path in `getAsset`.
- [ ] **`frameloop="demand"` mode** — Verify `invalidate()` triggers a frame. The `endFrameEXP` patch must still flush correctly when frames are not continuous.
- [ ] **Custom camera props** — `orthographic`, `camera={{ position, fov }}` passed through Canvas.
- [ ] **Raycasting / hit testing** — `onPointerDown` on a specific mesh (not just the canvas). Requires the pointer event → R3F raycaster pipeline to work.
- [ ] **React Suspense inside Canvas** — `<Suspense fallback={...}>` around a lazy-loaded component within Canvas.
- [ ] **npm publish config** — Verify `package.json` `files`, `exports`, `types` fields. Dry-run `npm pack`. Add LICENSE file.
- [ ] **README.md** — Installation, quick start, API reference for Canvas/useNativeTexture/polyfills/GLContextProvider.

### Test Cases

| # | Test | Pass Criteria |
|---|------|---------------|
| P1-01 | Load `.glb` model via `useGLTF` / `GLTFLoader` | Model renders with correct geometry and materials |
| P1-02 | Load `.glb` with embedded textures | Textures decode and render (JPEG/PNG within glTF) |
| P1-03 | `useGLTF` with Draco-compressed model | Either loads with wasm decoder or throws clear error |
| P1-04 | Android: full testbed (all 7 tabs) | All tests pass on physical Android device |
| P1-05 | Android: remote texture via `useNativeTexture` | JPEG loads and renders (same as iOS) |
| P1-06 | `frameloop="demand"` with `invalidate()` | Scene renders on demand, not continuously. Manual invalidate triggers frame. |
| P1-07 | `<Canvas camera={{ position: [0, 5, 10], fov: 50 }}>` | Camera positioned correctly, perspective matches fov |
| P1-08 | `<Canvas orthographic>` | Orthographic projection renders correctly |
| P1-09 | Tap a specific mesh in a multi-mesh scene | `onClick` fires on tapped mesh only, not others |
| P1-10 | `onPointerOver` / `onPointerOut` on a mesh | Hover events fire on touch move enter/exit |
| P1-11 | `<Suspense>` around a component that throws a promise | Fallback renders, then resolves to real content |
| P1-12 | `npm pack --dry-run` | Only `dist/`, `README.md`, `package.json` included. No `src/`, `tests/`, `node_modules/`. |
| P1-13 | Install from tarball in a fresh Expo project | `import { Canvas } from '@react-three/native'` resolves types and renders |

---

## Phase 2 — Performance + drei Compatibility

**Goal:** Usable for real apps. Key drei helpers work. Performance is acceptable for 60fps scenes.

### Remaining Work

- [ ] **drei `<OrbitControls>`** — Requires `canvas.ownerDocument` hack to satisfy controls' DOM assumptions. Currently set to `canvas` itself — verify orbit/pan/zoom work with touch.
- [ ] **drei `<Environment>`** — Loads HDR/EXR environment maps. Needs `RGBELoader` or `EXRLoader` through polyfilled `FileLoader`. May need `useNativeTexture`-style pattern for HDR data.
- [ ] **drei `<Text>` / `<Text3D>`** — `troika-three-text` uses canvas for SDF generation. No `<canvas>` element in RN — needs `OffscreenCanvas` polyfill or alternative.
- [ ] **drei `<useTexture>`** — Wraps `TextureLoader` with Suspense. Verify it works with the polyfilled loader, or provide a native-aware alternative.
- [ ] **Multi-touch gestures** — Replace PanResponder with `react-native-gesture-handler` for pinch-to-zoom, two-finger rotate. Forward all active touches to R3F event system.
- [ ] **Texture memory management** — `useNativeTexture` currently never disposes textures. Add cleanup on unmount (`texture.dispose()`). Track GPU memory in dev mode.
- [ ] **Image decode performance** — jpeg-js and upng-js are pure JS. Profile decode time for large textures (2048x2048+). Consider moving decode to a worker thread or native module for images > 1MP.
- [ ] **Asset cache cleanup API** — `cleanAssetCache()` to sweep stale `r3n-*` files from `cacheDirectory`.
- [ ] **Canvas resize on orientation change** — `onLayout` fires but the GL surface may need explicit resize. Verify `drawingBufferWidth/Height` updates.

### Test Cases

| # | Test | Pass Criteria |
|---|------|---------------|
| P2-01 | `<OrbitControls>` — single-finger orbit | Camera orbits around target on drag |
| P2-02 | `<OrbitControls>` — pinch to zoom (requires multi-touch) | Camera zooms in/out on pinch gesture |
| P2-03 | `<OrbitControls>` — two-finger pan | Camera pans horizontally/vertically |
| P2-04 | `<Environment preset="sunset">` | Scene lit by HDR environment map |
| P2-05 | `<Text>` renders a string in 3D | Text visible, positioned correctly, no crashes |
| P2-06 | `useTexture` with Suspense | Texture loads, Suspense fallback shows during load |
| P2-07 | Load 10 textures simultaneously | All 10 render correctly, no duplicate downloads (dedup working) |
| P2-08 | Unmount component with `useNativeTexture` | `texture.dispose()` called, no WebGL resource leak |
| P2-09 | Decode 2048x2048 JPEG | Decode completes in < 2s on mid-range device. No UI freeze. |
| P2-10 | Decode 4096x4096 PNG | Either completes or throws OOM error gracefully (not a crash) |
| P2-11 | Rotate device portrait → landscape → portrait | Canvas resizes, scene re-renders at correct aspect ratio, no black flash |
| P2-12 | `cleanAssetCache()` after loading 5 textures | Cache files removed, disk space freed |
| P2-13 | 100-mesh scene at 60fps | `useFrame` delta stays < 20ms. No GC stalls > 50ms. |
| P2-14 | Profile a scene with React DevTools | R3F reconciler visible, component tree inspectable |

---

## Phase 3 — Post-Processing, Shadows, Lifecycle

**Goal:** Feature parity with common web R3F patterns. Production-quality lifecycle handling.

### Remaining Work

- [ ] **Shadows** — `<Canvas shadows>` with `castShadow`/`receiveShadow` on meshes. expo-gl supports `DEPTH_TEXTURE` extension — verify shadow maps work.
- [ ] **Post-processing** — `@react-three/postprocessing` uses `EffectComposer` which creates render targets and reads back framebuffers. Verify basic effects (bloom, vignette) work with expo-gl.
- [ ] **App lifecycle** — Handle `AppState` changes (active/background/inactive). Pause the render loop when backgrounded. Resume GL context on foreground — expo-gl may destroy and recreate the context.
- [ ] **GL context loss recovery** — If expo-gl loses the context (low memory, background kill), detect it and recreate the root. Rehydrate scene state. The `onContextCreate` path exists but scene rehydration is untested.
- [ ] **Hot reload stability** — Verify Canvas + children survive Fast Refresh. `resetGLContext()` may need to be called automatically. Test with `useFrame`, `useNativeTexture`, refs.
- [ ] **Memory pressure handling** — Listen to RN's memory warnings. Dispose unused textures and geometries. Optionally lower resolution.
- [ ] **WebGPU backend** — Test `GLContextProvider` with `react-native-webgpu`. The pluggable context is designed for this but completely untested.

### Test Cases

| # | Test | Pass Criteria |
|---|------|---------------|
| P3-01 | `<Canvas shadows>` with directional light | Shadow renders on receiving mesh |
| P3-02 | Shadow map quality at different `shadow-mapSize` | Visible quality difference between 512/1024/2048 |
| P3-03 | `<EffectComposer><Bloom /></EffectComposer>` | Bloom glow visible on bright objects |
| P3-04 | `<EffectComposer><Vignette /></EffectComposer>` | Dark corners visible |
| P3-05 | Background app for 5s, foreground | Scene resumes rendering. No black screen. No crash. |
| P3-06 | Background app for 60s (context may be destroyed) | Context recreated, scene re-renders from scratch or rehydrates |
| P3-07 | Kill and relaunch app | Clean startup, no stale GL state |
| P3-08 | Fast Refresh: edit a component inside Canvas | Component updates without remounting Canvas or losing GL context |
| P3-09 | Fast Refresh: edit `useFrame` callback | New callback runs on next frame, no stacking |
| P3-10 | Memory warning while rendering | Textures downsampled or disposed. App does not OOM crash. |
| P3-11 | `GLContextProvider` with react-native-webgpu | Canvas renders using WebGPU backend (basic mesh) |
| P3-12 | Switch GL provider at runtime (context swap) | Old context torn down, new context renders correctly |

---

## Phase 4 — Stress Testing + Stable Release

**Goal:** `@react-three/native@10.0.0` stable release. Battle-tested in real apps.

### Remaining Work

- [ ] **Real app integration** — Partner with 1-2 open-source RN apps to adopt. Collect bug reports from real usage patterns.
- [ ] **Complex scene stress test** — Scene with 500+ meshes, 20+ textures, animated skeletons, particle systems. Profile frame time, memory, GC pressure.
- [ ] **Long-running stability** — Run a looping animation for 1 hour. Monitor for memory leaks (texture/geometry accumulation), frame drops, context loss.
- [ ] **Navigation integration** — Canvas inside React Navigation / expo-router stack and tab navigators. Mount/unmount on navigate. Verify cleanup on screen pop.
- [ ] **Concurrent rendering** — React 19 concurrent features with R3F. `useTransition` around expensive scene changes. Verify no tearing or double-render.
- [ ] **CI pipeline** — Automated typecheck, unit tests, and build on PR. Optionally: Detox/Maestro E2E tests on simulator for Canvas mount/render/unmount.
- [ ] **Documentation site** — Comprehensive docs: installation, migration from web R3F, API reference, troubleshooting, expo-gl quirks, performance tips.
- [ ] **Changelog + migration guide** — From `@react-three/fiber/native` (v9) to `@react-three/native` (v10).

### Test Cases

| # | Test | Pass Criteria |
|---|------|---------------|
| P4-01 | 500-mesh scene with instancing | Renders at > 30fps on mid-range device |
| P4-02 | 20 unique textures loaded simultaneously | All render, peak memory < 500MB, no OOM |
| P4-03 | Animated skeleton (skinned mesh from glTF) | Skeleton animates smoothly at 60fps |
| P4-04 | Particle system (1000 points) | Points render correctly, animation smooth |
| P4-05 | 1-hour continuous animation loop | No memory growth > 10%, no frame drops > 100ms, no context loss |
| P4-06 | Navigate to Canvas screen, back, forward 50x | Memory returns to baseline after each unmount. No leaked GL contexts. |
| P4-07 | Tab navigator with 3 Canvas screens | Only active tab renders. Inactive tabs pause. Switch is instant. |
| P4-08 | `useTransition` wrapping a scene swap | Old scene stays visible until new scene is ready. No flash. |
| P4-09 | CI: `npm test` + `npm run typecheck` + `npm run build` | All pass on every PR |
| P4-10 | CI: Detox test — mount Canvas, verify GL surface exists | Automated E2E on iOS simulator |
| P4-11 | Fresh Expo project: `npx expo install @react-three/native` | Installs, resolves peer deps, renders a rotating box |
| P4-12 | Upgrade three.js minor version (0.183 → 0.185) | No regressions. Polyfills still apply. Build succeeds. |

---

## Non-Goals (Out of Scope)

These are explicitly not planned:

- **Web support** — Use `@react-three/fiber` directly on web. This package is native-only.
- **Expo Go compatibility** — Requires dev client (`npx expo run:ios`) for native modules. Expo Go may work for basic scenes but is not a target.
- **React Native < 0.78** — Minimum RN version is 0.78 (React 19 requirement from R3F v10).
- **three.js < 0.181** — Minimum three version matched to R3F v10's peer dep.
- **Custom native modules** — No Turbo Modules or Fabric components. Pure JS/TS over expo-gl.
