# Native Status

Current status of @react-three/native features, verified on a real iOS device using Expo 55 + React Native 0.83.

**Test device:** iPhone, iOS, Expo Go / `npx expo run:ios --device`
**Dependencies:** three@0.183, @react-three/fiber@10.0.0-alpha.2, expo-gl@55

## Verified Working

- [x] **Canvas mount/unmount** — `<Canvas>` renders and tears down cleanly inside a React Native `<View>`
- [x] **Mesh rendering** — `<mesh>` elements render to the GL surface
- [x] **Box geometry** — `<boxGeometry>` creates visible geometry
- [x] **Standard material** — `<meshStandardMaterial>` with color prop works
- [x] **useFrame** — per-frame callback fires, rotation animation runs smoothly
- [x] **useRef** — refs attach to mesh objects correctly
- [x] **useState** — state changes trigger re-renders (scale toggle works)
- [x] **Ambient light** — `<ambientLight>` illuminates the scene
- [x] **Point light** — `<pointLight>` with position prop works
- [x] **Polyfills** — `import '@react-three/native'` applies polyfills without errors
- [x] **Re-exports** — `useFrame` from `@react-three/fiber` works alongside native Canvas
- [x] **Touch events** — `onPointerDown`/`onPointerUp`/`onClick` work via PanResponder
- [x] **Procedural DataTexture** — sync Uint8Array pixel data renders correctly
- [x] **useNativeTexture hook** — remote JPEG/PNG loads and renders via async decode + useFrame swap
- [x] **TextureLoader polyfill** — basic compatibility (1x1 placeholder + async decode); `useNativeTexture` recommended for reliable rendering
- [x] **Multiple canvases** — two side-by-side `<Canvas>` instances render independently
- [x] **Error boundaries** — `<ErrorBoundary>` catches errors inside Canvas children
- [x] **GLContextProvider** — pluggable GL context (expo-gl default, swap for webgpu)

## Not Yet Tested

- [ ] GLTF/model loading
- [ ] Canvas resize on orientation change
- [ ] Background/foreground lifecycle (app suspend/resume)
- [ ] Android device
- [ ] `frameloop="demand"` mode
- [ ] Custom camera props
- [ ] Raycasting / hit testing
- [ ] Shadows
- [ ] Post-processing effects
- [ ] React Suspense boundaries inside Canvas

## Known Issues

- **Multi-touch not supported** — PanResponder only reports the primary touch. Multi-finger gestures (pinch-to-zoom, two-finger rotate) are not forwarded to the R3F event system. This is a fundamental PanResponder limitation; fixing it requires a custom gesture handler (e.g., react-native-gesture-handler).
- **TextureLoader polyfill limitations** — The polyfilled `TextureLoader.load()` creates a 1x1 placeholder and swaps data async, but has no access to useFrame/invalidate. Textures may not upload on first frame. Use `useNativeTexture` hook for reliable texture rendering.
- **expo-gl texStorage2D immutability** — expo-gl uses `texStorage2D` (WebGL2) which locks texture dimensions on first upload. Textures cannot be resized after creation. The `useNativeTexture` hook works around this by deferring the first upload until full-size data is ready.
- **expo-gl GL command batching** — GL commands only flush via `endFrameEXP()` at the end of `gl.render()`. Texture uploads from async callbacks (useEffect, Promises) outside the render loop are never flushed. All GPU uploads must happen within the render loop.
- **Temp cache files** — Data URI conversion creates cache files with deterministic names (content-hashed). Files are reused for identical content but never actively deleted. Long-running apps with many unique assets may accumulate cache files.
- **BlobManager path** — The internal React Native BlobManager import path has changed across RN versions. A nested try/catch handles this, but future RN versions may need updates.
- **Non-base64 data URIs** — Only base64-encoded data URIs are supported. Plain data URIs (`data:text/plain,Hello`) will throw a descriptive error.

## Recent Fixes (2026-03-05)

- **endFrameEXP stacking** — Fixed `gl.render` being wrapped multiple times on re-render. Added `__nativePatched` guard.
- **Cache file accumulation** — Replaced random UUID filenames with deterministic content hashes for file reuse.
- **Download dedup** — Concurrent `getAsset` calls for the same URL now share one download via in-flight map.
- **Click threshold DPI** — Normalized tap-vs-drag threshold to ~20 physical pixels using `PixelRatio.get()`.
- **BLOB_URI_SCHEME null** — Guarded against `BlobModule` being undefined before `startsWith` check.
- **Data URI validation** — Non-base64 data URIs now throw a clear error instead of silently corrupting.
- **GLContext reset** — Added `resetGLContext()` for hot reload and testing.

## Testbed App

See [r3f-native-testbed](https://github.com/fredkwh/r3f-native-testbed) for the working test app with 7 test tabs.

### Minimal setup requirements

1. `babel.config.js` — needs `unstable_transformImportMeta: true` for Three.js `import.meta.url`
2. `metro.config.js` — needs `url` shim for R3F's dead `import.meta` polyfill code
3. `node_modules/url/` — shim must also exist here (Metro's concatenated require bypasses `extraNodeModules`)
4. Copy `@react-three/native` dist + package.json into node_modules (do NOT use `file:` link — causes Babel/Metro resolution loops)
