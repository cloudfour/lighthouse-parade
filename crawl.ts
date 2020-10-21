import Crawler from 'simplecrawler';
import type { QueueItem } from 'simplecrawler/queue';
import type { IncomingMessage } from 'http';
import { createEmitter } from './emitter';

export interface CrawlOptions {
  /** Whether to crawl pages even if they are listed in the site's robots.txt */
  ignoreRobotsTxt: boolean;
  userAgent?: string;
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

  const emitWarning = (queueItem: QueueItem, response: IncomingMessage) => {
    emit(
      'warning',
      `Error fetching (${response.statusCode}): ${queueItem.url}`
    );
  };

  crawler.on('fetchcomplete', (queueItem, responseBuffer, response) => {
    const url = queueItem.url;
    const contentType = response.headers['content-type'];
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
