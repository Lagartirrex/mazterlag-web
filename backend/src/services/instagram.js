const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JsonFile } = require('../store');
const { fetchJson, sniffImage } = require('../http-utils');
const { HttpError } = require('../errors');
const { IMAGE_OK, clean } = require('../validate');

const DAY = 86_400_000;
const FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';

/**
 * Publicaciones de Instagram.
 * - Con IG_ACCESS_TOKEN: se sincronizan solas con la API de Instagram (Instagram Login) cada IG_SYNC_MINUTES,
 *   las imágenes se descargan a /uploads/instagram (las URLs de Instagram vencen) y el token de 60 días se renueva solo.
 * - Sin token (o además de él): se pueden cargar publicaciones a mano desde la administración.
 */
function createInstagram(config, { fetchImpl = fetch } = {}) {
  const { token: envToken, base, syncMinutes, maxPosts, profileUrl } = config.ig;
  const posts = new JsonFile(path.join(config.dataDir, 'instagram.json'), { api: [], manual: [], ocultos: [], syncedAt: null, ok: null, error: null });
  posts.data.ocultos = posts.data.ocultos || []; // archivos creados por versiones anteriores
  const tokens = new JsonFile(path.join(config.dataDir, 'ig-token.json'), { token: null });
  const imgDir = path.join(config.uploadsDir, 'instagram');
  let timer = null;
  let syncing = null;
  let importer = null;
  const hasTag = caption => !!config.ig.buildTag && String(caption || '').toLowerCase().includes(config.ig.buildTag.toLowerCase());
  const absUrl = p => (!p ? null : p.startsWith('/') ? config.publicUrl + p : p);
  const toApi = p => ({ id: p.id, titulo: p.titulo, descripcion: p.descripcion, imagen: absUrl(p.imagen), enlace: p.enlace, fecha: p.fecha, tipo: p.tipo, fuente: p.fuente });

  const currentToken = () => tokens.get().token || envToken || '';
  const configured = () => !!currentToken();

  async function adoptEnvToken() {
    // Si el .env trae un token distinto al guardado, se usa el del .env (por ejemplo, uno recién generado).
    if (!envToken) return;
    const t = tokens.get();
    if (t.envToken === envToken) return;
    await tokens.update(() => ({ token: envToken, envToken, obtainedAt: new Date().toISOString(), refreshedAt: null, expiresAt: null }));
  }

  /** Los tokens largos duran 60 días y se pueden renovar a partir de las 24 h de vida. Se renueva a los 30 días. */
  async function refreshTokenIfNeeded(now = Date.now()) {
    const t = tokens.get();
    if (!t.token) return false;
    const since = Date.parse(t.refreshedAt || t.obtainedAt || 0) || 0;
    if (now - since < 30 * DAY) return false;
    const url = `${base}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`;
    const j = await fetchJson(fetchImpl, url);
    if (!j || !j.access_token) throw new Error('La renovación del token no devolvió un token');
    await tokens.update(d => ({ ...d, token: j.access_token, refreshedAt: new Date(now).toISOString(), expiresAt: j.expires_in ? new Date(now + j.expires_in * 1000).toISOString() : null }));
    return true;
  }

  async function downloadImage(url, id) {
    const safe = id.replace(/[^A-Za-z0-9_-]/g, '');
    await fs.promises.mkdir(imgDir, { recursive: true });
    for (const ext of ['jpg', 'png', 'webp']) {
      if (fs.existsSync(path.join(imgDir, `${safe}.${ext}`))) return `/uploads/instagram/${safe}.${ext}`;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const res = await fetchImpl(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} al bajar la imagen`);
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 8 * 1024 * 1024) throw new Error('Imagen demasiado grande');
      const kind = sniffImage(buf);
      if (!kind) throw new Error('El archivo descargado no es una imagen');
      await fs.promises.writeFile(path.join(imgDir, `${safe}.${kind.ext}`), buf);
      return `/uploads/instagram/${safe}.${kind.ext}`;
    } finally { clearTimeout(t); }
  }

  const stripTag = c => (config.ig.buildTag ? String(c || '').split(config.ig.buildTag).join('').replace(/#build\b/gi, '') : String(c || ''));
  const titleOf = caption => {
    const line = (caption || '').split(/\r?\n/).map(s => s.trim()).find(Boolean) || '';
    return clean(line).slice(0, 80) || 'Publicación de Instagram';
  };

  async function doSync() {
    if (!configured()) throw new HttpError(409, 'Instagram no está configurado (falta IG_ACCESS_TOKEN)');
    try {
      await adoptEnvToken();
      try { await refreshTokenIfNeeded(); } catch (e) { console.warn('[instagram] no se pudo renovar el token:', e.message); }
      const url = `${base}/me/media?fields=${FIELDS}&limit=${maxPosts}&access_token=${encodeURIComponent(currentToken())}`;
      const j = await fetchJson(fetchImpl, url);
      const media = (j && Array.isArray(j.data)) ? j.data : [];
      const out = [];
      for (const m of media) {
        const src = m.media_type === 'VIDEO' ? m.thumbnail_url : m.media_url;
        if (!src || !m.id || !m.permalink) continue;
        let imagen = '';
        try { imagen = await downloadImage(src, m.id); } catch (e) { console.warn(`[instagram] imagen ${m.id}:`, e.message); continue; }
        out.push({ id: String(m.id), tipo: m.media_type, esBuild: hasTag(m.caption), titulo: titleOf(stripTag(m.caption)), descripcion: clean(m.caption || '').slice(0, 1000), imagen, enlace: m.permalink, fecha: m.timestamp, fuente: 'api' });
      }
      await posts.update(d => ({ ...d, api: out, manual: d.manual.filter(p => !p.semilla), syncedAt: new Date().toISOString(), ok: true, error: null }));
      let borradores = 0;
      if (importer) for (const p of out) if (p.esBuild && !posts.get().ocultos.includes(p.id)) { if (await importer(p)) borradores++; }
      return { sincronizadas: out.length, buildsNuevasEnBorrador: borradores };
    } catch (e) {
      await posts.update(d => ({ ...d, ok: false, error: e.message, errorAt: new Date().toISOString() }));
      throw e;
    }
  }
  /** Evita dos sincronizaciones al mismo tiempo. */
  function sync() { if (!syncing) syncing = doSync().finally(() => { syncing = null; }); return syncing; }

  return {
    configured,
    sync,
    refreshTokenIfNeeded,
    start() {
      if (!configured() || timer) return;
      sync().catch(e => console.warn('[instagram] sincronización inicial falló:', e.message));
      timer = setInterval(() => sync().catch(e => console.warn('[instagram] sincronización falló:', e.message)), syncMinutes * 60_000);
      timer.unref();
    },
    stop() { if (timer) clearInterval(timer); timer = null; },
    list(limit = 12) {
      const d = posts.get();
      const rows = [...d.api, ...d.manual].filter(p => !p.oculto && !d.ocultos.includes(p.id)).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
      limit = Math.min(Math.max(parseInt(limit, 10) || 12, 1), 50);
      return { posts: rows.slice(0, limit).map(toApi), actualizado: d.syncedAt, fuente: d.api.length ? 'api' : (rows.length ? 'manual' : 'vacio'), perfil: profileUrl };
    },
    setBuildImporter(fn) { importer = fn; },
    get(id) { const d = posts.get(); return [...d.api, ...d.manual].find(p => p.id === id) || null; },
    /** Todas las publicaciones (también las ocultas), para la administración. */
    listAll() {
      const d = posts.get();
      return { posts: [...d.api, ...d.manual].sort((a, b) => String(b.fecha).localeCompare(String(a.fecha))).map(p => ({ ...toApi(p), esBuild: !!p.esBuild, oculto: !!p.oculto || d.ocultos.includes(p.id) })) };
    },
    async setHidden(id, hidden) {
      await posts.update(d => {
        const m = d.manual.find(p => p.id === id);
        if (!m && !d.api.some(p => p.id === id)) throw new HttpError(404, 'No existe esa publicación');
        if (m) m.oculto = !!hidden;
        else d.ocultos = hidden ? [...new Set([...d.ocultos, id])] : d.ocultos.filter(x => x !== id);
        return d;
      });
    },
    status() {
      const d = posts.get();
      const t = tokens.get();
      return { configurado: configured(), ultimaSincronizacion: d.syncedAt, ok: d.ok, error: d.error, publicacionesApi: d.api.length, publicacionesManuales: d.manual.length, ocultas: d.ocultos.length, tokenVenceEl: t.expiresAt || null };
    },
    async addManual({ enlace, imagen, titulo, descripcion, fecha, semilla = false }) {
      const errors = {};
      if (typeof enlace !== 'string' || !/^https:\/\/(www\.)?instagram\.com\/[^\s]+$/.test(enlace)) errors.enlace = 'debe ser un enlace https de instagram.com';
      if (typeof imagen !== 'string' || !imagen || !IMAGE_OK(imagen)) errors.imagen = 'debe ser una ruta /uploads/... o una URL http(s)';
      if (fecha !== undefined && Number.isNaN(Date.parse(fecha))) errors.fecha = 'debe ser una fecha ISO válida';
      if (Object.keys(errors).length) throw new HttpError(400, 'Datos inválidos', errors);
      const p = { id: `m-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`, tipo: 'IMAGE', titulo: titleOf(titulo || descripcion), descripcion: clean(descripcion || '').slice(0, 1000), imagen, enlace, fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString(), fuente: 'manual' };
      if (semilla) p.semilla = true;
      await posts.update(d => ({ ...d, manual: [...d.manual, p] }));
      return toApi(p);
    },
    async removeManual(id) {
      await posts.update(d => {
        if (!d.manual.some(p => p.id === id)) throw new HttpError(404, 'No existe una publicación manual con ese id');
        return { ...d, manual: d.manual.filter(p => p.id !== id) };
      });
    },
    isEmpty: () => { const d = posts.get(); return !d.api.length && !d.manual.length; }
  };
}
module.exports = { createInstagram };
