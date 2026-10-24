/* Tarjeta de guía/build, compartida por las bibliotecas y la página de detalle. */
const ROLE_COLOR = { Top: '#512C7D', Jungla: '#9BCB3C', Mid: '#E5DFEC', ADC: '#F1ECE1', Support: '#9BCB3C', General: '#E5DFEC' };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* Botones de una guía: descargar el PDF y ver el video. Sin video todavía, queda deshabilitado. */
function guideActions(x, big = false) {
  if (x.pdf === undefined && x.yt === undefined) return '';
  const sz = big ? ' big' : ' sm';
  const ext = u => (/^https?:\/\//.test(u) ? ' target="_blank" rel="noopener"' : '');
  const pdf = x.pdf ? `<a class="btn${sz}" href="${esc(safeUrl(x.pdf))}" download${ext(x.pdf)}>Descargar PDF</a>` : '';
  const yt = x.yt
    ? `<a class="btn gh yt${sz}" href="${esc(safeUrl(x.yt))}" target="_blank" rel="noopener">Ver en YouTube</a>`
    : `<span class="btn gh yt off${sz}" role="link" aria-disabled="true">Video próximamente</span>`;
  return `<div class="acts">${pdf}${yt}</div>`;
}

function card(key, x, i) {
  const art = x.src
    ? `<div class="art im"><img src="${esc(safeUrl(x.src))}" alt="" loading="lazy"><span>${esc(x.r)}</span></div>`
    : `<div class="art r-${esc(String(x.r).toLowerCase())}"><span>${esc(x.r)}</span>${M(ROLE_COLOR[x.r] || '#E5DFEC', i, 96)}</div>`;
  return `<div class="bc"><a class="bl" href="detalle.html?tipo=${key}&amp;id=${encodeURIComponent(x.id)}">${art}<div class="bb"><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p><small>${esc(x.k)}</small></div></a>${key === 'guias' ? guideActions(x) : ''}</div>`;
}
