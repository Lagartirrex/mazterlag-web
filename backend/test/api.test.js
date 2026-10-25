const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { boot, mockServer, PNG, TOKEN } = require('./helpers');

const guia = (o = {}) => ({ id: 'como-jugar-ahri', titulo: 'Cómo jugar Ahri', rol: 'Mid', tipo: 'Campeón', campeon: 'Ahri', descripcion: 'Guía de prueba', ...o });

test('salud, enlaces, 404 y 405', async t => {
  const s = await boot(); t.after(s.close);
  assert.deepEqual((await s.call('GET', '/api/health')).json.ok, true);
  const links = (await s.call('GET', '/api/enlaces')).json;
  assert.equal(links.discord, 'https://discord.gg/XebU8vQu2F');
  assert.equal(links.instagram, 'https://www.instagram.com/mazter_lag');
  assert.equal(links.turnito, undefined, 'el link de pago no sale de la API');
  assert.equal((await s.call('GET', '/api/nada')).status, 404);
  const r = await s.call('DELETE', '/api/guias');
  assert.equal(r.status, 405);
  assert.match(r.headers.get('allow'), /GET/);
});

test('datos iniciales: guías, builds, publicaciones e imágenes', async t => {
  const s = await boot({}, { seed: true }); t.after(s.close);
  const g = (await s.call('GET', '/api/guias')).json;
  assert.equal(g.total, 1);
  assert.match(g.items[0].imagen, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/guias\/guia-urgot\.jpg$/);
  assert.match(g.items[0].pdf, /^http:\/\/127\.0\.0\.1:\d+\/uploads\/pdfs\/guia-urgot\.pdf$/);
  assert.equal(g.items[0].youtube, '');
  assert.equal((await s.call('GET', '/api/builds')).json.total, 5);
  const ig = (await s.call('GET', '/api/instagram?limit=4')).json;
  assert.equal(ig.posts.length, 4);
  assert.equal(ig.fuente, 'manual');
  const img = await fetch(g.items[0].imagen);
  assert.equal(img.status, 200);
  assert.equal(img.headers.get('content-type'), 'image/jpeg');
  assert.equal(img.headers.get('cross-origin-resource-policy'), 'cross-origin');
});

test('filtros y búsqueda sin distinguir tildes', async t => {
  const s = await boot({}, { seed: true }); t.after(s.close);
  assert.equal((await s.call('GET', '/api/builds?rol=ADC')).json.total, 1);
  assert.equal((await s.call('GET', '/api/builds?q=build%20de')).json.total, 5);
  assert.equal((await s.call('GET', '/api/guias?q=estrategia')).json.total, 1);
  assert.equal((await s.call('GET', '/api/guias?q=sabias')).json.total, 0);
  assert.equal((await s.call('GET', '/api/guias?tipo=campeon&rol=Top')).json.total, 1);
  assert.equal((await s.call('GET', '/api/builds?limit=2&offset=1')).json.items.length, 2);
});

test('administración: exige token y valida', async t => {
  const s = await boot(); t.after(s.close);
  assert.equal((await s.call('POST', '/api/admin/guias', { body: guia() })).status, 401);
  assert.equal((await s.call('POST', '/api/admin/guias', { body: guia(), token: 'otro' })).status, 401);
  const bad = await s.call('POST', '/api/admin/guias', { body: { id: 'Mal Id', rol: 'Rey' }, token: TOKEN });
  assert.equal(bad.status, 400);
  assert.ok(bad.json.error.detalles.id && bad.json.error.detalles.rol && bad.json.error.detalles.titulo);
  const ok = await s.call('POST', '/api/admin/guias', { body: guia(), token: TOKEN });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.item.imagen, null);
  assert.equal((await s.call('POST', '/api/admin/guias', { body: guia(), token: TOKEN })).status, 409);
});

test('administración desactivada si falta ADMIN_TOKEN', async t => {
  const s = await boot({ ADMIN_TOKEN: '' }); t.after(s.close);
  assert.equal((await s.call('POST', '/api/admin/guias', { body: guia(), token: 'x' })).status, 503);
});

test('crear, leer, editar, borradores y borrar', async t => {
  const s = await boot(); t.after(s.close);
  await s.call('POST', '/api/admin/guias', { body: guia({ publicado: false }), token: TOKEN });
  assert.equal((await s.call('GET', '/api/guias')).json.total, 0);
  assert.equal((await s.call('GET', '/api/guias/como-jugar-ahri')).status, 404);
  assert.equal((await s.call('GET', '/api/guias?borradores=1')).status, 401);
  assert.equal((await s.call('GET', '/api/guias?borradores=1', { token: TOKEN })).json.total, 1);
  const p = await s.call('PATCH', '/api/admin/guias/como-jugar-ahri', { body: { publicado: true, titulo: 'Ahri en 5 minutos' }, token: TOKEN });
  assert.equal(p.json.item.titulo, 'Ahri en 5 minutos');
  assert.equal(p.json.item.rol, 'Mid');
  assert.equal((await s.call('GET', '/api/guias/como-jugar-ahri')).json.titulo, 'Ahri en 5 minutos');
  const put = await s.call('PUT', '/api/admin/guias/como-jugar-ahri', { body: { titulo: 'Solo título' }, token: TOKEN });
  assert.equal(put.status, 400);
  const put2 = await s.call('PUT', '/api/admin/guias/como-jugar-ahri', { body: guia({ descripcion: 'Nueva' }), token: TOKEN });
  assert.equal(put2.json.item.descripcion, 'Nueva');
  assert.equal((await s.call('DELETE', '/api/admin/guias/como-jugar-ahri', { token: TOKEN })).status, 204);
  assert.equal((await s.call('DELETE', '/api/admin/guias/como-jugar-ahri', { token: TOKEN })).status, 404);
});

test('builds con ítems y runas', async t => {
  const s = await boot(); t.after(s.close);
  const r = await s.call('POST', '/api/admin/builds', { body: { id: 'build-ahri', titulo: 'Build de Ahri', rol: 'Mid', tipo: 'Daño', items: ['A', 'B'], runas: 'Electrocutar' }, token: TOKEN });
  assert.equal(r.status, 201);
  assert.deepEqual(r.json.item.items, ['A', 'B']);
  const bad = await s.call('POST', '/api/admin/builds', { body: { id: 'otra-build', titulo: 'Otra', rol: 'Mid', tipo: 'Daño', items: 'no-es-lista' }, token: TOKEN });
  assert.equal(bad.status, 400);
});

test('las escrituras simultáneas no se pisan', async t => {
  const s = await boot(); t.after(s.close);
  const rs = await Promise.all(Array.from({ length: 12 }, (_, i) => s.call('POST', '/api/admin/guias', { body: guia({ id: `guia-numero-${i}` }), token: TOKEN })));
  assert.ok(rs.every(r => r.status === 201));
  assert.equal((await s.call('GET', '/api/guias?limit=50')).json.total, 12);
  const file = JSON.parse(fs.readFileSync(path.join(s.config.dataDir, 'guias.json'), 'utf8'));
  assert.equal(file.items.length, 12);
});

test('subida de imágenes', async t => {
  const s = await boot(); t.after(s.close);
  const ok = await s.call('POST', '/api/admin/imagenes?carpeta=guias&nombre=Cómo Jugar Irelia.png', { raw: PNG, token: TOKEN, headers: { 'Content-Type': 'image/png' } });
  assert.equal(ok.status, 201);
  assert.match(ok.json.ruta, /^\/uploads\/guias\/como-jugar-irelia-[0-9a-f]{8}\.png$/);
  assert.equal((await fetch(ok.json.url)).status, 200);
  const nota = await s.call('POST', '/api/admin/imagenes?carpeta=guias', { raw: Buffer.from('hola, no soy una imagen'), token: TOKEN, headers: { 'Content-Type': 'image/png' } });
  assert.equal(nota.status, 415);
  assert.equal((await s.call('POST', '/api/admin/imagenes?carpeta=../x', { raw: PNG, token: TOKEN })).status, 400);
  assert.equal((await s.call('POST', '/api/admin/imagenes', { raw: PNG })).status, 401);
  const g = await s.call('POST', '/api/admin/guias', { body: guia({ imagen: ok.json.ruta }), token: TOKEN });
  assert.equal(g.json.item.imagen, ok.json.url);
  const evil = await s.call('POST', '/api/admin/guias', { body: guia({ id: 'otra-guia', imagen: '/uploads/../data/guias.json' }), token: TOKEN });
  assert.equal(evil.status, 400);
});

test('guías: el enlace de YouTube se valida', async t => {
  const s = await boot(); t.after(s.close);
  assert.equal((await s.call('POST', '/api/admin/guias', { body: guia({ youtube: 'https://evil.test/x' }), token: TOKEN })).status, 400);
  const ok = await s.call('POST', '/api/admin/guias', { body: guia({ youtube: 'https://www.youtube.com/watch?v=abc123' }), token: TOKEN });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.item.youtube, 'https://www.youtube.com/watch?v=abc123');
});

test('no se puede salir de la carpeta de imágenes', async t => {
  const s = await boot({}, { seed: true }); t.after(s.close);
  for (const p of ['/uploads/../data/guias.json', '/uploads/%2e%2e/data/guias.json', '/uploads/..%2fdata%2fguias.json']) {
    const r = await fetch(s.base + p);
    assert.equal(r.status, 404, p);
  }
});

test('Discord: datos públicos con caché y aviso por webhook', async t => {
  let invites = 0; const hooks = [];
  const d = await mockServer((req, res) => {
    if (req.url.startsWith('/invites/abc123')) { invites++; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ guild: { name: 'MazterLag' }, approximate_member_count: 321, approximate_presence_count: 45 })); }
    if (req.url === '/hook' && req.method === 'POST') { let b = ''; req.on('data', c => b += c); req.on('end', () => { hooks.push(JSON.parse(b)); res.statusCode = 204; res.end(); }); return; }
    res.statusCode = 404; res.end();
  });
  t.after(d.close);
  const s = await boot({ DISCORD_INVITE_CODE: 'abc123', DISCORD_API_BASE: d.url, DISCORD_WEBHOOK_URL: d.url + '/hook', SITE_URL: 'https://mazterlag.test' }); t.after(s.close);
  const a = (await s.call('GET', '/api/discord')).json;
  assert.equal(a.miembros, 321); assert.equal(a.enLinea, 45); assert.equal(a.nombre, 'MazterLag');
  assert.equal(a.invitacion, 'https://discord.gg/abc123');
  await s.call('GET', '/api/discord');
  assert.equal(invites, 1, 'la segunda consulta sale de la caché');
  const r = await s.call('POST', '/api/admin/guias?avisar=1', { body: guia(), token: TOKEN });
  assert.equal(r.json.discord, 'enviado');
  assert.match(hooks[0].content, /Nueva guía en la web: Cómo jugar Ahri\nhttps:\/\/mazterlag\.test\/detalle\.html\?tipo=guias&id=como-jugar-ahri/);
  assert.deepEqual(hooks[0].allowed_mentions, { parse: [] });
});

test('Discord sin configurar y webhook caído', async t => {
  const s = await boot(); t.after(s.close);
  assert.deepEqual((await s.call('GET', '/api/discord')).json, { configurado: false });
  const w = await mockServer((req, res) => { res.statusCode = 500; res.end('boom'); }); t.after(w.close);
  const s2 = await boot({ DISCORD_WEBHOOK_URL: w.url }); t.after(s2.close);
  const r = await s2.call('POST', '/api/admin/guias?avisar=1', { body: guia(), token: TOKEN });
  assert.equal(r.status, 201);
  assert.match(r.json.discord, /^error:/);
});

function graph({ token = 'tok1', fail = false, calls = [] } = {}) {
  return mockServer((req, res) => {
    const u = new URL(req.url, 'http://x'); calls.push(u.pathname + '?' + (u.searchParams.get('access_token') || ''));
    const json = o => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(o)); };
    if (u.pathname === '/me/media') {
      if (fail) { res.statusCode = 400; return json({ error: { message: 'Token inválido', code: 190 } }); }
      const origin = `http://${req.headers.host}`;
      return json({ data: [
        { id: '111', caption: 'Cómo jugar Irelia\nGuía completa', media_type: 'IMAGE', media_url: origin + '/img/a.png', permalink: 'https://www.instagram.com/p/AAA/', timestamp: '2026-10-20T12:00:00+0000' },
        { id: '222', caption: 'Build de Rakan #build', media_type: 'VIDEO', media_url: origin + '/video.mp4', thumbnail_url: origin + '/img/b.png', permalink: 'https://www.instagram.com/reel/BBB/', timestamp: '2026-10-21T12:00:00+0000' },
        { id: '333', media_type: 'IMAGE', permalink: 'https://www.instagram.com/p/CCC/', timestamp: '2026-10-19T12:00:00+0000' }
      ] });
    }
    if (u.pathname === '/refresh_access_token') return json({ access_token: 'tok-renovado', token_type: 'bearer', expires_in: 5184000 });
    if (u.pathname.startsWith('/img/')) { res.setHeader('Content-Type', 'image/png'); return res.end(PNG); }
    res.statusCode = 404; res.end();
  });
}

test('Instagram: sincroniza, guarda las imágenes y reemplaza la semilla', async t => {
  const calls = []; const g = await graph({ calls }); t.after(g.close);
  const s = await boot({ IG_ACCESS_TOKEN: 'tok1', IG_API_BASE: g.url }, { seed: true }); t.after(s.close);
  assert.equal((await s.call('GET', '/api/instagram')).json.posts.length, 4);
  assert.equal((await s.call('POST', '/api/admin/instagram/sync')).status, 401);
  const r = await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  assert.equal(r.status, 200); assert.equal(r.json.sincronizadas, 2, 'la publicación sin imagen se omite');
  assert.equal(r.json.buildsNuevasEnBorrador, 1);
  const j = (await s.call('GET', '/api/instagram')).json;
  assert.equal(j.fuente, 'api'); assert.equal(j.posts.length, 2);
  assert.equal(j.posts[0].id, '222'); assert.equal(j.posts[0].tipo, 'VIDEO'); assert.equal(j.posts[0].titulo, 'Build de Rakan');
  assert.equal(j.posts[1].titulo, 'Cómo jugar Irelia');
  assert.equal(j.posts[1].enlace, 'https://www.instagram.com/p/AAA/');
  assert.equal((await fetch(j.posts[0].imagen)).status, 200);
  assert.ok(fs.existsSync(path.join(s.config.uploadsDir, 'instagram', '111.png')));
  const st = (await s.call('GET', '/api/admin/estado', { token: TOKEN })).json.instagram;
  assert.equal(st.ok, true); assert.equal(st.publicacionesApi, 2);
  assert.ok(!JSON.stringify(j).includes('tok1'), 'el token nunca sale en la API pública');
});

test('Instagram: si falla, conserva lo guardado y registra el error', async t => {
  const live = await graph(); t.after(live.close);
  const s = await boot({ IG_ACCESS_TOKEN: 'tok1', IG_API_BASE: live.url }); t.after(s.close);
  await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  const bad = await graph({ fail: true }); t.after(bad.close);
  const s2 = await boot({ IG_ACCESS_TOKEN: 'tok1', IG_API_BASE: bad.url }, { tmp: s.tmp }); t.after(s2.close);
  const r = await s2.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  assert.equal(r.status, 502); assert.match(r.json.error.mensaje, /Token inválido/);
  assert.equal((await s2.call('GET', '/api/instagram')).json.posts.length, 2);
  const st = (await s2.call('GET', '/api/admin/estado', { token: TOKEN })).json.instagram;
  assert.equal(st.ok, false); assert.match(st.error, /Token inválido/);
});

test('Instagram: renueva el token de 60 días cuando pasaron 30', async t => {
  const calls = []; const g = await graph({ calls }); t.after(g.close);
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mzl-'));
  fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  fs.writeFileSync(path.join(tmp, 'data', 'ig-token.json'), JSON.stringify({ token: 'viejo', envToken: 'viejo', obtainedAt: new Date(Date.now() - 40 * 86400000).toISOString() }));
  const s = await boot({ IG_ACCESS_TOKEN: 'viejo', IG_API_BASE: g.url }, { tmp }); t.after(s.close);
  await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  assert.ok(calls.some(c => c.startsWith('/refresh_access_token?viejo')));
  assert.ok(calls.some(c => c === '/me/media?tok-renovado'), 'usa el token nuevo');
  const saved = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'ig-token.json'), 'utf8'));
  assert.equal(saved.token, 'tok-renovado');
  assert.ok(saved.expiresAt);
});

test('Instagram sin token: carga manual', async t => {
  const s = await boot(); t.after(s.close);
  assert.equal((await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN })).status, 409);
  const bad = await s.call('POST', '/api/admin/instagram/posts', { body: { enlace: 'http://malo.com/x', imagen: 'x' }, token: TOKEN });
  assert.equal(bad.status, 400);
  const ok = await s.call('POST', '/api/admin/instagram/posts', { body: { enlace: 'https://www.instagram.com/p/XYZ/', imagen: '/uploads/instagram/x.jpg', descripcion: 'Título de prueba\nresto' }, token: TOKEN });
  assert.equal(ok.status, 201);
  const l = (await s.call('GET', '/api/instagram')).json;
  assert.equal(l.posts[0].titulo, 'Título de prueba'); assert.equal(l.fuente, 'manual');
  assert.equal((await s.call('DELETE', `/api/admin/instagram/posts/${ok.json.post.id}`, { token: TOKEN })).status, 204);
  assert.equal((await s.call('GET', '/api/instagram')).json.posts.length, 0);
});

test('CORS, límite de pedidos y errores de formato', async t => {
  const s = await boot({ RATE_LIMIT_PER_MIN: '5' }); t.after(s.close);
  const ok = await s.call('GET', '/api/health', { headers: { Origin: 'http://sitio.test' } });
  assert.equal(ok.headers.get('access-control-allow-origin'), 'http://sitio.test');
  const no = await s.call('GET', '/api/health', { headers: { Origin: 'http://malo.test' } });
  assert.equal(no.headers.get('access-control-allow-origin'), null);
  const pre = await s.call('OPTIONS', '/api/admin/guias', { headers: { Origin: 'http://sitio.test' } });
  assert.equal(pre.status, 204);
  assert.equal((await s.call('POST', '/api/admin/guias', { raw: '{mal', token: TOKEN, headers: { 'Content-Type': 'application/json' } })).status, 400);
  assert.equal((await s.call('POST', '/api/admin/guias', { raw: 'hola', token: TOKEN, headers: { 'Content-Type': 'text/plain' } })).status, 415);
  const codes = []; for (let i = 0; i < 6; i++) codes.push((await s.call('GET', '/api/guias')).status);
  assert.ok(codes.includes(429), codes.join());
});

test('cuerpo demasiado grande', async t => {
  const s = await boot(); t.after(s.close);
  const r = await s.call('POST', '/api/admin/guias', { raw: JSON.stringify({ x: 'a'.repeat(1_100_000) }), token: TOKEN, headers: { 'Content-Type': 'application/json' } });
  assert.equal(r.status, 413);
});

test('sirve el sitio web y no deja salir de su carpeta', async t => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mzl-'));
  const web = path.join(tmp, 'web'); fs.mkdirSync(path.join(web, 'js'), { recursive: true });
  fs.writeFileSync(path.join(web, 'index.html'), '<h1>hola</h1>'); fs.writeFileSync(path.join(tmp, 'secreto.txt'), 'no');
  const s = await boot({ FRONTEND_DIR: web }, { tmp }); t.after(s.close);
  const home = await fetch(s.base + '/');
  assert.equal(home.status, 200); assert.match(await home.text(), /hola/);
  assert.match(home.headers.get('content-security-policy'), /script-src 'self'/);
  assert.match(await (await fetch(s.base + '/js/config.js')).text(), /apiBase: ''/);
  for (const p of ['/../secreto.txt', '/%2e%2e/secreto.txt', '/..%2fsecreto.txt']) assert.equal((await fetch(s.base + p)).status, 404, p);
});

test('sitio web: archivo inexistente devuelve 404.html y la API sigue en JSON', async t => {
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'mzl-'));
  const web = path.join(tmp, 'web'); fs.mkdirSync(web, { recursive: true });
  fs.writeFileSync(path.join(web, 'index.html'), '<h1>hola</h1>');
  const s = await boot({ FRONTEND_DIR: web }, { tmp }); t.after(s.close);
  assert.equal((await fetch(s.base + '/no-existe')).status, 404); // sin 404.html: JSON de siempre
  fs.writeFileSync(path.join(web, '404.html'), '<h1>Página no encontrada</h1>');
  const r = await fetch(s.base + '/algo/no-existe.html');
  assert.equal(r.status, 404); assert.match(r.headers.get('content-type'), /text\/html/); assert.match(await r.text(), /Página no encontrada/);
  const api = await fetch(s.base + '/api/no-existe');
  assert.equal(api.status, 404); assert.match(api.headers.get('content-type'), /json/);
});

test('administración: la clave corta se rechaza', async t => {
  const s = await boot({ ADMIN_TOKEN: 'corta' }); t.after(s.close);
  const r = await s.call('POST', '/api/admin/guias', { body: guia(), token: 'corta' });
  assert.equal(r.status, 503); assert.match(r.json.error.mensaje, /24 caracteres/);
});

test('guías con PDF: subida validada y descarga', async t => {
  const s = await boot(); t.after(s.close);
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF');
  assert.equal((await s.call('POST', '/api/admin/pdfs?nombre=x', { raw: pdf })).status, 401);
  assert.equal((await s.call('POST', '/api/admin/pdfs?nombre=x', { raw: Buffer.from('no soy un pdf'), token: TOKEN, headers: { 'Content-Type': 'application/pdf' } })).status, 415);
  const up = await s.call('POST', '/api/admin/pdfs?nombre=Guía de Irelia', { raw: pdf, token: TOKEN, headers: { 'Content-Type': 'application/pdf' } });
  assert.equal(up.status, 201); assert.match(up.json.ruta, /^\/uploads\/pdfs\/guia-de-irelia-[0-9a-f]{8}\.pdf$/);
  const g = await s.call('POST', '/api/admin/guias', { body: guia({ pdf: up.json.ruta }), token: TOKEN });
  assert.equal(g.status, 201); assert.equal(g.json.item.pdf, up.json.url);
  const res = await fetch(s.base + up.json.ruta);
  assert.equal(res.headers.get('content-type'), 'application/pdf');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  const bad = await s.call('POST', '/api/admin/guias', { body: guia({ id: 'otra-guia', pdf: 'javascript:alert(1)' }), token: TOKEN });
  assert.equal(bad.status, 400);
});

test('Instagram: builds en borrador, ocultar y usar una publicación como build', async t => {
  const g = await graph(); t.after(g.close);
  const s = await boot({ IG_ACCESS_TOKEN: 'tok1', IG_API_BASE: g.url }); t.after(s.close);
  await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  // Solo la publicación con #build se importa, y en borrador: el público no la ve
  assert.equal((await s.call('GET', '/api/builds')).json.total, 0);
  const drafts = (await s.call('GET', '/api/builds?borradores=1', { token: TOKEN })).json;
  assert.equal(drafts.total, 1); assert.equal(drafts.items[0].id, 'ig-222'); assert.equal(drafts.items[0].fuente, 'instagram'); assert.equal(drafts.items[0].publicado, false);
  assert.equal(drafts.items[0].titulo, 'Build de Rakan');
  // Publicar la build completando campeón y rol
  const pub = await s.call('PATCH', '/api/admin/builds/ig-222', { body: { publicado: true, campeon: 'Rakan', rol: 'Support', tipo: 'Utilidad' }, token: TOKEN });
  assert.equal(pub.json.item.fuente, 'instagram');
  assert.equal((await s.call('GET', '/api/builds?rol=Support')).json.total, 1);
  // Ocultar una publicación: sale de /api/instagram y sigue oculta tras sincronizar de nuevo
  assert.equal((await s.call('PATCH', '/api/admin/instagram/posts/111', { body: { oculto: true }, token: TOKEN })).status, 200);
  assert.deepEqual((await s.call('GET', '/api/instagram')).json.posts.map(p => p.id), ['222']);
  await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  assert.deepEqual((await s.call('GET', '/api/instagram')).json.posts.map(p => p.id), ['222']);
  const all = (await s.call('GET', '/api/admin/instagram/posts', { token: TOKEN })).json.posts;
  assert.equal(all.find(p => p.id === '111').oculto, true);
  // Usar otra publicación como build, a mano
  const mk = await s.call('POST', '/api/admin/instagram/posts/111/build', { body: { campeon: 'Irelia', rol: 'Top', tipo: 'Daño', publicado: true }, token: TOKEN });
  assert.equal(mk.status, 201); assert.equal(mk.json.item.id, 'ig-111');
  assert.equal((await s.call('POST', '/api/admin/instagram/posts/nope/build', { body: {}, token: TOKEN })).status, 404);
  // Una nueva sincronización no pisa las ediciones de una build ya revisada
  await s.call('POST', '/api/admin/instagram/sync', { token: TOKEN });
  assert.equal((await s.call('GET', '/api/builds/ig-222')).json.rol, 'Support');
});
