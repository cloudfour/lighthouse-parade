const makeUrlRow = (queueItem, responseBuffer, response) => {
  return `"${queueItem.url}",${response.headers['content-type']},${responseBuffer.length},${response.statusCode}\n`;
};

module.exports = {
  makeUrlRow,
};
