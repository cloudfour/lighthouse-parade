const spawnSync = require('child_process').spawnSync;
const lighthouseCli = require.resolve('lighthouse/lighthouse-cli');
const chromeLauncher = require('chrome-launcher');
const sanitize = require('sanitize-filename');
const fs = require('fs');
const path = require('path');

const runReport = async (url, outputFormat, maxWait) => {
  const { status = -1, stdout } = spawnSync('node', [
    lighthouseCli,
    url,
    `--output=${outputFormat}`,
    `--output-path=stdout`,
    `--emulated-form-factor=mobile`,
    `--only-categories=performance`,
    `--chrome-flags="--headless"`,
    `--max-wait-for-load=${maxWait || 45000}`,
  ]);

  if (status !== 0) {
    console.error(`Lighthouse report failed for: ${url}`);
    return false;
  }

  console.log('Report is done for', url);
  return stdout;
};

const makeFileNameFromUrl = (url, extension) => {
  const newUrl = url.replace(/\./g, '_').replace(/\//g, '-');
  return `${sanitize(newUrl)}.${extension}`;
};

// Const repoortFileAlreadyExists = (path) => {
//   return fs.existsSync(path);
// }

// const isHtml = (rowObj) => {
//   const type = rowObj.content_type;
//   return (type.indexOf('html') !== -1);
// };

module.exports = {
  makeFileNameFromUrl,
  runReport,
};
