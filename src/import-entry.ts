import type { ConfigOptions } from './config.js';

export const defineConfig = (config: ConfigOptions): ConfigOptions => config;

export type { ConfigOptions } from './config.js';

export { console } from './cli.js';

export { defaultCrawler } from './crawl.js';
