import type Sheets from '@googleapis/sheets';

import type { Column } from '../index.js';
import { ColumnType } from '../index.js';

const makeColor = (
  red: number,
  green: number,
  blue: number
): Sheets.sheets_v4.Schema$Color => ({
  red: red / 255,
  green: green / 255,
  blue: blue / 255,
});

const colors = {
  bad: makeColor(242, 112, 65),
  good: makeColor(113, 244, 174),
  neutral: makeColor(255, 255, 0),
};

export const getInitialFormatting = (
  sheetId: number,
  runInfoSheetId: number
) => [
  {
    // URL column width in main sheet
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 1,
      },
      properties: {
        pixelSize: 400,
      },
      fields: 'pixelSize',
    },
  },
  {
    // First column in run info sheet
    updateDimensionProperties: {
      range: {
        sheetId: runInfoSheetId,
        dimension: 'COLUMNS',
        startIndex: 0,
        endIndex: 1,
      },
      properties: {
        pixelSize: 200,
      },
      fields: 'pixelSize',
    },
  },
  {
    // Don't wrap first column (URLs)
    repeatCell: {
      range: {
        sheetId,
        startRowIndex: 2,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          wrapStrategy: 'CLIP',
        },
      },
      fields: 'userEnteredFormat.wrapStrategy',
    },
  },
];

export const getFormattingUpdates = (sheetId: number, columns: Column[]) => {
  const batchUpdates: Sheets.sheets_v4.Schema$Request[] = [
    {
      // The default "filter view" - allows sorting by columns while keeping the headers in place
      setBasicFilter: {
        filter: {
          range: { sheetId, startRowIndex: 1 },
        },
      },
    },
    {
      // Text in the header rows should wrap and be centered
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 2,
        },
        cell: {
          userEnteredFormat: {
            wrapStrategy: 'WRAP',
            horizontalAlignment: 'CENTER',
          },
        },
        fields:
          'userEnteredFormat.wrapStrategy,userEnteredFormat.horizontalAlignment',
      },
    },
    ...columns.flatMap((column, i): Sheets.sheets_v4.Schema$Request[] => {
      const colIndex = i + 1;
      // These numbers can be fiddled with to adjust the width of the columns, it is a linear equation based on the number of characters
      const colWidth = Math.min(
        Math.max(
          column.name.length,
          column.nameDetail ? column.nameDetail.length + 2 : 0
        ) *
          6 +
          42,
        170
      );
      const colRange: Sheets.sheets_v4.Schema$GridRange = {
        sheetId,
        startRowIndex: 2,
        startColumnIndex: colIndex,
        endColumnIndex: colIndex + 1,
      };
      return [
        ...(column.field.type === ColumnType.AuditBoolean
          ? ([
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [colRange],
                    booleanRule: {
                      condition: {
                        type: 'TEXT_EQ',
                        values: [{ userEnteredValue: 'PASS' }],
                      },
                      format: {
                        backgroundColor: colors.good,
                      },
                    },
                  },
                },
              },
              {
                addConditionalFormatRule: {
                  rule: {
                    ranges: [colRange],
                    booleanRule: {
                      condition: {
                        type: 'TEXT_EQ',
                        values: [{ userEnteredValue: 'FAIL' }],
                      },
                      format: {
                        backgroundColor: colors.bad,
                      },
                    },
                  },
                },
              },
            ] as Sheets.sheets_v4.Schema$Request[])
          : ([
              {
                // Conditional format backgrounds for main data cells
                addConditionalFormatRule: {
                  rule: {
                    ranges: [colRange],
                    gradientRule:
                      column.field.type === ColumnType.AuditValue
                        ? {
                            maxpoint: {
                              colorStyle: { rgbColor: colors.bad },
                              type: 'MAX',
                            },
                            midpoint: {
                              colorStyle: { rgbColor: colors.neutral },
                              type: 'PERCENT',
                              value: '50',
                            },
                            minpoint: {
                              colorStyle: { rgbColor: colors.good },
                              type: 'MIN',
                            },
                          }
                        : {
                            maxpoint: {
                              colorStyle: { rgbColor: colors.good },
                              type: 'NUMBER',
                              value: '100',
                            },
                            midpoint: {
                              colorStyle: { rgbColor: colors.neutral },
                              type: 'PERCENT',
                              value: '50',
                            },
                            minpoint: {
                              colorStyle: { rgbColor: colors.bad },
                              type: 'MIN',
                            },
                          },
                  },
                  index: 0,
                },
              },
            ] as Sheets.sheets_v4.Schema$Request[])),
        {
          // Widths of columns on main sheet
          updateDimensionProperties: {
            range: {
              sheetId,
              startIndex: colIndex,
              endIndex: colIndex + 1,
              dimension: 'COLUMNS',
            },
            properties: {
              // We calculate the width and set it explicitly
              // rather than using the autoResizeDimensions request
              // because the auto-sizing via API call does not leave space
              // for the sort/filter button or account for the bold text
              pixelSize: colWidth,
            },
            fields: 'pixelSize',
          },
        },
        {
          // Format number of digits shown in main data cells
          repeatCell: {
            range: colRange,
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'NUMBER',
                  pattern:
                    column.field.type === ColumnType.AuditValue
                      ? '#0.0'
                      : '###',
                },
              },
            },
            fields: 'userEnteredFormat.numberFormat',
          },
        },
      ];
    }),
  ];
  return batchUpdates;
};
