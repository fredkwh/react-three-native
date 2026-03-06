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

import { NativeModules, Platform } from 'react-native'
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

//* Image Decoding ==============================

/**
 * Decode an image file (JPEG or PNG) to raw RGBA pixel data.
 * Uses pure JS decoders (jpeg-js, upng-js) so no native image APIs are needed.
 * expo-gl only supports TypedArray data in texImage2D — it cannot load from
 * file URIs despite having loadImage() in native code.
 */
async function decodeImageToRGBA(uri: string): Promise<{ data: Uint8Array; width: number; height: number }> {
  const fs = getFileSystem()
  if (!fs) {
    throw new Error('[@react-three/native] expo-file-system is required for image decoding')
  }

  const base64 = await fs.readAsStringAsync(uri, { encoding: fs.EncodingType.Base64 })
  const bytes = Buffer.from(base64, 'base64')

  // Detect format from magic bytes
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    // JPEG
    const jpeg = require('jpeg-js')
    const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true })
    return { data: new Uint8Array(decoded.data), width: decoded.width, height: decoded.height }
  } else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    // PNG
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

  // expo-gl only supports TypedArray pixel data in texImage2D/texSubImage2D.
  // Its loadImage() with localUri objects does not work.
  //
  // Additionally, expo-gl batches GL commands and only flushes them via
  // endFrameEXP() at the end of gl.render(). Textures created after the first
  // render frame must already exist as GL objects — we can't create new GL
  // textures from async callbacks outside the render loop.
  //
  // Strategy: create a 1x1 placeholder DataTexture synchronously (so the GL
  // texture is allocated on the first render frame), then async decode the image
  // to raw RGBA pixels and swap the data in-place. Setting needsUpdate = true
  // bumps source.version; three.js detects the version mismatch on the next
  // render frame (inside gl.render → endFrameEXP) and re-uploads.
  T.TextureLoader.prototype.load = function load(this: any, url: any, onLoad: any, onProgress: any, onError: any) {
    if (this.path && typeof url === 'string') url = this.path + url

    // 1x1 transparent placeholder — returned synchronously
    const placeholder = new Uint8Array(4)
    const texture = new T.DataTexture(placeholder, 1, 1, T.RGBAFormat)
    texture.needsUpdate = true

    this.manager.itemStart(url)

    getAsset(url)
      .then(async (uri: string) => {
        const { data, width, height } = await decodeImageToRGBA(uri)

        // Swap pixel data on the existing texture object.
        // Three.js will detect source.version change and re-upload
        // during the next gl.render() call (flushed by endFrameEXP).
        texture.image = { data, width, height }
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
