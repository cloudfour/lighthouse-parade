import http from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, describe, test } from 'vitest';

import { type CrawlOptions, crawl } from '../src/crawl.js';

import { html, startFixtureServer } from './support/fixture-server.js';

/**
 * These run the real simplecrawler against a local server, unlike
 * scan-task.test.ts, which swaps in the fake from crawl.mock.ts. The site is
 * three levels deep, with non-HTML resources, a robots.txt rule, and broken
 * links mixed in.
 */
const routes = {
  '/': html(`
    <link rel="stylesheet" href="/styles.css">
    <a href="/a">A</a>
    <a href="/b">B</a>
    <a href="/data.json">Data</a>
    <a href="/private/secret">Secret</a>
    <a href="/missing">Missing</a>
    <a href="/broken">Broken</a>
  `),
  '/a': html('<a href="/a/deep">Deep</a>'),
  '/a/deep': html('<p>The bottom.</p>'),
  '/b': html('<a href="/">Home</a>'),
  '/private/secret': html('<p>Hidden from crawlers.</p>'),
  '/styles.css': { contentType: 'text/css', body: 'body { color: red; }' },
  '/data.json': { contentType: 'application/json', body: '{"ok":true}' },
  '/broken': { status: 500, contentType: 'text/html', body: 'Oops' },
  '/robots.txt': {
    contentType: 'text/plain',
    body: 'User-agent: *\nDisallow: /private/\n',
  },
};

const defaultOptions: CrawlOptions = {
  ignoreRobotsTxt: false,
  includePathGlob: [],
  excludePathGlob: [],
};

const runCrawl = async (url: string, opts: Partial<CrawlOptions> = {}) => {
  const urls: { url: string; contentType: string; statusCode: number }[] = [];
  const warnings: string[] = [];
  const { on, promise } = crawl(url, { ...defaultOptions, ...opts });
  on('urlFound', (found, contentType, _bytes, statusCode) => {
    urls.push({ url: found, contentType, statusCode });
  });
  on('warning', (message) => {
    warnings.push(String(message));
  });
  await promise;
  return { urls, warnings };
};

const paths = (urls: { url: string }[]) =>
  urls.map(({ url }) => new URL(url).pathname).toSorted();

// The simplecrawler queue waits 250ms between queue checks, which isn't configurable
// through `crawl`, so each crawl takes a second or two. Running them
// concurrently keeps the file fast enough for every PR.
describe.concurrent('crawl against a local site', () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  let defaultCrawl: Awaited<ReturnType<typeof runCrawl>>;

  beforeAll(async () => {
    server = await startFixtureServer(routes);
    defaultCrawl = await runCrawl(`${server.origin}/`);
  });

  afterAll(async () => {
    await server.close();
  });

  test('follows links and reports each HTML page once', ({ expect }) => {
    const { urls } = defaultCrawl;
    expect(paths(urls)).toEqual(['/', '/a', '/a/deep', '/b']);
    for (const found of urls) {
      expect(found.statusCode).toBe(200);
      expect(found.contentType).toMatch(/^text\/html/v);
    }
  });

  test('skips non-HTML responses, including robots.txt itself', ({
    expect,
  }) => {
    const found = paths(defaultCrawl.urls);
    expect(found).not.toContain('/styles.css');
    expect(found).not.toContain('/data.json');
    expect(found).not.toContain('/robots.txt');
  });

  test('respects --max-crawl-depth', async ({ expect }) => {
    const { urls } = await runCrawl(`${server.origin}/`, { maxCrawlDepth: 2 });
    expect(paths(urls)).toEqual(['/', '/a', '/b']);
  });

  test('a max depth of 1 crawls only the entry page', async ({ expect }) => {
    const { urls } = await runCrawl(`${server.origin}/`, { maxCrawlDepth: 1 });
    expect(paths(urls)).toEqual(['/']);
  });

  test('crawls pages disallowed by robots.txt when told to ignore it', async ({
    expect,
  }) => {
    const { urls } = await runCrawl(`${server.origin}/`, {
      ignoreRobotsTxt: true,
    });
    expect(paths(urls)).toContain('/private/secret');
  });

  test('applies path globs to discovered links', async ({ expect }) => {
    const { urls } = await runCrawl(`${server.origin}/`, {
      excludePathGlob: ['/a/**'],
    });
    expect(paths(urls)).toEqual(['/', '/a', '/b']);
  });

  test('warns about 404s and server errors without stopping', ({ expect }) => {
    const { urls, warnings } = defaultCrawl;
    expect(warnings).toEqual(
      expect.arrayContaining([
        `Error fetching (404): ${server.origin}/missing`,
        `Error fetching (500): ${server.origin}/broken`,
      ]),
    );
    expect(paths(urls)).toContain('/b');
  });

  test('skips pages disallowed by robots.txt', ({ expect }) => {
    expect(paths(defaultCrawl.urls)).not.toContain('/private/secret');
  });
});

test('warns when the site cannot be reached', async ({ expect }) => {
  // Grab a free port, then close it, so nothing is listening there.
  const closed = http.createServer();
  await new Promise<void>((resolve) => {
    closed.listen(0, '127.0.0.1', resolve);
  });
  const { port } = closed.address() as AddressInfo;
  await new Promise((resolve) => closed.close(resolve));

  const { urls, warnings } = await runCrawl(`http://127.0.0.1:${port}/`);
  expect(urls).toEqual([]);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toBe(
    `Error fetching (ECONNREFUSED): http://127.0.0.1:${port}/`,
  );
});
