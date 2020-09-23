import fs from 'fs';
import path from 'path';
import parse from 'csv-parse/lib/sync';
import { reportsForRows } from './lighthouse';

// First two indexes of argv are node (0) and the path to the script (1)
const filePath = process.argv[2];
const dir = path.dirname(filePath);
const fileData = fs.readFileSync(filePath);
const csvRows = parse(fileData, { columns: true, skip_empty_lines: true });
const outputFormat = 'csv'; // Html works too
const reportDirName = 'reports';
const reportsDirPath = `${dir}/${reportDirName}`;
fs.mkdirSync(`${dir}/${reportDirName}`, { recursive: true });

const writeReportFile = (reportData, reportFileName: string) => {
  if (!reportData) {
    console.log('No data to write');
    return;
  }

  fs.writeFileSync(`${reportsDirPath}/${reportFileName}`, reportData);
};

reportsForRows(csvRows, outputFormat, writeReportFile, reportsDirPath);
