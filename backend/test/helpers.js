const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createApp } = require('../src/server');
const { loadConfig } = require('../src/config');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const TOKEN = 'clave-de-prueba-bien-larga-0123456789';

function mockServer(handler) {
  return new Promise(resolve => {
    const s = http.createServer(handler);
    s.listen(0, '127.0.0.1', () => resolve({ server: s, url: `http://127.0.0.1:${s.address().port}`, close: () => new Promise(r => { s.close(r); s.closeAllConnections(); }) }));
  });
}

/** Levanta el backend en un puerto libre con carpetas temporales. */
async function boot(env = {}, { seed = false, tmp } = {}) {
  tmp = tmp || fs.mkdtempSync(path.join(os.tmpdir(), 'mzl-'));
  const config = loadConfig({
    PORT: '0', HOST: '127.0.0.1', LOG: '0', ADMIN_TOKEN: TOKEN,
    DATA_DIR: path.join(tmp, 'data'), UPLOADS_DIR: path.join(tmp, 'up'),
    ALLOWED_ORIGINS: 'http://sitio.test', ...env
  }, tmp);
  config.seed = seed;
  const app = createApp(config);
  const addr = await app.start();
  const base = `http://127.0.0.1:${addr.port}`;
  config.publicUrl = base;

  async function call(method, url, { body, token, headers = {}, raw } = {}) {
    const h = { ...headers };
    if (token) h.Authorization = `Bearer ${token}`;
    let payload = raw;
    if (body !== undefined) { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
    const res = await fetch(base + url, { method, headers: h, body: payload });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* no es JSON */ }
    return { status: res.status, json, text, headers: res.headers };
  }
  return { app, config, base, tmp, call, close: () => app.close() };
}

module.exports = { boot, mockServer, PNG, TOKEN };
