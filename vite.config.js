// @ts-check

import { defineConfig } from 'vite';

// Used for vitest
export default defineConfig({
  esbuild: {
    target: 'node14',
  },
  test: {
    includeSource: ['src/**/*.{js,ts}'],
  },
});
