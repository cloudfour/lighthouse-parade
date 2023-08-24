import { type LighthouseSettings, initWorkerThreads } from './lighthouse.js';
import {
  type Output,
  OutputType,
  adaptLHRToOutputWriter,
  combineOutputWriters,
  createCSVOutputWriter,
  createGoogleSheetsOutputWriter,
} from './output-writer/index.js';

/**
 * Creates output writers for each specified output format,
 * and returns a single merged output writer that updates each of them individually.
 */
const getOutputWriter = async (
  outputs: Output[],
  command: string,
  lighthouseParadeVersion: string,
) => {
  const outputWriters = await Promise.all(
    outputs.map((output) => {
      if (output.type === OutputType.GoogleSheets) {
        return createGoogleSheetsOutputWriter(output.title);
      }
      return createCSVOutputWriter(output.filename);
    }),
  );

  const outputWriter = combineOutputWriters(outputWriters);
  return adaptLHRToOutputWriter(outputWriter, command, lighthouseParadeVersion);
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

export interface Crawler {
  (emitURL: (url: string) => void): Promise<void>;
}

export interface RunOptions {
  outputs: Output[];
  lighthouseConcurrency: number;
  lighthouseSettings: LighthouseSettings;
  getURLs: Crawler;
}

export const main = async (
  opts: RunOptions,
  command: string,
  lighthouseParadeVersion: string,
): Promise<RunStatus> => {
  const state = new Map<string, URLState>();
  const outputWriter = await getOutputWriter(
    opts.outputs,
    command,
    lighthouseParadeVersion,
  );
  const start = async () => {
    const lighthouseRunners = initWorkerThreads(opts);

    const lighthousePromises: Promise<void>[] = [];
    const emitURL = (url: unknown) => {
      if (typeof url !== 'string') {
        throw new TypeError(
          `emitURL (the callback passed to getURLs) must be passed a URL as a string. Received ${typeof url} (${url})`,
        );
      }
      return lighthousePromises.push(
        (async () => {
          state.set(url, { state: State.Pending });
          const lighthouseRunner = await lighthouseRunners.getNextAvailable();
          state.set(url, { state: State.InProgress });
          try {
            const lighthouseReport = await lighthouseRunner.run(url);
            await outputWriter.addEntry(lighthouseReport);
            state.set(url, { state: State.Success });
          } catch (error) {
            state.set(url, { state: State.Failure, error: error as Error });
          }
        })(),
      );
    };
    await opts.getURLs(emitURL);

    await Promise.all(lighthousePromises);

    await outputWriter.complete();
    await lighthouseRunners.close();
  };

  return {
    state,
    start,
  };
};
