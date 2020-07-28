const fs = require('fs');
const path = require('path');
// const {exec} = require('child_process');
var sanitize = require("sanitize-filename");
const parse = require('csv-parse/lib/sync');
const {reportsForRows} = require('./lighthouse');

//first two indexes of argv are node (0) and the path to the script (1)
const filePath = process.argv[2];
const dir = path.dirname(filePath);
const fileData = fs.readFileSync(filePath);
const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});
const outputFormat = 'csv'; // html works too
const reportDirName = 'reports';
fs.mkdirSync(`${dir}/${reportDirName}`, {recursive: true});

const writeReportFile = (runnerResult) => {
  // `.report` is the HTML report as a string
  const reportData = runnerResult.report;
  const reportFileName = runnerResult.lhr.finalUrl
    .replace(/\./g, '_')
    .replace(/\//g, '-');
  fs.writeFileSync(`${dir}/${reportDirName}/${sanitize(reportFileName)}.${outputFormat}`, reportData);
};

reportsForRows(csvRows, outputFormat, writeReportFile);

// exec('find . -type f | wc -l', (err, stdout, stderr) => {
//   if (err) {
//     console.error(`exec error: ${err}`);
//     return;
//   }

//   console.log(`Number of files ${stdout}`);
// });