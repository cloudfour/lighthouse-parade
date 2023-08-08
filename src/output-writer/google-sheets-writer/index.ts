import type Sheets from '@googleapis/sheets';
import googleSheets from '@googleapis/sheets';
// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';

import type { OutputWriter } from '../index.js';

import { getAuthenticatedClient } from './auth.js';
import { getCharts } from './charts.js';
import { getFormattingUpdates, getInitialFormatting } from './formatting.js';

export const sheetNames = {
  main: 'Lighthouse Results',
  auditBreakdown: 'Audit Breakdown',
  runInfo: 'Run Info',
};

export const createGoogleSheetsOutputWriter = async (
  documentTitle: string
): Promise<OutputWriter> => {
  // Used to make sure that the addEntry calls happen one at a time
  // so they always write to the file in a deterministic order
  // (specifically important to make sure the header is first)
  let mutexPromise: Promise<unknown> = Promise.resolve();
  const { auth, redirect } = await getAuthenticatedClient();
  const service = googleSheets.sheets({ version: 'v4', auth: auth as any });
  let rowNum = 0;

  const spreadsheet: any = await service.spreadsheets
    .create({
      resource: {
        properties: {
          title: documentTitle,
        },
      },
    } as any)
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
        properties: { title: sheetNames.auditBreakdown },
      },
    },
    {
      addSheet: {
        properties: { title: sheetNames.runInfo },
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
    ...getInitialFormatting(sheetId, runInfoSheetId),
  ]);

  await writeRow(service, spreadsheetId, sheetNames.main, 1, [
    '',
    'Waiting for first Lighthouse report to complete...',
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

        const formattingBatchUpdates = getFormattingUpdates(sheetId, columns);
        const {
          batchUpdates: chartBatchUpdates,
          batchValues: chartBatchValues,
        } = getCharts(sheetId, auditBreakdownSheetId, columns);

        await batchUpdate(service, spreadsheetId, [
          ...formattingBatchUpdates,
          ...chartBatchUpdates,
        ]);

        await service.spreadsheets.values
          .batchUpdate({
            spreadsheetId,
            resource: chartBatchValues,
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
    // Doesn't need to do anything so it is empty
    async complete() {},
  };
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
