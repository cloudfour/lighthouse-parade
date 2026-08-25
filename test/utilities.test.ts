import tk from 'timekeeper';
import { describe, expect, it, test } from 'vitest';

import {
  isContentTypeHtml,
  makeFileNameFromUrl,
  usefulDirName,
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
    const time = new Date(1_893_448_800_000); // Mon Dec 31 2029 22:00:00 UTC
    tk.freeze(time);
    expect(usefulDirName()).toBe('2029-12-31T22_00_00');
    tk.reset();
  });
});

test('makeFileNameFromUrl works as expected', () => {
  // These URLs are test data, not requests. The scheme has to stay http so the
  // expected filenames keep their `http--` prefix, which is the thing under test.
  /* eslint-disable unicorn/prefer-https -- see above */
  expect(makeFileNameFromUrl('http://example.com/foo', 'csv')).toBe(
    'http--example_com-foo.csv',
  );
  expect(makeFileNameFromUrl('http://example.com/bar/', 'html')).toBe(
    'http--example_com-bar-.html',
  );
  /* eslint-enable unicorn/prefer-https -- re-enable for the rest of the file */
});
