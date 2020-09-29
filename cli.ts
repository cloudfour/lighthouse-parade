#!/usr/bin/env node

import sade from 'sade';
import { scan } from './scan-task';
import { usefulDirName } from './utilities';
import * as path from 'path';
import { version } from './package.json';

const program = sade('lighthouse-parade');

program.version(version);

program
  .command(
    'scan <url> [dataDirectory]',
    'Crawls the site at the provided URL, recording the lighthouse scores for each URL found. The lighthouse data will be stored in the provided directory, which defaults ./data/YYYY-MM-DDTTZ_HH_MM',
    { default: true }
  )
  .alias('s')
  .option(
    '--ignore-robots',
    "Crawl pages even if they are listed in the site's robots.txt",
    false
  )
  .action(
    (
      url,
      // eslint-disable-next-line default-param-last
      dataDirectory = path.join(process.cwd(), 'data', usefulDirName()),
      opts
    ) => {
      // We are attempting to parse the URL here, so that if the user passes an invalid URL,
      // the prorgam will exit here instead of continuing (which would lead to a more confusing error)
      // eslint-disable-next-line no-new
      new URL(url);
      const ignoreRobotsTxt: boolean = opts['ignore-robots'];
      scan(url, { ignoreRobotsTxt, dataDirectory });
    }
  );

program.parse(process.argv);
