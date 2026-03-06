# R3F Native — Next Phase Roadmap

## Context

You are working on `@react-three/native`, a standalone React Native bindings package for @react-three/fiber, extracted from the pmndrs v10 branch. The package is at ~/projects/react-three-native. The testbed app is at ~/projects/r3f-native-testbed.

This package will eventually power Baunze (~/projects/baunze), an AI interior design app that currently uses a WebView to embed a web-based R3F scene editor. The end goal is replacing that WebView with native 3D rendering using this package.

## What's Done (Don't Redo This)

### Package Infrastructure
- Standalone repo with tsup build (CJS + ESM + .d.ts)
- 4 jest tests passing (mount, ref forwarding, context bridging, unmount)
- TypeScript strict, all types clean
- MIT license, npm publish ready

### Bugs Fixed (16 audit items)
- #1 endFrameEXP stacking → __nativePatched guard
- #2 root leak on GL re-creation → unmount before overwrite
- #3 getContext crash without options → default destructuring
- #4 TextureLoader LoadingManager tracking → itemStart/itemEnd calls
- #5 FileLoader ignores responseType → respect this.responseType
- #6 Blob-to-data-URI corruption → proper binary handling
- #7 sideEffects:false wrong → removed, polyfills are side effects
- #8 temp cache files → deterministic content-hash filenames
- #9 root cleanup race → sync guard
- #10 no dedup in getAsset → in-flight request map
- #11 polyfills not idempotent → __applied guard
- #12 multi-touch → documented as PanResponder limitation
- #13 click threshold not DPI-aware → PixelRatio normalization
- #14 BLOB_URI_SCHEME undefined → truthiness guard
- #15 data URI assumes base64 → validate marker
- #16 GLContext singleton → resetGLContext() exported

### Features Built
- `useNativeTexture(url)` hook — sync placeholder + async JPEG/PNG decode via jpeg-js/upng-js + useFrame swap. Works up to 2048x2048.
- `useNativeGLTF(url)` hook — wraps useLoader(GLTFLoader) + patchSceneTextures for mipmap/filter fixes
- Polyfill TextureLoader.load with JPEG/PNG decode to raw RGBA DataTexture
- Object.defineProperty mipmap lock on DataTextures (expo-gl can't generate mipmaps)
- expo-gl endFrameEXP integration via gl.render wrapper

### Verified Working on Device (iPhone, iOS)
- Basic rendering (mesh, geometry, material, lights)
- Touch events (onClick, onPointerDown/Up/Move/Over/Out, per-mesh raycasting)
- Texture loading via useNativeTexture (64x64 to 2048x2048)
- Simple GLTF models (BoxTextured with single texture)
- GLTF geometry + emissive maps (DamagedHelmet shape + glow)
- Resize handling (full/half/small cycling)
- Mount/unmount lifecycle (clean cleanup)
- Multiple simultaneous canvases (4 in grid)
- React Suspense inside Canvas
- Custom camera props (perspective with fov, orthographic)

### Known Limitations (Documented)
- GLTF PBR textures render black (expo-gl texture upload timing with MeshStandardMaterial). Emissive maps work. Workaround: MeshBasicMaterial or useNativeTexture for individual textures.
- frameloop="demand" not working (endFrameEXP doesn't flush in demand mode)
- Multi-touch not supported (PanResponder only reports primary touch)
- expo-gl warnings: pixelStorei not fully supported, EXT_color_buffer_float missing

## What's Next — Prioritized Task List

Execute these in order. One commit per task. Run typecheck and tests after each. Push both repos after each task.

### Task 1: Publish to npm
- Set version to 0.1.0-alpha.1
- Verify package.json: name (@react-three/native or scoped alternative if taken), repository, bugs, homepage all point to fredkwh/react-three-native
- Verify `npm pack --dry-run` includes only: dist/, README.md, package.json, LICENSE
- Verify README.md has: description, install instructions, basic Canvas usage, useNativeTexture usage, useNativeGLTF usage, link to NATIVE_STATUS.md, known limitations
- Run `npm publish --access public`
- Tag the release: `git tag v0.1.0-alpha.1 && git push --tags`

### Task 2: Android Verification Setup
- Update the testbed to support Android (it's Expo, should mostly work)
- Document any Android-specific issues in NATIVE_STATUS.md
- Key risk: the getAsset Android content policy workarounds in polyfills.ts

### Task 3: drei Compatibility Audit
- Test these drei components in the testbed (add a new "Drei" tab):
  - `<OrbitControls>` — touch orbit/pan/zoom
  - `useTexture` — with Suspense
  - `<Environment>` — HDR/preset loading
  - `<Text>` — troika-three-text SDF generation (likely needs OffscreenCanvas polyfill)
  - `<Center>`, `<Float>`, `<MeshReflectorMaterial>`
- For each: log whether it works, crashes, or partially works
- Document results in a DREI_COMPAT.md

### Task 4: Performance Baseline
- Add an FPS counter to every test tab (display in corner)
- Add a "Stress" tab: render 100 meshes, then 200, then 500. Log frame times.
- Profile memory: log `performance.memory` or equivalent at intervals
- Establish baseline numbers for: single mesh FPS, 100 mesh FPS, texture decode time (1024, 2048), GLTF load time
- Document in PERFORMANCE.md

### Task 5: useNativeTexture Improvements
- Add texture disposal on unmount (texture.dispose())
- Add error handling with onError callback
- Add loading state (return [texture, isLoading, error])
- Add caching — same URL returns same texture, don't re-download
- Test with 10 simultaneous texture loads

### Task 6: GLTF Texture Investigation (Lower Priority)
- The core issue: GLTF embedded textures (base color, normal, metalness, roughness, AO) render black on expo-gl
- The emissive map renders fine with identical texture properties
- All textures are valid DataTextures with correct Uint8Array pixel data
- Hypothesis: Three.js WebGL2 texture upload path (texStorage2D + texSubImage2D) doesn't work correctly on expo-gl for textures that were already "uploaded" outside the render loop
- Investigation path: try creating the GLTF textures through useNativeTexture's path (extract image data from GLTF, create fresh DataTexture in useFrame)
- This is Phase 2/3 work — don't block the publish on this

### Task 7: Baunze Integration Prep (When Ready)
This is the eventual goal but don't start it yet. Documenting for context:

The Baunze app (frontshell/) currently uses a WebView to load the web scene editor. The native R3F replacement needs:

1. **Scene data layer** — Fetch SceneV1 JSON from backend via existing apiGet/apiPost
2. **Room geometry** — Floor plane + 4 walls from SceneV1.room dimensions + wall materials (12 color presets for MVP)
3. **Furniture rendering** — Load GLB models per SceneV1.furniture[].modelId, position/rotate per the data
4. **Camera controls** — Touch orbit/pan/zoom (drei OrbitControls or custom)
5. **Touch interaction** — Tap to select furniture, drag to move on XZ plane
6. **Scene state** — Port SceneContext (undo/redo, selection, save via PATCH /scene/actions)
7. **Openings** — Window/door cutouts in walls (CSG or pre-segmented geometry)
8. **Lighting** — Ambient + directional + point, shadow maps if expo-gl supports them

The coordinate system is Y-up, room centered at origin, dimensions in meters.

## Key Technical Notes for Claude Code

- expo-gl requires endFrameEXP() after every gl.render() to flush commands to the screen
- Textures created asynchronously must be swapped into pre-existing texture objects inside useFrame — creating new textures outside the render loop won't flush to GPU
- expo-gl can't generate mipmaps for DataTextures — always set generateMipmaps=false and minFilter=LinearFilter
- The package depends on @react-three/fiber ^10.0.0 (alpha) — use --legacy-peer-deps for installs
- three.js peer dep is >=0.181.2
- React 19 required (R3F v10 dependency)
- The testbed uses Expo SDK 52, built with `npx expo run:ios --device` (not Expo Go)
- To update the testbed with library changes: rebuild library (`npm run build` in react-three-native), then copy dist + package.json to testbed's node_modules/@react-three/native/
