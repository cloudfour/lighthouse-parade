import * as childProcess from 'node:child_process';
import * as os from 'node:os';

import { getChromePath } from 'chrome-launcher';
import prettyBytes from 'pretty-bytes';

export interface RunInfo {
  command: string;
  time: string;
  versions: {
    node: string;
    npm: string;
    lighthouseParade: string;
    lighthouse: string;
    chrome: string;
  };
  system: {
    operatingSystem: string;
    cpus: string;
    memory: string;
  };
}

export const getRunInfo = async (
  command: string,
  lighthouseParadeVersion: string,
  lighthouseVersion: string,
): Promise<RunInfo> => {
  const chromePath = getChromePath();
  return {
    command,
    time: new Date().toString(),
    versions: {
      npm: await runWithTimeoutAndGetStdout('npm --version'),
      chrome: await runWithTimeoutAndGetStdout(
        `${chromePath.replace(/\s/g, '\\$&')} --version`,
      ),
      lighthouse: lighthouseVersion,
      lighthouseParade: lighthouseParadeVersion,
      node: `${process.versions.node} (${process.arch})`,
    },
    system: {
      operatingSystem: `${os.platform()} ${os.release()}`,
      memory: prettyBytes(os.totalmem()),
      cpus: `(${os.cpus().length}) ${os.cpus()[0].model}`,
    },
  };
};

const runWithTimeoutAndGetStdout = (command: string) =>
  new Promise<string>((resolve) => {
    let resolved = false;
    childProcess.exec(command, (_error, stdout) => {
      resolved = true;
      resolve(stdout.trim() || '?');
    });
    setTimeout(() => {
      if (!resolved) resolve('?');
    }, 2000);
  });
