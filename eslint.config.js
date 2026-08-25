import cloudFourConfig from '@cloudfour/eslint-config';

export default [
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
    rules: {
      // Your overrides here
    },
  },
];
