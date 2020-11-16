#!/usr/bin/env node

import * as fs from 'fs';
import * as os from 'os';
import * as kleur from 'kleur/colors';
import logUpdate from 'log-update';
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

const symbols = {
  error: kleur.red('✖'),
  success: kleur.green('✔'),
};

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
  .option(
    '--lighthouse-concurrency',
    'Control the maximum number of ligthhouse reports to run concurrently',
    os.cpus().length - 1
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

      const lighthouseConcurrency = opts['lighthouse-concurrency'];

      const scanner = scan(url, {
        ignoreRobotsTxt,
        dataDirectory,
        lighthouseConcurrency,
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

      const log = (...messages: string[]) =>
        printAboveLogUpdate(() => console.log(...messages));

      const urlsFile = path.join(dataDirectory, 'urls.csv');
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

      scanner.promise.then(() => {
        clearInterval(intervalId);
        console.log('DONE!');
      });
    }
  )
  .parse(process.argv);
