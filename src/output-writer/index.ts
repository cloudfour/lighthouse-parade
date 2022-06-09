import type { LHR } from 'lighthouse';

export { createCSVOutputWriter } from './csv-writer.js';
export { createGoogleSheetsOutputWriter } from './google-sheets-writer.js';

export interface OutputWriter {
  addEntry(report: LHR): Promise<void>;
  complete(): Promise<void>;
}
