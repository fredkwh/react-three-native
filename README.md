# @react-three/native

React Native bindings for [@react-three/fiber](https://github.com/pmndrs/react-three-fiber), extracted from the v10 branch and maintained as a standalone community package.

## Installation

```bash
# Install core packages
npm install @react-three/fiber @react-three/native three

# Install expo dependencies
npx expo install expo-gl expo-asset expo-file-system
```

> **Note:** R3F v10 is currently in alpha. You may need `--legacy-peer-deps` for installation.

## Usage

```tsx
import { Canvas } from '@react-three/native'

function App() {
  return (
    <Canvas>
      <mesh>
        <boxGeometry />
        <meshStandardMaterial color="orange" />
      </mesh>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
    </Canvas>
  )
}
```

### useNativeTexture

Load remote JPEG/PNG textures with reliable GPU upload on expo-gl:

```tsx
import { useNativeTexture } from '@react-three/native'

function TexturedBox() {
  const texture = useNativeTexture('https://example.com/texture.jpg')

  return (
    <mesh>
      <boxGeometry />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}
```

`useNativeTexture` handles async image decoding (pure JS via jpeg-js/upng-js) and defers the GPU texture upload to `useFrame`, which is required for expo-gl's command batching model.

### useNativeGLTF

Load GLTF/GLB models with automatic texture patching:

```tsx
import { Suspense } from 'react'
import { useNativeGLTF } from '@react-three/native'

function Model() {
  const gltf = useNativeGLTF('https://example.com/model.glb')
  return <primitive object={gltf.scene} />
}

// Wrap in Suspense
<Suspense fallback={null}>
  <Model />
</Suspense>
```

## Migration from v9

```diff
- import { Canvas } from '@react-three/fiber/native'
+ import { Canvas } from '@react-three/native'
```

Install the new package alongside fiber:

```bash
npm install @react-three/fiber @react-three/native three
npx expo install expo-gl expo-asset expo-file-system
```

## API

### Canvas

Accepts all the same props as the web Canvas, with native-specific behavior:

- Uses `expo-gl` for GL context by default
- Automatically applies native DPR via `PixelRatio.get()`
- Touch events are translated to pointer events via PanResponder

```tsx
<Canvas camera={{ position: [0, 0, 5] }} onCreated={(state) => console.log('Ready!')}>
  {/* Your 3D scene */}
</Canvas>
```

### Polyfills

Polyfills are automatically applied on import. They patch `THREE.TextureLoader`, `THREE.FileLoader`, `URL.createObjectURL`, and `THREE.LoaderUtils` so Three.js loaders work on React Native.

### Custom GL Context

For future WebGPU support or custom GL implementations:

```tsx
import { Canvas, GLContextProvider } from '@react-three/native'

<GLContextProvider value={{ GLView: CustomGLView, contextType: 'webgl' }}>
  <Canvas>{/* Your scene */}</Canvas>
</GLContextProvider>
```

## Known Limitations

- **GLTF PBR textures render black** on expo-gl. Simple models with single textures work; complex PBR (multiple texture maps) does not flush correctly. Use `MeshBasicMaterial` or load textures individually with `useNativeTexture` as a workaround.
- **`frameloop="demand"` not supported** — expo-gl's `endFrameEXP()` doesn't fire in demand mode. Use `frameloop="always"` (the default).
- **Multi-touch not supported** — PanResponder only reports the primary touch.
- **expo-gl limitations** — `pixelStorei` not fully supported, `EXT_color_buffer_float` missing, `texStorage2D` locks texture dimensions.

See [NATIVE_STATUS.md](./NATIVE_STATUS.md) for the full compatibility matrix and verified feature list.

## Requirements

- React Native >= 0.78
- Expo SDK >= 43
- React >= 19
- Three.js >= 0.181.2
- @react-three/fiber ^10.0.0

## License

MIT
