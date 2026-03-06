# @react-three/native — Community Maintained

## What This Is
Standalone React Native bindings for @react-three/fiber, extracted from pmndrs/react-three-fiber v10 before native support was removed. The community solution for R3F on React Native.

## Origin
Extracted from commit dc0b1f5b of pmndrs/react-three-fiber (v10 branch, Dec 2025). The pmndrs team split native into its own package (`@react-three/native`), then removed it entirely. This repo picks up where they left off.

## Project Structure

### Source Files (`src/`)
- `Canvas.tsx` — Native canvas component. Uses expo-gl for GL context, wraps R3F's createRoot. Handles layout, pixel ratio, touch forwarding via PanResponder. endFrameEXP called via gl.render wrapper.
- `context.tsx` — Pluggable GL context provider. Designed to swap expo-gl for react-native-webgpu later. Exports `resetGLContext()` for hot reload/testing.
- `events.ts` — Touch/pointer event bridge from RN gesture system to R3F's event system.
- `polyfills.ts` — Web API shims so Three.js works on RN. Handles: Blob/URL, asset loading with content-hash caching, in-flight request dedup, JPEG/PNG decoding to raw RGBA via jpeg-js/upng-js, TextureLoader patch with DataTexture + mipmap lock (Object.defineProperty), FileLoader with responseType support, idempotency guard.
- `hooks.ts` — `useNativeTexture(url)` and `useNativeGLTF(url)` hooks. useNativeTexture creates sync placeholder + async decode + useFrame swap. useNativeGLTF wraps useLoader(GLTFLoader) + patchSceneTextures for mipmap/filter fixes.
- `index.tsx` — Public API entry point. Re-exports from @react-three/fiber, exports Canvas, useNativeTexture, useNativeGLTF, polyfills, GLContextProvider, resetGLContext.

### Other Files
- `tests/canvas.test.tsx` — 4 tests (mount, ref forwarding, context bridging, unmount)
- `__mocks__/` — Mocks for expo-gl, expo-asset, expo-file-system, react-native
- `NATIVE_STATUS.md` — What works, what doesn't, verified on device
- `ROADMAP.md` — Phased development plan
- `MIGRATION-REFERENCE.md` — pmndrs team's migration rationale
- `SPLIT-PLAN-REFERENCE.md` — Technical plan for the split

## Build & Test
- Build: `npm run build` (tsup → dist/index.cjs.js, dist/index.esm.js, dist/index.d.ts)
- Type check: `npm run typecheck`
- Test: `npm test` (jest, 4 tests, uses --forceExit due to R3F scheduler timer)
- Lint: `npm run lint`

## Dependencies
- Peer: `@react-three/fiber` ^10.0.0, `three` >=0.181.2, `react` ^19.0.0, `react-native` >=0.78
- Peer (optional): `expo` >=43.0, `expo-asset`, `expo-file-system`, `expo-gl`
- Direct: `base64-js`, `buffer`, `its-fine`, `jpeg-js`, `upng-js`

## Key Technical Discoveries (expo-gl)

These are hard-won findings from device testing. DO NOT ignore them:

1. **endFrameEXP is required** — expo-gl batches GL commands and only flushes to screen when `endFrameEXP()` is called. Without it, nothing renders. Called via gl.render wrapper after every Three.js render.

2. **Textures must exist from first render** — expo-gl allocates texStorage2D at the texture's initial size. Textures created asynchronously outside the render loop never upload to the GPU correctly. Fix: create a sync placeholder DataTexture, then swap pixel data inside useFrame where endFrameEXP flushes.

3. **expo-gl cannot generate mipmaps for DataTextures** — texStorage2D + texSubImage2D path doesn't support generateMipmap. Always set `generateMipmaps = false` and `minFilter = LinearFilter`. The polyfill uses Object.defineProperty to lock these on every DataTexture.

4. **pixelStorei is not supported** — expo-gl logs warnings but ignores the calls. flipY must be handled in software, not via GL state.

5. **GLTF PBR textures render black** — All embedded textures have valid pixel data but only emissive maps render. Base color, normal, AO, metalness, roughness maps appear black even with correct properties. Root cause: texture upload timing interacts with MeshStandardMaterial's PBR shader in a way that produces roughness=0 (perfect mirror reflecting nothing = black). This is an expo-gl limitation. Workaround: MeshBasicMaterial or standalone useNativeTexture.

6. **CJS vs ESM** — R3F v10's .mjs build uses `import.meta` which Hermes doesn't support. Metro must be configured to resolve .cjs files instead of .mjs (via custom resolveRequest in metro.config.js).

## What's Verified Working (iOS, Physical Device)
- Basic rendering (mesh, geometry, material, lights)
- Touch events (onClick, onPointerDown/Up/Move/Over/Out, per-mesh raycasting)
- Texture loading via useNativeTexture (64x64 to 2048x2048, JPEG and PNG)
- Simple GLTF models (geometry + single texture via BoxTextured)
- GLTF geometry + emissive maps (DamagedHelmet shape + glow)
- Resize handling (layout changes propagate correctly)
- Mount/unmount lifecycle (clean cleanup, no leaks)
- Multiple simultaneous canvases (4 in 2x2 grid)
- React Suspense inside Canvas
- Custom camera props (perspective with fov, orthographic)

## Known Limitations (Documented in NATIVE_STATUS.md)
- GLTF PBR textures black (expo-gl limitation, see above)
- frameloop="demand" not working (endFrameEXP doesn't flush in demand mode)
- Multi-touch not supported (PanResponder only reports primary touch)
- expo-gl: pixelStorei not supported, EXT_color_buffer_float missing

## Bugs Fixed (All 16 Audit Items Addressed)
1. endFrameEXP stacking → __nativePatched guard
2. Root leak on GL re-creation → unmount before overwrite
3. getContext crash without options → default destructuring
4. TextureLoader LoadingManager tracking → itemStart/itemEnd
5. FileLoader ignores responseType → respect this.responseType
6. Blob-to-data-URI corruption → proper binary handling
7. sideEffects:false wrong → removed
8. Temp cache files → deterministic content-hash filenames
9. Root cleanup race → sync guard
10. No dedup in getAsset → in-flight request map
11. Polyfills not idempotent → __applied guard
12. Multi-touch → documented as PanResponder limitation
13. Click threshold not DPI-aware → PixelRatio normalization
14. BLOB_URI_SCHEME undefined → truthiness guard
15. Data URI assumes base64 → validate marker
16. GLContext singleton → resetGLContext() exported

## Code Style
- TypeScript strict
- Functional components, hooks only
- Minimal dependencies — this is a library
- Conventional commits: fix: / feat: / refactor: / docs: / test:
- Keep commits atomic

## Testbed App
Separate repo at ~/projects/r3f-native-testbed (Expo SDK 52). 8 tabs testing every capability. Built with `npx expo run:ios --device` (not Expo Go). Uses file copy of the built package into node_modules/@react-three/native/.

To update testbed with library changes:
```bash
cd ~/projects/react-three-native && npm run build
cd ~/projects/r3f-native-testbed
cp -r ../react-three-native/dist node_modules/@react-three/native/
cp ../react-three-native/package.json node_modules/@react-three/native/
npx expo run:ios --device
```
