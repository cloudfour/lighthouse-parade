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

console.log('fileData', fileData);
// console.log('csvRows', csvRows);

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
  const reportHtml = runnerResult.report;
  fs.writeFileSync(dir+'/'+sanitize(url)+'.'+outputFormat, reportHtml);
  fs.writeFileSync(`${dir}/${sanitize(url)}.${outputFormat}`, reportHtml);

  // `.lhr` is the Lighthouse Result as a JS object
  console.log('Report is done for', runnerResult.lhr.finalUrl);
  console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
};

const reportsForRows = async (csvRows) => {
  // @TODO This should use a child process!
  for (let i=1; i<csvRows.length; i++) {
  	const row = csvRows[i];
  	await runReport(row.URL)
  		.catch( e => console.log(e) );
  }
}

reportsForRows(csvRows);


// exec('find . -type f | wc -l', (err, stdout, stderr) => {
//   if (err) {
//     console.error(`exec error: ${err}`);
//     return;
//   }

//   console.log(`Number of files ${stdout}`);
// });