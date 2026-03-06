import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.[jt]sx?$': [
      'ts-jest',
      {
        tsconfig: {
          jsx: 'react-jsx',
          module: 'CommonJS',
          moduleResolution: 'node',
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          allowJs: true,
          strict: true,
          target: 'ES2020',
        },
      },
    ],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: ['<rootDir>/tests/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/(?!(three|@react-three|its-fine)/)',
  ],
  moduleNameMapper: {
    '^three/webgpu$': 'three',
    '^three/tsl$': 'three',
    '^three/addons/inspector/(.*)$': '<rootDir>/__mocks__/empty.js',
  },
  // R3F's internal scheduler keeps a timer open after tests complete
  forceExit: true,
}

export default config
