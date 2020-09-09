const csvStringify = require('csv-stringify/lib/sync');
const Crawler = require("simplecrawler");
const fs = require('fs');
const path = require('path');
const { makeRow } = require('./csv_maker'); 
const { runReport, makeFileNameFromUrl, isHtml } = require('./lighthouse');
const { aggregateCSVReports } = require('./combine');
const siteUrl = process.argv[2];
const dir = path.join(__dirname,'data', `${Date.now()}`);

// set up for lighthouse reports
const reportFormat = 'csv'; // html works too
const reportDirName = 'reports';
const reportsDirPath = `${dir}/${reportDirName}`;
fs.mkdirSync(reportsDirPath, {recursive: true});
const writeReportFile = (reportData, reportFileName) => {
  if (!reportData) {
    console.log('No data to write');
    return;
  }
  fs.writeFileSync(`${reportsDirPath}/${reportFileName}`, reportData);
};
const fileDoesntExist = (reportFileName, targetReportDirectory) => {
	return  !fs.existsSync(path.join(targetReportDirectory, reportFileName));
}
const isContentTypeHtml = (contentType) => { return contentType.indexOf('html') !== -1; };

// set up for crawler
const respectRobots = false;
const crawler = new Crawler(siteUrl);
fs.mkdirSync(dir, {recursive: true});
const file = `${dir}/urls.csv`;
fs.writeFileSync(file, 'URL,content_type,bytes,response\n', {
     encoding: 'utf-8'
});
console.log("Created CSV file");
const stream = fs.createWriteStream(file, {flags:'a'});
crawler.on("fetchcomplete", async (queueItem, responseBuffer, response) => {
    console.log("Crawled %s [%s] (%d bytes)", queueItem.url, response.headers['content-type'], responseBuffer.length);
    stream.write(makeRow(queueItem, responseBuffer, response));
    const reportFileName = makeFileNameFromUrl(queueItem.url, reportFormat);
    if (!fileDoesntExist(reportFileName, reportsDirPath)) {
    	console.log('Skipping report because file already exists');
    	return;
    }
    if (!isContentTypeHtml(response.headers['content-type'])){
    	return;
    }
    const reportData = await runReport(queueItem.url, reportFormat);
    writeReportFile(reportData, reportFileName);
    console.log(`Wrote report for ${queueItem.url}`);
});
crawler.on("complete", function() {
    console.log("Scan complete");
    console.log('Aggregating reports...');
    aggregateCSVReports(reportsDirPath, dir);
    console.log('DONE!');
});
crawler.on("fetcherror", errorLog);
crawler.on("fetch404", errorLog);
crawler.on("fetch410", errorLog);
function errorLog(queueItem, response) {
	console.log(`Error fetching (${response.statusCode}): ${queueItem.url}`);
}
if (!respectRobots) {
	crawler.respectRobotsTxt = false;
}

console.log("Starting the crawl...");
crawler.start();