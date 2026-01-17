import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  target: 'node18',
  shims: true,
  // Note: shebang is in the source file, no banner needed
  clean: true,
  dts: true,
  external: ['react'],
  sourcemap: true,
});
