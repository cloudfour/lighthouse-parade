![Lighthouse Parade Hero Image](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/hero.svg)

# Lighthouse Parade [![CI](https://github.com/cloudfour/lighthouse-parade/workflows/CI/badge.svg)](https://github.com/cloudfour/lighthouse-parade/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/lighthouse-parade)](https://www.npmjs.com/package/lighthouse-parade)

A Node.js command line tool that crawls a domain and compiles a report with lighthouse performance data for every page.

## Why?

There are great tools for doing performance analysis on a single web page. We use [Lighthouse](https://developers.google.com/web/tools/lighthouse) and [WebPageTest](https://webpagetest.org/) for this all the time. But what if you want to evaluate the performance characteristics of an entire site? It is tedious to manually run a report for each page and then the output is a jumble of individual reports that have to be analyzed one-by-one. This tool was created to solve this problem.

## How?

With a single command, the tool will crawl an entire site, run a Lighthouse report for each page, and then output a spreadsheet or CSV file with the aggregated data. [Here is an example of the produced output](https://docs.google.com/spreadsheets/d/1FNc5Rl4Tp2BruTBTRN7bAXToGpo9JgdN0OGvZsQ4igo).

![Screenshot of the produced spreadsheet showing Lighthouse data recorded for each visited page](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/example-sheet-1.png)

![Screenshot of the produced spreadsheet showing histograms of Lighthouse data](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/example-sheet-2.png)

## Installation/Usage

Make sure you have a recent Node version (Node 14+).

You can use `npx` to automatically install and run the tool:

```
npx lighthouse-parade <url> [options]
```

Or you can install it globally and run it this way:

```
npm i -g lighthouse-parade
lighthouse-parade <url> [options]
```

In the above commands, replace `<url>` with your starting URL to visit, and replace `[options]` with any additional options as needed. Lighthouse Parade will fetch the starting URL, and crawl your site for additional pages to visit. As it does, it will generate Lighthouse reports for the pages it finds.

### CLI Options

#### `-c`, `--config`

The config file to read options from. If this is passed, no other CLI flags may be passed. The [config file](#config-file) is described below.

#### `-o`, `--output`

The output file(s). CSV and Google Sheets are supported. It can be passed multiple times for multiple outputs.

Example: `-o cloudfour-a.csv -o google-sheets -o google-sheets:"Spreadsheet Name"`.

#### `--ignore-robots-txt`

Crawl pages even if they are listed in the site's `robots.txt`

#### `--crawler-user-agent`

Pass a user agent string to be used by the crawler (not by Lighthouse)

#### `--lighthouse-concurrency`

Control the maximum number of Lighthouse reports running concurrently (defaults to `os.cpus().length - 1`)

#### `--lighthouse-category`

Only run the specified Lighthouse category. Available categories: `accessibility`, `best-practices`, `performance`, `pwa`, `seo`. Multiple categories can be enabled by passing the flag multiple times, e.g. `--lighthouse-category accessibility --lighthouse-category seo`. If not specified, all categories will be used.

#### `--max-crawl-depth`

Control the maximum depth of crawled links. 1 means only the entry page will be used. 2 means the entry page and any page linked directly from the entry page will be used.

#### `--include-path-glob`

Specify a glob (in quotes) for paths to match. Links to non-matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to allow multiple paths.

`*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.

#### `--exclude-path-glob`

Specify a glob (in quotes) for paths to exclude. Links to matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to exclude multiple paths.

`*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.

#### `-v`, `--version`

Displays current version

#### `-h`, `--help`

Displays all of these options

#### Example with multiple options

```
lighthouse-parade https://cloudfour.com --exclude-path-glob "/thinks/*" --max-crawl-depth 2 --output cloudfour-a.csv
```

### Config File

A config file can be specified via `-c` or `--config`. It must be a JS file that provides a default export that is the configuration object.

Example `config.mjs`:

```js
// @ts-check

import { defaultCrawler, defineConfig } from 'lighthouse-parade';

export default defineConfig({
  outputs: [{ type: 'csv', name: 'cloudfour.csv' }],
  getURLs: defaultCrawler({
    initialUrl: 'https://cloudfour.com',
  }),
  lighthouseConcurrency: 2,
});
```

The `defineConfig` function is an optional pass-through function that only exists to provide editor types and autocompletion for the configuration object.

Here are the properties of the configuration object:

#### `config.outputs` (required)

An array of targets where the results will be saved. At least one is required. Each output must be one of the following types:

```ts
{
  type: 'google-sheets';
  /** The document title of the created Google Spreadsheet */
  name: string;
}
```

```ts
{
  type: 'csv';
  /** The filename of the CSV file */
  name: string;
}
```

#### `config.lighthouseSettings` (optional)

Options to be passed into Lighthouse. See [Lighthouse's .d.ts](https://github.com/GoogleChrome/lighthouse/blob/v11.0.0/types/lhr/settings.d.ts#L49-L117) for more details.

#### `config.getURLs` (required) (`(emitURL: (url: string) => void): Promise<void>`)

A function that generates the list of URLs to run Lighthouse on. You can use `defaultCrawler` to create this function, or use your own. The function will be passed a callback, `emitURL`, which should be called for each URL to enqueue.

You can supply your own URL-generating function for `getURLs` or you can use the built-in `defaultCrawler` ([see below](#defaultcrawler)).

#### `config.lighthouseConcurrency` (optional) (`number`)

Control the maximum number of Lighthouse reports running concurrently (defaults to `os.cpus().length - 1`). Must be a positive whole number.

### `defaultCrawler`

This is the built-in crawler that generates the list of URLs to run Lighthouse on. (you can pass the value returned by this function to `getURLs`). `defaultCrawler` can be passed the following options:

#### `crawlOptions.initialURL` (required) (`string`)

The starting URL which will be crawled first.

#### `crawlOptions.ignoreRobotsTxt` (optional) (`boolean`)

Whether to crawl pages even if they are listed in the site's `robots.txt`.

#### `crawlOptions.crawlerUserAgent` (optional) (`string`)

Pass a user agent string to be used by the crawler (not by Lighthouse).

#### `crawlOptions.includePathGlob` (optional) (`string[]`)

Any path that doesn't match these globs will not be crawled. If the array is empty, all paths are allowed.

#### `crawlOptions.excludePathGlob` (optional) (`string[]`)

Any path that matches these globs will not be crawled.

## Mac M1 Note

Users running virtualized x64 versions of Node on Macs with M1 chips may see anomalous results. For best results on an M1 chip, ensure you are running the native arm version of Node 16+.

When you run the command `node -p process.arch` you should see `arm64`. If you see `x86`, try uninstalling and reinstalling Node. [More details here](https://gist.github.com/LeZuse/bf838718ff2689c5fc035c5a6825a11c).

## Shout-outs

- [auto-lighthouse](https://github.com/TGiles/auto-lighthouse) is a similar project that provided early inspiration for this one.
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) is handling emulation and performance metrics.
- [Node CSV](https://csv.js.org/) is the library handling CSV logic.
- [simplecrawler](https://github.com/simplecrawler/simplecrawler) is the library handling URL discovery.
