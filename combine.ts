import fs from 'fs';
import path from 'path';
import { reportToRow, reportToRowHeaders } from './report-to-row';
import csvStringify from 'csv-stringify/lib/sync';

/**
 * @returns the stringified CSV with the aggregated reports.
 */
export const aggregateCSVReports = (reportsDirectoryPath: string) => {
  let files;
  try {
    files = fs.readdirSync(reportsDirectoryPath);
  } catch (error) {
    console.error(error);
    return false;
  }

  const mobileRows = [];
  let headers: boolean | string[] | null = null;

  try {
    files.forEach((fileName) => {
      if (fileName !== '.DS_Store') {
        const filePath = path.join(reportsDirectoryPath, fileName);
        const fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
        // If headers aren't set yet, do it now
        headers = headers || reportToRowHeaders(fileContents);
        console.log(`Bundling ${fileName} into aggregated report`);
        const newRow = reportToRow(fileContents);
        if (newRow) {
          mobileRows.push(newRow);
        } else {
          console.log(`Failed to bundle: ${fileName}`);
        }
      }
    });
    mobileRows.unshift(headers);

    return csvStringify(mobileRows);
  } catch (error) {
    console.error(error);
    return false;
  }
};
