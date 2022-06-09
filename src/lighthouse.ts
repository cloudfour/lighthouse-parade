import type { LighthouseResult } from './lighthouse-result.js';
import { Worker } from 'worker_threads';
import { fileURLToPath } from 'url';
import * as path from 'path';
import type { LHR } from 'lighthouse';

export interface LighthouseRunner {
  run(url: string): Promise<LighthouseResult>;
  isFree: boolean;
  freePromise: Promise<LighthouseRunner>;
  worker: Worker;
}

const createLighthouseRunner = (): LighthouseRunner => {
  const worker = new Worker(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'lighthouse-worker.js',
    ),
  );
  const runner: LighthouseRunner = {
    worker,
    isFree: true,
    freePromise: null as any,
    async run(url) {
      this.isFree = false;
      worker.postMessage({ type: 'runLighthouse', url });
      const lighthouseResultPromise = new Promise<LighthouseResult>(
        (resolve, reject) => {
          const workerListener = (message: unknown) => {
            if (!isLighthouseReport(message)) return;
            resolve(message);
            worker.removeListener('message', workerListener);
            worker.removeListener('error', errorListener);
          };

          const errorListener = (error: any) => {
            reject(error);
            worker.removeListener('message', workerListener);
            worker.removeListener('error', errorListener);
          };

          worker.addListener('message', workerListener);
          worker.addListener('error', errorListener);
        },
      );
      const newFreePromise = this.freePromise
        .then(() => lighthouseResultPromise)
        .then(() => {
          if (this.freePromise === newFreePromise) {
            this.isFree = true;
          }

          return this;
        });
      this.freePromise = newFreePromise;
      return lighthouseResultPromise;
    },
  };
  runner.freePromise = Promise.resolve(runner);
  return runner;
};

const isLighthouseReport = (report: unknown): report is LHR =>
  typeof report === 'object' &&
  report !== null &&
  'categories' in report &&
  'audits' in report &&
  'lighthouseVersion' in report;

export const initWorkerThreads = (numThreads: number) => {
  const lighthouseRunners: LighthouseRunner[] = [];
  const getNextAvailable = async (): Promise<LighthouseRunner> => {
    for (const lighthouseRunner of lighthouseRunners)
      if (lighthouseRunner.isFree) return lighthouseRunner;

    // No worker is currently available
    if (lighthouseRunners.length < numThreads) {
      const lighthouseRunner = createLighthouseRunner();
      lighthouseRunners.push(lighthouseRunner);
      return lighthouseRunner;
    }

    return Promise.race(lighthouseRunners.map((runner) => runner.freePromise));
  };

  const close = () =>
    Promise.all(
      lighthouseRunners.map(async (lighthouseRunner) => {
        lighthouseRunner.worker.postMessage({ type: 'close' });
        await new Promise<void>((resolve) => {
          lighthouseRunner.worker.on('exit', () => resolve());
        });
      }),
    );
  cleanupFunctions.push(close);

  return {
    getNextAvailable,
    close,
  };
};

const cleanupFunctions: (() => Promise<unknown>)[] = [];

const cleanup = (exitCode: number) => {
  const exit = () =>
    // eslint-disable-next-line @cloudfour/n/no-process-exit
    process.exit(exitCode);

  Promise.all(cleanupFunctions.map((fn) => fn()))
    .then(exit)
    .catch(exit);

  // If the cleanup functions don't resolve very quickly, still exit regardless.
  // There *must not* be a perceptible delay after doing ctrl+c
  // but also, we do not want to exit this process
  // before we send the kill signal to the child chrome processes.
  setTimeout(exit, 200);
};

// Make sure that even in the non-happy-path ways of exiting the program,
// the chrome instances are cleaned up.

// SIGINT is fired when program is killed with Ctrl+C
process.on('SIGINT', cleanup);
// SIGTERM is fired when program is killed with kill
process.on('SIGTERM', cleanup);
// Fired when something is thrown that exits the program
process.on('uncaughtException', (error) => {
  console.error(error);
  cleanup(1);
});
