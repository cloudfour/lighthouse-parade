import { parse as csvParse } from 'csv-parse/sync';

export const reportToRowHeaders = (csvFileContents: string) => {
  const singleReportRows: LighthouseCSVReportRow[] = csvParse(csvFileContents, {
    columns: true,
    skip_empty_lines: true,
    ltrim: true,
    // Version 5 of csv-parse split `relax` into `relax_quotes` and
    // `relax_column_count`. This is the direct rename — it tolerates malformed
    // quoting, which is what half-baked Lighthouse reports tend to produce.
    // https://csv.js.org/parse/options/
    relax_quotes: true,
  });
  if (singleReportRows.length === 0) {
    throw new Error('Unable to find report headers');
  }
  const headers = [
    'Requested URL',
    'Final URL',
    ...singleReportRows.map(
      (row) => `${row.category}: ${row.title} (${row.type})`,
    ),
  ];
  return headers;
};

export const reportToRow = (csvFileContents: string) => {
  const reportRows: LighthouseCSVReportRow[] = csvParse(csvFileContents, {
    // https://csv.js.org/parse/options/
    columns: true,
    skip_empty_lines: true,
    ltrim: true,
  });
  // Sometimes reports come out half-baked...
  if (reportRows.length === 0) {
    return false;
  }

  const csvRow: CSVReportRow = [
    reportRows[0].requestedUrl,
    reportRows[0].finalUrl,
    ...reportRows.map((reportRow) => reportRow.score),
  ];
  return csvRow;
};

type LighthouseCSVReportRow = {
  requestedUrl: string;
  finalUrl: string;
  category: string;
  name: string;
  title: string;
  type: string;
  score: string;
};

type CSVReportRow = [
  requestedUrl: string,
  finalUrl: string,
  ...scores: string[],
];
