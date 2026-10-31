import { json, svg } from '../lib/http.js';
import { parseHost } from '../lib/parseHost.js';
import { queryServerStatus } from '../lib/query.js';
import { renderStatusSvg } from '../lib/svgRender.js';

const OFFLINE_MESSAGE = '无法连接到服务器，它可能已离线或地址/端口不正确。';

function readQuery(url) {
  const p = url.searchParams;
  return {
    parsed: parseHost({
      ip: p.get('ip'),
      port: p.get('port'),
      host: p.get('host'),
    }),
    iconUrl: p.get('icon'),
    serverType: p.get('stype') || 'auto',
    isSRV: p.get('srv') === 'true',
  };
}

/** GET /api/status */
export async function handleStatus(request, env, ctx) {
  const url = new URL(request.url);
  const { parsed, iconUrl, serverType, isSRV } = readQuery(url);

  if (!parsed.success) {
    return json({ status: 'error', message: parsed.message }, 400);
  }

  const fullAddress = parsed.port ? `${parsed.ip}:${parsed.port}` : parsed.ip;
  const internal = request.headers.get('x-internal-request') === 'true';

  try {
    const { data, cached } = await queryServerStatus(
      { ip: parsed.ip, port: parsed.port, iconUrl, serverType, isSRV },
      env,
      ctx,
      { internal },
    );
    return json({ ...data, cached: undefined });
  } catch (err) {
    console.log('[QUERY] 查询失败', fullAddress, err?.message);
    return json({ status: 'offline', host: fullAddress, error: OFFLINE_MESSAGE, logs: err.logs ?? [] });
  }
}

/** GET /api/status_img —— 原版返回 PNG，Workers 无法使用 node-canvas，这里返回 SVG */
export async function handleStatusImage(request, env, ctx) {
  const url = new URL(request.url);
  const { parsed, iconUrl, serverType, isSRV } = readQuery(url);

  if (!parsed.success) {
    return json({ status: 'error', message: parsed.message }, 400);
  }

  const fullAddress = parsed.port ? `${parsed.ip}:${parsed.port}` : parsed.ip;
  const internal = request.headers.get('x-internal-request') === 'true';

  try {
    const { data } = await queryServerStatus(
      { ip: parsed.ip, port: parsed.port, iconUrl, serverType, isSRV },
      env,
      ctx,
      { internal },
    );
    return svg(renderStatusSvg({ online: true, data }));
  } catch (err) {
    console.log('[QUERY_IMG] 查询失败', fullAddress, err?.message);
    return svg(renderStatusSvg({ online: false, host: fullAddress }));
  }
}
