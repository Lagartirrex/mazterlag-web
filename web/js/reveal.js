/* Aparición suave al scrollear (fade + leve subida, escalonada en grillas).
   Va en el <head>: pone html.js-reveal antes del primer pintado. Sin JS, o con "menos movimiento",
   no se agrega la clase y todo se ve normal. Sirve también para tarjetas que se dibujan después. */
(() => {
  const root = document.documentElement;
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.classList.add('js-reveal');

  const GRID = '.bg,.lu,.lu2,#posts,.team,.pil';   /* sus hijos aparecen de a uno */
  const WRAP = 'section,.cols,.pg';                /* se abren para animar lo de adentro */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    io.unobserve(el);
    el.classList.add('rv-in');
    /* Al terminar, se saca la clase para no pisar los hover de las tarjetas */
    setTimeout(() => el.classList.remove('rv', 'rv-in'), 900 + (parseInt(el.style.getPropertyValue('--d')) || 0));
  }), { threshold: 0.08, rootMargin: '0px 0px -4% 0px' });

  const mark = (el, i = 0) => {
    if (el.dataset.rv) return;
    el.dataset.rv = '1';
    el.classList.add('rv');
    el.style.setProperty('--d', Math.min(i, 7) * 70 + 'ms');
    io.observe(el);
  };
  const walk = parent => [...parent.children].forEach(c => {
    if (c.matches('script,style,[hidden]')) return;
    if (c.matches(GRID)) [...c.children].forEach((k, i) => mark(k, i));
    else if (c.matches(WRAP)) walk(c);
    else mark(c);
  });
  const run = () => { const m = document.querySelector('main'); if (m) walk(m); };

  document.addEventListener('DOMContentLoaded', () => {
    run();
    /* Contenido dibujado por JS (tarjetas, posts, detalle) */
    let t;
    new MutationObserver(() => { cancelAnimationFrame(t); t = requestAnimationFrame(run); })
      .observe(document.querySelector('main') || document.body, { childList: true, subtree: true });
  });
})();
