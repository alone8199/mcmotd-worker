/**
 * 用 SVG 绘制状态卡片，替代原版 node-canvas 生成的 PNG（参考 example/pic.example.json 的 simple 模板）。
 * 注意：原版使用的 HYPixel 字体无法在 SVG 中内嵌加载，这里使用系统字体。
 */

const WIDTH = 640;
const HEIGHT = 360;

function escapeXml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(text, max = 13) {
  const s = String(text ?? '');
  return s.length >= max ? `${s.substring(0, max)}...` : s;
}

function formatTime(date = new Date()) {
  return date.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function header() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <style>text{font-family:"Microsoft YaHei","PingFang SC","Noto Sans CJK SC",system-ui,sans-serif;}</style>`;
}

function renderOffline({ host }) {
  return `${header()}
  <text x="30" y="90" font-size="36" font-weight="bold" fill="#f87171">状态: 离线</text>
  <text x="30" y="150" font-size="24" fill="#e2e8f0">地址: ${escapeXml(host)}</text>
  <text x="30" y="200" font-size="20" fill="#94a3b8">无法连接到服务器</text>
</svg>`;
}

function renderOnline({ data }) {
  const iconHref = typeof data.icon === 'string' && /^(data:|https?:)/.test(data.icon) ? data.icon : null;
  const iconBlock = iconHref
    ? `<image href="${escapeXml(iconHref)}" x="520" y="40" width="80" height="80"/>`
    : '';

  const lines = [
    `状态: ${data.type} - 在线`,
    `协议: ${data.protocol ?? '未知'}`,
    `MOTD: ${truncate(data.pureMotd)}`,
    `玩家: ${data.players?.online ?? 0} / ${data.players?.max ?? 0}`,
    `网络延迟: ${data.delay ?? '-'}ms`,
    `版本: ${data.version ?? '未知'}`,
    `查询时间: ${formatTime()}`,
  ];

  const rows = [40, 90, 135, 185, 235, 285, 335];
  const textRows = lines
    .map((line, i) => {
      const size = i === 0 ? 24 : 30;
      const color = i === 0 ? '#000000' : '#ffffff';
      return `<text x="30" y="${rows[i]}" font-size="${size}" fill="${color}">${escapeXml(line)}</text>`;
    })
    .join('\n  ');

  return `${header()}
  ${iconBlock}
  ${textRows}
</svg>`;
}

export function renderStatusSvg({ online, data, host }) {
  return online ? renderOnline({ data }) : renderOffline({ host });
}
