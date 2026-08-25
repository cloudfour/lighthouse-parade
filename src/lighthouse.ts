import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

import { createEmitter } from './emitter.js';

const require = createRequire(import.meta.url);
// Lighthouse 10 renamed its `lighthouse-cli/` directory to `cli/`. There is no
// `exports` map to go through, so this resolves the entry point directly — the
// same file Lighthouse lists as its `lighthouse` bin.
const lighthouseCli = require.resolve('lighthouse/cli/index.js');

let lighthouseLimit = 2;
let currentLighthouseInstances = 0;
const lighthouseQueue: (() => void)[] = [];

const runLighthouseQueue = () => {
  while (
    lighthouseQueue.length > 0 &&
    currentLighthouseInstances < lighthouseLimit
  ) {
    const run = lighthouseQueue.shift() as () => void;
    currentLighthouseInstances++;
    run();
  }
};

export type LighthouseEvents = {
  begin: () => void;
  complete: (reportData: string) => void;
  error: (message: Error) => void;
};

export const runLighthouseReport = (url: string, maxConcurrency?: number) => {
  if (maxConcurrency) {
    lighthouseLimit = maxConcurrency;
  }
  const { on, emit } = createEmitter<LighthouseEvents>();
  const run = () => {
    emit('begin');
    const lighthouseProcess = spawn('node', [
      lighthouseCli,
      url,
      '--output=csv',
      '--output-path=stdout',
      '--only-categories=performance',
      '--chrome-flags="--headless"',
      '--max-wait-for-load=45000',
    ]);

    // Without an encoding these streams emit Buffers, and concatenating those
    // onto a string decodes each chunk independently. A multi-byte character
    // straddling a chunk boundary is then decoded as two invalid sequences and
    // lost, which mangles page titles containing accents, em dashes or curly
    // quotes. Setting the encoding makes Node hold partial characters back
    // until the rest of their bytes arrive.
    lighthouseProcess.stdout.setEncoding('utf8');
    lighthouseProcess.stderr.setEncoding('utf8');

    let stdout = '';
    let stderr = '';

    lighthouseProcess.stdout.on('data', (d: string) => {
      stdout += d;
    });

    lighthouseProcess.stderr.on('data', (d: string) => {
      if (/runtime error encountered/i.test(d)) {
        stderr += d;
      }
    });

    lighthouseProcess.on('close', (status) => {
      if (status === 0) {
        emit('complete', stdout.replaceAll('\r\n', '\n'));
      } else {
        emit(
          'error',
          new Error(stderr.trim() || `Lighthouse report failed for: ${url}`),
        );
      }

      currentLighthouseInstances--;
      runLighthouseQueue();
    });
  };

  lighthouseQueue.push(run);
  runLighthouseQueue();

  return { on };
};
