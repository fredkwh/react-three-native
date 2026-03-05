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

## Not Yet Tested

- [ ] Touch/press events (`onPress`, `onPointerDown`, etc.)
- [ ] Texture loading (requires expo-asset + expo-file-system)
- [ ] GLTF/model loading
- [ ] Multiple canvases
- [ ] Canvas resize on orientation change
- [ ] Background/foreground lifecycle (app suspend/resume)
- [ ] Android device
- [ ] `frameloop="demand"` mode
- [ ] Custom camera props
- [ ] Raycasting / hit testing
- [ ] Shadows
- [ ] Post-processing effects
- [ ] React Suspense boundaries inside Canvas
- [ ] Error boundaries inside Canvas

## Known Issues

- **GL context stacking** — If `onContextCreate` fires multiple times without unmount, old roots may leak. A fix is in place (unmount previous root before creating new one) but edge cases remain under heavy remounting.
- **endFrameEXP accumulation** — Rapid mount/unmount cycles could stack `endFrameEXP` calls in the render loop. Not observed in normal use.
- **Temp files not cleaned up** — Blob URI polyfill creates temporary files via `expo-file-system` that are never deleted. Low impact for most apps, but long-running apps with heavy asset loading may accumulate files.
- **BlobManager path** — The internal React Native BlobManager import path has changed across RN versions. A nested try/catch handles this, but future RN versions may need updates.

## Testbed App

See [r3f-native-testbed](https://github.com/fredkwh/r3f-native-testbed) for the working test app. It renders a rotating orange box with tap-to-scale interaction.

### Minimal setup requirements

1. `babel.config.js` — needs `unstable_transformImportMeta: true` for Three.js `import.meta.url`
2. `metro.config.js` — needs `url` shim for R3F's dead `import.meta` polyfill code
3. `node_modules/url/` — shim must also exist here (Metro's concatenated require bypasses `extraNodeModules`)
4. Copy `@react-three/native` dist + package.json into node_modules (do NOT use `file:` link — causes Babel/Metro resolution loops)
