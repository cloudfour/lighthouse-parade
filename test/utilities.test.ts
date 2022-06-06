import { describe, test, it, expect } from 'vitest';
import tk from 'timekeeper';
import {
  isContentTypeHtml,
  usefulDirName,
  makeFileNameFromUrl,
} from '../src/utilities.js';

describe('isContentTypeHtml', () => {
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

describe('usefulDirName', () => {
  it('returns what we expect', () => {
    const time = new Date(1893448800000); // Mon Dec 31 2029 22:00:00 UTC
    tk.freeze(time);
    expect(usefulDirName()).toBe('2029-12-31T22_00_00');
    tk.reset();
  });
});

test('makeFileNameFromUrl works as expected', () => {
  expect(makeFileNameFromUrl('http://example.com/foo', 'csv')).toBe(
    'http--example_com-foo.csv'
  );
  expect(makeFileNameFromUrl('http://example.com/bar/', 'html')).toBe(
    'http--example_com-bar-.html'
  );
});
