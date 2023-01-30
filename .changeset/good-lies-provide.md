---
'lighthouse-parade': major
---

Implement multiple output writer formats.

Now there is a `--output` flag (short: `-o`) which allows you to specify the output filename. Currently there are two output formats: CSV and Google Sheets.

To output to a CSV file, use `-o some-csv-file.csv`. Note that output in the CSV files has changed since the last version.
To output to a Google Sheet, use `-o google-sheets:"Spreadsheet Name"`. If no spreadsheet name is provided (`-o google-sheets`), a spreadsheet name will be generated. It will open a Google login prompt to create the spreadsheet in your account.

The `--output` or `-o` flag can be provided multiple times to create multiple outputs.
