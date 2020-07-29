const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');
var sanitize = require("sanitize-filename");
const fs = require('fs');
const path = require('path');

const runReport = async (url, outputFormat) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
  	// logLevel: 'info', 
  	output: outputFormat, 
  	onlyCategories: ['performance'], 
  	port: chrome.port
  };
  const runnerResult = await lighthouse(url, options);

  // `.lhr` is the Lighthouse Result as a JS object
  console.log('Report is done for', runnerResult.lhr.requestedUrl);
  console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
  return runnerResult;
};

const makeFileNameFromUrl = (url, extension) => {
  const newUrl = url
    .replace(/\./g, '_')
    .replace(/\//g, '-');
  return `${sanitize(newUrl)}.${extension}`;
}

const repoortFileAlreadyExists = (path) => {
  return fs.existsSync(path);
}

/**
 * @param csvRows (array) : and array of row objects. must have `URL` property
 * @param outputFormat (str) : output format of the lighthouse report. Ex: csv, html, json
 * @param reportDataCb (fn) : a callback function that runs for each row
 * @param targetReportDirectory (str) : optional path to where report files will be written. Dor checking if files already exist
 */
const reportsForRows = async (csvRows, outputFormat, reportDataCb, targetReportDirectory=false) => {
  // @TODO This should use a child process!
  for (let i=0; i<csvRows.length; i++) {
  	const row = csvRows[i];
    const reportFileName = makeFileNameFromUrl(row.URL, outputFormat);
    const fileDoesntExist = (targetReportDirectory) ? 
        () => !fs.existsSync(path.join(targetReportDirectory, reportFileName)) :
        () => true;
    if (isHtml(row) && fileDoesntExist()) {
      const runnerResult = await runReport(row.URL, outputFormat)
        .catch( e => console.log(e) );
      reportDataCb(runnerResult, reportFileName);
    }
  }
};

const isHtml = (rowObj) => {
  const type = rowObj.content_type;
  return (type.indexOf('html') !== -1);
};

module.exports = { 
  reportsForRows,
  makeFileNameFromUrl
};
