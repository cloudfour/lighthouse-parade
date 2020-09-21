import path from 'path';
import fs from 'fs';
import { aggregateCSVReports } from '../combine';
import csvParse from 'csv-parse/lib/sync';

const testReportsPath = path.join(__dirname, 'support', 'example2', 'reports');

const testOutputPath = path.join(__dirname, 'support', 'example2');

const testReportsPathWithBadFiles = path.join(
  __dirname,
  'support',
  'example3',
  'reports'
);

describe('aggregateCSVReports', () => {
  it('creates the expected csv', () => {
    const data = aggregateCSVReports(testReportsPath);
    const expected = fs.readFileSync(
      path.join(testOutputPath, 'expectedAggregatedMobileReport.csv'),
      { encoding: 'utf-8' }
    );
    expect(data).toEqual(expected);
  });

  it('skips erroneous files', () => {
    const data = aggregateCSVReports(testReportsPathWithBadFiles); // This directory has bad files in it
    if (!data)
      throw new Error(
        'There was an error in aggregating the CSV reports that must be handled'
      );
    const parsed = csvParse(data);
    expect(parsed.length).toEqual(2); // Expecting header + one real row
  });
});
