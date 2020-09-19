import * as fs from 'fs';
import * as path from 'path';

export const fileDoesntExist = (
  reportFileName: string,
  targetReportDirectory: string
) => {
  return !fs.existsSync(path.join(targetReportDirectory, reportFileName));
};

export const isContentTypeHtml = (contentType: string) => {
  return contentType.toLowerCase().includes('html');
};

export const usefulDirName = () => {
  const date = new Date();
  const iso = date.toISOString();
  const withoutColons = iso.replace(/:/g, '_');
  const trimmed = withoutColons.split('.')[0];
  return trimmed;
};
