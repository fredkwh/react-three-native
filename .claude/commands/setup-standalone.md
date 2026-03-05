This package was extracted from a monorepo that used preconstruct. It needs a standalone build setup.

Set up:
1. tsconfig.json — strict TypeScript, target ES2020, jsx react-jsx, moduleResolution bundler. Exclude tests and mocks.
2. Build tool — use tsup (lightweight, handles CJS + ESM + .d.ts). Output to dist/ matching the package.json main/module/types fields.
3. Jest config — for running tests/canvas.test.tsx with the existing __mocks__/
4. Update package.json scripts: build, dev, test, typecheck, lint
5. Add .gitignore for node_modules/, dist/, .turbo/
6. Verify: run typecheck, run build, run test

Do NOT change any source files in src/ during this setup. Only add config files and update package.json.
