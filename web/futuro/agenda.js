/* Agenda: elegir horario, datos, pago (simulado) y confirmación.
   En el sitio real, el pago lo cobra Mercado Pago/PayPal y la reserva se confirma
   cuando el backend recibe el aviso (webhook) de pago aprobado. */
(() => {
  const $ = s => document.querySelector(s);
  const TZ = 'America/Argentina/Buenos_Aires';
  const fd = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', timeZone: TZ });
  const fl = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ });
  const days = [...Array(7)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() + i + 1); return d; });
  const hours = [17, 18, 19, 20, 21, 22];
  const busy = (d, h) => (d.getDate() * 7 + h * 3) % 5 === 0; // horarios ocupados de ejemplo
  const sel = { d: null, h: null };
  const dEl = $('#days'), sEl = $('#slots');
  let timer = null;

  const mark = (box, b) => box.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));

  function stepper() {
    const li = document.querySelectorAll('#stp li');
    const ok = sel.d !== null && sel.h !== null;
    const acc = !!document.querySelector('.acc [aria-pressed="true"]');
    const dat = ['#rid', '#dc', '#em'].every(i => $(i).value.trim());
    [acc, ok, dat].forEach((d, i) => li[i].classList.toggle('done', d));
  }

  function upd() {
    const ok = sel.d !== null && sel.h !== null;
    stepper();
    $('#sum').classList.remove('warn');
    $('#sum').textContent = ok ? 'Elegiste ' + fl.format(days[sel.d]) + ', ' + sel.h + ':00 h.' : 'Todavía no elegiste horario.';
  }

  function slots() {
    sEl.innerHTML = '';
    hours.forEach(h => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = h + ':00'; b.setAttribute('aria-pressed', 'false');
      if (busy(days[sel.d], h)) { b.disabled = true; b.title = 'Ocupado'; }
      b.onclick = () => { sel.h = h; mark(sEl, b); upd(); };
      sEl.append(b);
    });
  }

  days.forEach((d, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = fd.format(d).replace('.', ''); b.setAttribute('aria-pressed', 'false');
    b.onclick = () => { sel.d = i; sel.h = null; mark(dEl, b); slots(); upd(); };
    dEl.append(b);
  });

  // Conectar cuentas (simulado). En el sitio real: OAuth con Discord, Google y Riot Sign On.
  const accounts = { d: ['#dc', 'tu_usuario', 'Discord'], g: ['#em', 'tucorreo@gmail.com', 'Google'], r: ['#rid', 'Invocador#LAS', 'Riot'] };
  document.querySelectorAll('.acc button').forEach(b => b.onclick = () => {
    const [id, v, n] = accounts[b.dataset.k], i = $(id);
    i.value = v; i.readOnly = true;
    b.setAttribute('aria-pressed', 'true'); b.textContent = n + ' conectado (demo)';
    stepper();
  });

  // Paso 1-3: validar y pasar al pago
  $('#form').onsubmit = e => {
    e.preventDefault();
    if (sel.d === null || sel.h === null) {
      const m = $('#sum');
      m.textContent = 'Elegí un día y un horario para continuar.';
      m.classList.add('warn'); m.scrollIntoView({ block: 'center' });
      return;
    }
    $('#form').hidden = true;
    $('#pay').hidden = false;
    scrollTo(0, 0);
    $('#psum').textContent = fl.format(days[sel.d]) + ', ' + sel.h + ':00 h · ' + $('#rid').value;
    startTimer();
  };
  $('#form').addEventListener('input', stepper);

  // Paso 4: pago. El horario queda retenido 15 minutos.
  function startTimer() {
    let s = 900;
    clearInterval(timer);
    const tick = () => {
      $('#tmr').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
      if (s-- <= 0) { clearInterval(timer); $('#pay').hidden = true; $('#exp').hidden = false; }
    };
    tick();
    timer = setInterval(tick, 1000);
  }

  $('#meth').onclick = e => { const b = e.target.closest('button'); if (b) mark($('#meth'), b); };

  $('#paybtn').onclick = () => {
    const b = $('#paybtn');
    b.disabled = true; b.textContent = 'Procesando…';
    setTimeout(() => {
      clearInterval(timer);
      $('#pay').hidden = true; $('#done').hidden = false;
      $('#dmsg').textContent = 'Pago acreditado. Reservamos ' + fl.format(days[sel.d]) + ', ' + sel.h + ':00 h para ' + $('#rid').value + '. Te llega un email de confirmación y un aviso en Discord. Podés cancelar desde el email hasta 12 horas antes.';
      b.disabled = false; b.textContent = 'Pagar $15.000';
    }, 1200);
  };

  $('#payfail').onclick = () => {
    const m = $('#pmsg');
    m.textContent = 'El pago no se acreditó. Tu horario sigue retenido: probá de nuevo o con otro medio.';
    m.classList.add('warn');
  };

  $('#again').onclick = () => {
    $('#exp').hidden = true; $('#form').hidden = false;
    sel.h = null; slots(); upd();
  };
})();
