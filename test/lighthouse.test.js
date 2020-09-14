const { reportsForRows, makeFileNameFromUrl } = require('../lighthouse.js');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

test('reportForRows reports HTML files only', async () => {
	// jest.setTimeout(30000); //@TODO
	const filePath = path.join(__dirname,'support','urls.csv');
	const fileData = fs.readFileSync(filePath);
	const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});

	let reportCount = 0;
	const reportCb = () => {
		reportCount++;
	};

	// temporarily mock console.error to prevent test from failing
	const originalError = console.error;
	console.error = jest.fn();

	await reportsForRows(csvRows, 'csv', reportCb);

	// revert console.error
  	console.error = originalError;

  	// The CSV has 5+ rows, but only 3 of them are HTML
	expect(reportCount).toBe(3);
});

test('reportForRows skips files that already exist only', async () => {
	// jest.setTimeout(30000); //@TODO
	const filePath = path.join(__dirname,'support', 'example1','urls.csv');
	const fileData = fs.readFileSync(filePath);
	const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});

	let reportCount = 0;
	const reportCb = () => {
		reportCount++;
	};
	const reportDirName = path.join(path.dirname(filePath), 'reports');

	// temporarily mock console.error to prevent test from failing
	const originalError = console.error;
	console.error = jest.fn();

	await reportsForRows(csvRows, 'csv', reportCb, reportDirName);

	// revert console.error
  	console.error = originalError;

	expect(reportCount).toBe(1);
});

test('makeFileNameFromUrl works as expected', () => {
	expect(makeFileNameFromUrl('http://example.com/foo', 'csv'))
	.toBe('http--example_com-foo.csv');
	expect(makeFileNameFromUrl('http://example.com/bar/', 'html'))
	.toBe('http--example_com-bar-.html');
});