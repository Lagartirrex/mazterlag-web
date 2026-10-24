/* Panel de administración: guías (con PDF y portada), builds, publicaciones de Instagram y estado.
   Habla con el backend (apiBase de js/config.js) usando la clave de administración. */
(() => {
  const $ = s => document.querySelector(s);
  const KEY = 'mzl-admin-token';
  const ROLES = ['Top', 'Jungla', 'Mid', 'ADC', 'Support', 'General'];
  const base = typeof CFG.apiBase === 'string' ? CFG.apiBase : null;
  let token = sessionStorage.getItem(KEY) || '';

  if (base === null) {
    $('#login').innerHTML = '<h1>Falta el backend</h1><p>Para administrar el contenido hay que conectar el sitio al backend: en <code>js/config.js</code> poné la dirección en <code>apiBase</code>.</p>';
    return;
  }

  /* ---------- API ---------- */
  async function call(method, path, { json, raw, type } = {}) {
    const headers = { Authorization: 'Bearer ' + token };
    let body;
    if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (raw) { headers['Content-Type'] = type; body = raw; }
    const res = await fetch(base + path, { method, headers, body });
    const text = await res.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { /* sin cuerpo JSON */ }
    if (!res.ok) {
      const e = data && data.error;
      const det = e && e.detalles ? ' (' + Object.entries(e.detalles).map(([k, v]) => `${k}: ${v}`).join('; ') + ')' : '';
      throw new Error((e && e.mensaje || 'Error ' + res.status) + det);
    }
    return data;
  }
  function say(text, err) { const m = $('#msg'); m.textContent = text || ''; m.classList.toggle('err', !!err); }
  async function run(fn, okText) {
    try { say('Guardando…'); const r = await fn(); say(okText || 'Listo.'); return r; }
    catch (e) { say(e.message, true); if (/inválido o ausente/.test(e.message)) logout(); }
  }
  /* El backend devuelve URLs completas; al guardar se vuelve a la ruta /uploads/... para que no dependa del dominio. */
  const toPath = u => { if (!u) return ''; try { const p = new URL(u, location.href).pathname; return p.startsWith('/uploads/') ? p : u; } catch { return u; } };
  const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  /* ---------- Entrada y salida ---------- */
  async function enter(t) {
    token = t;
    try { await call('GET', '/api/admin/estado'); } catch (e) { token = ''; throw e; }
    sessionStorage.setItem(KEY, token);
    $('#login').hidden = true; $('#panel').hidden = false; $('#logout').hidden = false;
    show('guias');
  }
  function logout() { token = ''; sessionStorage.removeItem(KEY); $('#login').hidden = false; $('#panel').hidden = true; $('#logout').hidden = true; $('#tok').value = ''; }
  $('#login-form').onsubmit = async e => {
    e.preventDefault();
    try { $('#login-msg').textContent = ''; await enter($('#tok').value.trim()); }
    catch (err) { $('#login-msg').textContent = err.message; }
  };
  $('#logout').onclick = logout;
  $('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) show(b.dataset.t); };

  function show(tab) {
    document.querySelectorAll('#tabs button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === tab)));
    ['guias', 'builds', 'instagram', 'estado'].forEach(t => { $('#t-' + t).hidden = t !== tab; });
    say('');
    ({ guias: () => collection('guias'), builds: () => collection('builds'), instagram: instagram, estado: estado })[tab]();
  }

  /* ---------- Guías y builds ---------- */
  async function collection(kind) {
    const box = $('#t-' + kind);
    const label = kind === 'guias' ? 'guía' : 'build';
    const { items } = await call('GET', `/api/${kind}?borradores=1&limit=200`);
    box.innerHTML = `<div class="adm-bar"><h2>${kind === 'guias' ? 'Guías' : 'Builds'} (${items.length})</h2><button type="button" class="btn" id="new-${kind}">Nueva ${label}</button></div>
      <div id="form-${kind}"></div>
      <div class="adm-list">${items.map(x => `
        <div class="adm-row">${x.imagen ? `<img src="${esc(safeUrl(x.imagen))}" alt="">` : '<div class="ph0"></div>'}
          <div><b>${esc(x.titulo)}</b><small><span class="tag ${x.publicado ? 'ok' : 'off'}">${x.publicado ? 'Publicada' : 'Borrador'}</span>${x.fuente === 'instagram' ? '<span class="tag">Instagram</span>' : ''}${x.pdf ? '<span class="tag">PDF</span>' : ''}${esc(x.rol)} · ${esc(x.campeon)} · ${esc(x.tipo)}</small></div>
          <div class="adm-acts"><button type="button" class="btn gh" data-act="edit" data-id="${esc(x.id)}">Editar</button><button type="button" class="btn gh" data-act="toggle" data-id="${esc(x.id)}">${x.publicado ? 'Ocultar' : 'Publicar'}</button><button type="button" class="btn gh" data-act="del" data-id="${esc(x.id)}">Borrar</button></div>
        </div>`).join('') || '<p class="hint">Todavía no hay nada.</p>'}</div>`;
    $(`#new-${kind}`).onclick = () => form(kind, null);
    box.querySelector('.adm-list').onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const x = items.find(i => i.id === b.dataset.id);
      if (b.dataset.act === 'edit') form(kind, x);
      if (b.dataset.act === 'toggle') { await run(() => call('PATCH', `/api/admin/${kind}/${x.id}`, { json: { publicado: !x.publicado } }), x.publicado ? 'Ocultada.' : 'Publicada.'); collection(kind); }
      if (b.dataset.act === 'del' && confirm(`¿Borrar "${x.titulo}"? No se puede deshacer.`)) { await run(() => call('DELETE', `/api/admin/${kind}/${x.id}`), 'Borrada.'); collection(kind); }
    };
  }

  function form(kind, x) {
    const isG = kind === 'guias', edit = !!x;
    const v = x || { rol: 'General', publicado: true };
    const f = $('#form-' + kind);
    f.innerHTML = `<form class="adm-form" id="f-${kind}"><h2>${edit ? 'Editar' : 'Nueva'} ${isG ? 'guía' : 'build'}</h2>
      <div class="grid">
        <div><label for="a-titulo">Título *</label><input id="a-titulo" required maxlength="120" value="${esc(v.titulo || '')}"></div>
        <div><label for="a-id">Identificador (para el enlace)</label><input id="a-id" ${edit ? 'readonly' : ''} maxlength="60" value="${esc(v.id || '')}" placeholder="se completa solo"></div>
        <div><label for="a-rol">Rol *</label><select id="a-rol">${ROLES.map(r => `<option${r === v.rol ? ' selected' : ''}>${r}</option>`).join('')}</select></div>
        <div><label for="a-campeon">Campeón</label><input id="a-campeon" maxlength="40" value="${esc(v.campeon || 'General')}"></div>
        <div><label for="a-tipo">Tipo * (ej: Campeón, Fundamentos, Lore)</label><input id="a-tipo" required maxlength="30" value="${esc(v.tipo || '')}"></div>
        ${isG ? '' : `<div><label for="a-runas">Runas</label><input id="a-runas" maxlength="200" value="${esc(v.runas || '')}"></div>`}
      </div>
      <label for="a-desc">Descripción corta</label><textarea id="a-desc" rows="2" maxlength="600">${esc(v.descripcion || '')}</textarea>
      ${isG ? `<label for="a-cont">Texto de la guía (opcional)</label><textarea id="a-cont" rows="4">${esc(v.contenido || '')}</textarea>
      <label for="a-pdf">Archivo PDF ${v.pdf ? `(actual: <a href="${esc(safeUrl(v.pdf))}" target="_blank" rel="noopener">ver</a>; si subís otro, lo reemplaza)` : ''}</label><input id="a-pdf" type="file" accept="application/pdf">
      <label for="a-yt">Video de YouTube de la guía (opcional; vacío = "Video próximamente")</label><input id="a-yt" type="url" maxlength="300" placeholder="https://www.youtube.com/watch?v=..." value="${esc(v.youtube || '')}">`
      : `<label for="a-items">Ítems (separados por coma)</label><input id="a-items" value="${esc((v.items || []).join(', '))}">`}
      <label for="a-img">Portada (imagen PNG, JPG o WEBP) ${v.imagen ? `(actual: <a href="${esc(safeUrl(v.imagen))}" target="_blank" rel="noopener">ver</a>)` : ''}</label><input id="a-img" type="file" accept="image/png,image/jpeg,image/webp">
      <label class="chk"><input id="a-pub" type="checkbox"${v.publicado !== false ? ' checked' : ''}> Publicada (visible en el sitio)</label>
      ${edit ? '' : '<label class="chk"><input id="a-avisar" type="checkbox"> Avisar en Discord al crearla</label>'}
      <p class="actions"><button class="btn" type="submit">Guardar</button> <button class="btn gh" type="button" id="cancel">Cancelar</button></p></form>`;
    f.scrollIntoView({ block: 'start' });
    $('#cancel').onclick = () => { f.innerHTML = ''; };
    if (!edit) $('#a-titulo').oninput = () => { if (!$('#a-id').dataset.manual) $('#a-id').value = slug($('#a-titulo').value); };
    $('#a-id').oninput = () => { $('#a-id').dataset.manual = '1'; };
    $(`#f-${kind}`).onsubmit = async e => {
      e.preventDefault();
      const ok = await run(async () => {
        const data = {
          id: $('#a-id').value.trim() || slug($('#a-titulo').value), titulo: $('#a-titulo').value.trim(), rol: $('#a-rol').value,
          campeon: $('#a-campeon').value.trim() || 'General', tipo: $('#a-tipo').value.trim(), descripcion: $('#a-desc').value.trim(),
          imagen: toPath(v.imagen), publicado: $('#a-pub').checked
        };
        const img = $('#a-img').files[0];
        if (img) data.imagen = (await call('POST', `/api/admin/imagenes?carpeta=${kind}&nombre=${encodeURIComponent(data.id)}`, { raw: img, type: img.type })).ruta;
        if (isG) {
          data.contenido = $('#a-cont').value.trim(); data.pdf = toPath(v.pdf); data.youtube = $('#a-yt').value.trim();
          const pdf = $('#a-pdf').files[0];
          if (pdf) data.pdf = (await call('POST', `/api/admin/pdfs?nombre=${encodeURIComponent(data.id)}`, { raw: pdf, type: 'application/pdf' })).ruta;
        } else {
          data.items = $('#a-items').value.split(',').map(s => s.trim()).filter(Boolean); data.runas = $('#a-runas').value.trim();
        }
        return edit ? call('PUT', `/api/admin/${kind}/${x.id}`, { json: data })
          : call('POST', `/api/admin/${kind}${$('#a-avisar') && $('#a-avisar').checked ? '?avisar=1' : ''}`, { json: data });
      }, edit ? 'Cambios guardados.' : 'Creada.');
      if (ok) collection(kind);
    };
  }

  /* ---------- Instagram ---------- */
  async function instagram() {
    const box = $('#t-instagram');
    const [{ posts }, st] = await Promise.all([call('GET', '/api/admin/instagram/posts'), call('GET', '/api/admin/estado')]);
    const ig = st.instagram;
    box.innerHTML = `<div class="adm-bar"><h2>Publicaciones de Instagram (${posts.length})</h2><button type="button" class="btn" id="sync"${ig.configurado ? '' : ' disabled'}>Sincronizar ahora</button></div>
      <p class="hint">${ig.configurado ? `Última sincronización: ${ig.ultimaSincronizacion ? new Date(ig.ultimaSincronizacion).toLocaleString('es-AR') : 'todavía ninguna'}${ig.ok === false ? ' · error: ' + esc(ig.error) : ''}.` : 'Instagram no está conectado (falta IG_ACCESS_TOKEN): se muestran las publicaciones cargadas a mano.'}
      Las que lleven <b>#build</b> en el texto entran a Builds como borrador. Las ocultas no aparecen en el sitio.</p>
      <div id="ig-form"></div>
      <div class="adm-list">${posts.map(p => `
        <div class="adm-row"><img src="${esc(safeUrl(p.imagen))}" alt="">
          <div><b>${esc(p.titulo)}</b><small>${p.oculto ? '<span class="tag off">Oculta</span>' : '<span class="tag ok">Visible</span>'}${p.esBuild ? '<span class="tag">#build</span>' : ''}${new Date(p.fecha).toLocaleDateString('es-AR')}</small></div>
          <div class="adm-acts"><button type="button" class="btn gh" data-act="hide" data-id="${esc(p.id)}">${p.oculto ? 'Mostrar' : 'Ocultar'}</button><button type="button" class="btn gh" data-act="build" data-id="${esc(p.id)}">Usar como build</button></div>
        </div>`).join('') || '<p class="hint">No hay publicaciones.</p>'}</div>`;
    const sync = $('#sync');
    if (sync) sync.onclick = async () => { const r = await run(() => call('POST', '/api/admin/instagram/sync'), 'Sincronizado.'); if (r) say(`Sincronizadas ${r.sincronizadas} publicaciones; builds nuevas en borrador: ${r.buildsNuevasEnBorrador}.`); instagram(); };
    box.querySelector('.adm-list').onclick = async e => {
      const b = e.target.closest('[data-act]'); if (!b) return;
      const p = posts.find(x => x.id === b.dataset.id);
      if (b.dataset.act === 'hide') { await run(() => call('PATCH', `/api/admin/instagram/posts/${p.id}`, { json: { oculto: !p.oculto } }), p.oculto ? 'Ahora se ve en el sitio.' : 'Oculta en el sitio.'); instagram(); }
      if (b.dataset.act === 'build') {
        $('#ig-form').innerHTML = `<form class="adm-form" id="ig-b"><h2>Usar como build: ${esc(p.titulo)}</h2><div class="grid">
          <div><label for="b-camp">Campeón *</label><input id="b-camp" required maxlength="40"></div>
          <div><label for="b-rol">Rol *</label><select id="b-rol">${ROLES.map(r => `<option>${r}</option>`).join('')}</select></div>
          <div><label for="b-tipo">Tipo *</label><input id="b-tipo" required maxlength="30" value="Build"></div></div>
          <label class="chk"><input id="b-pub" type="checkbox" checked> Publicar ahora</label>
          <p class="actions"><button class="btn" type="submit">Crear build</button> <button class="btn gh" type="button" id="b-x">Cancelar</button></p></form>`;
        $('#b-x').onclick = () => { $('#ig-form').innerHTML = ''; };
        $('#ig-b').onsubmit = async ev => { ev.preventDefault(); await run(() => call('POST', `/api/admin/instagram/posts/${p.id}/build`, { json: { campeon: $('#b-camp').value.trim(), rol: $('#b-rol').value, tipo: $('#b-tipo').value.trim(), publicado: $('#b-pub').checked } }), 'Build creada. La ves en la pestaña Builds.'); $('#ig-form').innerHTML = ''; };
      }
    };
  }

  /* ---------- Estado ---------- */
  async function estado() {
    const st = await call('GET', '/api/admin/estado');
    $('#t-estado').innerHTML = `<h2>Estado</h2><pre class="adm-pre">${esc(JSON.stringify(st, null, 2))}</pre>`;
  }

  if (token) enter(token).catch(() => logout());
})();
