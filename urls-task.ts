import Crawler from 'simplecrawler';
import fs from 'fs';
import path from 'path';
import { makeUrlRow } from './utilities';
import type { QueueItem } from 'simplecrawler/queue';
import type { IncomingMessage } from 'http';

const siteUrl = process.argv[2];
const crawler = new Crawler(siteUrl);
crawler.respectRobotsTxt = true;

const dir = path.join(process.cwd(), 'data', `${Date.now()}`);
fs.mkdirSync(dir, { recursive: true });
const file = `${dir}/urls.csv`;
fs.writeFileSync(file, 'URL,content_type,bytes,response\n', {
  encoding: 'utf-8',
});
console.log('Created CSV file');
const stream = fs.createWriteStream(file, { flags: 'a' });

// Set up the crawler
crawler.on('fetchcomplete', function (queueItem, responseBuffer, response) {
  console.log(
    'Fetched %s [%s] (%d bytes)',
    queueItem.url,
    response.headers['content-type'],
    responseBuffer.length
  );
  stream.write(makeUrlRow(queueItem, responseBuffer, response));
});

crawler.on('complete', function () {
  console.log('Crawling complete');
});

crawler.on('fetcherror', logError);
crawler.on('fetch404', logError);
crawler.on('fetch410', logError);

function logError(queueItem: QueueItem, response: IncomingMessage) {
  console.log(`Error fetching (${response.statusCode}): ${queueItem.url}`);
}

console.log('Starting the crawl...');
crawler.start();
