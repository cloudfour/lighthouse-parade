import sanitize from 'sanitize-filename';

export const isContentTypeHtml = (contentType?: string) => {
  return contentType?.toLowerCase().includes('html');
};

export const usefulDirName = () => {
  const date = new Date();
  const iso = date.toISOString();
  const withoutColons = iso.replace(/:/g, '_');
  const trimmed = withoutColons.split('.')[0];
  return trimmed;
};

type OutputFormat = 'json' | 'html' | 'csv';

export const makeFileNameFromUrl = (url: string, extension: OutputFormat) => {
  const newUrl = url.replace(/\./g, '_').replace(/\//g, '-');
  return `${sanitize(newUrl)}.${extension}`;
};
