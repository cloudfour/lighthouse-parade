import fs from 'fs';
import path from 'path';
import { reportToRow, reportToRowHeaders } from './report-to-row.js';
import csvStringify from 'csv-stringify/lib/sync.js';

const { readdir, writeFile } = fs.promises;

/** Combines the individual report CSV's from a folder into a single CSV file */
export const aggregateCSVReports = async (dataDirPath: string) => {
  const reportsDirPath = path.join(dataDirPath, 'reports');
  const files = await readdir(reportsDirPath);

  const rows = [];
  let headers: string[] | null = null;

  for (const fileName of files) {
    if (fileName !== '.DS_Store') {
      const filePath = path.join(reportsDirPath, fileName);
      const fileContents = fs.readFileSync(filePath, 'utf8');
      // If headers aren't set yet, do it now
      if (!headers) headers = reportToRowHeaders(fileContents);
      const newRow = reportToRow(fileContents);
      if (newRow) {
        rows.push(newRow);
      } else {
        console.log(`Failed to bundle: ${fileName}`);
      }
    }
  }

  rows.unshift(headers);

  const aggregatedReportData = csvStringify(rows);

  const writePath = path.join(dataDirPath, 'aggregatedMobileReport.csv');
  await writeFile(writePath, aggregatedReportData);
};
