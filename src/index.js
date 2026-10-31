import { CORS_HEADERS, json } from './lib/http.js';
import { handleStatus, handleStatusImage } from './routes/status.js';
import { handleLogin } from './routes/auth.js';

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === '/api/status' && request.method === 'GET') {
        return withCors(await handleStatus(request, env, ctx));
      }

      if (url.pathname === '/api/status_img' && request.method === 'GET') {
        return withCors(await handleStatusImage(request, env, ctx));
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return withCors(await handleLogin(request, env));
      }

      if (url.pathname === '/' && request.method === 'GET') {
        return new Response(
          'MC-MOTD-API (Cloudflare Worker)\n\n' +
            'GET  /api/status?host=example.com:25565\n' +
            'GET  /api/status_img?host=example.com:25565\n' +
            'POST /api/login\n',
          { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        );
      }

      return json({ error: 'Not Found' }, 404);
    } catch (err) {
      console.log('[ERROR]', err?.stack || err);
      return json({ error: '服务器内部错误。' }, 500);
    }
  },
};
