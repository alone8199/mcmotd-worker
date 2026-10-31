/**
 * 解析 host / ip / port 参数，逻辑与原 Express 版本 utils/parsehost.js 保持一致。
 * 支持: host=example.com:25565、host=[2001:db8::1]:25565、ip=...&port=...
 */
export function parseHost({ ip, port, host }) {
  let address = null;
  let portStr = null;

  if (host) {
    const h = host.trim();
    const v6WithPort = h.match(/^\[(.+)\]:(\d+)$/);

    if (v6WithPort) {
      address = v6WithPort[1];
      portStr = v6WithPort[2];
    } else {
      const lastColon = h.lastIndexOf(':');
      const firstColon = h.indexOf(':');

      if (lastColon > -1 && lastColon > h.lastIndexOf(']')) {
        if (lastColon === firstColon || h.includes('.')) {
          address = h.substring(0, lastColon);
          portStr = h.substring(lastColon + 1);
        } else {
          // 纯 IPv6 地址，没有端口
          address = h;
        }
      } else {
        address = h;
      }
    }
  } else if (ip) {
    address = ip;
    portStr = port ?? null;
  }

  if (address) address = address.trim();

  if (!address) {
    return { success: false, message: '请求格式不正确。必须提供 host 或 ip 参数。' };
  }

  let numericPort;
  if (portStr) {
    const parsed = parseInt(portStr, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 65535 || String(parsed) !== String(portStr).trim()) {
      return { success: false, message: '端口无效。如果提供，端口必须是 1 到 65535 之间的纯数字。' };
    }
    numericPort = parsed;
  }

  return { success: true, ip: address, port: numericPort };
}
