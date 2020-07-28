const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

const runReport = async (url, outputFormat) => {
  const chrome = await chromeLauncher.launch({chromeFlags: ['--headless']});
  const options = {
  	// logLevel: 'info', 
  	output: outputFormat, 
  	onlyCategories: ['performance'], 
  	port: chrome.port
  };
  const runnerResult = await lighthouse(url, options);

  // `.lhr` is the Lighthouse Result as a JS object
  console.log('Report is done for', runnerResult.lhr.finalUrl);
  console.log('Performance score was', runnerResult.lhr.categories.performance.score * 100);

  await chrome.kill();
  return runnerResult;
};

const reportsForRows = async (csvRows, outputFormat, reportDataCb) => {
  // @TODO This should use a child process!
  for (let i=0; i<csvRows.length; i++) {
  	const row = csvRows[i];
    if (isHtml(row)) {
      const runnerResult = await runReport(row.URL, outputFormat)
        .catch( e => console.log(e) );
      reportDataCb(runnerResult);
    }
  }
};

const isHtml = (rowObj) => {
  const type = rowObj.content_type;
  return (type.indexOf('html') !== -1);
};

module.exports = { 
  reportsForRows 
};
