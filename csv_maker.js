const makeRow = (queueItem, responseBuffer, response) => {
	return `"${queueItem.url}",${response.headers['content-type']},${responseBuffer.length},${response.statusCode}\n`;
};

module.exports = {
	makeRow
};