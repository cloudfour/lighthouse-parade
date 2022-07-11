import http from 'node:http';

import { OAuth2Client } from 'google-auth-library';
// eslint-disable-next-line @cloudfour/n/file-extension-in-import
import * as kleur from 'kleur/colors';
import open from 'open';

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

export const getAuthenticatedClient = async (): Promise<{
  auth: OAuth2Client;
  redirect: (url: string) => void;
}> => {
  const oAuth2Client = new OAuth2Client(
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
