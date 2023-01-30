import { parentPort } from 'node:worker_threads';

import chromeLauncher, { LaunchedChrome } from 'chrome-launcher';
import type { LHOptions } from 'lighthouse';
import lighthouse from 'lighthouse';

import type { LighthouseRunOpts } from './lighthouse.js';

const chromeInstances = new Set<LaunchedChrome>();

const runLighthouse = async (
  url: string,
  lighthouseRunOpts: LighthouseRunOpts
) => {
  const chrome = await chromeLauncher.launch({
    chromeFlags: ['--headless', '--no-first-run'],
  });
  chromeInstances.add(chrome);
  const options: LHOptions = {
    output: 'json',
    onlyCategories: lighthouseRunOpts.categories,
    port: chrome.port,
  };
  const runnerResult = await lighthouse(url, options);
  chrome.kill();
  chromeInstances.delete(chrome);
  parentPort?.postMessage(runnerResult.lhr);
};

parentPort?.on('message', (message) => {
  if (message.type === 'runLighthouse') {
    runLighthouse(message.url, message.lighthouseRunOpts);
  } else if (message.type === 'close') {
    Promise.all([...chromeInstances].map((chrome) => chrome.kill())).then(() =>
      // eslint-disable-next-line @cloudfour/n/no-process-exit, @cloudfour/unicorn/no-process-exit
      process.exit(0)
    );
  }
});
