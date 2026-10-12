import { defineConfig, loadEnv } from 'vite';
import { Readable } from 'node:stream';

// Serves netlify/functions/identify.js at /api/identify during `npm run dev`,
// so the app works locally without the Netlify CLI. Defaults to the mock.
function netlifyFunctionDev() {
  return {
    name: 'netlify-function-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/identify', async (req, res, next) => {
        try {
          const { default: handler } = await server.ssrLoadModule('/netlify/functions/identify.js');
          const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
          const request = new Request(new URL(req.originalUrl, `http://${req.headers.host}`), {
            method: req.method,
            headers: req.headers,
            body: hasBody ? Readable.toWeb(req) : undefined,
            duplex: 'half',
          });
          const response = await handler(request, {});
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.MOCK_IDENTIFY ??= env.MOCK_IDENTIFY ?? '1';
  if (env.MOCK_DELAY_MS) process.env.MOCK_DELAY_MS ??= env.MOCK_DELAY_MS;

  return {
    plugins: [netlifyFunctionDev()],
    server: { host: true },
  };
});
