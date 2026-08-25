import { parse as csvParse } from 'csv-parse/sync';

/*
 * Lighthouse 10 changed `--output=csv` from one flat table into three
 * blank-line-separated sections, with these columns:
 *
 *   requestedUrl, finalDisplayedUrl, fetchTime, gatherMode  — one row
 *   category, score                                         — one row per category
 *   category, audit, score, displayValue, description       — one row per audit
 *
 * Before that it was a single table of
 * `requestedUrl, finalUrl, category, name, title, type, score`, where the
 * overall category score arrived as an audit named `performance-score`.
 */

/** One parsed section: rows keyed by that section's own column names. */
type ReportSection = Record<string, string | undefined>[];

const parseSections = (csvFileContents: string) => {
  const sections: ReportSection[] = csvFileContents
    .split(/\r?\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean)
    .map((section) =>
      csvParse(section, {
        columns: true,
        skip_empty_lines: true,
        ltrim: true,
        // Version 5 of csv-parse split `relax` into `relax_quotes` and
        // `relax_column_count`. This is the direct rename — it tolerates
        // malformed quoting, which is what half-baked Lighthouse reports
        // tend to produce. https://csv.js.org/parse/options/
        relax_quotes: true,
      }),
    );

  // Identified by their columns rather than their position, so a future
  // Lighthouse release adding or reordering a section doesn't silently shift
  // every column in the aggregated report.
  const meta = sections.find((rows) => rows[0]?.requestedUrl !== undefined);
  const categories = sections.find(
    (rows) => rows[0]?.category !== undefined && rows[0]?.audit === undefined,
  );
  const audits = sections.find((rows) => rows[0]?.audit !== undefined);

  return {
    meta: meta?.[0],
    categories: categories ?? [],
    audits: audits ?? [],
  };
};

export const reportToRowHeaders = (csvFileContents: string) => {
  const { meta, categories, audits } = parseSections(csvFileContents);
  if (!meta || audits.length === 0) {
    throw new Error('Unable to find report headers');
  }

  return [
    'Requested URL',
    'Final URL',
    ...categories.map((row) => `${row.category}: Overall Category Score`),
    // Labelled by audit id rather than a prose title. Lighthouse 13 no longer
    // emits a `title` column, and its `description` is multi-sentence markdown
    // — the id is what the docs use and it stays stable across releases.
    ...audits.map((row) => `${row.category}: ${row.audit}`),
  ];
};

export const reportToRow = (csvFileContents: string) => {
  const { meta, categories, audits } = parseSections(csvFileContents);
  // Sometimes reports come out half-baked...
  if (!meta || audits.length === 0) {
    return false;
  }

  // A missing cell becomes an empty one rather than `undefined`, which
  // csv-stringify would reject outright and take the whole aggregation with it.
  const csvRow: CSVReportRow = [
    meta.requestedUrl ?? '',
    // Renamed from `finalUrl` in Lighthouse 10. The fallback keeps reports
    // written by earlier versions readable, since a data directory accumulates
    // across runs.
    meta.finalDisplayedUrl ?? meta.finalUrl ?? '',
    ...categories.map((row) => row.score ?? ''),
    ...audits.map((row) => row.score ?? ''),
  ];
  return csvRow;
};

type CSVReportRow = [
  requestedUrl: string,
  finalUrl: string,
  ...scores: string[],
];
