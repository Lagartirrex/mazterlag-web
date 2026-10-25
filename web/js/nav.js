/* Menú del encabezado en celular: botón hamburguesa + panel a pantalla completa.
   Va en el <head>: marca html.js-nav antes del primer pintado. Sin JS el menú queda como una fila
   de links deslizable (ver responsive.css), así que nunca se pierde la navegación. */
(() => {
  const root = document.documentElement;
  root.classList.add('js-nav');

  const init = () => {
    const nav = document.querySelector('.top .nav');
    const tabs = nav && nav.querySelector('.tabs');
    const brand = nav && nav.querySelector('.brand');
    if (!tabs || !brand) return;

    /* Agrupa links + botón del Discord en un panel (en escritorio es transparente: display:contents) */
    const menu = document.createElement('div');
    menu.className = 'menu';
    menu.id = 'menu';
    tabs.before(menu);
    while (menu.nextSibling) menu.append(menu.nextSibling);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'burger';
    btn.setAttribute('aria-controls', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-label', 'Abrir menú');
    btn.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
    brand.after(btn);

    const set = open => {
      nav.classList.toggle('open', open);
      root.classList.toggle('nav-open', open);
      btn.setAttribute('aria-expanded', String(open));
      btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    };
    btn.addEventListener('click', () => set(!nav.classList.contains('open')));
    menu.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); }
    });
    matchMedia('(min-width:861px)').addEventListener('change', e => { if (e.matches) set(false); });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
