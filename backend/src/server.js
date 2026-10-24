const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createCollection } = require('./collections');
const { createInstagram } = require('./services/instagram');
const { createDiscord } = require('./services/discord');
const { createRateLimiter } = require('./ratelimit');
const { isAdmin, requireAdmin } = require('./auth');
const { readJson, readBody, MIME, sniffImage } = require('./http-utils');
const { HttpError } = require('./errors');
const { seedIfNeeded } = require('./seed');
const pkg = require('../package.json');

const FOLDERS = ['guias', 'builds', 'instagram', 'otros'];

function createApp(config, { fetchImpl = fetch } = {}) {
  if (config.seed !== false) seedIfNeeded(config);
  const col = { guias: createCollection('guias', config), builds: createCollection('builds', config) };
  const ig = createInstagram(config, { fetchImpl });
  const discord = createDiscord(config, { fetchImpl });
  const limiter = createRateLimiter();
  const slug = s => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  /** Crea (o completa) una build a partir de una publicación de Instagram. */
  async function buildFromPost(post, fields = {}, { draftOnly = false } = {}) {
    const id = `ig-${post.id}`.toLowerCase();
    const exists = col.builds.store.get().items.some(x => x.id === id);
    if (draftOnly && exists) return false;
    const data = { titulo: post.titulo, descripcion: post.descripcion.slice(0, 600), rol: 'General', campeon: 'General', tipo: 'Instagram', imagen: post.imagen, publicado: false, ...fields };
    if (exists) return col.builds.update(id, data, { replace: false });
    return col.builds.create({ id, ...data }, { fuente: 'instagram', igId: post.id });
  }
  ig.setBuildImporter(post => buildFromPost(post, {}, { draftOnly: true }).catch(e => { console.warn('[instagram] no se pudo crear la build en borrador:', e.message); return false; }));
  const routes = [];

  const route = (method, pattern, handler, { admin = false } = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:([a-z]+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handler, admin });
  };

  // ---------- Rutas públicas ----------
  route('GET', '/api/health', () => ({ ok: true, version: pkg.version }));

  for (const kind of ['guias', 'builds']) {
    const c = col[kind];
    const admBase = `/api/admin/${kind}`;
    const label = kind === 'guias' ? 'guía' : 'build';
    const draftsAllowed = (ctx) => {
      if (ctx.query.get('borradores') !== '1') return false;
      requireAdmin(ctx.req, config);
      return true;
    };
    route('GET', `/api/${kind}`, ctx => {
      const q = ctx.query;
      return c.list({ rol: q.get('rol'), campeon: q.get('campeon'), tipo: q.get('tipo'), q: q.get('q'), limit: q.get('limit'), offset: q.get('offset'), borradores: draftsAllowed(ctx) });
    });
    route('GET', `/api/${kind}/:id`, ctx => c.get(ctx.params.id, { borradores: draftsAllowed(ctx) }));

    // ---------- Administración ----------
    route('POST', admBase, async ctx => {
      const item = await c.create(await readJson(ctx.req, config.maxJsonBytes));
      let aviso = 'omitido';
      if (ctx.query.get('avisar') === '1' && item.publicado) {
        try { aviso = await discord.notify(`Nueva ${label} en la web: ${item.titulo}\n${config.siteUrl}/detalle.html?tipo=${kind}&id=${item.id}`); }
        catch (e) { aviso = `error: ${e.message}`; }
      }
      return [201, { item, discord: aviso }];
    }, { admin: true });
    route('PUT', `${admBase}/:id`, async ctx => ({ item: await c.update(ctx.params.id, await readJson(ctx.req, config.maxJsonBytes), { replace: true }) }), { admin: true });
    route('PATCH', `${admBase}/:id`, async ctx => ({ item: await c.update(ctx.params.id, await readJson(ctx.req, config.maxJsonBytes), { replace: false }) }), { admin: true });
    route('DELETE', `${admBase}/:id`, async ctx => { await c.remove(ctx.params.id); return [204, null]; }, { admin: true });
  }

  route('GET', '/api/enlaces', () => config.links);
  route('GET', '/api/instagram', ctx => ig.list(ctx.query.get('limit') || 12));
  route('GET', '/api/discord', async () => {
    try { return await discord.info(); }
    catch (e) { console.warn('[discord]', e.message); throw new HttpError(502, 'No se pudo consultar Discord'); }
  });

  route('GET', '/api/admin/estado', () => ({
    version: pkg.version,
    guias: col.guias.store.get().items.length,
    builds: col.builds.store.get().items.length,
    instagram: ig.status(),
    discord: { configurado: discord.configured(), webhook: discord.webhookConfigured() }
  }), { admin: true });
  route('POST', '/api/admin/instagram/sync', async () => {
    try { return await ig.sync(); }
    catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(502, `Falló la sincronización con Instagram: ${e.message}`); }
  }, { admin: true });
  route('POST', '/api/admin/instagram/posts', async ctx => [201, { post: await ig.addManual(await readJson(ctx.req, config.maxJsonBytes)) }], { admin: true });
  route('DELETE', '/api/admin/instagram/posts/:id', async ctx => { await ig.removeManual(ctx.params.id); return [204, null]; }, { admin: true });

  route('GET', '/api/admin/instagram/posts', () => ig.listAll(), { admin: true });
  route('PATCH', '/api/admin/instagram/posts/:id', async ctx => {
    const b = await readJson(ctx.req, config.maxJsonBytes);
    if (typeof b.oculto !== 'boolean') throw new HttpError(400, 'Datos inválidos', { oculto: 'debe ser true o false' });
    await ig.setHidden(ctx.params.id, b.oculto);
    return { ok: true };
  }, { admin: true });
  route('POST', '/api/admin/instagram/posts/:id/build', async ctx => {
    const post = ig.get(ctx.params.id);
    if (!post) throw new HttpError(404, 'No existe esa publicación');
    const b = await readJson(ctx.req, config.maxJsonBytes);
    const fields = {};
    for (const k of ['titulo', 'descripcion', 'rol', 'campeon', 'tipo', 'publicado']) if (b[k] !== undefined) fields[k] = b[k];
    return [201, { item: await buildFromPost(post, fields) }];
  }, { admin: true });

  /** Subida de PDF (guías): cuerpo binario application/pdf. ?nombre=guia-irelia */
  route('POST', '/api/admin/pdfs', async ctx => {
    const buf = await readBody(ctx.req, config.maxPdfBytes);
    if (buf.length < 8 || buf.toString('latin1', 0, 5) !== '%PDF-') throw new HttpError(415, 'El archivo no es un PDF');
    const name = `${slug(ctx.query.get('nombre')) || 'guia'}-${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8)}.pdf`;
    const dir = path.join(config.uploadsDir, 'pdfs');
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, name), buf);
    const ruta = `/uploads/pdfs/${name}`;
    return [201, { ruta, url: config.publicUrl + ruta, bytes: buf.length }];
  }, { admin: true });

  /** Subida de imágenes: cuerpo binario (image/png|jpeg|webp). ?carpeta=guias|builds|instagram|otros&nombre=irelia */
  route('POST', '/api/admin/imagenes', async ctx => {
    const carpeta = ctx.query.get('carpeta') || 'otros';
    if (!FOLDERS.includes(carpeta)) throw new HttpError(400, `carpeta debe ser una de: ${FOLDERS.join(', ')}`);
    const buf = await readBody(ctx.req, config.maxImageBytes);
    const kind = sniffImage(buf);
    if (!kind) throw new HttpError(415, 'El archivo no es una imagen PNG, JPG o WEBP');
    const base = (ctx.query.get('nombre') || 'imagen').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'imagen';
    const name = `${base}-${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 8)}.${kind.ext}`;
    const dir = path.join(config.uploadsDir, carpeta);
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, name), buf);
    const ruta = `/uploads/${carpeta}/${name}`;
    return [201, { ruta, url: config.publicUrl + ruta, bytes: buf.length }];
  }, { admin: true });

  // ---------- Utilidades de respuesta ----------
  function send(res, status, body, headers = {}) {
    if (status === 204 || body === null) { res.writeHead(status, headers); return res.end(); }
    const data = JSON.stringify(body);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(data), ...headers });
    res.end(data);
  }

  function clientIp(req) {
    if (config.trustProxy) {
      const f = (req.headers['x-forwarded-for'] || '').split(',')[0].trim();
      if (f) return f;
    }
    return req.socket.remoteAddress || 'desconocida';
  }

  function applyCors(req, res) {
    const origin = req.headers.origin;
    if (!origin) return;
    const ok = config.allowedOrigins.includes('*') || config.allowedOrigins.includes(origin);
    res.setHeader('Vary', 'Origin');
    if (!ok) return;
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Max-Age', '600');
  }

  function safeJoin(root, rel) {
    const full = path.resolve(root, '.' + path.sep + rel);
    return full === root || full.startsWith(root + path.sep) ? full : null;
  }

  async function serveFile(req, res, file, headers = {}) {
    let st;
    try { st = await fs.promises.stat(file); } catch { return false; }
    if (!st.isFile()) return false;
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream', 'Content-Length': st.size, 'X-Content-Type-Options': 'nosniff', ...headers });
    if (req.method === 'HEAD') { res.end(); return true; }
    fs.createReadStream(file).pipe(res);
    return true;
  }

  function csp() {
    const api = config.allowedOrigins.concat(config.publicUrl).filter(o => /^https?:/.test(o)).join(' ');
    return `default-src 'self'; img-src 'self' data: https:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; script-src 'self'; connect-src 'self' ${api}; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;
  }

  // ---------- Manejo de cada pedido ----------
  async function handle(req, res) {
    const started = Date.now();
    res.on('finish', () => {
      if (config.log) console.log(JSON.stringify({ t: new Date().toISOString(), m: req.method, p: (req.url || '').split('?')[0], s: res.statusCode, ms: Date.now() - started }));
    });
    try {
      let url;
      try { url = new URL(req.url, 'http://localhost'); decodeURIComponent(url.pathname); }
      catch { throw new HttpError(400, 'URL inválida'); }
      const pathname = decodeURIComponent(url.pathname);
      const isApi = pathname.startsWith('/api/');

      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer');
      if (isApi) { applyCors(req, res); res.setHeader('Cache-Control', 'no-store'); }
      if (req.method === 'OPTIONS' && isApi) return send(res, 204, null);

      // Archivos subidos (públicos, pueden usarse desde otro dominio)
      if (pathname.startsWith('/uploads/') && (req.method === 'GET' || req.method === 'HEAD')) {
        const file = safeJoin(config.uploadsDir, pathname.slice('/uploads/'.length));
        if (file && await serveFile(req, res, file, { 'Cache-Control': 'public, max-age=86400', 'Cross-Origin-Resource-Policy': 'cross-origin', ...(pathname.endsWith('.pdf') ? { 'Content-Disposition': 'inline' } : {}) })) return;
        throw new HttpError(404, 'No encontrado');
      }

      if (isApi) {
        const ip = clientIp(req);
        const match = routes.map(r => ({ r, m: pathname.match(r.re) })).find(x => x.m && x.r.method === req.method);
        const pathExists = routes.some(r => r.re.test(pathname));
        if (!match) {
          if (pathExists) { res.setHeader('Allow', routes.filter(r => r.re.test(pathname)).map(r => r.method).join(', ')); throw new HttpError(405, 'Método no permitido'); }
          throw new HttpError(404, 'Ruta no encontrada');
        }
        const lim = match.r.admin ? limiter.check('admin:' + ip, 30) : limiter.check('api:' + ip, config.rateLimitPerMin);
        if (!lim.ok) { res.setHeader('Retry-After', String(lim.retryAfter)); throw new HttpError(429, 'Demasiados pedidos, probá de nuevo en unos segundos'); }
        if (match.r.admin) requireAdmin(req, config);
        const ctx = { req, res, url, query: url.searchParams, params: Object.fromEntries(match.r.keys.map((k, i) => [k, decodeURIComponent(match.m[i + 1])])) };
        const out = await match.r.handler(ctx);
        if (res.writableEnded) return;
        const [status, body] = Array.isArray(out) ? out : [200, out];
        const cacheable = req.method === 'GET' && !match.r.admin && status === 200 && !pathname.endsWith('/health') && ctx.query.get('borradores') !== '1';
        return send(res, status, body, cacheable ? { 'Cache-Control': 'public, max-age=60' } : {});
      }

      // Sitio web (opcional): lo sirve este mismo servidor si se configura FRONTEND_DIR
      if (config.frontendDir && (req.method === 'GET' || req.method === 'HEAD')) {
        let rel = pathname === '/' ? '/index.html' : pathname;
        if (rel === '/js/config.js') {
          const body = `window.MZL_CONFIG = { apiBase: '', discordUrl: '' };\n`;
          res.writeHead(200, { 'Content-Type': MIME['.js'], 'Cache-Control': 'no-cache' });
          return res.end(req.method === 'HEAD' ? undefined : body);
        }
        const hidden = /(^|\/)\.|(^|\/)_headers$|README\.md$/i.test(rel);
        const file = hidden ? null : safeJoin(config.frontendDir, rel.slice(1));
        if (file) {
          const isHtml = path.extname(file) === '.html';
          const ok = await serveFile(req, res, file, isHtml ? { 'Content-Security-Policy': csp(), 'X-Frame-Options': 'DENY', 'Cache-Control': 'no-cache' } : { 'Cache-Control': 'public, max-age=3600' });
          if (ok) return;
        }
      }
      throw new HttpError(404, 'No encontrado');
    } catch (e) {
      if (res.headersSent) { res.destroy(); return; }
      if (e instanceof HttpError) return send(res, e.status, { error: { mensaje: e.message, ...(e.details ? { detalles: e.details } : {}) } });
      console.error('[error]', e);
      return send(res, 500, { error: { mensaje: 'Error interno del servidor' } });
    }
  }

  const server = http.createServer((req, res) => { handle(req, res); });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;

  return {
    server,
    services: { ig, discord, col },
    start() {
      return new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(config.port, config.host, () => { ig.start(); resolve(server.address()); });
      });
    },
    close() {
      ig.stop(); limiter.stop();
      return new Promise(r => { server.close(() => r()); server.closeAllConnections && server.closeAllConnections(); });
    }
  };
}

module.exports = { createApp };
