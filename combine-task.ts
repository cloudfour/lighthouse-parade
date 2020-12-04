import { aggregateCSVReports } from './aggregate';

const main = async () => {
  const reportsDirPath = process.argv[2];
  await aggregateCSVReports(reportsDirPath);
  console.log('DONE!');
};

main();
