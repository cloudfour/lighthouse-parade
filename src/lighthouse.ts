import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type { LHR } from 'lighthouse';

import type { RunOptions } from './main.js';

export interface LighthouseRunner {
  run(url: string): Promise<LHR>;
  isFree: boolean;
  /** Resolves when the runner is free (has nothing to do) */
  freePromise: Promise<LighthouseRunner>;
  worker: Worker;
}

export interface LighthouseRunOpts {
  categories: string[];
}

const createLighthouseRunner = (
  lighthouseRunOpts: LighthouseRunOpts
): LighthouseRunner => {
  const worker = new Worker(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      'lighthouse-worker.js'
    )
  );
  const runner: LighthouseRunner = {
    worker,
    isFree: true,
    // Initialized as null because it needs to resolve to the `runner` object which is not accessible here
    // This property gets set after the object is defined
    freePromise: null as any,
    async run(url) {
      this.isFree = false;
      worker.postMessage({ type: 'runLighthouse', url, lighthouseRunOpts });
      const lighthouseReportPromise = new Promise<LHR>((resolve, reject) => {
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
      });
      // Updates the freePromise to a new promise which will resolve once _this_ run finishes
      // freePromise must always be a promise that resolves once the _last_ lighthouse run on this runner finishes.
      const newFreePromise = this.freePromise
        .then(() => lighthouseReportPromise)
        .then(() => {
          if (this.freePromise === newFreePromise) {
            // Don't set isFree unless this is the last promise in the chain
            this.isFree = true;
          }

          return runner;
        });
      this.freePromise = newFreePromise;
      return lighthouseReportPromise;
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

export const initWorkerThreads = (opts: RunOptions) => {
  const lighthouseRunners: LighthouseRunner[] = [];
  const getNextAvailable = async (): Promise<LighthouseRunner> => {
    for (const lighthouseRunner of lighthouseRunners)
      if (lighthouseRunner.isFree) return lighthouseRunner;

    // No worker is currently available
    if (lighthouseRunners.length < opts.lighthouseConcurrency) {
      const lighthouseRunner = createLighthouseRunner(opts.lighthouseRunOpts);
      lighthouseRunners.push(lighthouseRunner);
      return lighthouseRunner;
    }

    // Return the worker which becomes available soonest
    return Promise.race(lighthouseRunners.map((runner) => runner.freePromise));
  };

  const close = () =>
    Promise.all(
      lighthouseRunners.map(async (lighthouseRunner) => {
        lighthouseRunner.worker.postMessage({ type: 'close' });
        await new Promise<void>((resolve) => {
          lighthouseRunner.worker.on('exit', () => resolve());
        });
      })
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
    // eslint-disable-next-line @cloudfour/n/no-process-exit, @cloudfour/unicorn/no-process-exit
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
