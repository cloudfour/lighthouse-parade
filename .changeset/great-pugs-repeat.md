---
'lighthouse-parade': patch
---

Restore the `#!/usr/bin/env node` shebang on the CLI entry point. Without it, npm symlinks `node_modules/.bin/lighthouse-parade` at a file the shell cannot execute, so `npx lighthouse-parade` and globally installed runs failed with `import: command not found`. Only `node path/to/cli.js` worked.
