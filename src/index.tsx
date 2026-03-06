/**
 * @fileoverview React Native bindings for @react-three/fiber
 *
 * This package provides React Native support for react-three-fiber.
 * It re-exports core fiber functionality and adds native-specific Canvas and polyfills.
 *
 * Usage:
 *   import { Canvas } from '@react-three/native'
 *
 * With custom GL context provider:
 *   import { Canvas, GLContextProvider } from '@react-three/native'
 *   <GLContextProvider value={MyCustomGLView}>
 *     <Canvas>...</Canvas>
 *   </GLContextProvider>
 */

// Re-export everything from fiber for convenience
export * from '@react-three/fiber'

// Native-specific exports
export { Canvas, type CanvasProps } from './Canvas'
export { polyfills } from './polyfills'
export { createTouchEvents as events } from './events'

// Pluggable GL context
export { GLContextProvider, useGLContext, resetGLContext, type GLContextValue, type GLContextProps } from './context'

// Native hooks (recommended over polyfilled loaders for reliable GPU upload)
export { useNativeTexture, useNativeGLTF } from './hooks'

// Initialize polyfills on import (can be disabled by not importing from root)
// Pass three explicitly so the polyfill patches this module's three instance.
// Consumers may also need to call polyfills(THREE) with their own import if
// Metro resolves CJS/ESM to different three entry points.
import { Platform } from 'react-native'
import * as THREE from 'three'
import { polyfills } from './polyfills'

if (Platform.OS !== 'web') {
  polyfills(THREE)
}
