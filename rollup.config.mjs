import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import * as esbuild from 'esbuild';
import { resolve } from 'import-meta-resolve';
import { defineConfig } from 'rollup';

/**
 * @param {esbuild.TransformOptions} config
 * @returns {import('rollup').Plugin}
 */
const esbuildPlugin = (config) => ({
  name: 'esbuild',
  async transform(code, id) {
    try {
      const result = await esbuild.transform(code, {
        sourcefile: id,
        loader: loader(path.extname(id)),
        ...config,
      });
      return result.code;
    } catch (error) {
      this.error(error, error.errors?.[0].location);
    }
  },
});

const loader = (ext) => (ext === '.ts' || ext === '.mts' ? 'ts' : 'js');

/**
 * Changes ./asdf.js import paths to look for a file ./asdf.ts if necessary
 * @returns {import('rollup').Plugin}
 */
const jsToTsResolvePlugin = () => ({
  name: 'js-to-ts-resolver',
  async resolveId(id, importer) {
    if (!id.endsWith('.js') || !importer.endsWith('.ts')) return;
    const resolvedByOthers = await this.resolve(id, importer, {
      skipSelf: true,
    });
    if (resolvedByOthers) return resolvedByOthers;
    return this.resolve(id.replace(/js$/, 'ts'), importer, {
      skipSelf: true,
    });
  },
});

/**
 * Changes ./asdf.js import paths to look for a file ./asdf.ts if necessary
 * @returns {import('rollup').Plugin}
 */
const nodeResolvePlugin = () => ({
  name: 'node-resolver',
  async resolveId(id, importer) {
    if (id.startsWith('node:')) return { id, external: true };
    if (id.startsWith('.') || !importer) return;
    const resolved = await resolve(id, pathToFileURL(importer)).catch(() => {});
    if (!resolved) return;
    if (resolved.startsWith('file:')) return fileURLToPath(resolved);
  },
});

export default defineConfig({
  input: ['./src/cli.ts', './src/lighthouse-worker.ts'],
  plugins: [
    esbuildPlugin({
      define: { 'import.meta.vitest': undefined },
      target: 'node14',
    }),
    jsToTsResolvePlugin(),
    nodeResolvePlugin(),
  ],
  output: { dir: 'dist' },
  preserveEntrySignatures: false,
  external: [
    'lighthouse',
    'chrome-launcher',
    'log-update',
    'simplecrawler',
    'globrex',
    'sade',
    'tinydate',
    'google-auth-library',
    /googleapis/,
    'open',
  ],
});
