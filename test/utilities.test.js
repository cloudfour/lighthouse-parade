const path = require('path');
const fs = require('fs');
const {
  isContentTypeHtml,
  fileDoesntExist,
  writeReportFile
 
} = require('../utilities.js');
// const testCsvPath = path.join(
//   __dirname,
//   'support',
//   'lombard.csv'
// );
// const fileContents = fs.readFileSync(testCsvPath, { encoding: 'utf-8' });

describe("isContentTypeHtml", () => {

  it('returns false when not HTML', () => {
    expect(isContentTypeHtml('text/css')).toBe(false);
    expect(isContentTypeHtml('image/x-icon')).toBe(false);
    expect(isContentTypeHtml('application/json')).toBe(false);

  });

  it('returns true when HTML', () => {
    expect(isContentTypeHtml('HTML')).toBe(true);
    expect(isContentTypeHtml('text/html; charset=utf-8')).toBe(true);
    expect(isContentTypeHtml('html')).toBe(true);
  });

});

describe("fileDoesntExist", () => {

  it('returns true when there is no file', () => {
    expect(fileDoesntExist('not-here.json', __dirname+'/support/example1/reports')).toBe(true);
  });

  it('returns false when there IS a file', () => {
    expect(fileDoesntExist('https--whatever_net-.csv', __dirname+'/support/example1/reports')).toBe(false);
  });

});
