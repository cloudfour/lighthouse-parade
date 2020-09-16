const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { reportToRow, reportToRowHeaders } = require('./reportToRow');
const csvStringify = require('csv-stringify/lib/sync');
const { aggregateCSVReports } = require('./combine');

const reportsDirPath = process.argv[2];
const outputDir = process.argv[3] || process.argv[2];
const aggregatedReportData = aggregateCSVReports(reportsDirPath);
const writePath = path.join(outputDir, 'aggregatedMobileReport.csv');
fs.writeFile(
    writePath, 
    aggregatedReportData,
    (e) => {
        if (e) {
            console.error(e);
        }
    }
);
console.log('DONE!');
