/**
 * @fileoverview React Native polyfills for Three.js
 *
 * These polyfills patch Three.js loaders and React Native APIs
 * to work correctly in the React Native environment.
 *
 * Usage:
 *   // Auto-apply all polyfills (patches bundled three instance):
 *   import '@react-three/native'
 *
 *   // Explicitly patch the consumer's three instance:
 *   import * as THREE from 'three'
 *   import { polyfills } from '@react-three/native'
 *   polyfills(THREE)
 */

import { Image, NativeModules, Platform } from 'react-native'
import { fromByteArray } from 'base64-js'
import { Buffer } from 'buffer'

//* Asset Loading ==============================

// Conditionally import expo-file-system/legacy to support Expo 54
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

// http://stackoverflow.com/questions/105034
function uuidv4() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0,
      v = c == 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

async function getAsset(input: string | number): Promise<string> {
  const fs = getFileSystem()
  const Asset = getExpoAsset()

  if (!fs || !Asset) {
    throw new Error(
      '[@react-three/native] expo-file-system and expo-asset are required for asset loading. ' +
        'Install them with: npx expo install expo-file-system expo-asset',
    )
  }

  if (typeof input === 'string') {
    // Don't process storage
    if (input.startsWith('file:')) return input

    // Unpack Blobs from react-native BlobManager
    // https://github.com/facebook/react-native/issues/22681#issuecomment-523258955
    if (input.startsWith('blob:') || input.startsWith(NativeModules.BlobModule?.BLOB_URI_SCHEME)) {
      const blob = await new Promise<Blob>((res, rej) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', input as string)
        xhr.responseType = 'blob'
        xhr.onload = () => res(xhr.response)
        xhr.onerror = rej
        xhr.send()
      })

      // Use readAsDataURL to correctly handle binary blob data.
      // readAsText would corrupt binary content (images, models, etc.)
      const dataUrl = await new Promise<string>((res, rej) => {
        const reader = new FileReader()
        reader.onload = () => res(reader.result as string)
        reader.onerror = rej
        reader.readAsDataURL(blob)
      })

      input = dataUrl
    }

    // Create safe URI for JSI serialization
    if (input.startsWith('data:')) {
      const [header, data] = input.split(';base64,')
      const [, type] = header.split('/')

      const uri = fs.cacheDirectory + uuidv4() + `.${type}`
      await fs.writeAsStringAsync(uri, data, { encoding: fs.EncodingType.Base64 })

      return uri
    }
  }

  // Download bundler module or external URL
  const asset = await Asset.fromModule(input).downloadAsync()
  let uri = asset.localUri || asset.uri

  // Unpack assets in Android Release Mode
  if (!uri.includes(':')) {
    const file = `${fs.cacheDirectory}ExponentAsset-${asset.hash}.${asset.type}`
    await fs.copyAsync({ from: uri, to: file })
    uri = file
  }

  return uri
}

//* Polyfills ==============================

let _globalApplied = false
const _patchedPrototypes = new WeakSet<object>()

/**
 * Patch Three.js loaders on a specific THREE module instance.
 * Uses a WeakSet to ensure each prototype is only patched once.
 */
function patchThreeLoaders(T: any) {
  if (_patchedPrototypes.has(T.TextureLoader.prototype)) return
  _patchedPrototypes.add(T.TextureLoader.prototype)

  // Save originals for this instance
  const origExtractUrlBase = T.LoaderUtils.extractUrlBase.bind(T.LoaderUtils)

  // Don't pre-process urls, let expo-asset generate an absolute URL
  T.LoaderUtils.extractUrlBase = (url: string) => (typeof url === 'string' ? origExtractUrlBase(url) : './')

  // expo-gl's native texImage2D/texSubImage2D accept { localUri } objects.
  // The C++ loadImage() in EXGLImageUtils uses stbi_load to decode the image
  // from a file:// path and upload raw pixels to the GPU.
  //
  // We create a regular THREE.Texture (not DataTexture) so three.js uses the
  // 6/7-arg texImage2D/texSubImage2D form which passes texture.image directly
  // to GL — expo-gl then detects the localUri property and handles decoding.
  T.TextureLoader.prototype.load = function load(this: any, url: any, onLoad: any, onProgress: any, onError: any) {
    if (this.path && typeof url === 'string') url = this.path + url

    const texture = new T.Texture()

    this.manager.itemStart(url)

    getAsset(url)
      .then(async (uri: string) => {
        const { width, height } = await new Promise<{ width: number; height: number }>((res, rej) =>
          Image.getSize(uri, (width, height) => res({ width, height }), rej),
        )

        // Set image as { localUri } for expo-gl's native image loading path.
        // expo-gl's EXGLImageUtils::loadImage checks for a localUri property,
        // decodes the image with stbi_load, and uploads raw RGBA pixels.
        texture.image = { localUri: uri, width, height }

        // expo-gl doesn't support UNPACK_FLIP_Y_WEBGL via pixelStorei —
        // the native stbi_load produces correctly oriented pixels already.
        texture.flipY = false
        texture.needsUpdate = true

        onLoad?.(texture)
      })
      .catch((error: any) => {
        onError?.(error)
        this.manager.itemError(url)
      })
      .finally(() => {
        this.manager.itemEnd(url)
      })

    return texture
  }

  // Fetches assets via FS
  const fs = getFileSystem()
  if (fs) {
    T.FileLoader.prototype.load = function load(this: any, url: any, onLoad: any, onProgress: any, onError: any) {
      if (this.path && typeof url === 'string') url = this.path + url

      this.manager.itemStart(url)

      getAsset(url)
        .then(async (uri: string) => {
          const base64 = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 })
          const data = Buffer.from(base64, 'base64')

          // Respect responseType like the original FileLoader
          switch (this.responseType) {
            case 'json':
              onLoad?.(JSON.parse(data.toString('utf-8')))
              break
            case '':
            case 'text':
              onLoad?.(data.toString('utf-8'))
              break
            default:
              // 'arraybuffer' and any other type
              onLoad?.(data.buffer)
              break
          }
        })
        .catch((error: any) => {
          onError?.(error)
          this.manager.itemError(url)
        })
        .finally(() => {
          this.manager.itemEnd(url)
        })
    }
  }
}

function applyGlobalPolyfills() {
  // Patch Blob for ArrayBuffer and URL if unsupported
  // https://github.com/facebook/react-native/pull/39276
  // https://github.com/pmndrs/react-three-fiber/issues/3058
  if (Platform.OS !== 'web') {
    try {
      const blob = new Blob([new ArrayBuffer(4) as any])
      const url = URL.createObjectURL(blob)
      URL.revokeObjectURL(url)
    } catch (_) {
      // Patch BlobManager for older RN versions that can't handle ArrayBuffer in Blob.
      // The internal module path may not exist in newer RN versions (>=0.83) — skip if so.
      try {
        const BlobManagerModule = require('react-native/Libraries/Blob/BlobManager.js')
        const BlobManager = BlobManagerModule.default ?? BlobManagerModule

        const origCreateObjectURL = URL.createObjectURL
        URL.createObjectURL = function (blob: Blob): string {
          if ((blob as any).data._base64) {
            return `data:${blob.type};base64,${(blob as any).data._base64}`
          }

          return origCreateObjectURL(blob)
        }

        const origCreateFromParts = BlobManager.createFromParts
        BlobManager.createFromParts = function (parts: Array<Blob | BlobPart | string>, options: any) {
          parts = parts.map((part) => {
            if (part instanceof ArrayBuffer || ArrayBuffer.isView(part)) {
              part = fromByteArray(new Uint8Array(part as ArrayBuffer))
            }

            return part
          })

          const blob = origCreateFromParts(parts, options)

          // Always enable slow but safe path for iOS (previously for Android unauth)
          // https://github.com/pmndrs/react-three-fiber/issues/3075
          blob.data._base64 = ''
          for (const part of parts) {
            blob.data._base64 += (part as any).data?._base64 ?? part
          }

          return blob
        }
      } catch (_) {
        // BlobManager not available — newer RN version likely handles Blob natively
      }
    }
  }
}

/**
 * Apply React Native polyfills for Three.js.
 *
 * Call without arguments to auto-patch (uses the bundled three instance):
 *   polyfills()
 *
 * Pass your THREE instance to guarantee the correct module is patched
 * (needed when Metro resolves CJS/ESM to different three entry points):
 *   import * as THREE from 'three'
 *   polyfills(THREE)
 *
 * Safe to call multiple times — global polyfills run once, THREE loader
 * patches are tracked per-prototype via WeakSet.
 */
export function polyfills(userTHREE?: any) {
  // Apply global polyfills (Blob, URL) once
  if (!_globalApplied) {
    _globalApplied = true
    applyGlobalPolyfills()
  }

  // Patch THREE loaders
  if (userTHREE) {
    patchThreeLoaders(userTHREE)
  } else {
    // Fallback: try to require three from this package's resolution context.
    // This may resolve to a different three entry point than the consumer's import
    // (CJS vs ESM via package.json exports), but it's better than nothing.
    try {
      patchThreeLoaders(require('three'))
    } catch {
      // three not available — skip loader patching
    }
  }
}
