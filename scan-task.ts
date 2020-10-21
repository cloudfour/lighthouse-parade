import fs from 'fs';
import path from 'path';
import { runLighthouseReport } from './lighthouse';
import { aggregateCSVReports } from './combine';
import { isContentTypeHtml } from './utilities';
import type { CrawlOptions } from './crawl';
import { crawl as defaultCrawler } from './crawl';
import { createEmitter } from './emitter';

interface ScanOptions extends CrawlOptions {
  /** Where to store the newly-generated reports */
  dataDirectory: string;
  /**
   * Function to determine whether to run lighthouse on a given URL
   * The intended use case for this is to skip URL's where there are already reports saved from previous runs.
   */
  shouldRunLighthouseOnURL: (url: string) => boolean;
  crawler?: typeof defaultCrawler;
  lighthouse?: typeof runLighthouseReport;
}

type ScanEvents = {
  warning: (message: string | Error) => void;
  info: (message: string) => void;
  reportComplete: (url: string, reportData: string) => void;
  urlFound: (
    url: string,
    contentType: string,
    bytes: number,
    statusCode: number
  ) => void;
};

export const scan = (
  siteUrl: string,
  {
    crawler = defaultCrawler,
    lighthouse = runLighthouseReport,
    dataDirectory,
    shouldRunLighthouseOnURL,
    ...opts
  }: ScanOptions
) => {
  const { promise, on, emit } = createEmitter<ScanEvents>();
  // Set up for lighthouse reports
  const reportDirName = 'reports';
  const reportsDirPath = `${dataDirectory}/${reportDirName}`;

  fs.mkdirSync(dataDirectory, { recursive: true });
  /** Used so we can display an error if no pages are found while crawling */
  let hasFoundAnyPages = false;

  emit('info', 'Starting the crawl...');

  const crawlerEmitter = crawler(siteUrl, opts);

  crawlerEmitter.on('urlFound', (url, contentType, bytes, statusCode) => {
    hasFoundAnyPages = true;
    // TODO in code review: move this console.log up to cli
    console.log('Crawled %s [%s] (%d bytes)', url, contentType, bytes);
    if (!isContentTypeHtml(contentType)) return;
    emit('urlFound', url, contentType, bytes, statusCode);
    // TODO in code review: should non-HTML URL's be written to the urls.csv and logged or not?
    // TODO in code review: How common is the use case where it does "skipping report because file already exists"? If it is uncommon, can we remove it?
    if (!shouldRunLighthouseOnURL(url)) return;
    lighthouse(url)
      .then((reportData) => {
        emit('reportComplete', url, reportData);
      })
      .catch((error) => emit('warning', error));
  });

  crawlerEmitter.on('warning', (message) => emit('warning', message));

  crawlerEmitter.promise.then(() => {
    emit('info', 'Scan complete');

    if (!hasFoundAnyPages) {
      emit(
        'warning',
        `No pages were found for this site. The two most likely reasons for this are:
1) the URL is incorrect
2) the crawler is being denied by a robots.txt file`
      );
      return;
    }

    emit('info', 'Aggregating reports...');
    const aggregatedReportData = aggregateCSVReports(reportsDirPath);
    if (!aggregatedReportData) return;

    const writePath = path.join(dataDirectory, 'aggregatedMobileReport.csv');
    fs.writeFile(writePath, aggregatedReportData, (e) => {
      if (e) emit('warning', e);
    });
    emit('info', 'DONE!');
  });
  return { promise, on };
};
