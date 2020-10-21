import { spawnSync } from 'child_process';

const lighthouseCli = require.resolve('lighthouse/lighthouse-cli');

export const runLighthouseReport = async (url: string) => {
  const { status = -1, stdout } = spawnSync('node', [
    lighthouseCli,
    url,
    '--output=csv',
    '--output-path=stdout',
    '--emulated-form-factor=mobile',
    '--only-categories=performance',
    '--chrome-flags="--headless"',
    '--max-wait-for-load=45000',
  ]);

  if (status !== 0) {
    throw new Error(`Lighthouse report failed for: ${url}`);
  }

  return stdout;
};
