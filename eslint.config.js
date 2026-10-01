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
  {
    /*
     * Rules that arrived with @cloudfour/eslint-config 26 and flag existing
     * code. Every one of these is a style or strictness preference rather than
     * a defect — none were found to be hiding bugs when reviewed. They are off
     * for now so the toolchain upgrade stays reviewable, and because the files
     * they touch most (cli.ts, crawl.ts, lighthouse.ts) have almost no test
     * coverage, which makes a sweep across them riskier than it looks.
     *
     * Turning them back on one at a time is tracked in #379. Delete an entry
     * here as its violations are fixed.
     */
    rules: {
      // 14 violations, all but one `.on('event', () => emit(...))` in tests
      '@typescript-eslint/strict-void-return': 'off',
      // 14 violations; the `v` flag changes escaping rules, so needs care
      'require-unicode-regexp': 'off',
      // 7 violations, all in cli.ts
      '@typescript-eslint/no-shadow': 'off',
      'n/prefer-global/process': 'off',
    },
  },
];

export default config;
