const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');
var sanitize = require("sanitize-filename");
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
const parse = require('csv-parse/lib/sync');

//first two indexes of argv are node (0) and the path to the script (1)
const filePath = process.argv[2];
const dir = path.dirname(filePath);
const fileData = fs.readFileSync(filePath);
const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});
const outputFormat = 'csv'; // html works too
const reportDirName = 'reports';
fs.mkdirSync(`${dir}/${reportDirName}`, {recursive: true});

const runReport = async (url) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
  	// logLevel: 'info', 
  	output: outputFormat, 
  	onlyCategories: ['performance'], 
  	port: chrome.port
  };
  const runnerResult = await lighthouse(url, options);

  // `.report` is the HTML report as a string
  const reportData = runnerResult.report;
  const reportFileName = url
    .replace(/\./g, '_')
    .replace(/\//g, '-');
  fs.writeFileSync(`${dir}/${reportDirName}/${sanitize(reportFileName)}.${outputFormat}`, reportData);

  // `.lhr` is the Lighthouse Result as a JS object
  console.log('Report is done for', runnerResult.lhr.finalUrl);
  console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
};

const reportsForRows = async (csvRows) => {
  // @TODO This should use a child process!
  for (let i=0; i<csvRows.length; i++) {
  	const row = csvRows[i];
    if (isHtml(row)) {
      await runReport(row.URL)
        .catch( e => console.log(e) );
    }
  }
}

const isHtml = (rowObj) => {
  const type = rowObj.content_type;
  return (type.indexOf('html') !== -1);
}

reportsForRows(csvRows);


// exec('find . -type f | wc -l', (err, stdout, stderr) => {
//   if (err) {
//     console.error(`exec error: ${err}`);
//     return;
//   }

//   console.log(`Number of files ${stdout}`);
// });