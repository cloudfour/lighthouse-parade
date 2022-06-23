import * as kleur from 'kleur/colors';
import Crawler from 'simplecrawler';
import type { QueueItem } from 'simplecrawler/queue.js';
import type { IncomingMessage } from 'http';
import type { ModifiedConsole } from './cli.js';
import type { ReadonlyAsyncIteratorQueue } from './async-iterator-queue.js';
import { asyncIteratorQueue } from './async-iterator-queue.js';
import { createUrlFilter } from './create-url-filter.js';

export interface CrawlOptions {
  /** Whether to crawl pages even if they are listed in the site's robots.txt */
  ignoreRobotsTxt: boolean;
  crawlerUserAgent?: string;
  /** Maximum depth of fetched links */
  maxCrawlDepth?: number;
  /** Any path that doesn't match these globs will not be crawled. If the array is empty, all paths are allowed. */
  includePathGlob: string[];
  /** Any path that matches these globs will not be crawled. */
  excludePathGlob: string[];
}

export function crawl(
  initialUrl: string,
  opts: CrawlOptions,
  console: ModifiedConsole
): ReadonlyAsyncIteratorQueue<string> {
  const crawler = new Crawler(initialUrl);
  if (opts.crawlerUserAgent) crawler.userAgent = opts.crawlerUserAgent;
  crawler.respectRobotsTxt = !opts.ignoreRobotsTxt;
  if (opts.maxCrawlDepth !== undefined) crawler.maxDepth = opts.maxCrawlDepth;

  const initialPath = new URL(initialUrl).pathname;

  const resultsQueue = asyncIteratorQueue<string>();
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
    resultsQueue.push(url);
  });

  crawler.on('complete', () => {
    resultsQueue.finish();
  });

  const logWarning = (queueItem: QueueItem, response: IncomingMessage) => {
    console.warn(
      `${kleur.yellow('⚠')} Error fetching (${response.statusCode}): ${
        queueItem.url
      }`
    );
  };
  crawler.on('fetcherror', logWarning);
  crawler.on('fetch404', logWarning);
  crawler.on('fetch410', logWarning);

  crawler.start();

  return resultsQueue;
}
