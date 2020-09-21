const fs = require('fs');
const path = require('path');

const fileDoesntExist = (reportFileName, targetReportDirectory) => {
  return !fs.existsSync(path.join(targetReportDirectory, reportFileName));
};

const isContentTypeHtml = (contentType) => {
  return contentType.toLowerCase().includes('html');
};

const usefulDirName = () => {
  const date = new Date();
  const iso = date.toISOString();
  const wo_colons = iso.replace(/:/g, '_');
  const trimmed = wo_colons.split('.')[0];
  return trimmed;
};

module.exports = {
  isContentTypeHtml,
  fileDoesntExist,
  usefulDirName,
};
