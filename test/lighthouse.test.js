const { reportsForRows, makeFileNameFromUrl } = require('../lighthouse.js');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

test('reportForRows reports HTML files only', async () => {
	jest.setTimeout(30000);
	const filePath = path.join(__dirname,'support','urls.csv');
	const fileData = fs.readFileSync(filePath);
	const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});

	let reportCount = 0;
	const reportCb = () => {
		reportCount++;
	};
	await reportsForRows(csvRows, 'csv', reportCb);
	expect(reportCount).toBe(3);
});

test('reportForRows skips files that already exist only', async () => {
	jest.setTimeout(30000);
	const filePath = path.join(__dirname,'support', 'example1','urls.csv');
	const fileData = fs.readFileSync(filePath);
	const csvRows = parse(fileData, {columns: true, skip_empty_lines: true});

	let reportCount = 0;
	const reportCb = () => {
		reportCount++;
	};
	const reportDirName = path.join(path.dirname(filePath), 'reports');
	console.log('reportDirName', reportDirName);
	await reportsForRows(csvRows, 'csv', reportCb, reportDirName);
	expect(reportCount).toBe(1);
});

test('makeFileNameFromUrl works as expected', () => {
	expect(makeFileNameFromUrl('http://example.com/foo', 'csv'))
	.toBe('http--example_com-foo.csv');
	expect(makeFileNameFromUrl('http://example.com/bar/', 'html'))
	.toBe('http--example_com-bar-.html');
});