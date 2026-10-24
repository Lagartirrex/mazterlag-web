/* Tarjeta de guía/build, compartida por las bibliotecas y la página de detalle. */
const ROLE_COLOR = { Top: '#512C7D', Jungla: '#9BCB3C', Mid: '#E5DFEC', ADC: '#F1ECE1', Support: '#9BCB3C', General: '#E5DFEC' };
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function card(key, x, i) {
  const art = x.src
    ? `<div class="art im"><img src="${esc(safeUrl(x.src))}" alt="" loading="lazy"><span>${esc(x.r)}</span></div>`
    : `<div class="art r-${esc(String(x.r).toLowerCase())}"><span>${esc(x.r)}</span>${M(ROLE_COLOR[x.r] || '#E5DFEC', i, 96)}</div>`;
  return `<a class="bc" href="detalle.html?tipo=${key}&amp;id=${encodeURIComponent(x.id)}">${art}<div class="bb"><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p><small>${esc(x.k)}</small></div></a>`;
}
