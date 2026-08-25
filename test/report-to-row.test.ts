import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { reportToRow, reportToRowHeaders } from '../src/report-to-row.js';

const testCsvPath = path.join(__dirname, 'support', 'lombard.csv');
const fileContents = fs.readFileSync(testCsvPath, { encoding: 'utf8' });

describe('reportToRow', () => {
  it('converts rows to columns', () => {
    const row = reportToRow(fileContents);

    if (!Array.isArray(row)) {
      throw new TypeError('expected an array');
    }

    // The first two columns come from the report's metadata section, the third
    // from its category section, and everything after from its audit section.
    expect(row[0]).toBe('http://localhost:8099/');
    expect(row[1]).toBe('http://localhost:8099/');
    expect(row.slice(2).every((score) => typeof score === 'string')).toBe(true);
    expect(row).toHaveLength(52);
  });

  it('returns false for a report with no audits', () => {
    expect(reportToRow('not a lighthouse report')).toBe(false);
  });
});

describe('reportToRowHeaders', () => {
  const headers = reportToRowHeaders(fileContents);

  it('is long list of metrics', () => {
    expect(headers[0]).toBe('Requested URL');
    expect(headers[1]).toBe('Final URL');
    expect(headers[2]).toBe('performance: Overall Category Score');
    expect(headers[3]).toBe('performance: first-contentful-paint');
  });

  // The full column list is derived from whatever audits Lighthouse emits, so it
  // moves whenever Lighthouse is upgraded. A snapshot makes that shift show up as
  // a reviewable diff of audit names rather than as a changed count.
  it('matches the known Lighthouse column list', () => {
    expect(headers).toMatchSnapshot();
  });

  it('throws when the input is not a Lighthouse report', () => {
    expect(() => reportToRowHeaders('not a lighthouse report')).toThrow(
      /unable to find report headers/i,
    );
  });
});
