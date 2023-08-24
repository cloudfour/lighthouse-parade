import * as fs from 'node:fs/promises';

import type { OutputWriter } from './index.js';

const makeCSVRow = (cells: string[]) => `${cells.join(',')}\n`;

export const createCSVOutputWriter = async (
  filePath: string,
): Promise<OutputWriter> => {
  const outputFile = await fs.open(filePath, 'w');
  // Used to make sure that the addEntry calls happen one at a time
  // so they always write to the file in a deterministic order
  // (specifically important to make sure the header is first)
  // This promise chains all the promises from addEntry calls,
  // making sure each call finishes before the next one is processed
  let mutexPromise: Promise<unknown> = Promise.resolve();
  return {
    async writeHeader(columns) {
      mutexPromise = mutexPromise.then(async () => {
        await outputFile.write(
          makeCSVRow(['', ...columns.map((c) => c.lighthouseCategory)]) +
            makeCSVRow([
              'URL',
              ...columns.map(
                (c) => c.name + (c.nameDetail ? ` (${c.nameDetail})` : ''),
              ),
            ]),
        );
      });
      await mutexPromise;
    },
    async addEntry(url, rowValues) {
      mutexPromise = mutexPromise.then(async () => {
        await outputFile.write(makeCSVRow([url, ...rowValues]));
      });
      await mutexPromise;
    },
    async complete() {
      await outputFile.close();
    },
  };
};
