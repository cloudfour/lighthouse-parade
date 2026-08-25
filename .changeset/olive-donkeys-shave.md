---
'lighthouse-parade': major
---

Drop support for Node 18 & 20, which are both past end-of-life. The package now requires Node `^22.19.0 || >=24.0.0`.

The 22.19 floor comes from Lighthouse 13, which is the strictest of the upgraded dependencies.
