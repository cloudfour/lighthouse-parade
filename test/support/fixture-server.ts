import http from 'node:http';
import type { AddressInfo } from 'node:net';

export type FixtureRoute = {
  status?: number;
  contentType: string;
  body: string;
};

/**
 * Serves a fixed set of routes from 127.0.0.1 on an ephemeral port, so tests
 * can point the real crawler (or Lighthouse) at a site whose contents they
 * control. Any path not in `routes` gets a plain 404.
 */
export const startFixtureServer = async (
  routes: Record<string, FixtureRoute>,
) => {
  const server = http.createServer((req, res) => {
    const { pathname } = new URL(req.url ?? '/', 'http://x');
    if (!Object.hasOwn(routes, pathname)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const route = routes[pathname];
    res.writeHead(route.status ?? 200, { 'content-type': route.contentType });
    res.end(route.body);
  });

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve);
  });
  const { port } = server.address() as AddressInfo;

  return {
    origin: `http://127.0.0.1:${port}`,
    close: async () =>
      new Promise<void>((resolve, reject) => {
        // The crawler keeps connections alive, which would otherwise hold
        // `close` open until they time out.
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
};

export const html = (body: string) => ({
  contentType: 'text/html; charset=utf-8',
  body: `<!doctype html><html><head><title>Fixture</title></head><body>${body}</body></html>`,
});
