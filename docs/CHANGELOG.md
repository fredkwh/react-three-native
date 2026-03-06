# Changelog

## 2026-03-05 — Audit bug fixes

### fix: add resetGLContext() for hot reload and testing (`e823316`)

**Problem:** The default GL context (`expo-gl`'s GLView) is cached in a module-level singleton (`defaultGLContext`). During React Native hot reloads or in test environments, the cached reference becomes stale — pointing to a GLView instance that no longer exists — but there was no way to clear it.

**Root Cause:** `getDefaultGLContext()` in `context.tsx` uses a lazy singleton pattern: once `defaultGLContext` is set, it returns the same object forever. Module-level variables survive hot reloads in Metro, so the stale expo-gl reference persists across code changes during development.

**Fix:** Added `resetGLContext()` which sets `defaultGLContext = null`, forcing `getDefaultGLContext()` to re-require expo-gl on the next `useGLContext()` call. Exported from the package's public API so consumers and test harnesses can call it.

**How to Verify:**
1. In a test file: `import { resetGLContext } from '@react-three/native'` — call it in `beforeEach` or `afterEach`.
2. In a dev app: trigger a hot reload while a Canvas is mounted — the GL context should reinitialize cleanly.
3. Run `npx tsc --noEmit` — no type errors.
4. Run `npx jest` — all 4 tests pass.

**Related Issues:**
- Hot reload may also need `unmountComponentAtNode` cleanup in Canvas — tracked separately.

---

### fix: normalize click threshold to physical pixels using PixelRatio (`075c149`)

**Problem:** The 20px click-vs-drag threshold in `PanResponder.onPanResponderEnd` was hardcoded in density-independent pixels (dp). On a 3x device, 20dp = 60 physical pixels — a very generous tap zone. On a 1x device, 20dp = 20 physical pixels — much tighter. Tap detection felt inconsistent across devices.

**Root Cause:** PanResponder's `state.dx`/`state.dy` are reported in dp. The threshold needs to account for device pixel density to represent the same physical finger movement.

**Fix:** Changed `< 20` to `< 20 / PixelRatio.get()`, normalizing to ~20 physical pixels on all devices. `PixelRatio` was already imported.

**How to Verify:**
1. On a high-DPI device (3x): tapping a mesh should register as a click. Small finger movements should not.
2. On a low-DPI device (1x): same behavior — consistent physical threshold.
3. Run `npx jest` — all tests pass.

**Related Issues:**
- #12: Multi-touch is not supported by PanResponder (documented as known limitation).

---

### fix: getAsset dedup, deterministic cache, BLOB_URI guard, data URI validation (`3f753ac`)

**Problem (4 bugs):**
1. **#8 — Temp cache files accumulate:** `getAsset` wrote data URI content to `cacheDirectory` using random UUIDs. Each call created a new file even for identical content. Long-running apps leaked disk space.
2. **#10 — No download dedup:** Concurrent calls to `getAsset` with the same URL triggered separate downloads — wasting bandwidth and potentially racing on file writes.
3. **#14 — BLOB_URI_SCHEME crash:** `NativeModules.BlobModule?.BLOB_URI_SCHEME` could be `undefined`, and `input.startsWith(undefined)` coerces to `"undefined"` — not a crash but semantically wrong.
4. **#15 — Non-base64 data URIs:** `input.split(';base64,')` assumed all data URIs are base64-encoded. Plain data URIs (e.g., `data:text/plain,Hello`) would produce `undefined` for the data portion, causing a silent write of garbage.

**Root Cause:** Original code used UUID for uniqueness without considering caching. No concurrency control. No null guards on optional native modules. No validation of data URI encoding scheme.

**Fix:**
1. Replaced `uuidv4()` with `hashString()` — a deterministic hash of the first 256 chars of the base64 data. Same content → same filename → file reuse.
2. Added `_inflight` Map keyed by input string. Concurrent calls share the same Promise. Entry is cleaned up in `.finally()`.
3. Extracted `NativeModules.BlobModule?.BLOB_URI_SCHEME` to a variable and added a truthiness check before `startsWith`.
4. Added explicit check for `;base64,` marker in data URIs. Non-base64 data URIs now throw a descriptive error.

**How to Verify:**
1. Load the same texture URL twice simultaneously — network tab should show only one download.
2. Convert a blob to a data URI twice — cache directory should contain one file, not two.
3. On a device without BlobModule (newer RN): no crash on blob URI check.
4. Pass `data:text/plain,Hello` to a loader — should get a clear error instead of silent corruption.
5. `npx jest` — all tests pass.

**Related Issues:**
- Cache files are never actively deleted (only reused). A future `cleanAssetCache()` API could sweep stale files.

---

### fix: guard endFrameEXP monkey-patch to prevent stacking on re-render (`9f6974a`)

**Problem:** Every React re-render caused `gl.render` to be wrapped again with another `endFrameEXP()` call. After N re-renders, each `gl.render()` call would invoke `endFrameEXP()` N times — unnecessary GPU flushes that degrade performance.

**Root Cause:** `useIsomorphicLayoutEffect` in Canvas has no dependency array, so it runs on every render. Each run calls `root.current.configure()` which triggers `onCreated`, which wraps `state.gl.render` with `endFrameEXP()` unconditionally.

**Fix:** Added a `__nativePatched` flag on the renderer instance. The wrap only executes if the flag is not set, then sets it. Subsequent `onCreated` calls skip the wrapping.

**How to Verify:**
1. Add `console.log` inside the wrapped render — should see exactly one `endFrameEXP` per frame, not increasing over time.
2. Toggle state rapidly on a component inside Canvas — frame rate should remain stable.
3. `npx jest` — all tests pass.

**Related Issues:**
- The `useIsomorphicLayoutEffect` with no deps is intentional (re-configures on every prop change), but means `onCreated` must be idempotent for all side effects.
