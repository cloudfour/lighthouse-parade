![Lighthouse Parade Hero Image](https://raw.githubusercontent.com/cloudfour/lighthouse-parade/master/assets/hero.svg)

# Lighthouse Parade [![CI](https://github.com/cloudfour/lighthouse-parade/workflows/CI/badge.svg)](https://github.com/cloudfour/lighthouse-parade/actions?query=workflow%3ACI) [![npm](https://img.shields.io/npm/v/lighthouse-parade)](https://www.npmjs.com/package/lighthouse-parade)

A Node.js command line tool that crawls a domain and compiles a report with lighthouse performance data for every page.

## Why?

There are great tools for doing performance analysis on a single web page. We use [Lighthouse](https://developers.google.com/web/tools/lighthouse) and [WebPageTest](https://webpagetest.org/) for this all the time. But what if you want to evaluate the performance characteristics of an entire site? It is tedious to manually run a report for each page and then the output is a jumble of individual reports that have to be analyzed one-by-one. This tool was created to solve this problem.

## How?

TODO: rewrite/see what to keep

## Usage

TODO: rewrite/see what to keep

### Options

TODO: rewrite/see what to keep

## Analysis spreadsheet template

TODO: rewrite/see what to keep

## Mac M1 Note

Users running virtualized x64 versions of Node on Macs with M1 chips may see anomalous results. For best results on an M1 chip, ensure you are running the native arm version of Node 16+.

When you run the command `node -p process.arch` you should see `arm64`. If you see `x86`, try uninstalling and reinstalling Node. [More details here](https://gist.github.com/LeZuse/bf838718ff2689c5fc035c5a6825a11c).

## Shout-outs

- [auto-lighthouse](https://github.com/TGiles/auto-lighthouse) is a similar project that provided early inspiration for this one.
- [Lighthouse](https://github.com/GoogleChrome/lighthouse) is handling emulation and performance metrics.
- [Node CSV](https://csv.js.org/) is the library handling CSV logic.
- [simplecrawler](https://github.com/simplecrawler/simplecrawler) is the library handling URL discovery.
