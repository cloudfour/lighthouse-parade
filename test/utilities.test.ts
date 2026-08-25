import tk from 'timekeeper';
import { describe, expect, it, test } from 'vitest';

import {
  countPendingToDisplay,
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

describe('countPendingToDisplay', () => {
  it('falls back to a usable height when stdout is not a TTY', () => {
    // Process.stdout.rows is undefined whenever output is piped or redirected.
    // Passing that through produced NaN, which hid every pending URL and
    // printed "...And NaN more pending".
    expect(countPendingToDisplay(undefined, 1, 5)).toBe(5);
  });

  it('never returns NaN for any terminal height', () => {
    for (const rows of [undefined, 0, 1, 24, 200]) {
      expect(countPendingToDisplay(rows, 3, 10)).not.toBeNaN();
    }
  });

  it('shows every pending URL when they all fit', () => {
    expect(countPendingToDisplay(40, 2, 5)).toBe(5);
  });

  it('truncates the list to the space available', () => {
    expect(countPendingToDisplay(10, 2, 20)).toBe(5);
  });

  it('always leaves room for at least one pending URL', () => {
    expect(countPendingToDisplay(5, 40, 20)).toBe(1);
  });
});
