const { reportsForRows } = require('../lighthouse.js');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

const filePath = path.join(__dirname,'support','urls.csv');
const fileData = fs.readFileSync(filePath);
const csvRows1 = parse(fileData, {columns: true, skip_empty_lines: true});

test('reportForRows reports HTML files only', async () => {
	jest.setTimeout(30000);
	let reportCount = 0;
	const reportCb = () => {
		reportCount++;
	};
	await reportsForRows(csvRows1, 'csv', reportCb);
	expect(reportCount).toBe(3);
});