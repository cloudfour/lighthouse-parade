# lighthouse-parade

## 3.0.0

### Major Changes

- [#304](https://github.com/cloudfour/lighthouse-parade/pull/304) [`1f99599`](https://github.com/cloudfour/lighthouse-parade/commit/1f9959916eb4f3bb6a71be0ce7b22d077095d4a8) Thanks [@renovate](https://github.com/apps/renovate)! - Update Lighthouse from 9.6.8 to 13.4.1.

  **This fixes a tool that no longer worked.** Lighthouse 9.6.8 dates from 2022 and fails against current Chrome with `Runtime error encountered: Waiting for DevTools protocol response has exceeded the allotted time`, so every report in a scan failed.

  **The aggregated report's columns have changed.** Lighthouse 10 restructured its CSV output, so the column headings and the set of audits are both different:

  - Columns are now labelled `performance: first-contentful-paint` — the audit id — rather than `Performance: First Contentful Paint (numeric)`. Lighthouse no longer emits a prose title for each audit.
  - The overall score column is now `performance: Overall Category Score`.
  - Audits retired since Lighthouse 9 are gone, including Time to Interactive, First CPU Idle, Estimated Input Latency and First Meaningful Paint. A set of new `*-insight` audits has been added.

  Anything reading the aggregated CSV by column name will need updating.

- [#368](https://github.com/cloudfour/lighthouse-parade/pull/368) [`64e9973`](https://github.com/cloudfour/lighthouse-parade/commit/64e99738083115ead584d88f48bfb81b2cbcc152) Thanks [@spaceninja](https://github.com/spaceninja)! - Updated the supported Node versions. `lighthouse-parade` now requires Node `^22.19.0 || >=24.0.0`.

  Support for Node 14, 16, 18 and 20 has been dropped — all four are past end-of-life. The 22.19 floor is set by Lighthouse 13, the strictest of the upgraded dependencies.

### Patch Changes

- [#378](https://github.com/cloudfour/lighthouse-parade/pull/378) [`d4c73df`](https://github.com/cloudfour/lighthouse-parade/commit/d4c73df48039d51e7420ca32589ad25dbc241158) Thanks [@spaceninja](https://github.com/spaceninja)! - Restore the `#!/usr/bin/env node` shebang on the CLI entry point. Without it, npm symlinks `node_modules/.bin/lighthouse-parade` at a file the shell cannot execute, so `npx lighthouse-parade` and globally installed runs failed with `import: command not found`. Only `node path/to/cli.js` worked.

- [#387](https://github.com/cloudfour/lighthouse-parade/pull/387) [`c8df741`](https://github.com/cloudfour/lighthouse-parade/commit/c8df74195bdc744f0e41e41c379a37cafee1220b) Thanks [@spaceninja](https://github.com/spaceninja)! - Fix three bugs in report handling and output:

  - Lighthouse's output is no longer corrupted when a multi-byte character lands on a stream chunk boundary. Page titles and audit text containing accents, em dashes or curly quotes could previously come through mangled.
  - A scan where every Lighthouse run fails now explains that no reports could be read, instead of crashing with `ERR_STREAM_NULL_VALUES` from inside Node's stream internals.
  - The progress display no longer prints `...And NaN more pending` when output is piped or redirected, such as in CI logs.

  Also fixes aggregation depending on filename order: a malformed report sorting before the valid ones would abort the whole run rather than being skipped.

- [#375](https://github.com/cloudfour/lighthouse-parade/pull/375) [`ecaae79`](https://github.com/cloudfour/lighthouse-parade/commit/ecaae79559d160e1f058a9e1600ef56d9f436c48) Thanks [@renovate](https://github.com/apps/renovate)! - Update `csv-parse` to 7.x and `csv-stringify` to 6.x, and drop the unused `csv` umbrella package. Aggregated report output is unchanged — the byte-for-byte fixture comparison passes against the new versions.

- [#330](https://github.com/cloudfour/lighthouse-parade/pull/330) [`b533585`](https://github.com/cloudfour/lighthouse-parade/commit/b5335856824df090551a7db80112c66f344494a2) Thanks [@renovate](https://github.com/apps/renovate)! - Update `log-update` to 8.0.0. This is an internal dependency used for the progress display; there is no change to the command line interface.

## 2.1.0 - 2022-06-09

### Minor Changes

- [#110](https://github.com/cloudfour/lighthouse-parade/pull/110) [`38bfdf2`](https://github.com/cloudfour/lighthouse-parade/commit/38bfdf271dfc1a9d92b773b22810b52680570108) Thanks [@calebeby](https://github.com/calebeby)! - Add support for node 18

## 2.0.2 - 2022-05-24

### Patch Changes

- [#103](https://github.com/cloudfour/lighthouse-parade/pull/103) [`ac23bdb`](https://github.com/cloudfour/lighthouse-parade/commit/ac23bdb8ee02a11b88f0d7c313d3cd6e3eae6c9f) Thanks [@calebeby](https://github.com/calebeby)! - Fix crawling when --include-path-glob is not passed

## 2.0.1 - 2022-04-14

### Patch Changes

- [#99](https://github.com/cloudfour/lighthouse-parade/pull/99) [`fe12bc2`](https://github.com/cloudfour/lighthouse-parade/commit/fe12bc21f59e21663d35cf606df8d90bfdf715ba) Thanks [@calebeby](https://github.com/calebeby)! - Force the initial path to be included in the crawling regardless of include/exclude flags

## 2.0.0 - 2022-03-22

### Major Changes

- [#92](https://github.com/cloudfour/lighthouse-parade/pull/92) [`d0b1d12`](https://github.com/cloudfour/lighthouse-parade/commit/d0b1d12704a4b846daf506953ef78df10ed87c2e) Thanks [@calebeby](https://github.com/calebeby)! - Drop support for node 12 and add support for node 16

* [#77](https://github.com/cloudfour/lighthouse-parade/pull/77) [`4d21edc`](https://github.com/cloudfour/lighthouse-parade/commit/4d21edccdacb91732d041d43d109da05ed1c1323) Thanks [@calebeby](https://github.com/calebeby)! - Update Dependencies

  The most significant change is that Lighthouse has been updated from `^6.4.0` to `^9.5.0`. For most people, the changes will be non-breaking, but throughout the versions the [scores have been changed](https://github.com/GoogleChrome/lighthouse/releases)

## 1.1.0 - 2021-01-15

### Minor Changes

- [`0efa5a0`](https://github.com/cloudfour/lighthouse-parade/commit/0efa5a001040e68c8af0a2c652de080bb91d3676) [#65](https://github.com/cloudfour/lighthouse-parade/pull/65) Thanks [@calebeby](https://github.com/calebeby)! - Add options: `--max-crawl-depth`, `--include-path-glob`, `--exclude-path-glob`

  - `--max-crawl-depth`: Control the maximum depth of crawled links. 1 means only the entry page will be used. 2 means the entry page and any page linked directly from the entry page will be used.
  - `--include-path-glob`: Specify a glob (in quotes) for paths to match. Links to non-matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to allow multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.
  - `--exclude-path-glob`: Specify a glob (in quotes) for paths to exclude. Links to matched paths will not be crawled. The entry page will be crawled regardless of this flag. This flag can be specified multiple times to exclude multiple paths. `*` matches one url segment, `**` matches multiple segments. Trailing slashes are ignored.

## 1.0.0 - 2020-12-09

### Major Changes

- [`aae5305`](https://github.com/cloudfour/lighthouse-parade/commit/aae530573b7c2bdf1bc365cc37dc968f03183baa) [#60](https://github.com/cloudfour/lighthouse-parade/pull/60) Thanks [@calebeby](https://github.com/calebeby)! - First major release

## 0.4.0 - 2020-12-07

### Minor Changes

- [`150057a`](https://github.com/cloudfour/lighthouse-parade/commit/150057a85f0dedd6aabbe00924e0ecf56713d694) [#53](https://github.com/cloudfour/lighthouse-parade/pull/53) Thanks [@calebeby](https://github.com/calebeby)! - Run lighthouse instances concurrently, and change CLI output

## 0.3.0 - 2020-10-28

### Minor Changes

- [`99ee851`](https://github.com/cloudfour/lighthouse-parade/commit/99ee85118af1e4a0d8bdb4acbf0aea1898c09cf2) [#49](https://github.com/cloudfour/lighthouse-parade/pull/49) Thanks [@calebeby](https://github.com/calebeby)! - Fix line ending bug

* [`035f73f`](https://github.com/cloudfour/lighthouse-parade/commit/035f73f56cb331870b99d20821a0eacd6fa254c4) [#45](https://github.com/cloudfour/lighthouse-parade/pull/45) Thanks [@calebeby](https://github.com/calebeby)! - Reoorganize code to make testing easier

  - Reduce CLI output
  - Run lighthouse on URLs even if there are already reports saved for those URLs

- [`7b46d70`](https://github.com/cloudfour/lighthouse-parade/commit/7b46d70d7d02e37dec14e0744cef1659d0943a4b) [#48](https://github.com/cloudfour/lighthouse-parade/pull/48) Thanks [@calebeby](https://github.com/calebeby)! - Change default data directory to `lighthouse-parade-data`

## 0.2.1

### Patch Changes

- [`be3c8cb`](https://github.com/cloudfour/lighthouse-parade/commit/be3c8cb46e65b575c4e3e3e2de43dc1170b7ffda) [#41](https://github.com/cloudfour/lighthouse-parade/pull/41) Thanks [@calebeby](https://github.com/calebeby)! - Fix published files

## 0.2.0

### Minor Changes

- [`997b89a`](https://github.com/cloudfour/lighthouse-parade/commit/997b89aa9cbaf7fd5e5edf4df6875636b1ea2c03) [#38](https://github.com/cloudfour/lighthouse-parade/pull/38) Thanks [@calebeby](https://github.com/calebeby)! - Add optional --crawler-user-agent flag to override user agent

## 0.1.0

### Minor Changes

- [`e3a9d2f`](https://github.com/cloudfour/lighthouse-parade/commit/e3a9d2fc9ce89240b2e8b359cb692b2e44396ee7) [#36](https://github.com/cloudfour/lighthouse-parade/pull/36) Thanks [@calebeby](https://github.com/calebeby)! - Support only Node 12 LTS versions or 14

- [`b24d697`](https://github.com/cloudfour/lighthouse-parade/commit/b24d69769f12192783a89128ed2fb6453cdef28d) [#37](https://github.com/cloudfour/lighthouse-parade/pull/37) Thanks [@calebeby](https://github.com/calebeby)! - Updated lighthouse to [6.4.0](https://github.com/GoogleChrome/lighthouse/blob/main/changelog.md#640-2020-09-30).

### Patch Changes

- [`494aaa8`](https://github.com/cloudfour/lighthouse-parade/commit/494aaa803fc49400744058680ad17ec1ea99a67f) [#33](https://github.com/cloudfour/lighthouse-parade/pull/33) Thanks [@calebeby](https://github.com/calebeby)! - Initial Release
