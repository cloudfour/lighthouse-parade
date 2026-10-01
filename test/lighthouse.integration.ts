import { parse as csvParse } from 'csv-parse/sync';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { runLighthouseReport } from '../src/lighthouse.js';
import { reportToRow, reportToRowHeaders } from '../src/report-to-row.js';

import { html, startFixtureServer } from './support/fixture-server.js';

/**
 * Runs the real Lighthouse CLI, and so a real Chrome, against a local page.
 * Everything else in the suite injects a fake in place of
 * `runLighthouseReport`, which means a Lighthouse upgrade that changes the CLI
 * path, flags or CSV format would otherwise pass CI untouched.
 *
 * Lighthouse scores vary from run to run on identical input, so these assert
 * only on the shape of the output, never on particular scores.
 *
 * Needs Chrome and takes a while, so it's excluded from `npm test`. Run it with
 * `npm run test:integration`.
 */

const runReport = async (url: string) =>
  new Promise<string>((resolve, reject) => {
    const { on } = runLighthouseReport(url);
    on('complete', resolve);
    on('error', reject);
  });

const parseSections = (csv: string) =>
  csv
    .split(/\n\s*\n/v)
    .filter((section) => section.trim() !== '')
    .map((section) =>
      csvParse<Record<string, string>>(section.trim(), { columns: true }),
    );

const isScore = (value: string) => {
  const score = Number(value);
  return value.trim() !== '' && score >= 0 && score <= 1;
};

describe('Lighthouse against a local page', () => {
  let server: Awaited<ReturnType<typeof startFixtureServer>>;
  let url: string;
  let report: string;

  beforeAll(async () => {
    server = await startFixtureServer({
      '/': html('<h1>Fixture page</h1><p>Some text to paint.</p>'),
    });
    url = `${server.origin}/`;
    report = await runReport(url);
  });

  afterAll(async () => {
    await server.close();
  });

  test('emits the three CSV sections the aggregator expects', () => {
    const [meta, categories, audits] = parseSections(report);

    expect(Object.keys(meta[0])).toEqual([
      'requestedUrl',
      'finalDisplayedUrl',
      'fetchTime',
      'gatherMode',
    ]);
    expect(meta[0].requestedUrl).toBe(url);

    expect(Object.keys(categories[0])).toEqual(['category', 'score']);

    expect(audits.length).toBeGreaterThan(0);
    expect(Object.keys(audits[0])).toEqual([
      'category',
      'audit',
      'score',
      'displayValue',
      'description',
    ]);
  });

  test('scores are numbers between 0 and 1', () => {
    const [, categories, audits] = parseSections(report);

    expect(categories).toEqual([
      { category: 'performance', score: expect.toSatisfy(isScore) },
    ]);
    // Informative audits and insights have no score. Lighthouse 13 writes those
    // as the string `null`, which passes through to the aggregated report.
    for (const { audit, score } of audits) {
      expect(score === 'null' || isScore(score), `${audit}: ${score}`).toBe(
        true,
      );
    }
  });

  test('the report can be turned into an aggregated row', () => {
    const headers = reportToRowHeaders(report);
    const row = reportToRow(report);

    expect(row).not.toBe(false);
    expect(row).toHaveLength(headers.length);
    expect(headers).toContain('performance: Overall Category Score');
    expect(headers).toContain('performance: first-contentful-paint');
  });
});
