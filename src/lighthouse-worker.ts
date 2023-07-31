import { write, writeFile } from 'node:fs';
import { parentPort } from 'node:worker_threads';

import chromeLauncher from 'chrome-launcher';
import type { Flags } from 'lighthouse';
// import open from 'open';
import lighthouse from 'lighthouse';
import puppeteer from 'puppeteer';

import type { LighthouseRunOpts } from './lighthouse.js';

const chromePromise = chromeLauncher.launch({
  chromeFlags: ['--headless', '--no-first-run'],
});
const runLighthouse = async (
  url: string,
  lighthouseRunOpts: LighthouseRunOpts
) => {
  // No longer using the chromeLauncher
  // const chrome = await chromePromise;

  // It's not clear if we need to more options, such as the
  // `--enable-automation` flag.
  // @see https://github.com/GoogleChrome/lighthouse/blob/main/docs/puppeteer.md#option-1-launch-chrome-with-puppeteer-and-handoff-to-lighthouse
  const browser = await puppeteer.launch({
    // @see https://developer.chrome.com/articles/new-headless/
    headless: 'new',
  });
  const page = await browser.newPage();

  // Set the cookie to prevent the cookie banner from showing
  // @see https://github.com/GoogleChrome/lighthouse/blob/main/docs/recipes/auth/README.md#pagesetcookie
  await page.setCookie({
    name: 'cookie_notice_accepted',
    value: 'true',
    url,
  });

  const options: Flags = {
    output: 'json',
    onlyCategories: lighthouseRunOpts.categories,
    // Since the code no longer uses the chromeLauncher, I commented this out.
    // Not sure if we need to change it to something else.
    // port: chrome.port,
    // This wasn't working before, we worked around it by using Puppeteer instead.
    // extraHeaders: {
    //   Cookie: 'cookie_notice_accepted=true',
    // },
    // In theory, so the cookie doesn't get discarded. But it doesn't seem to
    // be needed because the cookie is set by Puppeteer each time a new browser
    // window is opened??
    // disableStorageReset: true,
  };

  // Make sure to pass the Puppeteer page to Lighthouse
  const runnerResult = await lighthouse(url, options, undefined, page);

  writeFile(
    'link.txt',
    runnerResult?.lhr.fullPageScreenshot.screenshot.data,
    () => {}
  );
  parentPort?.postMessage(runnerResult?.lhr);

  await browser.close();
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
