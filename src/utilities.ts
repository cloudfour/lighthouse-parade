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

type OutputFormat = 'json' | 'html' | 'csv';

export const makeFileNameFromUrl = (url: string, extension: OutputFormat) => {
  const newUrl = url.replaceAll('.', '_').replaceAll('/', '-');
  return `${sanitize(newUrl)}.${extension}`;
};
