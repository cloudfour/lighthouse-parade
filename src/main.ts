import * as path from 'node:path';

import type { ModifiedConsole } from './cli.js';
import type { CrawlOptions } from './crawl.js';
import { crawl } from './crawl.js';
import { initWorkerThreads } from './lighthouse.js';
import {
  adaptLHRToOutputWriter,
  combineOutputWriters,
  createCSVOutputWriter,
  createGoogleSheetsOutputWriter,
} from './output-writer/index.js';

/**
 * Creates output writers for each specified output format,
 * and returns a single merged output writer that updates each of them individually.
 */
const getOutputWriter = async (outputs: string[], initialUrl: string) => {
  const outputWriters = await Promise.all(
    outputs.map((output) => {
      if (output === 'google-sheets')
        return createGoogleSheetsOutputWriter(initialUrl);
      const ext = path.extname(output);
      if (ext === '.csv') return createCSVOutputWriter(output);
      throw new Error(
        `Invalid output format: ${ext} (${output}). Expected <filename>.csv, or google-sheets`
      );
    })
  );

  const outputWriter = combineOutputWriters(outputWriters);
  return adaptLHRToOutputWriter(outputWriter);
};

export const enum State {
  Pending,
  InProgress,
  Success,
  Failure,
}

export type URLState =
  | { state: State.Pending }
  | { state: State.Success }
  | { state: State.InProgress }
  | { state: State.Failure; error: Error };

export type URLStates = ReadonlyMap<string, URLState>;

interface RunStatus {
  state: URLStates;
  start: () => Promise<void>;
}

export interface RunOptions extends CrawlOptions {
  outputs: string[];
  lighthouseConcurrency: number;
}

export const main = async (
  initialUrl: string,
  opts: RunOptions,
  console: ModifiedConsole
): Promise<RunStatus> => {
  const state = new Map<string, URLState>();
  const outputWriter = await getOutputWriter(opts.outputs, initialUrl);
  const start = async () => {
    const lighthouseRunners = initWorkerThreads(opts.lighthouseConcurrency);

    const lighthousePromises: Promise<void>[] = [];
    const crawlIterator = crawl(initialUrl, opts, console);
    crawlIterator.onItemAdded((url) => {
      state.set(url, { state: State.Pending });
    });
    for await (const url of crawlIterator) {
      const lighthouseRunner = await lighthouseRunners.getNextAvailable();
      state.set(url, { state: State.InProgress });
      lighthousePromises.push(
        lighthouseRunner
          .run(url)
          .then(async (lighthouseReport) => {
            await outputWriter.addEntry(lighthouseReport);
            state.set(url, { state: State.Success });
          })
          .catch((error) => {
            state.set(url, { state: State.Failure, error });
          })
      );
    }

    await Promise.all(lighthousePromises);

    await outputWriter.complete();
    await lighthouseRunners.close();
  };

  return {
    state,
    start,
  };
};
