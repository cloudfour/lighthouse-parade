import Crawler from 'simplecrawler';
import fs from 'fs';
import path from 'path';
import { runReport, makeFileNameFromUrl } from './lighthouse';
import { aggregateCSVReports } from './combine';
import { fileDoesntExist, isContentTypeHtml, makeUrlRow } from './utilities';
import type { QueueItem } from 'simplecrawler/queue';
import type { IncomingMessage } from 'http';

interface ScanOptions {
  /** Whether to crawl pages even if they are listed in the site's robots.txt */
  ignoreRobotsTxt: boolean;
  /** Where to store the newly-generated reports */
  dataDirectory: string;
}
export const scan = (siteUrl: string, opts: ScanOptions) => {
  const dir = opts.dataDirectory;
  // Set up for lighthouse reports
  const reportFormat = 'csv'; // Html works too
  const reportDirName = 'reports';
  const reportsDirPath = `${dir}/${reportDirName}`;
  fs.mkdirSync(reportsDirPath, { recursive: true });

  // Set up for crawler
  const crawler = new Crawler(siteUrl);
  crawler.respectRobotsTxt = !opts.ignoreRobotsTxt;
  fs.mkdirSync(dir, { recursive: true });
  const file = `${dir}/urls.csv`;
  fs.writeFileSync(file, 'URL,content_type,bytes,response\n', {
    encoding: 'utf-8',
  });
  /** Used so we can display an error if no pages are found while crawling */
  let hasFoundAnyPages = false;
  console.log('Created CSV file');
  const stream = fs.createWriteStream(file, { flags: 'a' });
  crawler.on('fetchcomplete', (queueItem, responseBuffer, response) => {
    hasFoundAnyPages = true;
    console.log(
      'Crawled %s [%s] (%d bytes)',
      queueItem.url,
      response.headers['content-type'],
      responseBuffer.length
    );
    stream.write(makeUrlRow(queueItem, responseBuffer, response));
    const reportFileName = makeFileNameFromUrl(queueItem.url, reportFormat);
    if (!fileDoesntExist(reportFileName, reportsDirPath)) {
      console.log('Skipping report because file already exists');
      return;
    }

    if (!isContentTypeHtml(response.headers['content-type'])) {
      return;
    }

    const reportData = runReport(queueItem.url, reportFormat);
    if (!reportData) return;
    fs.writeFileSync(`${reportsDirPath}/${reportFileName}`, reportData);
    console.log(`Wrote report for ${queueItem.url}`);
  });
  crawler.on('complete', function () {
    console.log('Scan complete');
    if (!hasFoundAnyPages) {
      console.error(`No pages were found for this site. The two most likely reasons for this are:
1) the URL is incorrect
2) the crawler is being denied by a robots.txt file`);
      return;
    }

    console.log('Aggregating reports...');
    const aggregatedReportData = aggregateCSVReports(reportsDirPath);
    if (!aggregatedReportData) return;

    const writePath = path.join(dir, 'aggregatedMobileReport.csv');
    fs.writeFile(writePath, aggregatedReportData, (e) => {
      if (e) {
        console.error(e);
      }
    });
    console.log('DONE!');
  });
  crawler.on('fetcherror', logError);
  crawler.on('fetch404', logError);
  crawler.on('fetch410', logError);
  function logError(queueItem: QueueItem, response: IncomingMessage) {
    console.log(`Error fetching (${response.statusCode}): ${queueItem.url}`);
  }

  console.log('Starting the crawl...');
  crawler.start();
};
