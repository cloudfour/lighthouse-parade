![Lighthouse Parade Hero Image](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/hero.svg)

# Lighthouse Parade [![CI](https://github.com/cloudfour/lighthouse-parade/workflows/CI/badge.svg)](https://github.com/cloudfour/lighthouse-parade/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/lighthouse-parade)](https://www.npmjs.com/package/lighthouse-parade)

A Node.js command line tool that crawls a domain and compiles a report with lighthouse performance data for every page.

## Why?

There are great tools for doing performance analysis on a single web page. We use [Lighthouse](https://developers.google.com/web/tools/lighthouse) and [WebPageTest](https://webpagetest.org/) for this all the time. But what if you want to evaluate the performance characteristics of an entire site? It is tedious to manually run a report for each page and then the output is a jumble of individual reports that have to be analyzed one-by-one. This tool was created to solve this problem.

## How?

With a single command, the tool will crawl an entire site, run a Lighthouse report for each page, and then output a spreadsheet or CSV file with the aggregated data. [Here is an example of the produced output](https://docs.google.com/spreadsheets/d/1FNc5Rl4Tp2BruTBTRN7bAXToGpo9JgdN0OGvZsQ4igo).

![Screenshot of the produced spreadsheet showing lighthouse data recorded for each visited page](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/example-sheet-1.png)

![Screenshot of the produced spreadsheet showing histograms of lighthouse data](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/main/assets/example-sheet-2.png)

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

### Options

#### `-o`, `--output`       

The output file(s). CSV and Google Sheets are supported. It can be passed multiple times for multiple outputs. 

Example: `-o cloudfour-a.csv -o google-sheets -o google-sheets:"Spreadsheet Name"`.

#### `--ignore-robots-txt`

Crawl pages even if they are listed in the site's robots.txt (default false)

#### `--crawler-user-agent`

Pass a user agent string to be used by the crawler (not by Lighthouse)

#### `--lighthouse-concurrency`

Control the maximum number of Lighthouse reports running concurrently (default 7)

#### `--lh:only-categories`

Only run the specified lighthouse categories. If not specified, all categories will be used. Available categories: accessibility, best-practices, performance, pwa, SEO. 

Multiple can be specified using commas, e.g. `--lh:only-categories=accessibility,seo`. 

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

## Mac M1 Note

Users running virtualized x64 versions of Node on Macs with M1 chips may see anomalous results. For best results on an M1 chip, ensure you are running the native arm version of Node 16+.

When you run the command `node -p process.arch` you should see `arm64`. If you see `x86`, try uninstalling and reinstalling Node. [More details here](https://gist.github.com/LeZuse/bf838718ff2689c5fc035c5a6825a11c).

## Shout-outs

- [auto-lighthouse](https://github.com/TGiles/auto-lighthouse) is a similar project that provided early inspiration for this one.
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) is handling emulation and performance metrics.
- [Node CSV](https://csv.js.org/) is the library handling CSV logic.
- [simplecrawler](https://github.com/simplecrawler/simplecrawler) is the library handling URL discovery.
