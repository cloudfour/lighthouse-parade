import type { OutputWriter } from './output-writer/index.js';
import {
  combineOutputWriters,
  createGoogleSheetsOutputWriter,
  createCSVOutputWriter,
} from './output-writer/index.js';

import * as path from 'path';
import type { CrawlOptions } from './crawl.js';
import { crawl } from './crawl.js';
import { initWorkerThreads } from './lighthouse.js';
import type { ModifiedConsole } from './cli.js';

/**
 * Creates output writers for each specified output format,
 * and returns a single merged output writer that updates each of them individually.
 */
const getOutputWriter = async (outputs: string[]): Promise<OutputWriter> => {
  const outputWriters = await Promise.all(
    outputs.map((output) => {
      if (output === 'google-sheets') return createGoogleSheetsOutputWriter();
      const ext = path.extname(output);
      if (ext === '.csv') return createCSVOutputWriter(output);
      throw new Error(
        `Invalid output format: ${ext} (${output}). Expected <filename>.csv, or google-sheets`
      );
    })
  );

  return combineOutputWriters(outputWriters);
};

export const enum State {
  Pending,
  ReportInProgress,
  ReportSuccess,
  ReportFailure,
}

export type URLState =
  | { state: State.Pending }
  | { state: State.ReportSuccess }
  | { state: State.ReportInProgress }
  | { state: State.ReportFailure; error: Error };

export type URLStates = ReadonlyMap<string, URLState>;

interface RunStatus {
  state: URLStates;
  start: () => Promise<void>;
}

export interface RunOptions extends CrawlOptions {
  outputs: string[];
  lighthouseConcurrency: number;
}

export const main = (
  initialUrl: string,
  opts: RunOptions,
  console: ModifiedConsole
): RunStatus => {
  const state = new Map<string, URLState>();
  const start = async () => {
    const outputWriter = await getOutputWriter(opts.outputs);
    const lighthouseRunners = initWorkerThreads(opts.lighthouseConcurrency);

    const lighthousePromises: Promise<void>[] = [];
    const crawlIterator = crawl(initialUrl, opts, console);
    crawlIterator.onItemAdded((url) => {
      state.set(url, { state: State.Pending });
    });
    for await (const url of crawlIterator) {
      const lighthouseRunner = await lighthouseRunners.getNextAvailable();
      state.set(url, { state: State.ReportInProgress });
      lighthousePromises.push(
        lighthouseRunner
          .run(url)
          .then(async (lighthouseReport) => {
            await outputWriter.addEntry(lighthouseReport);
            state.set(url, { state: State.ReportSuccess });
          })
          .catch((error) => {
            state.set(url, { state: State.ReportFailure, error });
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
