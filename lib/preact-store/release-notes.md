# 2.12.1

- tsconfig is ready for TypeScript 6: an explicit `rootDir`, `moduleResolution: "bundler"` instead of the deprecated node10 resolution and `module: "esnext"`. The `prepublish` build runs `tsc --build`, which would stop working on TypeScript 7

## 2.0.0

- subscribe callback called after state is updated.