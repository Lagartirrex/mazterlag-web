/* Acceso a los datos del sitio: usa el backend si está configurado (js/config.js) y, si no está
   disponible, vuelve a los datos locales de js/data.js. También aplica los enlaces oficiales. */
const CFG = window.MZL_CONFIG || { apiBase: null, links: {} };
const apiOn = () => typeof CFG.apiBase === 'string';

/* Todo texto que viene de la API se escapa antes de insertarlo en el HTML. */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = u => (/^https?:\/\//.test(u) || /^[\w./-]+$/.test(u) ? u : '#');

async function apiGet(path) {
  const r = await fetch(CFG.apiBase + path);
  if (!r.ok) throw new Error('API ' + r.status);
  return r.json();
}

/* Forma interna que usan las tarjetas: t=título, c=campeón, r=rol, k=tipo, d=descripción, src=imagen */
const fromApi = x => ({ id: x.id, t: x.titulo, c: x.campeon, r: x.rol, k: x.tipo, d: x.descripcion, src: x.imagen || '', pdf: x.pdf || '', yt: x.youtube || '', it: x.items || [], ru: x.runas || '', body: x.contenido || '' });
const fromLocal = x => ({ ...x, src: x.img ? IMG[x.img] : '' });

async function loadCollection(kind) {
  if (apiOn()) {
    try { return (await apiGet(`/api/${kind}?limit=200`)).items.map(fromApi); }
    catch (e) { console.warn('No se pudo usar la API, se usan los datos locales:', e.message); }
  }
  return (kind === 'guias' ? G : B).map(fromLocal);
}

async function loadInstagram(limit = 4) {
  if (!apiOn()) return null;
  try { return (await apiGet('/api/instagram?limit=' + limit)).posts; } catch { return null; }
}

async function loadDiscord() {
  if (!apiOn()) return null;
  try { const j = await apiGet('/api/discord'); return j.configurado ? j : null; } catch { return null; }
}

/* Solo se aceptan enlaces https a las redes oficiales: aunque alguien tocara la API, no puede mandar a otro sitio.
   El link de pago (Turnito) NO pasa por acá: está fijo en coaching.html. */
const LINK_HOSTS = { discord: ['discord.gg', 'discord.com'], instagram: ['www.instagram.com', 'instagram.com'], youtube: ['www.youtube.com', 'youtube.com'], tiktok: ['www.tiktok.com', 'tiktok.com'] };

async function applyLinks() {
  let links = CFG.links || {};
  if (apiOn()) { try { links = { ...links, ...(await apiGet('/api/enlaces')) }; } catch { /* quedan los de config.js */ } }
  document.querySelectorAll('[data-link]').forEach(a => {
    const hosts = LINK_HOSTS[a.dataset.link];
    if (!hosts || !links[a.dataset.link]) return;
    try { const u = new URL(links[a.dataset.link]); if (u.protocol === 'https:' && hosts.includes(u.hostname)) a.href = u.href; } catch { /* enlace inválido: se deja el del HTML */ }
  });
}
document.addEventListener('DOMContentLoaded', applyLinks);
