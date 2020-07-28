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

- [ ] Add support for resuming interrupted report run (probably: check for pre-existence of file before fetching)
- [ ] Run lighthouse in child process to support concurrent runs
- [ ] Bundle individual Lighthouse CSV reports into aggregated report (with metrics)