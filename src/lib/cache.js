/**
 * 基于 Cache API（caches.default）的简单缓存。
 * 注意：Cache API 是按数据中心（colo）隔离的，属于尽力而为的缓存，
 * 不保证全局一致，也不会跨节点共享。
 *
 * fn 抛出异常时不缓存（用于离线/失败结果）。
 */
export async function cachedCall(key, ttlSeconds, ctx, fn) {
  const cache = caches.default;
  const cacheKey = new Request(`https://cache.mcmotd.internal/v1/${encodeURIComponent(key)}`);

  const hit = await cache.match(cacheKey);
  if (hit) {
    const { v } = await hit.json();
    return { data: v, cached: true };
  }

  const data = await fn(); // 失败时直接抛出，不写缓存

  const entry = new Response(JSON.stringify({ v: data }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${ttlSeconds}`,
    },
  });
  const put = cache.put(cacheKey, entry);
  if (ctx?.waitUntil) ctx.waitUntil(put);
  else await put;

  return { data, cached: false };
}
