const spawnSync = require('child_process').spawnSync;
const lighthouseCli = require.resolve('lighthouse/lighthouse-cli');
const chromeLauncher = require('chrome-launcher');
var sanitize = require("sanitize-filename");
const fs = require('fs');
const path = require('path');

const runReport = async (url, outputFormat) => {

  const {status = -1, stdout} = spawnSync('node', [
    lighthouseCli,
    url,
    `--output=${outputFormat}`,
    `--output-path=stdout`,
    `--emulated-form-factor=mobile`,
    `--only-categories=performance`,
    `--chrome-flags="--headless"`
  ]);

  if (status !== 0) {
    console.error(`Lighthouse report failed for: ${url}`);
    return false;
  }

  console.log('Report is done for', url);
  return stdout;
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
  makeFileNameFromUrl,
  runReport
};
