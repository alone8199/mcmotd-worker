/**
 * Minecraft Java 版 Server List Ping 实现（https://wiki.vg/Server_List_Ping）
 * 使用 Cloudflare Workers 的 TCP Socket API（cloudflare:sockets）。
 */
import { connect } from 'cloudflare:sockets';
import { withTimeout } from './http.js';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/** VarInt 编码（负数按无符号 32 位处理，与协议一致） */
function encodeVarInt(value) {
  const out = [];
  let v = value >>> 0;
  do {
    let byte = v & 0x7f;
    v >>>= 7;
    if (v !== 0) byte |= 0x80;
    out.push(byte);
  } while (v !== 0);
  return out;
}

/** 从 buf[offset] 读取 VarInt；数据不完整时返回 null */
function readVarInt(buf, offset) {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (true) {
    if (i >= buf.length) return null;
    const byte = buf[i++];
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if ((byte & 0x80) === 0) break;
    if (shift > 35) throw new Error('VarInt too big');
  }
  return { value, next: i };
}

function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function buildPacket(packetId, payload) {
  const idBytes = encodeVarInt(packetId);
  const body = [...idBytes, ...payload];
  return new Uint8Array([...encodeVarInt(body.length), ...body]);
}

/**
 * 查询 Java 版服务器状态，返回原始 JSON（description / players / version / favicon ...）
 * @param {string} host
 * @param {number} port
 * @param {number} timeoutMs
 */
export async function pingJava(host, port, timeoutMs = 3000, log = () => {}) {
  log(`正在建立 TCP 连接 ${host}:${port}`);
  const socket = connect({ hostname: host, port });

  const exchange = (async () => {
    // socket.opened 在 TCP 连接建立后 resolve，连接失败会 reject，便于区分"连不上"和"连上后被断开"
    await socket.opened;
    log('TCP 连接已建立');

    const writer = socket.writable.getWriter();
    const hostBytes = encoder.encode(host);

    // Handshake: protocol version(-1), server address, port, next state(1 = status)
    const handshakePayload = [
      ...encodeVarInt(-1),
      ...encodeVarInt(hostBytes.length),
      ...hostBytes,
      (port >> 8) & 0xff,
      port & 0xff,
      ...encodeVarInt(1),
    ];

    await writer.write(buildPacket(0x00, handshakePayload));
    await writer.write(buildPacket(0x00, [])); // Status Request
    writer.releaseLock();
    log('握手包与状态请求已发送，等待服务器响应');

    const reader = socket.readable.getReader();
    let buffer = new Uint8Array(0);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) throw new Error('Socket closed before response.');
        buffer = concatBytes(buffer, value);
        log(`收到 ${value.length} 字节（累计 ${buffer.length} 字节）`);

        const frame = readVarInt(buffer, 0);
        if (!frame) continue;
        if (buffer.length < frame.next + frame.value) continue;

        const packetId = readVarInt(buffer, frame.next);
        if (!packetId || packetId.value !== 0x00) {
          throw new Error('Unexpected packet id in status response.');
        }
        const strLen = readVarInt(buffer, packetId.next);
        if (!strLen) throw new Error('Malformed status response.');

        const jsonBytes = buffer.subarray(strLen.next, strLen.next + strLen.value);
        return JSON.parse(decoder.decode(jsonBytes));
      }
    } finally {
      reader.releaseLock();
    }
  })();

  try {
    return await withTimeout(exchange, timeoutMs, `Connection timed out after ${timeoutMs}ms`);
  } catch (err) {
    log(`连接异常：${err.name || 'Error'} - ${err.message}`);
    throw err;
  } finally {
    try {
      socket.close();
    } catch {
      // 已关闭则忽略
    }
  }
}
