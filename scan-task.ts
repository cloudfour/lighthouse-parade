import fs from 'fs';
import path from 'path';
import { runLighthouseReport } from './lighthouse';
import { aggregateCSVReports } from './combine';
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
    emit('urlFound', url, contentType, bytes, statusCode);
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
    // TODO: Make aggregateCSVReports work without filesystem, for testing
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
