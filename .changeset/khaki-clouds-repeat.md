---
'lighthouse-parade': patch
---

Fix three bugs in report handling and output:

- Lighthouse's output is no longer corrupted when a multi-byte character lands on a stream chunk boundary. Page titles and audit text containing accents, em dashes or curly quotes could previously come through mangled.
- A scan where every Lighthouse run fails now explains that no reports could be read, instead of crashing with `ERR_STREAM_NULL_VALUES` from inside Node's stream internals.
- The progress display no longer prints `...And NaN more pending` when output is piped or redirected, such as in CI logs.

Also fixes aggregation depending on filename order: a malformed report sorting before the valid ones would abort the whole run rather than being skipped.
