const { makeFileNameFromUrl } = require('../lighthouse.js');
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

test('makeFileNameFromUrl works as expected', () => {
	expect(makeFileNameFromUrl('http://example.com/foo', 'csv'))
	.toBe('http--example_com-foo.csv');
	expect(makeFileNameFromUrl('http://example.com/bar/', 'html'))
	.toBe('http--example_com-bar-.html');
});
