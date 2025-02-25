import cloudFourConfig from '@cloudfour/eslint-config';

export default [
  ...cloudFourConfig,
  {
    ignores: ['dist/**/*'],
  },
  {
    rules: {
      // Your overrides here
    },
  },
];
