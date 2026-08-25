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
});
