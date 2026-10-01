---
'lighthouse-parade': patch
---

Runtime dependencies, including Lighthouse, are now version ranges instead of exact versions. Installing lighthouse-parade picks up the latest compatible release of each, so fixes such as Lighthouse updates for new versions of Chrome reach you without waiting for a lighthouse-parade release. This release includes Lighthouse 13.5.0, up from 13.4.1. Lighthouse updates can add audits and shift scores slightly, so keep that in mind when comparing reports made on different days.
