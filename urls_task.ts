const csvStringify = require('csv-stringify/lib/sync');
const Crawler = require("simplecrawler");
const fs = require('fs');
const path = require('path');
const { makeUrlRow } = require('./url_csv_maker'); 

const siteUrl = process.argv[2];
const respectRobots = false;
const crawler = new Crawler(siteUrl);

const dir = path.join(__dirname,'data', `${Date.now()}`);
fs.mkdirSync(dir, {recursive: true});
const file = `${dir}/urls.csv`;
fs.writeFileSync(file, 'URL,content_type,bytes,response\n', {
     encoding: 'utf-8'
});
console.log("Created CSV file");
const stream = fs.createWriteStream(file, {flags:'a'});

// Set up the crawler
crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
    console.log("Fetched %s [%s] (%d bytes)", queueItem.url, response.headers['content-type'], responseBuffer.length);
    stream.write(makeUrlRow(queueItem, responseBuffer, response));
});

crawler.on("complete", function() {
    console.log("Crawling complete");
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