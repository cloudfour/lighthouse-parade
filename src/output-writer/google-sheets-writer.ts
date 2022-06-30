import http from 'node:http';

import type { OAuth2Client } from 'google-auth-library';
import { google } from 'googleapis';
import type Sheets from 'googleapis/build/src/apis/sheets/v4.js';
// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import open from 'open';
import tinydate from 'tinydate';

import type { Column, OutputWriter } from './index.js';
import { ColumnType } from './index.js';

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
  neutral: makeColor(255, 255, 255),
};

const sheetNames = {
  main: 'Lighthouse Results',
  auditBreakdown: 'Audit Breakdown',
  runInfo: 'Run Info',
};

export const createGoogleSheetsOutputWriter = async (
  initialUrl: string
): Promise<OutputWriter> => {
  const date = tinydate('{YYYY}-{MM}-{DD} {HH}:{mm}')(new Date());
  const documentTitle = `Lighthouse ${new URL(initialUrl).hostname} ${date}`;

  // Used to make sure that the addEntry calls happen one at a time
  // so they always write to the file in a deterministic order
  // (specifically important to make sure the header is first)
  let mutexPromise: Promise<unknown> = Promise.resolve();
  const { auth, redirect } = await getAuthenticatedClient();
  const service = google.sheets({ version: 'v4', auth });
  let rowNum = 0;

  const spreadsheet: any = await service.spreadsheets
    .create({
      // @ts-expect-error types are wrong
      resource: {
        properties: {
          title: documentTitle,
        },
      },
    })
    .then((r) => r);

  const spreadsheetId: string = spreadsheet.data.spreadsheetId;
  const spreadsheetUrl: string = spreadsheet.data.spreadsheetUrl;

  console.log(
    `Output spreadsheet: ${kleur.blue(kleur.underline(spreadsheetUrl))}`
  );
  redirect(spreadsheetUrl);

  const updateResponse: any = await batchUpdate(service, spreadsheetId, [
    {
      addSheet: {
        properties: {
          title: sheetNames.main,
          gridProperties: {
            frozenColumnCount: 1,
            frozenRowCount: 2,
          },
        },
      },
    },
    {
      addSheet: {
        properties: {
          title: sheetNames.auditBreakdown,
        },
      },
    },
    {
      addSheet: {
        properties: {
          title: sheetNames.runInfo,
        },
      },
    },
  ]);

  const sheetId = updateResponse.data.replies[0].addSheet.properties.sheetId;
  const auditBreakdownSheetId =
    updateResponse.data.replies[1].addSheet.properties.sheetId;
  const runInfoSheetId =
    updateResponse.data.replies[2].addSheet.properties.sheetId;

  await batchUpdate(service, spreadsheetId, [
    {
      deleteSheet: {
        // This is the initial sheet, "Sheet 1" that is created when the google sheet is created
        sheetId: spreadsheet.data.sheets[0].properties.sheetId,
      },
    },
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
      // Center-align header rows
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 2,
          startColumnIndex: 0,
        },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER',
          },
        },
        fields: 'userEnteredFormat.horizontalAlignment',
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
  ]);

  return {
    async writeRunInfo(runInfo) {
      const valuesBatchUpdateRequest: Sheets.sheets_v4.Schema$BatchUpdateValuesRequest =
        {
          data: [
            {
              range: `'${sheetNames.runInfo}'!A1`,
              values: [
                ['Command', runInfo.command],
                ['Time', runInfo.time],
                [],
                ['node version:', runInfo.versions.node],
                ['npm version:', runInfo.versions.npm],
                ['lighthouse version:', runInfo.versions.lighthouse],
                [
                  'lighthouse-parade version:',
                  runInfo.versions.lighthouseParade,
                ],
                ['chrome version:', runInfo.versions.chrome],
                [],
                ['OS:', runInfo.system.operatingSystem],
                ['Memory:', runInfo.system.memory],
                ['CPU Info', runInfo.system.cpus],
              ],
            },
          ],
        };

      await service.spreadsheets.values
        .batchUpdate({
          spreadsheetId,
          resource: valuesBatchUpdateRequest,
          valueInputOption: 'USER_ENTERED',
        } as any)
        .then((r) => r);
    },
    async writeHeader(columns) {
      mutexPromise = mutexPromise.then(async () => {
        await writeRow(service, spreadsheetId, sheetNames.main, ++rowNum, [
          '',
          ...columns.map((c) => c.lighthouseCategory),
        ]);
        await writeRow(service, spreadsheetId, sheetNames.main, ++rowNum, [
          'URL',
          ...columns.map(
            (c) => c.name + (c.nameDetail ? `\n(${c.nameDetail})` : '')
          ),
        ]);

        let chartRow = 0;

        const charts: {
          column: Column;
          chartRow: number;
          columnIndex: number;
        }[] = [];

        await batchUpdate(service, spreadsheetId, [
          {
            // The default "filter view" - allows sorting by columns while keeping the headers in place
            setBasicFilter: {
              filter: {
                range: { sheetId, startRowIndex: 1 },
              },
            },
          },
          {
            // Text in the header rows should wrap
            repeatCell: {
              range: {
                sheetId,
                startRowIndex: 1,
                endRowIndex: 2,
              },
              cell: { userEnteredFormat: { wrapStrategy: 'WRAP' } },
              fields: 'userEnteredFormat.wrapStrategy',
            },
          },
          ...columns
            .map((column, i): Sheets.sheets_v4.Schema$Request | null => {
              if (
                column.field.type === ColumnType.AuditScore &&
                column.field.hasAuditValueColumn
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
            .filter(
              Boolean as any as <T>(input: T) => input is Exclude<T, null>
            ),
          ...columns.flatMap((column, i): Sheets.sheets_v4.Schema$Request[] => {
            const colIndex = i + 1;
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
        ]);

        const valuesBatchUpdateRequest: Sheets.sheets_v4.Schema$BatchUpdateValuesRequest =
          {
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

        await service.spreadsheets.values
          .batchUpdate({
            spreadsheetId,
            resource: valuesBatchUpdateRequest,
            valueInputOption: 'USER_ENTERED',
          } as any)
          .then((r) => r);
      });

      await mutexPromise;
    },
    async addEntry(url, rowValues) {
      mutexPromise = mutexPromise.then(async () => {
        await writeRow(service, spreadsheetId, sheetNames.main, ++rowNum, [
          url,
          ...rowValues,
        ]);
      });

      await mutexPromise;
    },
    async complete() {},
  };
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

const writeRow = async (
  service: Sheets.sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  rowNum: number,
  row: (string | number)[]
) => {
  await service.spreadsheets.values.update({
    spreadsheetId,
    range: `'${sheetName}'!A${rowNum}`,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: [row],
    },
  } as any);
};

const batchUpdate = async (
  service: Sheets.sheets_v4.Sheets,
  spreadsheetId: string,
  requests: Sheets.sheets_v4.Schema$Request[]
) => {
  const r = await service.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: { requests },
  } as any);
  return r;
};

// https://console.cloud.google.com/apis/credentials
const CLIENT_ID =
  '172798687411-4459o482o4trfp3kvkkoer5m7qiiejpr.apps.googleusercontent.com';
// This value is not actually a secret; it is OK to distribute it with source code:
// https://developers.google.com/identity/protocols/oauth2#installed
// > a client secret, which you embed in the source code of your application.
// > (In this context, the client secret is obviously not treated as a secret.)
const CLIENT_SECRET = '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';

// Must match port set for redirect URL in the Google Cloud Console Credentials page
// https://console.cloud.google.com/apis/credentials
const PORT = '2091';

const getAuthenticatedClient = async (): Promise<{
  auth: OAuth2Client;
  redirect: (url: string) => void;
}> => {
  const oAuth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    `http://localhost:${PORT}/oauth2callback` // Redirect URL
  );

  const authorizeUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return new Promise((resolve, reject) => {
    // HTTP server to accept the OAuth callback
    const server = http
      // eslint-disable-next-line @cloudfour/typescript-eslint/no-misused-promises
      .createServer(async (req, res) => {
        const url = req.url as string;
        try {
          if (url.includes('/oauth2callback')) {
            const qs = new URL(url, `http://localhost:${PORT}`).searchParams;
            const code = qs.get('code') as string;
            console.log('Google authentication complete');
            res.setHeader('content-type', 'text/html');
            res.write(`
<h1>Authentication successful! Creating spreadsheet...</h1>
<style>
body {
  text-align: center;
  font-family: system-ui, sans-serif;
  margin: 40px;
}
</style>
`);
            const { tokens } = await oAuth2Client.getToken(code);
            oAuth2Client.setCredentials(tokens);
            let didClose = false;
            resolve({
              auth: oAuth2Client,
              redirect: (url: string) => {
                if (didClose) return;
                didClose = true;
                res.end(`<script>location = ${JSON.stringify(url)}</script>`);
                server.close();
              },
            });
            // Fallback: if redirect() isn't called within the timeout,
            // just close the response and the server
            // The user can still get to the spreadsheet URL through the CLI output
            setTimeout(() => {
              if (didClose) return;
              didClose = true;
              res.end();
              server.close();
            }, 10_000);
          }
        } catch (error) {
          reject(error);
        }
      })
      .listen(PORT, () => {
        console.log(
          `Waiting for google authentication: ${kleur.blue(
            kleur.underline(authorizeUrl)
          )}`
        );
        open(authorizeUrl, { wait: false }).then((cp) => cp.unref());
      });
  });
};
