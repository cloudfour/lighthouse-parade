const csvParse = require('csv-parse/lib/sync');

const reportToRowHeaders = (csvFileContents) => {
  const headers = ['Requested URL', 'Final URL'];
  const singleReportRows = csvParse(csvFileContents, {
    columns: true,
    skip_empty_lines: true,
    ltrim: true,
    relax: true, // https://csv.js.org/parse/options/
  });
  for (const row of singleReportRows) {
    headers.push(`${row.category}: ${row.title} (${row.type})`);
  }

  return headers;
};

const reportToRow = (csvFileContents) => {
  const reportRows = csvParse(csvFileContents, {
    columns: true,
    skip_empty_lines: true,
    ltrim: true,
    relax: true, // https://csv.js.org/parse/options/
  });
  // Sometimes reports come out half-baked...
  if (!reportRows || !reportRows.length) {
    return false;
  }

  const columns = [reportRows[0].requestedUrl, reportRows[0].finalUrl];
  reportRows.forEach((reportRow, index) => {
    columns.push(reportRow.score);
  });
  const csvRow = columns;
  return csvRow;
};

module.exports = {
  reportToRow,
  reportToRowHeaders,
};
