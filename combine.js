const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { reportToRow, reportToRowHeaders } = require('./reportToRow');
const csvStringify = require('csv-stringify/lib/sync');

/**
 * @param {string} reportsDirectoryPath
 * @returns
 */
const aggregateCSVReports = (reportsDirectoryPath) => {
    let files;
    try {
        files = fs.readdirSync(reportsDirectoryPath);
    } catch (e) {
        console.error(e);
        return false;
    }

    // let desktopRows = [];
    let mobileRows = [];
    let mobileHeaders = null;
        
    try {
        files.forEach(fileName => {
            if (fileName !== '.DS_Store') {
                let filePath = path.join(reportsDirectoryPath, fileName);
                let fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
                // if headers arent set yet, do it now
                mobileHeaders = mobileHeaders || reportToRowHeaders(fileContents);
                console.log(`Bundling ${fileName} into aggregated report`);
                const newRow = reportToRow(fileContents);
                // if (fileName.includes('.desktop')) {
                //     desktopRows.push(newRow);
                // } else if (fileName.includes('.mobile')) {
                    mobileRows.push(newRow);
                // }
            }
        });
        mobileRows.unshift(mobileHeaders);
        //desktopRows.unshift(desktopHeaders);

        return csvStringify(mobileRows);

    }
    catch (e) {
        console.error(e);
        return false;
    }
    return true;
}

module.exports = {
    aggregateCSVReports
};
