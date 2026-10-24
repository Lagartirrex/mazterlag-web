/* Biblioteca con búsqueda y filtros (guias.html y builds.html).
   La página indica cuál es con <body data-lib="guias|builds">. */
(async () => {
  const $ = s => document.querySelector(s);
  const key = document.body.dataset.lib;
  const F = [['r', 'Rol'], ['c', 'Campeón'], ['k', 'Tipo']];
  const val = f => $('#lib-' + f).value;
  $('#lib-n').textContent = 'Cargando…';
  const items = await loadCollection(key);

  function draw() {
    const q = norm($('#lib-q').value.trim());
    const rows = items.filter(x => F.every(([f]) => !val(f) || x[f] === val(f)) && (!q || norm(x.t + ' ' + x.c + ' ' + x.d).includes(q)));
    $('#lib-grid').innerHTML = rows.map((x, i) => card(key, x, i)).join('') ||
      '<div class="empty"><p>No encontramos resultados con esos filtros.</p><button type="button" class="btn" data-clear="1">Limpiar filtros</button></div>';
    $('#lib-n').textContent = rows.length + (rows.length === 1 ? ' resultado' : ' resultados');
    $('#lib-x').hidden = !(q || F.some(([f]) => val(f)));
  }

  function clear() {
    $('#lib-q').value = '';
    F.forEach(([f]) => { $('#lib-' + f).value = ''; });
    draw();
  }

  F.forEach(([f, name]) => {
    const values = [...new Set(items.map(x => x[f]))].filter(v => v !== 'General');
    $('#lib-' + f).innerHTML = `<option value="">${name}: todos</option>` + values.map(v => `<option>${esc(v)}</option>`).join('');
    $('#lib-' + f).onchange = draw;
  });
  $('#lib-q').oninput = draw;
  $('#lib-x').onclick = clear;
  $('#lib-grid').onclick = e => { if (e.target.closest('[data-clear]')) clear(); };
  draw();
})();
