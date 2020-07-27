const csvStringify = require('csv-stringify/lib/sync');
const Crawler = require("simplecrawler");
const fs = require('fs');
const path = require('path');

const siteUrl = "https://baptistjaxqa.azurewebsites.net"; //@TODO handle trailing backslash
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

// set up the crawler
crawler.on("fetchcomplete", function(queueItem, responseBuffer, response) {
    console.log("Fetched %s [%s] (%d bytes)", queueItem.url, response.headers['content-type'], responseBuffer.length);
    stream.write(`${queueItem.url},${response.headers['content-type']},${responseBuffer.length},${response.statusCode}\n`);
});

crawler.on("complete", function() {
    console.log("Crawling complete");
});

if (!respectRobots) {
	crawler.respectRobotsTxt = false;
}

console.log("Starting the crawl...");
crawler.start();