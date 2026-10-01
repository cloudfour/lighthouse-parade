import cloudFourConfig from '@cloudfour/eslint-config';

const config = [
  ...cloudFourConfig,
  {
    ignores: ['dist/**/*'],
  },
  {
    // `bin` points at the compiled dist/src/cli.js, so n/hashbang can't tell
    // that src/cli.ts is the source of an executable. It reports the shebang as
    // unnecessary and `--fix` deletes it, which silently breaks `npx
    // lighthouse-parade` and global installs. That is how the shebang was lost
    // in #184 and shipped broken until this was caught.
    files: ['src/cli.ts'],
    rules: {
      'n/hashbang': 'off',
    },
  },
  {
    // This rule exists because Node's built-in test runner executes every file
    // under a `test/` directory, so importing a helper from there would run it
    // twice. Vitest only collects `*.test.ts`, which makes shared helpers in
    // test/support safe to import.
    files: ['test/**'],
    rules: {
      'node-test/no-import-test-files': 'off',
    },
  },
];

export default config;
