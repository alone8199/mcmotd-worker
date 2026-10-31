import { json } from '../lib/http.js';

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  return new Uint8Array(await crypto.subtle.digest('SHA-256', data));
}

/** 常数时间比较，避免时序攻击 */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/**
 * POST /api/login
 * 管理员账号从 Worker Secrets 读取: ADMIN_USERNAME / ADMIN_PASSWORD
 * 请使用 `wrangler secret put` 设置，不要写进 wrangler.toml。
 */
export async function handleLogin(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ code: 400, success: false, error: '请求体必须是 JSON。' }, 400);
  }

  const { username, password } = body || {};
  if (!username || !password) {
    return json({ code: 400, success: false, error: '请输入用户名和密码。' });
  }

  if (!env.ADMIN_USERNAME || !env.ADMIN_PASSWORD) {
    return json({ code: 500, success: false, error: '管理员账号未配置。' }, 500);
  }

  if (env.ADMIN_PASSWORD === 'password') {
    return json({ code: 403, success: false, error: '禁止使用默认密码登录，请修改您的密码。' }, 403);
  }

  const userOk = safeEqual(await sha256(String(username)), await sha256(env.ADMIN_USERNAME));
  const passOk = safeEqual(await sha256(String(password)), await sha256(env.ADMIN_PASSWORD));

  if (userOk && passOk) {
    return json({ code: 200, success: true, message: `欢迎回来, ${env.ADMIN_USERNAME}!` });
  }
  return json({ code: 401, success: false, error: '用户名或密码错误。' }, 401);
}
