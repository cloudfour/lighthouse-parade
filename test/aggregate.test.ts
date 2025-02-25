import fs from 'node:fs';
import path from 'node:path';

import csvParse from 'csv-parse/lib/sync.js';
import { describe, expect, it } from 'vitest';

import { aggregateCSVReports } from '../src/aggregate.js';

describe('aggregateCSVReports', () => {
  it('creates the expected csv', async () => {
    const dataPath = path.join(__dirname, 'support', 'example2');
    await aggregateCSVReports(dataPath);
    const expected = fs.readFileSync(
      path.join(dataPath, 'expectedAggregatedMobileReport.csv'),
    );
    const data = fs.readFileSync(
      path.join(dataPath, 'aggregatedMobileReport.csv'),
    );
    expect(data.equals(expected)).toEqual(true);
  });

  it('skips erroneous files', async () => {
    // This directory has bad files in it
    const dataPath = path.join(__dirname, 'support', 'example3');
    await aggregateCSVReports(dataPath);
    const data = fs.readFileSync(
      path.join(dataPath, 'aggregatedMobileReport.csv'),
      'utf8',
    );
    const parsed = csvParse(data);
    expect(parsed.length).toEqual(2); // Expecting header + one real row
  });
});
