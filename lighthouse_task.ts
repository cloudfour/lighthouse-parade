const fs = require('fs');
const path = require('path');
// Const {exec} = require('child_process');
const parse = require('csv-parse/lib/sync');
const {
  reportsForRows
} = require('./lighthouse');

// First two indexes of argv are node (0) and the path to the script (1)
const filePath = process.argv[2];
const dir = path.dirname(filePath);
const fileData = fs.readFileSync(filePath);
const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});
const outputFormat = 'csv'; // Html works too
const reportDirName = 'reports';
const reportsDirPath = `${dir}/${reportDirName}`;
fs.mkdirSync(`${dir}/${reportDirName}`, {recursive: true});

const writeReportFile = (reportData, reportFileName) => {
  if (!reportData) {
    console.log('No data to write');
    return;
  }

  fs.writeFileSync(`${reportsDirPath}/${reportFileName}`, reportData);
};

reportsForRows(csvRows, outputFormat, writeReportFile, reportsDirPath);

// Exec('find . -type f | wc -l', (err, stdout, stderr) => {
//   if (err) {
//     console.error(`exec error: ${err}`);
//     return;
//   }

//   console.log(`Number of files ${stdout}`);
// });