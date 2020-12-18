import { scan } from '../scan-task';
import { createFakeCrawler } from '../crawl.mock';
import type { LighthouseEvents } from '../lighthouse';
import { createEmitter } from '../emitter';

const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

test('Displays useful error if no pages are found while crawling', async () => {
  const { fakeCrawler, emit: scanEmit } = createFakeCrawler();
  const emitter = scan('https://nonexistent-website.com', {
    ignoreRobotsTxt: false,
    pathMustMatch: [],
    pathMustNotMatch: [],
    dataDirectory: 'foo',
    lighthouseConcurrency: 1,
    crawler: fakeCrawler,
  });

  const onWarning = jest.fn();
  emitter.on('warning', onWarning);
  const onInfo = jest.fn();
  emitter.on('info', onInfo);
  const onUrlFound = jest.fn();
  emitter.on('urlFound', onUrlFound);
  const onReportComplete = jest.fn();
  emitter.on('reportComplete', onReportComplete);
  const onReportFail = jest.fn();
  emitter.on('reportFail', onReportFail);
  const onReportBegin = jest.fn();
  emitter.on('reportBegin', onReportBegin);

  // Wait for next event loop tick to run assertions, because event handlers are executed in microtasks
  await nextTick();

  expect(onInfo).toHaveBeenCalledTimes(1);
  expect(onInfo).toHaveBeenCalledWith(expect.stringMatching(/starting/i));
  expect(onWarning).toHaveBeenCalledTimes(0);
  expect(onUrlFound).toHaveBeenCalledTimes(0);
  expect(onReportComplete).toHaveBeenCalledTimes(0);

  scanEmit('resolve');

  await nextTick();

  expect(onInfo).toHaveBeenCalledTimes(2);
  expect(onInfo).toHaveBeenCalledWith(expect.stringMatching(/complete/i));
  expect(onWarning).toHaveBeenCalledTimes(1);
  expect(onWarning).toHaveBeenCalledWith(
    expect.stringMatching(/no pages were found/i)
  );

  expect(onUrlFound).toHaveBeenCalledTimes(0);
  expect(onReportComplete).toHaveBeenCalledTimes(0);
  expect(onReportFail).toHaveBeenCalledTimes(0);
  expect(onReportBegin).toHaveBeenCalledTimes(0);
});

test('Fires correct lighthouse events as pages are found', async () => {
  const { fakeCrawler, emit: crawlerEmit } = createFakeCrawler();

  const googlePageLighthouse = createEmitter<LighthouseEvents>();

  const emitter = scan('https://google.com', {
    ignoreRobotsTxt: false,
    pathMustMatch: [],
    pathMustNotMatch: [],
    dataDirectory: 'foo',
    lighthouseConcurrency: 1,
    lighthouse: (url) => {
      if (url !== 'https://google.com/hello')
        throw new Error(`Create a mock to handle ${url}`);
      return googlePageLighthouse;
    },
    crawler: fakeCrawler,
  });

  const onWarning = jest.fn();
  emitter.on('warning', onWarning);
  const onInfo = jest.fn();
  emitter.on('info', onInfo);
  const onUrlFound = jest.fn();
  emitter.on('urlFound', onUrlFound);
  const onReportComplete = jest.fn();
  emitter.on('reportComplete', onReportComplete);
  const onReportFail = jest.fn();
  emitter.on('reportFail', onReportFail);
  const onReportBegin = jest.fn();
  emitter.on('reportBegin', onReportBegin);

  // Wait for next event loop tick to run assertions, because event handlers are executed in microtasks
  await nextTick();

  expect(onInfo).toHaveBeenCalledTimes(1);
  expect(onInfo).toHaveBeenCalledWith(expect.stringMatching(/starting/i));
  expect(onWarning).toHaveBeenCalledTimes(0);
  expect(onUrlFound).toHaveBeenCalledTimes(0);
  expect(onReportComplete).toHaveBeenCalledTimes(0);

  crawlerEmit('urlFound', 'https://google.com/hello', 'text/html', 1000, 200);

  await nextTick();

  expect(onInfo).toHaveBeenCalledTimes(1);
  expect(onWarning).toHaveBeenCalledTimes(0);
  expect(onUrlFound).toHaveBeenCalledTimes(1);
  expect(onReportComplete).toHaveBeenCalledTimes(0);
  expect(onReportFail).toHaveBeenCalledTimes(0);
  expect(onReportBegin).toHaveBeenCalledTimes(0);

  expect(onUrlFound).toHaveBeenLastCalledWith(
    'https://google.com/hello',
    'text/html',
    1000,
    200
  );

  // Fire the "report begin" event
  googlePageLighthouse.emit('begin');

  // Begin event gets forwarded from the lighthouse emitter to the scan emitter
  await nextTick();
  expect(onReportBegin).toHaveBeenCalledTimes(1);
  expect(onReportComplete).toHaveBeenCalledTimes(0);
  expect(onReportFail).toHaveBeenCalledTimes(0);

  googlePageLighthouse.emit('complete', 'some-csv-data');

  // Complete event gets forwarded from the lighthouse emitter to the scan emitter
  await nextTick();
  expect(onReportBegin).toHaveBeenCalledTimes(1);
  expect(onReportComplete).toHaveBeenCalledTimes(1);
  expect(onReportFail).toHaveBeenCalledTimes(0);

  crawlerEmit('resolve');

  await emitter.promise;
});
