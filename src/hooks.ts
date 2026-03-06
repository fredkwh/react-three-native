/**
 * @fileoverview Native texture loading hook for React Three Fiber.
 *
 * expo-gl constraints:
 * - Only supports TypedArray pixel data in texImage2D (no localUri/image objects)
 * - Uses texStorage2D (immutable) — texture size is locked on first upload
 * - Batches GL commands, only flushing via endFrameEXP() at end of gl.render()
 *
 * The useNativeTexture hook handles all of this internally:
 * 1. Creates a 1x1 placeholder DataTexture (NOT uploaded — needsUpdate=false)
 * 2. Async downloads + decodes image to raw RGBA pixels (jpeg-js / upng-js)
 * 3. Inside useFrame, swaps the pixel data and sets needsUpdate=true
 *    so the upload happens within gl.render() → endFrameEXP()
 *
 * Usage:
 *   import { useNativeTexture } from '@react-three/native'
 *
 *   function MyMesh() {
 *     const texture = useNativeTexture('https://example.com/texture.jpg')
 *     return (
 *       <mesh>
 *         <meshStandardMaterial map={texture} />
 *       </mesh>
 *     )
 *   }
 */

import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Buffer } from 'buffer'

// Lazy-load expo deps and decoders (same pattern as polyfills.ts)
const getFileSystem = () => {
  try {
    return require('expo-file-system/legacy')
  } catch {
    try {
      return require('expo-file-system')
    } catch {
      return null
    }
  }
}

const getExpoAsset = () => {
  try {
    return require('expo-asset').Asset
  } catch {
    return null
  }
}

async function loadAndDecode(url: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const Asset = getExpoAsset()
  const fs = getFileSystem()

  if (!Asset || !fs) {
    throw new Error(
      '[@react-three/native] expo-asset and expo-file-system are required for useNativeTexture. ' +
        'Install them with: npx expo install expo-asset expo-file-system',
    )
  }

  // Download
  const asset = Asset.fromURI ? Asset.fromURI(url) : Asset.fromModule(url)
  await asset.downloadAsync()
  const uri = asset.localUri || asset.uri

  // Read as binary
  const base64 = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 })
  const bytes = Buffer.from(base64, 'base64')

  // Detect format and decode
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const jpeg = require('jpeg-js')
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true })
    return { data: new Uint8Array(decoded.data), width: decoded.width, height: decoded.height }
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    const UPNG = require('upng-js')
    const img = UPNG.decode(bytes.buffer)
    const rgba = UPNG.toRGBA8(img)
    return { data: new Uint8Array(rgba[0]), width: img.width, height: img.height }
  } else {
    throw new Error(
      `[@react-three/native] Unsupported image format (magic: 0x${bytes[0]?.toString(16)}${bytes[1]?.toString(16)}). ` +
        'Only JPEG and PNG are supported.',
    )
  }
}

/**
 * Load a remote or local image as a Three.js DataTexture.
 *
 * Returns a DataTexture immediately (1x1 placeholder). The actual image
 * is decoded asynchronously and swapped in during a useFrame callback,
 * ensuring the GL upload happens within the render loop.
 *
 * @param url - URL string or require() asset ID
 * @param onLoad - Optional callback when texture data is ready
 * @param onError - Optional callback on failure
 */
export function useNativeTexture(
  url: string | number,
  onLoad?: (texture: THREE.DataTexture) => void,
  onError?: (error: Error) => void,
): THREE.DataTexture {
  const pendingRef = useRef<{ data: Uint8Array; width: number; height: number } | null>(null)

  // Create placeholder texture once — 1x1, NOT uploaded (needsUpdate=false)
  const texture = useMemo(() => {
    const placeholder = new Uint8Array(4)
    return new THREE.DataTexture(placeholder, 1, 1, THREE.RGBAFormat)
  }, [])

  // Download + decode in background
  useEffect(() => {
    let cancelled = false

    loadAndDecode(String(url))
      .then((result) => {
        if (!cancelled) {
          pendingRef.current = result
        }
      })
      .catch((err) => {
        if (!cancelled) {
          onError?.(err instanceof Error ? err : new Error(String(err)))
        }
      })

    return () => {
      cancelled = true
    }
  }, [url])

  // Swap data inside the render loop so GL commands flush via endFrameEXP
  useFrame(() => {
    if (pendingRef.current) {
      const { data, width, height } = pendingRef.current
      pendingRef.current = null

      texture.image = { data, width, height }
      texture.needsUpdate = true

      onLoad?.(texture)
    }
  })

  return texture
}

// Texture property names to patch on GLTF materials
const TEXTURE_PROPS = [
  'map', 'normalMap', 'emissiveMap', 'aoMap', 'metalnessMap',
  'roughnessMap', 'bumpMap', 'displacementMap', 'envMap',
  'lightMap', 'alphaMap',
] as const

function patchSceneTextures(scene: THREE.Object3D): void {
  const patched = new Set<number>()
  scene.traverse((child: any) => {
    if (!child.isMesh || !child.material) return
    const materials = Array.isArray(child.material) ? child.material : [child.material]
    for (const mat of materials) {
      for (const prop of TEXTURE_PROPS) {
        const tex = mat[prop]
        if (!tex) continue
        if (patched.has(tex.id)) continue
        patched.add(tex.id)

        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        tex.needsUpdate = true
      }
    }
  })
}

/**
 * Load a GLTF/GLB model with expo-gl-compatible texture handling.
 *
 * Uses useLoader(GLTFLoader) internally (triggers Suspense). On the first
 * frame after load, patches all material textures to disable mipmaps
 * (which expo-gl can't generate for DataTextures) and forces re-upload
 * within the render loop via needsUpdate.
 *
 * @param url - URL string or require() asset ID
 */
export function useNativeGLTF(url: string | number): GLTF {
  const gltf = useLoader(GLTFLoader, String(url))
  const patchedRef = useRef(false)

  useFrame(() => {
    if (!patchedRef.current && gltf?.scene) {
      patchedRef.current = true
      patchSceneTextures(gltf.scene)
    }
  })

  return gltf
}
