## Installation

`npm install`

## Usage

### Discover site URLs

`npm run urls -- <URL>`

Ex: `npm run urls -- https://baptistjaxqa.azurewebsites.net` (substitute url with whatever site)

Runs a crawler on the provided URL. Discovers all URLs and writes them to a CSV file located in `./data/<timestamp>/urls.csv` .
By default, a `robots.txt` file will be ignored, but this flag can be manually changed at the top of `urls_task.js`.

### Generate Lighthouse reports 

`npm run reports -- <path/to/urls.csv>`

Ex: `npm run reports -- data/1595551804243/urls.csv`  (substitute path with wherever CSV file lives)

Generates a Lighthouse report for each URL in the provided CSV file. Non-HTML content-types will be ignored (Ex: CSS, PNG, JSON...).
The default report format is CSV, but this flag can me manually changed at the top of `lighthouse_task.js`. Each report will be written
to a `reports/` directory in the same directory as the input CSV file.

## @TODO

- [ ] Run lighthouse in child process to support concurrent runs
- [ ] Bundle individual Lighthouse CSV reports into aggregated report (with metrics)

## More docs

* Lighthouse `lhr` object properties: https://github.com/GoogleChrome/lighthouse/blob/master/docs/understanding-results.md
* Using Lighthouse programmatically: https://github.com/GoogleChrome/lighthouse/blob/master/docs/readme.md#using-programmatically
* Lighthouse CLI options: https://github.com/GoogleChrome/lighthouse#using-the-node-cli
* Lighthouse applies network throttling by defualt: https://github.com/GoogleChrome/lighthouse#how-does-lighthouse-use-network-throttling-and-how-can-i-make-it-better
* Chrome flags/switches: https://peter.sh/experiments/chromium-command-line-switches/
* Node CSV docs: https://csv.js.org/