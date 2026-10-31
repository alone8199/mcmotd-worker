import { CORS_HEADERS, json } from './lib/http.js';
import { handleStatus, handleStatusImage } from './routes/status.js';
import { handleLogin } from './routes/auth.js';
import frontConfig from './config/front.json';

function withCors(response) {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    try {
      if (url.pathname === '/api/status' && request.method === 'GET') {
        return withCors(await handleStatus(request, env, ctx));
      }

      if (url.pathname === '/api/status_img' && request.method === 'GET') {
        return withCors(await handleStatusImage(request, env, ctx));
      }

      if (url.pathname === '/api/config' && request.method === 'GET') {
        return withCors(json(frontConfig));
      }

      if (url.pathname === '/api/login' && request.method === 'POST') {
        return withCors(await handleLogin(request, env));
      }

      if (url.pathname.startsWith('/api/')) {
        return json({ error: 'Not Found' }, 404);
      }

      // 其余请求交给静态资源（Vue 前端，SPA fallback 在 wrangler.toml 中配置）
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.log('[ERROR]', err?.stack || err);
      return json({ error: '服务器内部错误。' }, 500);
    }
  },
};
