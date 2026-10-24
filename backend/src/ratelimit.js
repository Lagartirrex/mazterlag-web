/** Límite de pedidos por IP en una ventana de 60 s (en memoria). */
function createRateLimiter() {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now - v.start > 60_000) hits.delete(k);
  }, 60_000);
  timer.unref();
  return {
    /** Devuelve { ok, retryAfter } */
    check(key, max) {
      const now = Date.now();
      let h = hits.get(key);
      if (!h || now - h.start > 60_000) { h = { start: now, n: 0 }; hits.set(key, h); }
      h.n++;
      return { ok: h.n <= max, retryAfter: Math.ceil((h.start + 60_000 - now) / 1000) };
    },
    stop() { clearInterval(timer); }
  };
}
module.exports = { createRateLimiter };
