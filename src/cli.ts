#!/usr/bin/env node

import * as fs from 'fs';
import * as os from 'os';
import * as kleur from 'kleur/colors';
import logUpdate from 'log-update';
import * as path from 'path';
import sade from 'sade';
import { scan } from './scan-task.js';
import { makeFileNameFromUrl, usefulDirName } from './utilities.js';
import { aggregateCSVReports } from './aggregate.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/*
This is a require because if it was an import, TS would copy package.json to `dist`
If TS copied package.json to `dist`, npm would not publish the JS files in `dist`
Since it is a require, TS leaves it as-is, which means that the require path
has to be relative to the built version of this file in the dist folder
It may in the future make sense to use a bundler to combine all the dist/ files into one file,
(including package.json) which would eliminate this problem
*/
// eslint-disable-next-line @cloudfour/typescript-eslint/no-var-requires
const { version } = require('../../package.json');

const symbols = {
  error: kleur.red('✖'),
  success: kleur.green('✔'),
};

const toArray = <T extends unknown>(input: T) =>
  Array.isArray(input) ? input : [input];

/** Returns whether the given path is a full URL (with protocol, domain, etc.) */
const isFullURL = (path: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(path);
    return true;
  } catch {}

  return false;
};

sade('lighthouse-parade <url> [dataDirectory]', true)
  .version(version)
  .example(
    'https://cloudfour.com --exclude-path-glob "/thinks/*" --max-crawl-depth 2'
  )
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
  .option(
    '--lighthouse-concurrency',
    'Control the maximum number of ligthhouse reports to run concurrently',
    os.cpus().length - 1
  )
  .option(
    '--max-crawl-depth',
    'Control the maximum depth of crawled links. 1 means only the entry page will be used. 2 means the entry page and any page linked directly from the entry page will be used.'
  )
  .option(
    '--include-path-glob',
    'Specify a glob (in quotes) for paths to match. Links to non-matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to allow multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.'
  )
  .option(
    '--exclude-path-glob',
    'Specify a glob (in quotes) for paths to exclude. Links to matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to exclude multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.'
  )
  .action(
    (
      url,
      // eslint-disable-next-line default-param-last
      dataDirPath = path.join(
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
      const reportsDirPath = path.join(dataDirPath, 'reports');
      fs.mkdirSync(reportsDirPath, { recursive: true });

      const userAgent: unknown = opts['crawler-user-agent'];
      if (userAgent !== undefined && typeof userAgent !== 'string') {
        throw new Error('--crawler-user-agent must be a string');
      }

      const maxCrawlDepth: unknown = opts['max-crawl-depth'];

      if (maxCrawlDepth !== undefined && typeof maxCrawlDepth !== 'number') {
        throw new Error('--max-crawl-depth must be a number');
      }

      const includePathGlob: unknown[] = toArray(
        opts['include-path-glob'] as unknown
      ).filter((glob) => glob !== undefined);

      if (includePathGlob.some((glob) => typeof glob !== 'string')) {
        throw new Error('--include-path-glob must be string(s)');
      }

      if ((includePathGlob as string[]).some(isFullURL)) {
        throw new Error('--include-path-glob must be path(s), not full URL(s)');
      }

      const excludePathGlob: unknown[] = toArray(
        opts['exclude-path-glob'] as unknown
      ).filter((glob) => glob !== undefined);

      if (excludePathGlob.some((glob) => typeof glob !== 'string')) {
        throw new Error('--exclude-path-glob must be string(s)');
      }

      if ((excludePathGlob as string[]).some(isFullURL)) {
        throw new Error('--exclude-path-glob must be path(s), not full URL(s)');
      }

      const lighthouseConcurrency = opts['lighthouse-concurrency'];

      const scanner = scan(url, {
        ignoreRobotsTxt,
        dataDirectory: dataDirPath,
        lighthouseConcurrency,
        maxCrawlDepth,
        includePathGlob: includePathGlob as string[],
        excludePathGlob: excludePathGlob as string[],
      });

      const enum State {
        Pending,
        ReportInProgress,
        ReportComplete,
      }
      const urlStates = new Map<
        string,
        { state: State; error?: Error | string }
      >();

      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let i = 0;

      const printLine = (url: string, state: State, error?: Error | string) => {
        const frame = kleur.blue(frames[i]);
        const statusIcon = error
          ? symbols.error
          : state === State.Pending
          ? ' '
          : state === State.ReportInProgress
          ? frame
          : symbols.success;
        let output = `${statusIcon} ${url}`;
        if (error) {
          output += `\n  ${kleur.gray(error.toString())}`;
        }

        return output;
      };

      const render = () => {
        const pendingUrls: string[] = [];
        const currentUrls: string[] = [];
        // eslint-disable-next-line @cloudfour/unicorn/no-array-for-each
        urlStates.forEach(({ state, error }, url) => {
          if (state === State.ReportComplete) return;
          const line = `${printLine(url, state, error)}\n`;
          if (state === State.Pending) pendingUrls.push(line);
          else currentUrls.push(line);
        });
        const numPendingToDisplay = Math.min(
          Math.max(process.stdout.rows - currentUrls.length - 3, 1),
          pendingUrls.length
        );
        const numHiddenUrls =
          numPendingToDisplay === pendingUrls.length
            ? ''
            : kleur.dim(
                `\n...And ${
                  pendingUrls.length - numPendingToDisplay
                } more pending`
              );
        logUpdate(
          currentUrls.join('') +
            pendingUrls.slice(0, numPendingToDisplay).join('') +
            numHiddenUrls
        );
      };

      const intervalId = setInterval(() => {
        i = (i + 1) % frames.length;
        render();
      }, 80);

      /**
       * Allows you to run a console.log that will output _above_ the persistent logUpdate log
       * Pass a callback where you run your console.log or console.error
       */
      const printAboveLogUpdate = (cb: () => void) => {
        logUpdate.clear();
        cb();
        render();
      };

      const log = (...messages: any[]) =>
        printAboveLogUpdate(() => console.log(...messages));
      const warn = (...messages: any[]) =>
        printAboveLogUpdate(() => console.log(...messages));

      const urlsFile = path.join(dataDirPath, 'urls.csv');
      fs.writeFileSync(urlsFile, 'URL,content_type,bytes,response\n');
      const urlsStream = fs.createWriteStream(urlsFile, { flags: 'a' });

      scanner.on('urlFound', (url, contentType, bytes, statusCode) => {
        urlStates.set(url, { state: State.Pending });
        const csvLine = [
          JSON.stringify(url),
          contentType,
          bytes,
          statusCode,
        ].join(',');
        urlsStream.write(`${csvLine}\n`);
      });
      scanner.on('reportBegin', (url) => {
        urlStates.set(url, { state: State.ReportInProgress });
      });
      scanner.on('reportFail', (url, error) => {
        urlStates.set(url, { state: State.ReportComplete, error });
        log(printLine(url, State.ReportComplete, error));
      });
      scanner.on('reportComplete', (url, reportData) => {
        urlStates.set(url, { state: State.ReportComplete });
        log(printLine(url, State.ReportComplete));
        const reportFileName = makeFileNameFromUrl(url, 'csv');

        fs.writeFileSync(path.join(reportsDirPath, reportFileName), reportData);
      });

      scanner.on('info', (message) => {
        log(message);
      });

      scanner.on('warning', (message) => {
        warn(message);
      });

      scanner.promise.then(async () => {
        clearInterval(intervalId);

        console.log('Aggregating reports...');

        await aggregateCSVReports(dataDirPath);

        console.log('DONE!');
      });
    }
  )
  .parse(process.argv);
