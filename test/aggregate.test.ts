import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parse as csvParse } from 'csv-parse/sync';
import { afterEach, describe, expect, it } from 'vitest';

import { aggregateCSVReports } from '../src/aggregate.js';

const supportDir = path.join(__dirname, 'support');

const tempDirs: string[] = [];

/**
 * `aggregateCSVReports` writes its output next to the reports it reads, so
 * running it directly against a fixture directory overwrites tracked files.
 * Copying the fixture somewhere disposable first keeps test input and test
 * output separate, and keeps a failing run from dirtying the working tree.
 */
const stageFixture = (name: string) => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), `lighthouse-parade-${name}-`),
  );
  fs.cpSync(path.join(supportDir, name, 'reports'), path.join(dir, 'reports'), {
    recursive: true,
  });
  tempDirs.push(dir);
  return dir;
};

afterEach(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  tempDirs.length = 0;
});

describe('aggregateCSVReports', () => {
  it('creates the expected csv', async () => {
    const dataPath = stageFixture('example2');

    await aggregateCSVReports(dataPath);

    const actual = fs.readFileSync(
      path.join(dataPath, 'aggregatedMobileReport.csv'),
    );
    const expected = fs.readFileSync(
      path.join(supportDir, 'example2', 'expectedAggregatedMobileReport.csv'),
    );
    expect(actual.equals(expected)).toBe(true);
  });

  it('skips erroneous files', async () => {
    // This fixture's reports directory contains three malformed CSVs
    const dataPath = stageFixture('example3');

    await aggregateCSVReports(dataPath);

    const actual = fs.readFileSync(
      path.join(dataPath, 'aggregatedMobileReport.csv'),
    );
    const expected = fs.readFileSync(
      path.join(supportDir, 'example3', 'expectedAggregatedMobileReport.csv'),
    );
    // Compared in full rather than by row count, so a change to which rows
    // survive or what they contain shows up as a diff rather than a number.
    expect(actual.equals(expected)).toBe(true);
    expect(csvParse(actual.toString('utf8'))).toHaveLength(2); // Header plus the one valid report
  });

  it('still aggregates when a malformed report sorts first', async () => {
    // Headers used to be read from whichever file came first, so this only
    // worked while the valid reports happened to sort ahead of the broken ones.
    const dataPath = stageFixture('example3');
    fs.renameSync(
      path.join(dataPath, 'reports', 'invalid1.csv'),
      path.join(dataPath, 'reports', 'aaa-malformed.csv'),
    );

    await aggregateCSVReports(dataPath);

    const actual = fs.readFileSync(
      path.join(dataPath, 'aggregatedMobileReport.csv'),
      'utf8',
    );
    expect(csvParse(actual)).toHaveLength(2);
  });

  // Both of these used to surface as something unhelpful: an empty directory
  // handed csv-stringify a null header row and threw ERR_STREAM_NULL_VALUES
  // from deep in Node's stream internals, and an all-malformed directory threw
  // "Unable to find report headers" from the first file it happened to read.
  it('explains itself when every report is malformed', async () => {
    const dataPath = stageFixture('no-valid-reports');

    await expect(aggregateCSVReports(dataPath)).rejects.toThrow(
      /no reports could be read/i,
    );
  });

  it('explains itself when there are no reports at all', async () => {
    const dataPath = fs.mkdtempSync(
      path.join(os.tmpdir(), 'lighthouse-parade-empty-'),
    );
    tempDirs.push(dataPath);
    fs.mkdirSync(path.join(dataPath, 'reports'));

    await expect(aggregateCSVReports(dataPath)).rejects.toThrow(
      /no reports could be read/i,
    );
  });
});
