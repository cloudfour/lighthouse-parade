import { spawn } from 'child_process';
import { createEmitter } from './emitter';

const lighthouseCli = require.resolve('lighthouse/lighthouse-cli');

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

// This function is marked as async to wrap it with a promise to make error handling easier
// Even though the underlying process is spawned synchronously
// eslint-disable-next-line @cloudfour/typescript-eslint/require-await
export const runLighthouseReport = (url: string, maxConcurrency?: number) => {
  if (maxConcurrency) lighthouseLimit = maxConcurrency;
  const { on, emit } = createEmitter<LighthouseEvents>();
  const run = () => {
    emit('begin');
    const lighthouseProcess = spawn('node', [
      lighthouseCli,
      url,
      '--output=csv',
      '--output-path=stdout',
      '--emulated-form-factor=mobile',
      '--only-categories=performance',
      '--chrome-flags="--headless"',
      '--max-wait-for-load=45000',
    ]);

    let stdout = '';
    let stderr = '';

    lighthouseProcess.stdout.on('data', (d) => {
      stdout += d;
    });

    lighthouseProcess.stderr.on('data', (d) => {
      if (/runtime error encountered/i.test(d)) stderr += d;
    });

    lighthouseProcess.on('close', (status) => {
      if (status === 0) {
        emit('complete', String(stdout).replace(/\r\n/g, '\n'));
      } else {
        emit(
          'error',
          new Error(stderr.trim() || `Lighthouse report failed for: ${url}`)
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
