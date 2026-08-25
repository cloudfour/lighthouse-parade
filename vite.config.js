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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      // Only the shipped source. The default sweep pulls in config files and
      // flatters the number.
      include: ['src/**'],
      // The CLI is exercised by spawning the built binary rather than by
      // importing it, so the v8 provider sees none of that work. Counting it
      // would report 0% for code the smoke tests do cover.
      exclude: ['src/cli.ts', 'src/crawl.mock.ts'],
    },
  },
});
