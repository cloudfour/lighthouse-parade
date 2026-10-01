// @ts-check

import { defineConfig, mergeConfig } from 'vite';

import baseConfig from './vite.config.js';

// Used by `npm run test:integration`, for the tests that need a real Chrome.
// Those files are named `*.integration.ts` rather than `*.test.ts` so that
// vitest's default pattern, and therefore `npm test`, never picks them up.
const config = mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      include: ['test/**/*.integration.ts'],
      // A Lighthouse run takes 10–20 seconds locally and longer on a CI runner.
      testTimeout: 120_000,
      hookTimeout: 120_000,
    },
  }),
);

export default config;
