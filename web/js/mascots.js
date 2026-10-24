/* Mascotas (SVG original). Cualquier elemento con data-m="#color" data-v="0|1|2" [data-s="tamaño"]
   recibe una mascota al cargar la página. */
const M = (c, v = 0, s = 120) => {
  const a = [
    '<path d="M42 28l6-16 12 10 12-10 6 16z" fill="#F1ECE1"/>',
    `<path d="M60 24V8" stroke="${c}" stroke-width="4"/><circle cx="60" cy="8" r="6" fill="#9BCB3C"/>`,
    `<circle cx="22" cy="42" r="12" fill="${c}"/><circle cx="98" cy="42" r="12" fill="${c}"/>`
  ][v % 3];
  return `<svg class="mas" viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true"><ellipse cx="60" cy="112" rx="30" ry="5" fill="rgba(0,0,0,.35)"/><path d="M60 22c28 0 44 22 44 48 0 22-16 38-44 38S16 92 16 70c0-26 16-48 44-48z" fill="${c}"/>${a}<ellipse cx="45" cy="66" rx="9" ry="11" fill="#fff"/><ellipse cx="75" cy="66" rx="9" ry="11" fill="#fff"/><circle cx="47" cy="68" r="5" fill="#090B0B"/><circle cx="77" cy="68" r="5" fill="#090B0B"/><path d="M50 88q10 8 20 0" stroke="#090B0B" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
};

function initMascots(root = document) {
  root.querySelectorAll('[data-m]').forEach(e => {
    if (!e.firstChild) e.innerHTML = M(e.dataset.m, +e.dataset.v, +e.dataset.s || 120);
  });
}
document.addEventListener('DOMContentLoaded', () => initMascots());
