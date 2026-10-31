/**
 * 核心查询逻辑，对应原版 services/queryService.js。
 *
 * 与原版的差异：
 *  - 仅支持 Java 版（TCP）。Bedrock 版使用 UDP，Workers 无法发送 UDP，已移除。
 *    serverType=auto 时只查询 Java；serverType=be 会返回明确错误。
 *  - SRV 解析改用 DNS-over-HTTPS。
 */
import { pingJava } from './java.js';
import { resolveSrv } from './srv.js';
import { motdToPlainText } from './motd.js';
import { cachedCall } from './cache.js';

function readInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

async function lookupSrv(domain, env, ctx) {
  const ttl = readInt(env.SRV_TTL_SECONDS, 600);
  // 查询失败或没有记录时返回 null，并同样写入缓存，避免反复查询无效域名
  const { data } = await cachedCall(`srv:${domain}`, ttl, ctx, async () => {
    try {
      return await resolveSrv(domain);
    } catch {
      return null;
    }
  });
  return data;
}

/**
 * @param {object} opts
 * @param {string} opts.ip
 * @param {number|undefined} opts.port
 * @param {string|null} opts.iconUrl
 * @param {'auto'|'je'|'be'} opts.serverType
 * @param {boolean} opts.isSRV
 * @param {object} env
 * @param {ExecutionContext} ctx
 */
export async function performLiveQuery({ ip, port, iconUrl, serverType = 'auto', isSRV = false }, env, ctx) {
  const start = Date.now();
  const timeout = readInt(env.QUERY_TIMEOUT_MS, 3000);
  const defaultJavaPort = readInt(env.JAVA_DEFAULT_PORT, 25565);

  if (serverType === 'be') {
    throw new Error('Bedrock 版查询依赖 UDP，无法在 Cloudflare Workers 中运行。');
  }
  if (serverType !== 'auto' && serverType !== 'je') {
    throw new Error(`无效的 serverType: "${serverType}"`);
  }

  let target = { host: ip, port: port ?? defaultJavaPort };

  if (isSRV || serverType === 'auto') {
    const srv = await lookupSrv(ip, env, ctx);
    if (srv) target = srv;
  }

  const data = await pingJava(target.host, target.port, timeout);

  const sample = data.players?.sample?.map((p) => p.name).join(', ') || '无';

  return {
    type: 'Java',
    status: 'online',
    host: `${target.host}:${target.port}`,
    motd: data.description,
    pureMotd: motdToPlainText(data.description).trim(),
    version: data.version?.name,
    protocol: data.version?.protocol,
    players: {
      online: data.players?.online ?? 0,
      max: data.players?.max ?? 0,
      sample,
    },
    mod_info: data.modinfo,
    icon: data.favicon || iconUrl || null,
    delay: Date.now() - start,
  };
}

/**
 * 带缓存的查询。internal=true（前端内部请求）时绕过缓存。
 */
export async function queryServerStatus(opts, env, ctx, { internal = false } = {}) {
  const cacheEnabled = String(env.CACHE_ENABLED ?? 'true') === 'true';

  if (!cacheEnabled || internal) {
    const data = await performLiveQuery(opts, env, ctx);
    return { data, cached: false };
  }

  const ttl = readInt(env.CACHE_TTL_SECONDS, 60);
  const key = `status:${opts.ip}:${opts.port ?? ''}:${opts.serverType}:${opts.isSRV}`;
  return cachedCall(key, ttl, ctx, () => performLiveQuery(opts, env, ctx));
}
