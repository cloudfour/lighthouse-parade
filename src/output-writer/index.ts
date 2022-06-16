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
  // This promise chains all the promises from addEntry and complete calls,
  // making sure each call finishes before the next one is processed
  // The promises from each child output writer is processed in parallel,
  // but the top-level addEntry calls are processed one at a time
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
