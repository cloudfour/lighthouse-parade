import sanitize from 'sanitize-filename';

export const isContentTypeHtml = (contentType?: string) =>
  contentType?.toLowerCase().includes('html');

export const usefulDirName = () => {
  const date = new Date();
  const iso = date.toISOString();
  const withoutColons = iso.replaceAll(':', '_');
  const trimmed = withoutColons.split('.', 1)[0];
  return trimmed;
};

/** Rows to assume when stdout has no height to report. */
const FALLBACK_TERMINAL_ROWS = 24;

/**
 * How many of the pending URLs fit on screen, leaving room for the in-progress
 * ones and the "...And N more pending" line.
 *
 * `terminalRows` is `process.stdout.rows`, which is `undefined` whenever stdout
 * isn't a TTY — piped to a file, a CI log, a container started without one.
 * Feeding that straight into the arithmetic produces NaN, which slices away
 * every pending URL and reports the hidden count as NaN too.
 */
export const countPendingToDisplay = (
  terminalRows: number | undefined,
  currentCount: number,
  pendingCount: number,
) =>
  Math.min(
    Math.max((terminalRows ?? FALLBACK_TERMINAL_ROWS) - currentCount - 3, 1),
    pendingCount,
  );

type OutputFormat = 'json' | 'html' | 'csv';

export const makeFileNameFromUrl = (url: string, extension: OutputFormat) => {
  const newUrl = url.replaceAll('.', '_').replaceAll('/', '-');
  return `${sanitize(newUrl)}.${extension}`;
};
