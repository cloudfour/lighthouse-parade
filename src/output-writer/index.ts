import type { LHR } from 'lighthouse';

export { createCSVOutputWriter } from './csv-writer.js';
export { createGoogleSheetsOutputWriter } from './google-sheets-writer.js';

export interface OutputWriter {
  addEntry(report: LHR): Promise<void>;
  complete(): Promise<void>;
}

/** Create a single top-level OutputWriter that outputs to multiple OutputWriters */
export const combineOutputWriters = (
  outputWriters: OutputWriter[]
): OutputWriter => {
  // Used to make sure that the output writers are always updated with the same entry at the same time.
  // Otherwise, there might be issues with output writers taking different amounts of time,
  // and entries would be written in different orders.
  let mutexPromise: Promise<unknown> = Promise.resolve();

  return {
    addEntry: async (...args) => {
      mutexPromise = mutexPromise.then(() =>
        Promise.all(outputWriters.map((writer) => writer.addEntry(...args)))
      );
      await mutexPromise;
    },
    complete: async () => {
      mutexPromise = mutexPromise.then(() =>
        Promise.all(outputWriters.map((writer) => writer.complete()))
      );
      await mutexPromise;
    },
  };
};
