/* Página de detalle: detalle.html?tipo=guias|builds&id=<id> */
(async () => {
  const $ = s => document.querySelector(s);
  const p = new URLSearchParams(location.search);
  const key = p.get('tipo') === 'builds' ? 'builds' : 'guias';
  const cfg = { guias: { name: 'Guías', page: 'guias.html' }, builds: { name: 'Builds', page: 'builds.html' } }[key];
  const tab = document.querySelector(`.tabs a[href="${cfg.page}"]`);
  if (tab) tab.setAttribute('aria-current', 'page');
  $('#det').innerHTML = '<p class="hint">Cargando…</p>';

  const items = await loadCollection(key);
  const x = items.find(y => y.id === p.get('id'));

  if (!x) {
    document.title = 'No encontrado | MazterLag';
    $('#det').innerHTML = `<nav class="bcr" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="${cfg.page}">${cfg.name}</a></nav>
    <div class="estado"><div class="pa" data-m="#512C7D" data-v="2" data-s="140"></div><span class="chip">No encontrado</span><h1>No encontramos esa ${key === 'builds' ? 'build' : 'guía'}</h1><p>Puede que el enlace esté mal escrito o que ya no exista.</p><div class="acts"><a class="btn big" href="guias.html">Ver guías</a><a class="btn big gh yt" href="builds.html">Ver builds</a></div></div>`;
    initMascots($('#det'));
    return;
  }

  const rel = items.filter(y => y.id !== x.id).slice(0, 3);
  const paragraphs = x.body ? x.body.split(/\n{2,}/).map(t => `<p>${esc(t)}</p>`).join('') : '';
  const list = `<h2>Ítems</h2><ol>${(x.it || []).map(i => `<li>${esc(i)}</li>`).join('')}</ol><h2>Runas</h2><p>${esc(x.ru || '')}</p>`;
  $('#det').innerHTML = `
    <nav class="bcr" aria-label="Ruta"><a href="index.html">Inicio</a><span>/</span><a href="${cfg.page}">${cfg.name}</a><span>/</span><span aria-current="page">${esc(x.c === 'General' ? x.k : x.c)}</span></nav>
    <div class="dg">
      <div>${x.src ? `<img class="cv" src="${esc(safeUrl(x.src))}" alt="${esc(x.t)}">` : ''}</div>
      <div>
        <h1>${esc(x.t)}</h1>
        <div class="meta"><span>${esc(x.r)}</span><span>${esc(x.k)}</span></div>
        <p>${esc(x.d)}</p>
        ${paragraphs}
        ${x.src ? '' : list}
        ${key === 'guias' ? guideActions(x) : ''}
      </div>
    </div>
    ${rel.length ? `<h2 class="t more">Seguí con</h2><div class="bg">${rel.map((y, i) => card(key, y, i)).join('')}</div>` : ''}`;
  document.title = x.t + ' | MazterLag';
  initMascots($('#det'));
  if (typeof applyLinks === 'function') applyLinks();
})();
