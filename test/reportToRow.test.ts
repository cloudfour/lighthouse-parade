const path = require('path');
const fs = require('fs');
const { reportToRow, reportToRowHeaders } = require('../reportToRow');
const testCsvPath = path.join(__dirname, 'support', 'lombard.csv');
const fileContents = fs.readFileSync(testCsvPath, { encoding: 'utf-8' });

describe('reportToRow', () => {
  it('converts rows to columns', () => {
    const row = reportToRow(fileContents);

    expect(row[0]).toBe('https://lombardstreettattoo.com/');
    expect(row[1]).toBe('https://lombardstreettattoo.com/');
    expect(row[2]).toBe('0.8');
    expect(row[3]).toBe('1');
    expect(row[4]).toBe('1');
    expect(row[5]).toBe('0.98');
    expect(row[6]).toBe('0.98');
    expect(row[7]).toBe('0.23');
  });
});

describe('reportToRowHeaders', () => {
  const headers = reportToRowHeaders(fileContents);

  it('is long list or metrics', () => {
    expect(headers[0]).toBe('Requested URL');
    expect(headers[1]).toBe('Final URL');
    expect(headers[2]).toBe(
      'Performance: Overall Performance Category Score (numeric)'
    );
    expect(headers[3]).toBe('Performance: First Contentful Paint (numeric)');
    expect(headers.length).toBe(59); // @TODO This will break
  });
});
