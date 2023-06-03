import { parentPort } from 'node:worker_threads';

import chromeLauncher from 'chrome-launcher';
import type { Flags } from 'lighthouse';
import lighthouse from 'lighthouse';

import type { LighthouseRunOpts } from './lighthouse.js';

const chromePromise = chromeLauncher.launch({
  chromeFlags: ['--headless', '--no-first-run'],
});
const runLighthouse = async (
  url: string,
  lighthouseRunOpts: LighthouseRunOpts
) => {
  const chrome = await chromePromise;
  const options: Flags = {
    output: 'json',
    onlyCategories: lighthouseRunOpts.categories,
    port: chrome.port,
  };
  const runnerResult = await lighthouse(url, options);
  parentPort?.postMessage(runnerResult?.lhr);
};

parentPort?.on('message', (message) => {
  if (message.type === 'runLighthouse') {
    runLighthouse(message.url, message.lighthouseRunOpts);
  } else if (message.type === 'close') {
    chromePromise
      .then((chrome) => chrome.kill())
      .then(() =>
        // eslint-disable-next-line @cloudfour/n/no-process-exit, @cloudfour/unicorn/no-process-exit
        process.exit(0)
      );
  }
});
