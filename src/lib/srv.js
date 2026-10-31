/**
 * 通过 Cloudflare DNS-over-HTTPS 查询 _minecraft._tcp.<domain> 的 SRV 记录。
 * Workers 中无法使用 Node 的 dns 模块，所以这里改用 DoH JSON API。
 */
const DOH_ENDPOINT = 'https://cloudflare-dns.com/dns-query';

function looksLikeIp(value) {
  return /^[\d.]+$/.test(value) || value.includes(':');
}

/**
 * @returns {Promise<{host: string, port: number} | null>}
 */
export async function resolveSrv(domain) {
  if (looksLikeIp(domain)) return null;

  const url = new URL(DOH_ENDPOINT);
  url.searchParams.set('name', `_minecraft._tcp.${domain}`);
  url.searchParams.set('type', 'SRV');

  const res = await fetch(url, { headers: { accept: 'application/dns-json' } });
  if (!res.ok) throw new Error(`DoH request failed: ${res.status}`);

  const body = await res.json();
  const record = (body.Answer || []).find((answer) => answer.type === 33); // 33 = SRV
  if (!record) return null;

  // data 格式: "<priority> <weight> <port> <target>."
  const [, , port, target] = record.data.trim().split(/\s+/);
  return {
    host: target.replace(/\.$/, ''),
    port: parseInt(port, 10),
  };
}
