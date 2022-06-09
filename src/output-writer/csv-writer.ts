import * as fs from 'fs/promises';
import type { OutputWriter } from './index.js';

const enum CSVColumnType {
  CategoryScore,
  AuditScore,
  AuditValue,
}

type CSVColumnField =
  | {
      type: CSVColumnType.AuditScore;
      audit: string;
    }
  | {
      type: CSVColumnType.AuditValue;
      audit: string;
    }
  | {
      type: CSVColumnType.CategoryScore;
      category: string;
    };

interface CSVColumn {
  name: string;
  category: string;
  field: CSVColumnField;
}

const makeCSVRow = (cells: string[]) => `${cells.join(',')}\n`;

export const createCSVOutputWriter = async (
  filePath: string,
): Promise<OutputWriter> => {
  const outputFile = await fs.open(filePath, 'w');
  let hasWrittenHeader = false;
  // Used to make sure that the addEntry calls happen one at a time
  // so they always write to the file in a deterministic order
  // (specifically important to make sure the header is first)
  let mutexPromise: Promise<unknown> = Promise.resolve();
  const columns: CSVColumn[] = [];
  return {
    async addEntry(report) {
      mutexPromise = mutexPromise.then(async () => {
        if (!hasWrittenHeader) {
          hasWrittenHeader = true;
          for (const category of Object.values(report.categories)) {
            columns.push({
              name: `${category.title} (overall score)`,
              category: category.title,
              field: {
                type: CSVColumnType.CategoryScore,
                category: category.id,
              },
            });
          }

          for (const category of Object.values(report.categories)) {
            for (const audit of Object.values(category.auditRefs)) {
              const auditData = report.audits[audit.id];
              if (auditData.scoreDisplayMode === 'numeric') {
                columns.push({
                  name: `${auditData.title} (score)`,
                  category: category.title,
                  field: {
                    type: CSVColumnType.AuditScore,
                    audit: audit.id,
                  },
                });
              }

              if (auditData.numericValue) {
                columns.push({
                  name: auditData.numericUnit
                    ? `${auditData.title} (${auditData.numericUnit})`
                    : auditData.title,
                  category: category.title,
                  field: {
                    type: CSVColumnType.AuditValue,
                    audit: audit.id,
                  },
                });
              }
            }
          }

          await outputFile.write(
            makeCSVRow(['', ...columns.map((c) => c.category)]) +
              makeCSVRow(['URL', ...columns.map((c) => c.name)]),
          );
        }

        await outputFile.write(
          makeCSVRow([
            report.finalUrl,
            ...columns.map((c) => {
              const val =
                c.field.type === CSVColumnType.AuditScore
                  ? report.audits[c.field.audit].score
                  : c.field.type === CSVColumnType.AuditValue
                  ? report.audits[c.field.audit].numericValue
                  : report.categories[c.field.category].score;

              return val ? String(val) : '';
            }),
          ]),
        );
      });
      await mutexPromise;
    },
    async complete() {
      await outputFile.close();
    },
  };
};
