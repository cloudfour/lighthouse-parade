import type Sheets from 'googleapis/build/src/apis/sheets/v4.js';

import type { Column } from '../index.js';
import { ColumnType } from '../index.js';

import { sheetNames } from './index.js';

export const getCharts = (
  sheetId: number,
  auditBreakdownSheetId: number,
  columns: Column[]
) => {
  let chartRow = 0;

  const charts: {
    column: Column;
    chartRow: number;
    columnIndex: number;
  }[] = [];

  const batchUpdates = columns
    .map((column, i): Sheets.sheets_v4.Schema$Request | null => {
      if (
        // Don't display scores as charts if we can make a chart corresponding to the actual numerical data column
        (column.field.type === ColumnType.AuditScore &&
          column.field.hasAuditValueColumn) ||
        column.field.type === ColumnType.AuditBoolean
      )
        return null;

      const thisChartRow = chartRow;
      chartRow += 15;
      const columnIndex = i + 1;

      charts.push({
        column,
        chartRow: thisChartRow,
        columnIndex,
      });

      return {
        // Histogram chart for each field
        addChart: {
          chart: {
            position: {
              overlayPosition: {
                anchorCell: {
                  sheetId: auditBreakdownSheetId,
                  columnIndex: 0,
                  rowIndex: thisChartRow,
                },
                widthPixels: 800,
                heightPixels: 300,
              },
            },
            spec: {
              title: `Distribution of ${column.name} (${column.nameDetail})`,
              histogramChart: {
                series: [
                  {
                    data: {
                      sourceRange: {
                        sources: [
                          {
                            sheetId,
                            startRowIndex: 2,
                            startColumnIndex: columnIndex,
                            endColumnIndex: columnIndex + 1,
                          },
                        ],
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
    })
    // The type cast is used to tell TS that the Boolean function will filter out null types from the array
    // https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
    .filter(Boolean as any as <T>(input: T) => input is Exclude<T, null>);

  const batchValues: Sheets.sheets_v4.Schema$BatchUpdateValuesRequest = {
    data: charts.map((chart) => {
      const columnLetter = numToSSColumn(chart.columnIndex + 1);
      const isScore =
        chart.column.field.type === ColumnType.AuditScore ||
        chart.column.field.type === ColumnType.CategoryScore;
      const numRowsHighestOrLowestShown = 8;
      return {
        range: `'${sheetNames.auditBreakdown}'!J${chart.chartRow + 1}`,
        values: [
          [
            'Mean:',
            `=AVERAGE('${sheetNames.main}'!${columnLetter}$3:${columnLetter})`,
          ],
          [
            'Median:',
            `=MEDIAN('${sheetNames.main}'!${columnLetter}$3:${columnLetter})`,
          ],
          [
            'Highest:',
            `=MAX('${sheetNames.main}'!${columnLetter}$3:${columnLetter})`,
          ],
          [
            'Lowest:',
            `=MIN('${sheetNames.main}'!${columnLetter}$3:${columnLetter})`,
          ],
          [
            isScore
              ? 'Lowest scores:'
              : `Highest values (${chart.column.nameDetail}):`,
          ],
          [
            `=SORTN(
              {'${sheetNames.main}'!${columnLetter}$3:${columnLetter},'${sheetNames.main}'!$A$3:$A},
              ${numRowsHighestOrLowestShown},
              0,
              1,
              ${isScore}
            )`.replace(/\n\s*/g, ''),
          ],
        ],
      };
    }),
  };

  return { batchUpdates, batchValues };
};

// https://stackoverflow.com/a/45789255/4898045
const numToSSColumn = (num: number) => {
  let s = '';
  let t;

  while (num > 0) {
    t = (num - 1) % 26;
    s = String.fromCodePoint(65 + t) + s;
    num = Math.trunc((num - t) / 26);
  }
  return s || undefined;
};
