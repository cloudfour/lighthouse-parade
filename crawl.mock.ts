import type { CrawlerEvents } from './crawl';
import { createEmitter } from './emitter';

export const createFakeCrawler = () => {
  const { emit, on, promise } = createEmitter<CrawlerEvents>();
  return {
    fakeCrawler: () => ({
      promise,
      on,
    }),
    emit,
  };
};
