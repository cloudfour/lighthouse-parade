import { makeFileNameFromUrl } from '../lighthouse';

test('makeFileNameFromUrl works as expected', () => {
  expect(makeFileNameFromUrl('http://example.com/foo', 'csv')).toBe(
    'http--example_com-foo.csv'
  );
  expect(makeFileNameFromUrl('http://example.com/bar/', 'html')).toBe(
    'http--example_com-bar-.html'
  );
});
