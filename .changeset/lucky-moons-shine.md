---
'lighthouse-parade': major
---

Update Lighthouse from 9.6.8 to 13.4.1.

**This fixes a tool that no longer worked.** Lighthouse 9.6.8 dates from 2022 and fails against current Chrome with `Runtime error encountered: Waiting for DevTools protocol response has exceeded the allotted time`, so every report in a scan failed.

**The aggregated report's columns have changed.** Lighthouse 10 restructured its CSV output, so the column headings and the set of audits are both different:

- Columns are now labelled `performance: first-contentful-paint` — the audit id — rather than `Performance: First Contentful Paint (numeric)`. Lighthouse no longer emits a prose title for each audit.
- The overall score column is now `performance: Overall Category Score`.
- Audits retired since Lighthouse 9 are gone, including Time to Interactive, First CPU Idle, Estimated Input Latency and First Meaningful Paint. A set of new `*-insight` audits has been added.

Anything reading the aggregated CSV by column name will need updating.
