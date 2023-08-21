import type { IncomingMessage } from 'node:http';

// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import SimpleCrawler from 'simplecrawler';
import type { QueueItem } from 'simplecrawler/queue.js';
import * as z from 'zod';

import { console } from './cli.js';
import { type AssertEqual, parseConfig } from './config.js';
import { createUrlFilter } from './create-url-filter.js';
import type { Crawler } from './main.js';

export const crawlOptionsSchema = z.object({
  initialUrl: z.string().url(),
  ignoreRobotsTxt: z.boolean().default(false),
  crawlerUserAgent: z.string().optional(),
  maxCrawlDepth: z.number().int().positive().optional(),
  includePathGlob: z.array(z.string()).default([]),
  excludePathGlob: z.array(z.string()).default([]),
});

interface CrawlOptions {
  /** The starting URL which will be crawled first */
  initialUrl: string;
  /** Whether to crawl pages even if they are listed in the site's robots.txt */
  ignoreRobotsTxt?: boolean;
  /** Pass a user agent string to be used by the crawler (not by Lighthouse) */
  crawlerUserAgent?: string;
  /** Maximum depth of fetched links */
  maxCrawlDepth?: number;
  /**
   * Any path that doesn't match these globs will not be crawled.
   * If the array is empty, all paths are allowed.
   */
  includePathGlob?: string[];
  /** Any path that matches these globs will not be crawled */
  excludePathGlob?: string[];
}

// Forces us to keep the manually-written type above in sync with the generated type from zod
// The manually-written type is there for the sake of preserving doc comments in the generated .d.ts
export type Check1 = AssertEqual<
  CrawlOptions,
  z.input<typeof crawlOptionsSchema>
>;

export const defaultCrawler = (opts: CrawlOptions): Crawler =>
  crawl(parseConfig(crawlOptionsSchema, opts, 'crawlerOptions'));

export const crawl =
  (opts: z.output<typeof crawlOptionsSchema>): Crawler =>
  (emitURL) =>
    new Promise((resolve, _reject) => {
      const { initialUrl } = opts;
      const crawler = new SimpleCrawler(initialUrl);
      if (opts.crawlerUserAgent) crawler.userAgent = opts.crawlerUserAgent;
      crawler.respectRobotsTxt = !opts.ignoreRobotsTxt;
      if (opts.maxCrawlDepth !== undefined)
        crawler.maxDepth = opts.maxCrawlDepth;

      const initialPath = new URL(initialUrl).pathname;

      crawler.addFetchCondition(
        createUrlFilter(
          opts.includePathGlob.length > 0
            ? [...opts.includePathGlob, initialPath]
            : [],
          opts.excludePathGlob
        )
      );

      crawler.on('fetchcomplete', (queueItem, _responseBuffer, response) => {
        const url = queueItem.url;
        const contentType = response.headers['content-type'];
        if (!contentType || !/html/i.test(contentType)) return;
        const statusCode = response.statusCode;
        if (!contentType || !statusCode) return;
        emitURL(url);
      });

      crawler.on('complete', () => {
        resolve();
      });

      // eslint-disable-next-line @cloudfour/unicorn/consistent-function-scoping
      const logWarning = (queueItem: QueueItem, response: IncomingMessage) => {
        console.warn(
          `${kleur.yellow('⚠')} Error fetching (${response.statusCode}): ${
            queueItem.url
          } - referrer: ${queueItem.referrer}`
        );
      };
      crawler.on('fetcherror', logWarning);
      crawler.on('fetch404', logWarning);
      crawler.on('fetch410', logWarning);

      crawler.start();
    });
