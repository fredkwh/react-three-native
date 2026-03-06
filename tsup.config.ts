import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react-native',
    'three',
    '@react-three/fiber',
    'expo',
    'expo-gl',
    'expo-asset',
    'expo-file-system',
    'its-fine',
    'base64-js',
    'buffer',
    'jpeg-js',
    'upng-js',
    'pako',
  ],
  outExtension({ format }) {
    return {
      js: format === 'cjs' ? '.cjs.js' : '.esm.js',
    }
  },
})
