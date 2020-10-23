import { scan } from '../scan-task';
import { createFakeCrawler } from '../crawl.mock';

const nextTick = () => new Promise((resolve) => process.nextTick(resolve));

test('Displays useful error if no pages are found while crawling', async () => {
  const { fakeCrawler, emit } = createFakeCrawler();
  const emitter = scan('https://nonexistent-website.com', {
    ignoreRobotsTxt: false,
    dataDirectory: 'foo',
    crawler: fakeCrawler,
  });

  const warningListener = jest.fn();
  emitter.on('warning', warningListener);
  const infoListener = jest.fn();
  emitter.on('info', infoListener);
  const urlFoundListener = jest.fn();
  emitter.on('urlFound', urlFoundListener);
  const reportCompleteListener = jest.fn();
  emitter.on('reportComplete', reportCompleteListener);

  // Wait for next event loop tick to run assertions, because event handlers are executed in microtasks
  await nextTick();

  expect(infoListener).toHaveBeenCalledTimes(1);
  expect(infoListener).toHaveBeenCalledWith(expect.stringMatching(/starting/i));
  expect(warningListener).toHaveBeenCalledTimes(0);
  expect(urlFoundListener).toHaveBeenCalledTimes(0);
  expect(reportCompleteListener).toHaveBeenCalledTimes(0);

  emit('resolve');

  await nextTick();

  expect(infoListener).toHaveBeenCalledTimes(2);
  expect(infoListener).toHaveBeenCalledWith(expect.stringMatching(/complete/i));
  expect(warningListener).toHaveBeenCalledTimes(1);
  expect(warningListener).toHaveBeenCalledWith(
    expect.stringMatching(/no pages were found/i)
  );
  expect(urlFoundListener).toHaveBeenCalledTimes(0);
  expect(reportCompleteListener).toHaveBeenCalledTimes(0);
});
