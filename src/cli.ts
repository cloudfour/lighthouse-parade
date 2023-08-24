import { createRequire } from 'node:module';
import * as path from 'node:path';

// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import logUpdate from 'log-update';
import sade from 'sade';
import tinydate from 'tinydate';
import * as z from 'zod';

import { configSchema, parseConfig } from './config.js';
import { crawl, crawlOptionsSchema } from './crawl.js';
import type { RunOptions, URLState, URLStates } from './main.js';
import { State, main } from './main.js';
import { type Output, OutputType } from './output-writer/index.js';

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

let modifiedConsole: ModifiedConsole = global.console;

export { modifiedConsole as console };

const symbols = {
  error: kleur.red('✖'),
  success: kleur.green('✔'),
};

/** Returns whether the given path is a full URL (with protocol, domain, etc.) */
const isFullURL = (path: unknown): path is string => {
  if (typeof path !== 'string') return false;
  try {
    // eslint-disable-next-line no-new
    new URL(path);
    return true;
  } catch {}

  return false;
};

const allLighthouseCategories = [
  'accessibility',
  'best-practices',
  'performance',
  'pwa',
  'seo',
] as const;

type RawFlags = Record<
  string,
  string | boolean | string[] | boolean[] | undefined
> & { _: (string | number | boolean)[] };

const cli = sade('lighthouse-parade [url]', true)
  .version(version)
  .example(
    'https://cloudfour.com --exclude-path-glob "/thinks/*" --max-crawl-depth 2 --output cloudfour-a.csv',
  )
  .describe(
    'Crawls the site at the provided URL, recording the Lighthouse scores for each URL found.',
  );

const allFlags: string[] = [];
const booleanFlags: string[] = [];

const toArray = <T>(value: T) =>
  (Array.isArray(value) ? value : [value]) as T extends any[] ? T : [T];

/** For use in a Zod transform. Passes through undefined values (to support .optional) */
const stringToNumber = <T>(
  input: T,
  ctx: z.RefinementCtx,
): T extends undefined ? undefined : number => {
  if (input === undefined) return undefined as any;
  const num = Number(input);
  if (input === '' || typeof input !== 'string' || Number.isNaN(num)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Expected a numerical value, received ${JSON.stringify(input)}`,
    });
    return z.NEVER;
  }

  return num as any;
};

const indent = (lines: string) =>
  lines
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');

/** Prints a value as "" if it is an empty string, without quotes otherwise */
const printVal = (val: unknown) => `${val === '' ? '""' : val}`;

const nth = (input: number) => {
  const lastDigit = Math.abs(input % 10);
  if (lastDigit === 1) return `${input}st`;
  if (lastDigit === 2) return `${input}nd`;
  if (lastDigit === 3) return `${input}rd`;
  return `${input}th`;
};

const addOption = <Schema extends z.Schema>(
  nameAndAliases: string[],
  description: string,
  schema: Schema,
): ((rawFlags: RawFlags) => z.infer<typeof schema>) => {
  cli.option(nameAndAliases.join(', '), description);
  const mainFlagName = nameAndAliases[0];
  const flagNameWithoutDashes = mainFlagName.replace(/^--/, '');
  allFlags.push(flagNameWithoutDashes);

  const isBoolean =
    schema instanceof z.ZodBoolean ||
    (schema instanceof z.ZodOptional &&
      schema.unwrap() instanceof z.ZodBoolean);

  if (isBoolean) booleanFlags.push(flagNameWithoutDashes);

  return (rawFlags) => {
    const value = rawFlags[flagNameWithoutDashes];
    const parsed = schema.safeParse(value);
    if (parsed.success) {
      return parsed.data;
    }
    const errors = parsed.error.issues.map((issue) => {
      if (issue.code === 'invalid_type' && issue.received === 'array') {
        return kleur.red(
          'This flag can only be passed once, received multiple',
        );
      }
      if (issue.code === 'invalid_type' && issue.received === 'undefined') {
        return kleur.red('This flag is required, but was missing');
      }
      if (issue.path.length === 1 && Array.isArray(value) && value.length > 1) {
        const issueIndex = issue.path[0] as number;
        return `${kleur.red(issue.message)} (from ${nth(
          issueIndex + 1,
        )} ${mainFlagName} flag, value: ${printVal(value[issueIndex])})`;
      }
      return kleur.red(issue.message);
    });
    const isMissing =
      parsed.error.issues.length === 1 &&
      parsed.error.issues[0].code === 'invalid_type' &&
      parsed.error.issues[0].received === 'undefined';

    console.error(
      `Unable to parse flag ${nameAndAliases
        .map((name) => kleur.red(name))
        .join(' / ')}:${errors.length > 1 ? '\n' : ' '}${errors.join('\n')}.
${
  isMissing
    ? ''
    : `\nReceived: ${toArray(value)
        .map((val) => `${mainFlagName} ${printVal(val)}`)
        .join(' ')}\n`
}
Help text for ${nameAndAliases.join(' / ')}:
${indent(description)}`,
    );
    process.exit(1);
  };
};

const allowMultiple = <Schema extends z.Schema>(valueType: Schema) =>
  z
    .unknown()
    .transform((value) => toArray(value))
    .pipe(z.array(valueType));

const configFileFlag = addOption(
  ['--config', '-c'],
  'The config file to read options from. If this is passed, no other CLI flags may be passed.',
  z.string().optional(),
);

const outputsFlag = addOption(
  ['--output', '-o'],
  'The output file(s). CSV and Google Sheets are supported. Can be passed multiple times for multiple outputs. Example: -o cloudfour-a.csv -o google-sheets -o google-sheets:"Spreadsheet Name"',
  allowMultiple(z.string())
    .optional()
    .transform((outputs = [], ctx): RunOptions['outputs'] => {
      if (outputs.length === 0) {
        outputs.push(`lighthouse-{sitename}-{timestamp}.csv`);
      }
      return outputs.map((output, i): Output => {
        if (output === 'google-sheets') {
          return {
            type: OutputType.GoogleSheets,
            title: `Lighthouse {hostname} {timestamp}`,
          };
        }
        const googleSheetsPrefix = 'google-sheets:';
        if (output.startsWith(googleSheetsPrefix)) {
          return {
            type: OutputType.GoogleSheets,
            title: output.slice(googleSheetsPrefix.length),
          };
        }
        const ext = path.extname(output);
        if (ext === '.csv')
          return {
            type: OutputType.CSV,
            filename: output,
          };
        ctx.addIssue({
          code: 'custom',
          path: [i],
          message: `Invalid output value: ${output}. Expected <filename>.csv, or google-sheets, or google-sheets:"<title>"`,
        });
        return z.NEVER;
      });
    }),
);

const lighthouseConcurrencyFlag = addOption(
  ['--lighthouse-concurrency'],
  'Control the maximum number of Lighthouse reports to run concurrently',
  z
    .string()
    .optional()
    .transform(stringToNumber)
    .pipe(configSchema.shape.lighthouseConcurrency),
);
const lighthouseOnlyCategoriesFlag = addOption(
  ['--lighthouse-category'],
  `Only run the specified Lighthouse category. Available categories: ${allLighthouseCategories.join(
    ', ',
  )}. Multiple can be specified by passing the flag multiple times, e.g. --lighthouse-category accessibility --lighthouse-category seo. If not specified, all categories will be used.`,
  allowMultiple(z.enum(allLighthouseCategories)).optional(),
);
const ignoreRobotsTxtFlag = addOption(
  ['--ignore-robots-txt'],
  "Crawl pages even if they are listed in the site's robots.txt (boolean)",
  crawlOptionsSchema.shape.ignoreRobotsTxt,
);
const crawlerUserAgentFlag = addOption(
  ['--crawler-user-agent'],
  'Pass a user agent string to be used by the crawler (not by Lighthouse) (string)',
  crawlOptionsSchema.shape.crawlerUserAgent,
);
const maxCrawlDepthFlag = addOption(
  ['--max-crawl-depth'],
  'Control the maximum depth of crawled links. 1 means only the entry page will be used. 2 means the entry page and any page linked directly from the entry page will be used.',
  z
    .string()
    .optional()
    .transform(stringToNumber)
    .pipe(crawlOptionsSchema.shape.maxCrawlDepth),
);
const includePathGlobFlag = addOption(
  ['--include-path-glob'],
  'Specify a glob (in quotes) for paths to match. Links to non-matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to allow multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.',
  allowMultiple(z.string())
    .optional()
    .pipe(crawlOptionsSchema.shape.includePathGlob),
);
const excludePathGlobFlag = addOption(
  ['--exclude-path-glob'],
  'Specify a glob (in quotes) for paths to exclude. Links to matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to exclude multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.',
  allowMultiple(z.string())
    .optional()
    .pipe(crawlOptionsSchema.shape.excludePathGlob),
);

cli
  .action(async (url, rawFlags: RawFlags) => {
    const configFile = configFileFlag(rawFlags);

    let runOpts: RunOptions;

    if (configFile) {
      const extraInput = [
        ...(url === undefined ? [] : [url]),
        ...rawFlags._,
        ...Object.entries(rawFlags)
          .filter(
            ([k, v]) =>
              k !== '_' && k !== 'c' && k !== 'config' && v !== undefined,
          )
          .map(([k, _v]) => k),
      ];
      if (extraInput.length > 0) {
        console.error(
          kleur.red(
            `Unexpected CLI input: ${extraInput.join(
              ', ',
            )}. When the --config / -c flag is passed, it must be the only flag/input.`,
          ),
        );
        process.exit(1);
      }
      const configModule = await import(path.join(process.cwd(), configFile));
      if (!('default' in configModule)) {
        console.error(
          kleur.red(
            `The config file ${configFile} must export the configuration object as the default export.`,
          ),
        );
        process.exit(1);
      }
      runOpts = parseConfig(configSchema, configModule.default, 'config');
    } else {
      if (!isFullURL(url)) {
        console.error(
          kleur.red(
            `The input URL must be a full URL (with protocol, etc.). Received ${JSON.stringify(
              url,
            )}`,
          ),
        );
        process.exit(1);
      }

      if (rawFlags._.length > 0) {
        console.error(kleur.red(`Unexpected CLI input: ${rawFlags._[0]}`));
        process.exit(1);
      }

      const hostname = new URL(url).hostname;
      // For file names, we need to take out non-ASCII characters
      const hostnameReduced = hostname.replace(/[^\da-z]+/gi, '-');
      const timestamp = tinydate('{YYYY}-{MM}-{DD} {HH}:{mm}')(new Date());
      const outputs = outputsFlag(rawFlags).map(
        (output): Output =>
          output.type === OutputType.CSV
            ? {
                type: OutputType.CSV,
                filename: output.filename
                  .replaceAll('{timestamp}', timestamp)
                  .replaceAll('{hostname}', hostnameReduced),
              }
            : {
                type: OutputType.GoogleSheets,
                title: output.title
                  .replaceAll('{timestamp}', timestamp)
                  .replaceAll('{hostname}', hostname),
              },
      );

      const ignoreRobotsTxt = ignoreRobotsTxtFlag(rawFlags);
      const crawlerUserAgent = crawlerUserAgentFlag(rawFlags);
      const maxCrawlDepth = maxCrawlDepthFlag(rawFlags);
      const includePathGlob = includePathGlobFlag(rawFlags);
      const excludePathGlob = excludePathGlobFlag(rawFlags);
      const lighthouseConcurrency = lighthouseConcurrencyFlag(rawFlags);
      const lighthouseCategories = lighthouseOnlyCategoriesFlag(rawFlags) ?? [
        ...allLighthouseCategories,
      ];

      runOpts = {
        outputs,
        lighthouseConcurrency,
        lighthouseSettings: {
          onlyCategories: lighthouseCategories,
        },
        getURLs: crawl({
          initialUrl: url,
          ignoreRobotsTxt,
          crawlerUserAgent,
          maxCrawlDepth,
          includePathGlob,
          excludePathGlob,
        }),
      };
    }

    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'].map((f) =>
      kleur.blue(f),
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
        pendingUrls.length,
      );
      const numHiddenUrls =
        numPendingToDisplay === pendingUrls.length
          ? ''
          : kleur.dim(
              `\n...And ${
                pendingUrls.length - numPendingToDisplay
              } more pending`,
            );
      logUpdate(
        currentUrls.join('') +
          pendingUrls.slice(0, numPendingToDisplay).join('') +
          numHiddenUrls,
      );
    };

    const command = [
      // This will usually be lighthouse-parade if referencing the global install
      path.basename(process.argv[1]),
      ...process.argv // These are all of the CLI args as strings
        .slice(2)
        // We quote args that have asterisks in them,
        // so you can paste the command directly in your shell
        // without your shell trying to expand the asterisks.
        .map((chunk) => (chunk.includes('*') ? JSON.stringify(chunk) : chunk)),
    ].join(' ');

    const runStatus = await main(runOpts, command, version);

    const intervalId = setInterval(() => {
      i = (i + 1) % frames.length;
      render(runStatus.state);
    }, 80);

    /**
     * Allows you to run a console.log that will output _above_ the persistent logUpdate log
     * Pass a callback where you run your console.log or console.error
     */
    const printAboveLogUpdate = (cb: () => void) => {
      logUpdate.clear();
      cb();
      render(runStatus.state);
    };

    modifiedConsole = {
      log: (...messages: any[]) =>
        printAboveLogUpdate(() => console.log(...messages)),
      warn: (...messages: any[]) =>
        printAboveLogUpdate(() => console.warn(...messages)),
      error: (...messages: any[]) =>
        printAboveLogUpdate(() => console.error(...messages)),
    };

    await runStatus.start();
    clearInterval(intervalId);
    render(runStatus.state);
  })
  .parse(process.argv, {
    boolean: booleanFlags,
    string: allFlags.filter((flag) => !booleanFlags.includes(flag)),
    unknown: (flag) => {
      console.error(kleur.red(`${flag} is not a valid flag`));
      console.log('\nHere is how to use the lighthouse-parade CLI:');
      cli.help();
      process.exit(1);
    },
  });

export interface ModifiedConsole {
  log: (...messages: any[]) => void;
  warn: (...messages: any[]) => void;
  error: (...messages: any[]) => void;
}
