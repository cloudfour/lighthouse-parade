const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { reportToRow, reportToRowHeaders } = require('./report-to-row');
const csvStringify = require('csv-stringify/lib/sync');

/**
 * @param {string} reportsDirectoryPath
 * @returns
 */
const aggregateCSVReports = (reportsDirectoryPath) => {
  let files;
  try {
    files = fs.readdirSync(reportsDirectoryPath);
  } catch (error) {
    console.error(error);
    return false;
  }

  // Let desktopRows = [];
  const mobileRows = [];
  let mobileHeaders = null;

  try {
    files.forEach((fileName) => {
      if (fileName !== '.DS_Store') {
        const filePath = path.join(reportsDirectoryPath, fileName);
        const fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
        // If headers arent set yet, do it now
        mobileHeaders = mobileHeaders || reportToRowHeaders(fileContents);
        console.log(`Bundling ${fileName} into aggregated report`);
        const newRow = reportToRow(fileContents);
        if (!newRow) {
          console.log(`Failed to bundle: ${fileName}`);
        } else {
          mobileRows.push(newRow);
        }
      }
    });
    mobileRows.unshift(mobileHeaders);

    return csvStringify(mobileRows);
  } catch (error) {
    console.error(error);
    return false;
  }

  return true;
};

module.exports = {
  aggregateCSVReports,
};
