import type { LHR } from 'lighthouse';

import type { createGoogleSheetsOutputWriter as innerCreateGoogleSheetsOutputWriter } from './google-sheets-writer.js';

export { createCSVOutputWriter } from './csv-writer.js';

// Lazy-loaded
export const createGoogleSheetsOutputWriter: typeof innerCreateGoogleSheetsOutputWriter =
  async (...args) => {
    const mod = await import('./google-sheets-writer.js');
    return mod.createGoogleSheetsOutputWriter(...args);
  };

export const enum ColumnType {
  CategoryScore,
  AuditScore,
  AuditValue,
}

type ColumnField =
  | {
      type: ColumnType.AuditScore;
      audit: string;
      /** Whether there is a corresponding AuditValue column for the same audit */
      hasAuditValueColumn: boolean;
    }
  | {
      type: ColumnType.AuditValue;
      audit: string;
      unit: string;
    }
  | {
      type: ColumnType.CategoryScore;
      category: string;
    };

export interface Column {
  name: string;
  /** Extra details to go along with the column name, usually the unit */
  nameDetail?: string;
  lighthouseCategory: string;
  field: ColumnField;
}

export interface OutputWriter {
  writeHeader(columns: Column[]): Promise<void>;
  addEntry(url: string, rowValues: string[]): Promise<void>;
  complete(): Promise<void>;
}

/**
 * Wraps an OutputWriter to allow being passed LHR (lighthouse reports)
 * and adapts it into a row/column format that is shared
 * between the different output writers.
 * Also, it handles calling writeHeader automatically after the first addEntry call.
 */
export const adaptLHRToOutputWriter = (outputWriter: OutputWriter) => {
  // Used to make sure that the addEntry calls happen one at a time
  // (specifically important to make sure the header finishes getting written
  // before the next row starts getting written)
  let mutexPromise: Promise<unknown> = Promise.resolve();
  let hasWrittenHeader = false;
  const columns: Column[] = [];

  return {
    complete: () => outputWriter.complete(),
    async addEntry(report: LHR) {
      if (!hasWrittenHeader) {
        mutexPromise = mutexPromise.then(async () => {
          hasWrittenHeader = true;
          for (const category of Object.values(report.categories)) {
            columns.push({
              name: category.title,
              nameDetail: 'category score',
              lighthouseCategory: category.title,
              field: {
                type: ColumnType.CategoryScore,
                category: category.id,
              },
            });
          }

          for (const category of Object.values(report.categories)) {
            for (const audit of Object.values(category.auditRefs)) {
              const auditData = report.audits[audit.id];
              if (auditData.scoreDisplayMode === 'numeric') {
                columns.push({
                  name: auditData.title,
                  nameDetail: 'score',
                  lighthouseCategory: category.title,
                  field: {
                    type: ColumnType.AuditScore,
                    hasAuditValueColumn: auditData.numericValue !== undefined,
                    audit: audit.id,
                  },
                });
              }

              if (auditData.numericValue) {
                columns.push({
                  name: auditData.title,
                  nameDetail: auditData.numericUnit,
                  lighthouseCategory: category.title,
                  field: {
                    type: ColumnType.AuditValue,
                    unit: auditData.numericUnit || '',
                    audit: audit.id,
                  },
                });
              }
            }
          }
          await outputWriter.writeHeader(columns);
        });
        await mutexPromise;
      }

      const rowValues = columns.map((c) => {
        const val =
          c.field.type === ColumnType.AuditScore
            ? report.audits[c.field.audit].score
            : c.field.type === ColumnType.AuditValue
            ? report.audits[c.field.audit].numericValue
            : report.categories[c.field.category].score;

        return typeof val === 'number'
          ? String(c.field.type === ColumnType.AuditValue ? val : val * 100)
          : '';
      });

      return outputWriter.addEntry(report.finalUrl, rowValues);
    },
  };
};

/** Create a single top-level OutputWriter that outputs to multiple OutputWriters */
export const combineOutputWriters = (
  outputWriters: OutputWriter[]
): OutputWriter => {
  // Used to make sure that the output writers are always updated with the same entry at the same time.
  // Otherwise, there might be issues with output writers taking different amounts of time,
  // and entries would be written in different orders.
  // This promise chains all the promises from addEntry and complete calls,
  // making sure each call finishes before the next one is processed
  // The promises from each child output writer is processed in parallel,
  // but the top-level addEntry calls are processed one at a time
  let mutexPromise: Promise<unknown> = Promise.resolve();

  return {
    async writeHeader(...args) {
      mutexPromise = mutexPromise.then(() =>
        Promise.all(outputWriters.map((writer) => writer.writeHeader(...args)))
      );
      await mutexPromise;
    },
    async addEntry(...args) {
      mutexPromise = mutexPromise.then(() =>
        Promise.all(outputWriters.map((writer) => writer.addEntry(...args)))
      );
      await mutexPromise;
    },
    async complete() {
      mutexPromise = mutexPromise.then(() =>
        Promise.all(outputWriters.map((writer) => writer.complete()))
      );
      await mutexPromise;
    },
  };
};
