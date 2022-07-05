import { createRequire } from 'node:module';
import * as os from 'node:os';
import * as path from 'node:path';

// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import logUpdate from 'log-update';
import sade from 'sade';
import tinydate from 'tinydate';

import type { URLState, URLStates } from './main.js';
import { State, main } from './main.js';

const require = createRequire(import.meta.url);

/*
This is a require because if it was an import, TS would copy package.json to `dist`
If TS copied package.json to `dist`, npm would not publish the JS files in `dist`
Since it is a require, TS leaves it as-is, which means that the require path
has to be relative to the built version of this file in the dist folder
It may in the future make sense to use a bundler to combine all the dist/ files into one file,
(including package.json) which would eliminate this problem
*/
const { version } = require('../package.json');

const symbols = {
  error: kleur.red('✖'),
  success: kleur.green('✔'),
};

const toArray = <T>(input: T) =>
  Array.isArray(input) ? input : input === undefined ? [] : [input];

/** Returns whether the given path is a full URL (with protocol, domain, etc.) */
const isFullURL = (path: string) => {
  try {
    // eslint-disable-next-line no-new
    new URL(path);
    return true;
  } catch {}

  return false;
};

sade('lighthouse-parade <url>', true)
  .version(version)
  .example(
    'https://cloudfour.com --exclude-path-glob "/thinks/*" --max-crawl-depth 2 --output cloudfour-a.csv'
  )
  .describe(
    'Crawls the site at the provided URL, recording the lighthouse scores for each URL found.'
  )
  .option(
    '--output, -o',
    'The output file(s). Can be specified multiple times, e.g. -o cloudfour-a.csv -o google-sheets'
  )
  .option(
    '--ignore-robots-txt',
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
  .action(async (url, opts) => {
    if (!isFullURL(url)) {
      throw new Error('The input URL must be a full URL (with protocol, etc.)');
    }

    const ignoreRobotsTxt: boolean = opts['ignore-robots-txt'];

    const outputs: string[] = toArray(opts.output);
    if (outputs.length === 0) {
      const siteName = new URL(url).hostname.replace(/[^\da-z]+/gi, '-');
      const date = tinydate('{YYYY}-{MM}-{DD}-{HH}:{mm}')(new Date());
      outputs.push(`lighthouse-${siteName}-${date}.csv`);
    }

    const crawlerUserAgent: unknown = opts['crawler-user-agent'];
    if (
      crawlerUserAgent !== undefined &&
      typeof crawlerUserAgent !== 'string'
    ) {
      throw new Error('--crawler-user-agent must be a string');
    }

    const maxCrawlDepth: number | undefined = opts['max-crawl-depth'];

    if (maxCrawlDepth !== undefined && typeof maxCrawlDepth !== 'number') {
      throw new Error('--max-crawl-depth must be a number');
    }

    const includePathGlob: string[] = toArray(opts['include-path-glob']);

    if (includePathGlob.some((glob) => typeof glob !== 'string')) {
      throw new Error('--include-path-glob must be string(s)');
    }

    if (includePathGlob.some(isFullURL)) {
      throw new Error('--include-path-glob must be path(s), not full URL(s)');
    }

    const excludePathGlob: string[] = toArray(opts['exclude-path-glob']);

    if (excludePathGlob.some((glob) => typeof glob !== 'string')) {
      throw new Error('--exclude-path-glob must be string(s)');
    }

    if (excludePathGlob.some(isFullURL)) {
      throw new Error('--exclude-path-glob must be path(s), not full URL(s)');
    }

    const lighthouseConcurrency: number = opts['lighthouse-concurrency'];
    if (typeof lighthouseConcurrency !== 'number') {
      throw new TypeError('--lighthouse-concurrency must be a number');
    }

    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((f) =>
      kleur.blue(f)
    );
    let i = 0;

    const printLine = (url: string, urlState: URLState) => {
      const frame = frames[i];
      const statusIcon =
        urlState.state === State.Failure
          ? symbols.error
          : urlState.state === State.Pending
          ? ' '
          : urlState.state === State.InProgress
          ? frame
          : symbols.success;
      let output = `${statusIcon} ${url}`;
      if (urlState.state === State.Failure) {
        output += `\n  ${kleur.gray(urlState.error.toString())}`;
      }

      return output;
    };

    // URLS which have completed (successfully or with a failure)
    const completedURLs = new Set<URLState>();

    const render = (urlStates: URLStates) => {
      logUpdate.clear();
      const pendingUrls: string[] = [];
      const currentUrls: string[] = [];

      for (const [url, urlState] of urlStates.entries()) {
        if (
          urlState.state === State.Success ||
          urlState.state === State.Failure
        ) {
          if (!completedURLs.has(urlState)) {
            completedURLs.add(urlState);
            console.log(printLine(url, urlState));
          }

          continue;
        }

        const line = `${printLine(url, urlState)}\n`;
        if (urlState.state === State.Pending) pendingUrls.push(line);
        else currentUrls.push(line);
      }

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

    /**
     * Allows you to run a console.log that will output _above_ the persistent logUpdate log
     * Pass a callback where you run your console.log or console.error
     */
    const printAboveLogUpdate = (cb: () => void) => {
      logUpdate.clear();
      cb();
      render(runStatus.state);
    };

    const modifiedConsole: ModifiedConsole = {
      log: (...messages: any[]) =>
        printAboveLogUpdate(() => console.log(...messages)),
      warn: (...messages: any[]) =>
        printAboveLogUpdate(() => console.warn(...messages)),
      error: (...messages: any[]) =>
        printAboveLogUpdate(() => console.error(...messages)),
    };

    const command = [
      path.basename(process.argv[1]), // This will usually be lighthouse-parade if referencing the global install
      ...process.argv // These are all of the CLI args as strings
        .slice(2)
        // We quote args that have asterisks in them, so you can paste the command directly in your shell
        // without your shell trying to expand the asterisks.
        .map((chunk) => (chunk.includes('*') ? JSON.stringify(chunk) : chunk)),
    ].join(' ');

    const runStatus = await main(
      url,
      {
        includePathGlob,
        excludePathGlob,
        ignoreRobotsTxt,
        outputs,
        maxCrawlDepth,
        crawlerUserAgent,
        lighthouseConcurrency,
      },
      modifiedConsole,
      command,
      version
    );

    const intervalId = setInterval(() => {
      i = (i + 1) % frames.length;
      render(runStatus.state);
    }, 80);

    await runStatus.start();
    render(runStatus.state);
    clearInterval(intervalId);
  })
  .parse(process.argv);

export interface ModifiedConsole {
  log: (...messages: any[]) => void;
  warn: (...messages: any[]) => void;
  error: (...messages: any[]) => void;
}
