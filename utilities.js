const fs = require('fs');
const path = require('path');

const writeReportFile = (reportData, reportFileName) => {
  if (!reportData) {
    console.log('No data to write');
    return;
  }
  fs.writeFileSync(`${reportsDirPath}/${reportFileName}`, reportData);
};
const fileDoesntExist = (reportFileName, targetReportDirectory) => {
	return  !fs.existsSync(path.join(targetReportDirectory, reportFileName));
}
const isContentTypeHtml = (contentType) => {
	return contentType.toLowerCase().indexOf('html') !== -1; 
};

module.exports = {
    isContentTypeHtml,
    fileDoesntExist,
    writeReportFile
}
