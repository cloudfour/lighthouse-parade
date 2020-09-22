import { spawnSync } from 'child_process';
import sanitize from 'sanitize-filename';

const lighthouseCli = require.resolve('lighthouse/lighthouse-cli');

type OutputFormat = 'json' | 'html' | 'csv';

export const runReport = (url: string, outputFormat: OutputFormat) => {
  const { status = -1, stdout } = spawnSync('node', [
    lighthouseCli,
    url,
    `--output=${outputFormat}`,
    `--output-path=stdout`,
    `--emulated-form-factor=mobile`,
    `--only-categories=performance`,
    `--chrome-flags="--headless"`,
    `--max-wait-for-load=45000`,
  ]);

  if (status !== 0) {
    console.error(`Lighthouse report failed for: ${url}`);
    return false;
  }

  console.log('Report is done for', url);
  return stdout;
};

export const makeFileNameFromUrl = (url: string, extension: OutputFormat) => {
  const newUrl = url.replace(/\./g, '_').replace(/\//g, '-');
  return `${sanitize(newUrl)}.${extension}`;
};
