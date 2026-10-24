/* Tarjeta de guía/build, compartida por las bibliotecas y la página de detalle. */
const ROLE_COLOR = { Top: '#512C7D', Jungla: '#9BCB3C', Mid: '#E5DFEC', ADC: '#F1ECE1', Support: '#9BCB3C', General: '#E5DFEC' };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* Logo de YouTube en un solo color (toma el color del texto). */
const YT_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor"><path fill-rule="evenodd" d="M5.5 4.5h13A4.5 4.5 0 0 1 23 9v6a4.5 4.5 0 0 1-4.5 4.5h-13A4.5 4.5 0 0 1 1 15V9a4.5 4.5 0 0 1 4.5-4.5zM10 8.8v6.4l5.5-3.2z"/></svg>';

/* Botones del detalle de una guía: descargar el PDF y ver el video.
   Sin video propio, "Ver video" lleva al canal oficial de YouTube. */
function guideActions(x) {
  const ext = u => (/^https?:\/\//.test(u) ? ' target="_blank" rel="noopener"' : '');
  const pdf = x.pdf ? `<a class="btn big" href="${esc(safeUrl(x.pdf))}" download${ext(x.pdf)}>Descargar PDF</a>` : '';
  const canal = (CFG.links && CFG.links.youtube) || 'https://www.youtube.com/@mazter_lag';
  const yt = x.yt
    ? `<a class="btn gh yt big" href="${esc(safeUrl(x.yt))}" target="_blank" rel="noopener">${YT_ICON}Ver video</a>`
    : `<a class="btn gh yt big" href="${esc(canal)}" data-link="youtube" target="_blank" rel="noopener">${YT_ICON}Ver video</a>`;
  return `<div class="acts">${pdf}${yt}</div>`;
}

/* Tarjeta del listado: portada + título + etiquetas, toda clickeable hacia el detalle. */
function card(key, x, i) {
  const art = x.src
    ? `<div class="art im"><img src="${esc(safeUrl(x.src))}" alt="" loading="lazy"></div>`
    : `<div class="art r-${esc(String(x.r).toLowerCase())}">${M(ROLE_COLOR[x.r] || '#E5DFEC', i, 96)}</div>`;
  const tags = [x.r, x.k].filter(Boolean).map(t => `<span>${esc(t)}</span>`).join('');
  return `<div class="bc"><a class="bl" href="detalle.html?tipo=${key}&amp;id=${encodeURIComponent(x.id)}">${art}<div class="bb"><h3>${esc(x.t)}</h3><div class="tg">${tags}</div></div></a></div>`;
}
