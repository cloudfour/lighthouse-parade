import { parentPort } from 'worker_threads';
import type { LHOptions } from 'lighthouse';
import lighthouse from 'lighthouse';
import chromeLauncher from 'chrome-launcher';

const chromePromise = chromeLauncher.launch({
  chromeFlags: ['--headless', '--no-first-run'],
});
const runLighthouse = async (url: string) => {
  const chrome = await chromePromise;
  const options: LHOptions = {
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port,
  };
  const runnerResult = await lighthouse(url, options);
  parentPort?.postMessage(runnerResult.lhr);
};

parentPort?.on('message', (message) => {
  if (message.type === 'runLighthouse') {
    runLighthouse(message.url);
  } else if (message.type === 'close') {
    chromePromise
      .then((chrome) => chrome.kill())
      .then(() =>
        // eslint-disable-next-line @cloudfour/n/no-process-exit
        process.exit(0)
      );
  }
});
