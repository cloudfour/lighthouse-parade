import Crawler from 'simplecrawler';
import type { QueueItem } from 'simplecrawler/queue.js';
import type { IncomingMessage } from 'http';
import { createEmitter } from './emitter.js';
import { isContentTypeHtml } from './utilities.js';
import globrex from 'globrex';

export interface CrawlOptions {
  /** Whether to crawl pages even if they are listed in the site's robots.txt */
  ignoreRobotsTxt: boolean;
  userAgent?: string;
  /** Maximum depth of fetched links */
  maxCrawlDepth?: number;
  /** Any path that doesn't match these globs will not be crawled. If the array is empty, all paths are allowed. */
  includePathGlob: string[];
  /** Any path that matches these globs will not be crawled. */
  excludePathGlob: string[];
}

export type CrawlerEvents = {
  urlFound: (
    url: string,
    contentType: string,
    bytes: number,
    statusCode: number
  ) => void;
  warning: (message: string | Error) => void;
};

export const crawl = (siteUrl: string, opts: CrawlOptions) => {
  const { on, emit, promise } = createEmitter<CrawlerEvents>();

  const crawler = new Crawler(siteUrl);
  if (opts.userAgent) crawler.userAgent = opts.userAgent;
  crawler.respectRobotsTxt = !opts.ignoreRobotsTxt;
  if (opts.maxCrawlDepth !== undefined) crawler.maxDepth = opts.maxCrawlDepth;

  const initialPath = new URL(siteUrl).pathname;

  crawler.addFetchCondition(
    createUrlFilter(
      opts.includePathGlob.length > 0
        ? [...opts.includePathGlob, initialPath]
        : [],
      opts.excludePathGlob
    )
  );

  const emitWarning = (queueItem: QueueItem, response: IncomingMessage) => {
    emit(
      'warning',
      `Error fetching (${response.statusCode}): ${queueItem.url}`
    );
  };

  crawler.on('fetchcomplete', (queueItem, responseBuffer, response) => {
    const url = queueItem.url;
    const contentType = response.headers['content-type'];
    if (!isContentTypeHtml(contentType)) return;
    const statusCode = response.statusCode;
    if (!contentType || !statusCode) return;
    emit('urlFound', url, contentType, responseBuffer.length, statusCode);
  });

  crawler.on('complete', () => emit('resolve'));

  crawler.on('fetcherror', emitWarning);
  crawler.on('fetch404', emitWarning);
  crawler.on('fetch410', emitWarning);

  crawler.start();

  return { on, promise };
};

export const createUrlFilter = (
  includeGlob: string[],
  excludeGlob: string[]
) => {
  const pathIncludeRegexes = includeGlob.map(
    (glob) => globrex(glob.replace(/\/$/, ''), globOpts).regex
  );
  const pathExcludeRegexes = excludeGlob.map(
    (glob) => globrex(glob.replace(/\/$/, ''), globOpts).regex
  );
  return ({ path }: { path: string }) => {
    const withoutTrailingSlash = path.replace(/\/$/, '');
    return (
      (pathIncludeRegexes.length === 0 ||
        pathIncludeRegexes.some((regex) => regex.test(withoutTrailingSlash))) &&
      !pathExcludeRegexes.some((regex) => regex.test(withoutTrailingSlash))
    );
  };
};

const globOpts: globrex.Options = { globstar: true, extended: true };
