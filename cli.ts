#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import sade from 'sade';
import { scan } from './scan-task';
import { makeFileNameFromUrl, usefulDirName } from './utilities';
/*
This is a require because if it was an import, TS would copy package.json to `dist`
If TS copied package.json to `dist`, npm would not publish the JS files in `dist`
Since it is a require, TS leaves it as-is, which means that the require path
has to be relative to the built version of this file in the dist folder
It may in the future make sense to use a bundler to combine all the dist/ files into one file,
(including package.json) which would eliminate this problem
*/
// eslint-disable-next-line @cloudfour/typescript-eslint/no-var-requires
const { version } = require('../package.json');

sade('lighthouse-parade <url> [dataDirectory]', true)
  .version(version)
  .describe(
    'Crawls the site at the provided URL, recording the lighthouse scores for each URL found. The lighthouse data will be stored in the provided directory, which defaults to ./data/YYYY-MM-DDTTZ_HH_MM'
  )
  .option(
    '--ignore-robots',
    "Crawl pages even if they are listed in the site's robots.txt",
    false
  )
  .option(
    '--crawler-user-agent',
    'Pass a user agent string to be used by the crawler (not by Lighthouse)'
  )
  .action(
    (
      url,
      // eslint-disable-next-line default-param-last
      dataDirectory = path.join(
        process.cwd(),
        'lighthouse-parade-data',
        usefulDirName()
      ),
      opts
    ) => {
      // We are attempting to parse the URL here, so that if the user passes an invalid URL,
      // the prorgam will exit here instead of continuing (which would lead to a more confusing error)
      // eslint-disable-next-line no-new
      new URL(url);
      const ignoreRobotsTxt: boolean = opts['ignore-robots'];
      const reportsDirPath = path.join(dataDirectory, 'reports');
      fs.mkdirSync(reportsDirPath, { recursive: true });

      const userAgent: unknown = opts['crawler-user-agent'];
      if (userAgent !== undefined && typeof userAgent !== 'string') {
        throw new Error('--crawler-user-agent flag must be a string');
      }

      const scanner = scan(url, { ignoreRobotsTxt, dataDirectory });

      const urlsFile = path.join(dataDirectory, 'urls.csv');
      fs.writeFileSync(urlsFile, 'URL,content_type,bytes,response\n');
      const urlsStream = fs.createWriteStream(urlsFile, { flags: 'a' });

      scanner.on('urlFound', (url, contentType, bytes, statusCode) => {
        console.log('Crawled %s [%s] (%d bytes)', url, contentType, bytes);
        const csvLine = [
          JSON.stringify(url),
          contentType,
          bytes,
          statusCode,
        ].join(',');
        urlsStream.write(`${csvLine}\n`);
      });
      scanner.on('reportComplete', (url, reportData) => {
        console.log('Report is done for', url);
        const reportFileName = makeFileNameFromUrl(url, 'csv');

        fs.writeFileSync(path.join(reportsDirPath, reportFileName), reportData);
      });

      scanner.on('info', (message) => {
        console.log(message);
      });
    }
  )
  .parse(process.argv);
