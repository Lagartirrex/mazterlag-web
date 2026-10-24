/* Inicio: lo último de cada sección, publicaciones de Instagram y miembros de Discord.
   Con backend salen de la API; sin backend, de js/data.js y del HTML. */
(async () => {
  const $ = s => document.querySelector(s);
  const [guias, builds] = await Promise.all([loadCollection('guias'), loadCollection('builds')]);
  $('#s1').textContent = guias.length;
  $('#s2').textContent = builds.length;
  $('#s1l').textContent = guias.length === 1 ? 'Guía gratis' : 'Guías gratis';
  $('#s2l').textContent = builds.length === 1 ? 'Build gratis' : 'Builds gratis';

  /* Rellena una tarjeta de "Lo último" con imagen, título y enlace */
  function fill(sel, { img, title, href }) {
    const el = $(sel);
    if (!el || !title) return;
    if (href) el.href = href;
    if (img) el.querySelector('.lim').innerHTML = `<img src="${esc(safeUrl(img))}" alt="" loading="lazy">`;
    el.querySelector('h3').textContent = title;
  }
  const g = guias[0], b = builds[0];
  if (g) fill('#lu-guia', { img: g.src, title: g.t, href: `detalle.html?tipo=guias&id=${encodeURIComponent(g.id)}` });
  if (b) fill('#lu-build', { img: b.src, title: b.t, href: `detalle.html?tipo=builds&id=${encodeURIComponent(b.id)}` });

  const posts = await loadInstagram(4);
  if (posts && posts.length) {
    $('#posts').innerHTML = posts.map(p =>
      `<a class="igc" href="${esc(safeUrl(p.enlace))}" target="_blank" rel="noopener"><img src="${esc(safeUrl(p.imagen))}" alt="${esc(p.titulo)}" loading="lazy"><span>${esc(p.titulo)}</span></a>`).join('');
  }
  const first = $('#posts a');
  if (first) fill('#lu-post', { img: first.querySelector('img').getAttribute('src'), title: first.querySelector('span').textContent, href: first.href });

  const d = await loadDiscord();
  if (d && d.miembros != null) {
    $('.stats').insertAdjacentHTML('beforeend', `<div><b>${Number(d.miembros).toLocaleString('es-AR')}</b><span>Miembros en Discord</span></div>`);
  }
})();
