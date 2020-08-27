const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { reportToRow, reportToRowHeaders } = require('./reportToRow');
const csvStringify = require('csv-stringify/lib/sync');
const { aggregateCSVReports } = require('./combine');

const reportsDirPath = process.argv[2];
aggregateCSVReports(reportsDirPath);
