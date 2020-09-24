import fs from 'fs';
import path from 'path';
import { aggregateCSVReports } from './combine';

const reportsDirPath = process.argv[2];
const outputDir = process.argv[3] || process.argv[2];
const aggregatedReportData = aggregateCSVReports(reportsDirPath);
const writePath = path.join(outputDir, 'aggregatedMobileReport.csv');
if (aggregatedReportData) {
  fs.writeFile(writePath, aggregatedReportData, (e) => {
    if (e) {
      console.error(e);
    }
  });
  console.log('DONE!');
}
