const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { reportToRow, reportToRowHeaders } = require('./reportToRow');
const csvStringify = require('csv-stringify/lib/sync');

/**
 * @param {string} directoryPath
 * @returns
 */
const aggregateCSVReports = (directoryPath) => {
    // const parsedDirectoryPath = path.parse(directoryPath);
    // const timestamp = parsedDirectoryPath.base;
    let files;
    try {
        files = fs.readdirSync(directoryPath);
    } catch (e) {
        console.error(e);
        return false;
    }

    // const desktopAggregateReportName = timestamp + '_desktop_aggregateReport.csv';
    const mobileAggregateReportName = 'aggregateReport.csv';
    // let desktopAggregatePath = path.join(directoryPath, desktopAggregateReportName);
    let mobileAggregatePath = path.join(directoryPath, mobileAggregateReportName);
    // let desktopWriteStream = fs.createWriteStream(desktopAggregatePath, { flags: 'a' });
    let mobileWriteStream = fs.createWriteStream(mobileAggregatePath, { flags: 'a' });

    // let desktopRows = [
    //     reportToRowHeaders
    // ];
    let mobileRows = [
        reportToRowHeaders
    ];

    try {
        files.forEach(fileName => {
            if (fileName !== mobileAggregateReportName && fileName !== '.DS_Store') {
                let filePath = path.join(directoryPath, fileName);
                let fileContents = fs.readFileSync(filePath, { encoding: 'utf-8' });
                console.log(`Bundling ${fileName} into aggregated report`);
                const newRow = reportToRow(fileContents);
                // if (fileName.includes('.desktop')) {
                //     desktopRows.push(newRow);
                // } else if (fileName.includes('.mobile')) {
                    mobileRows.push(newRow);
                // }
            }
        });
        // desktopWriteStream.write(csvStringify(desktopRows));
        // console.log('Wrote desktop aggregate report');
        mobileWriteStream.write(csvStringify(mobileRows));
        console.log('Wrote mobile aggregate report');

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
