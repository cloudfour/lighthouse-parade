// @ts-check

import { defineConfig } from 'vite';

// Used for vitest
export default defineConfig({
  esbuild: {
    target: 'node22',
  },
  test: {
    // Vitest 4 narrowed its default exclude to node_modules and .git, where
    // Vitest 3 also excluded dist. `tsc` compiles the tests alongside src, so
    // without this the compiled copies under dist/test get collected too and
    // fail on fixture paths that only resolve from test/. Note that setting
    // `exclude` replaces the defaults rather than extending them, so the two
    // built-in patterns have to be repeated here.
    exclude: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
  },
});
