import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

import type * as lh from 'lighthouse';

import { console } from './cli.js';
import type { RunOptions } from './main.js';

export interface LighthouseRunner {
  run(url: string): Promise<lh.Result>;
  isFree: boolean;
  worker: Worker;
}

export type LighthouseSettings = lh.SharedFlagsSettings;

const createLighthouseRunner = (
  lighthouseRunOpts: LighthouseSettings,
  queue: Queue
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
    async run(url) {
      this.isFree = false;
      worker.postMessage({ type: 'runLighthouse', url, lighthouseRunOpts });
      const result = await new Promise<lh.Result>((resolve, reject) => {
        const workerListener = (message: unknown) => {
          if (!isLighthouseReport(message)) return;
          resolve(message);
          worker.removeListener('message', workerListener);
          worker.removeListener('error', errorListener);
        };

        const errorListener = (error: unknown) => {
          reject(error);
          worker.removeListener('message', workerListener);
          worker.removeListener('error', errorListener);
        };

        worker.addListener('message', workerListener);
        worker.addListener('error', errorListener);
      });
      this.isFree = true;
      setImmediate(() => {
        // Notify the next queue item that this runner is available
        queue.shift()?.(this);
      });
      return result;
    },
  };
  return runner;
};

const isLighthouseReport = (report: unknown): report is lh.Result =>
  typeof report === 'object' &&
  report !== null &&
  'categories' in report &&
  'audits' in report &&
  'lighthouseVersion' in report;

type Queue = ((runner: LighthouseRunner) => void)[];

export const initWorkerThreads = (opts: RunOptions) => {
  const lighthouseRunners: LighthouseRunner[] = [];
  const queue: Queue = [];
  const getNextAvailable = async (): Promise<LighthouseRunner> => {
    for (const lighthouseRunner of lighthouseRunners)
      if (lighthouseRunner.isFree) {
        lighthouseRunner.isFree = false;
        return lighthouseRunner;
      }

    // No worker is currently available
    if (lighthouseRunners.length < opts.lighthouseConcurrency) {
      const lighthouseRunner = createLighthouseRunner(
        opts.lighthouseSettings,
        queue
      );
      lighthouseRunners.push(lighthouseRunner);
      lighthouseRunner.isFree = false;
      return lighthouseRunner;
    }

    // Return a Promise which resolves when a worker becomes available
    return new Promise<LighthouseRunner>((resolve) => {
      queue.push((runner) => {
        runner.isFree = false;
        resolve(runner);
      });
    });
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

const cleanup = (info: unknown) => {
  const exit = () => {
    if (typeof info === 'number') {
      process.exit(info);
    } else {
      console.error('Exiting due to', info);
      process.exit(1);
    }
  };

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
