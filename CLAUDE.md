# @react-three/native — Community Maintained

## What This Is
Standalone React Native bindings for @react-three/fiber, extracted from pmndrs/react-three-fiber v10 before native support was removed. Goal: stabilize, test, publish, and maintain as the community solution for R3F on React Native.

## Origin
Extracted from commit dc0b1f5b of pmndrs/react-three-fiber (v10 branch, Dec 2025). The pmndrs team split native into its own package, then removed it entirely. This repo picks up where they left off.

## Source Files (5 files, ~700 lines total)
- `src/Canvas.tsx` (277 lines) — Native canvas component. Uses expo-gl for GL context, wraps R3F's createRoot. Handles layout, pixel ratio, touch forwarding.
- `src/context.tsx` (87 lines) — Pluggable GL context provider. Designed to swap expo-gl for react-native-webgpu later.
- `src/events.ts` (11 lines) — Touch/pointer event bridge from RN gesture system to R3F's event system.
- `src/polyfills.ts` (218 lines) — Web API shims (Blob, URL, fetch, TextDecoder, etc.) so Three.js works on RN. Most complex file — handles asset loading, blob URIs, platform differences iOS/Android.
- `src/index.tsx` (34 lines) — Public API entry point, re-exports from fiber + native components.

## Tests & Mocks
- `tests/canvas.test.tsx` — Existing test from pmndrs
- `__mocks__/` — Mocks for expo-gl, expo-asset, expo-file-system, react-native

## Key Architecture
- This package DEPENDS on @react-three/fiber as a peer dep (^10.0.0)
- It re-exports everything from fiber, then adds native Canvas + polyfills
- GL context is pluggable via context.tsx (expo-gl is default, but designed for swap)
- Expo deps are ALL optional in peerDependenciesMeta
- No DOM, no window, no document — polyfills.ts bridges the gap

## Reference Docs
- `MIGRATION-REFERENCE.md` — pmndrs team's migration rationale
- `SPLIT-PLAN-REFERENCE.md` — Technical plan for the split, lists what Canvas needs from core

## Build
Package uses preconstruct. Build not yet configured for standalone — this is a first task.
- Type check: `npx tsc --noEmit` (once tsconfig is set up)
- Test: `npx jest` (once jest is configured)

## Code Style
- TypeScript strict
- Functional components, hooks only
- Minimal dependencies — this is a library
- Match pmndrs patterns from the original codebase

## Git
- Branch per fix: fix/gl-cleanup, feat/touch-events, etc.
- Conventional commits: fix: / feat: / refactor: / docs: / test:
- Keep commits atomic

## Priority Tasks
1. Set up standalone build toolchain (tsconfig, tsup or preconstruct, jest)
2. Get existing test passing
3. Audit all 5 source files for bugs, missing error handling, memory leaks
4. Create test app (separate Expo project) for device testing
5. Document what works and what doesn't in NATIVE_STATUS.md
6. Fix GL context lifecycle (mount/unmount/background recovery)
7. Fix touch event edge cases
8. Publish to npm as scoped package
