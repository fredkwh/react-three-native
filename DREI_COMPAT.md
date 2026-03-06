# drei Compatibility

Tested with `@react-three/drei@10.7.7` on iPhone (iOS), Expo 55, React Native 0.83, expo-gl 55.

## Working

| Component | Status | Notes |
|-----------|--------|-------|
| `<OrbitControls>` | PASS | Touch orbit/pan/zoom works |
| `useTexture` | PASS | Loads via Suspense, renders correctly |
| `<Environment>` | PASS | HDR preset loading works (tested `sunset`) |
| `<Center>` | PASS | Centers child geometry correctly |
| `<MeshReflectorMaterial>` | PASS | Reflection rendering works |

## Not Working

| Component | Status | Reason |
|-----------|--------|--------|
| `<Float>` | CRASH | `elapsedTime` undefined — R3F v10 scheduler API changed the clock/state shape. This is a drei v10 compatibility issue, not a native issue. Will be fixed upstream when drei fully supports R3F v10. |
| `<Text>` | CRASH | Requires `document` for troika-three-text SDF canvas generation. Expected failure on React Native — there is no DOM. Would need an OffscreenCanvas polyfill or alternative SDF approach. |

## Not Yet Tested

- `<Html>` — likely incompatible (requires DOM)
- `<Loader>` — likely incompatible (requires DOM)
- `<Stats>` — likely incompatible (requires DOM)
- `<Billboard>`
- `<Instances>` / `<Merged>`
- `<useGLTF>` — use `useNativeGLTF` from `@react-three/native` instead
- `<Sky>` / `<Stars>`
- `<ContactShadows>`
- `<Decal>`
- `<useAnimations>`
