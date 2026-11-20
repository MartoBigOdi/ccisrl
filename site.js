(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = new Intl.NumberFormat('es-AR');

  /* ---------- nav ---------- */
  const nav = $('#nav'), toggle = $('.nav__toggle');
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  nav.querySelectorAll('.nav__links a').forEach(a => a.addEventListener('click', () => { nav.classList.remove('is-open'); toggle.setAttribute('aria-expanded', false); document.body.style.overflow = ''; }));
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) toggle.click(); });

  /* ---------- entrances: the hero pours in once, the rest rise as they arrive ---------- */
  const hero = $('.hero');
  const start = () => { hero.classList.add('is-in'); $('#heroPour').classList.add('is-in'); };
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 600))]).then(() => requestAnimationFrame(start)); else start();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), { threshold: 0, rootMargin: '0px 0px -8% 0px' });
  document.querySelectorAll('.rise').forEach(el => io.observe(el));

  /* ---------- word highlight on the statement, one reading line as it crosses the screen ---------- */
  const st = $('#statement');
  if (st && !reduce) {
    const words = st.textContent.trim().split(/\s+/);
    st.innerHTML = words.map(w => `<span>${w}</span>`).join(' ');
    const spans = [...st.children];
    const upd = () => {
      const r = st.getBoundingClientRect(), vh = innerHeight;
      const p = Math.min(1, Math.max(0, (vh * .85 - r.top) / (vh * .55 + r.height * .6)));
      const n = Math.round(p * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    };
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  }

  /* ---------- portfolio explorer ---------- */
  const ROWS = window.OBRAS.map(o => ({ id: o[0], n: o[1], p: o[2], t: o[3], m2: o[4], per: o[5], usd: o[6], cur: o[7], scope: o[8], imgs: o[9], y: o[10], live: !!o[11] }));
  const TYPES = { all: 'Todas', e: 'Edificios', c: 'Casas', o: 'Naves, hoteles y oficinas' };
  const state = { type: 'all', sort: 'y', dir: -1, sel: null, img: 0 };
  const money = r => (r.cur === 'ARS' ? '$ ' : 'USD ') + fmt.format(r.usd);
  const $works = $('#works'), $chips = $('#chips'), $thumbs = $('#thumbs'), $stage = $('#stage');

  // one tab per type, with its totals from the data
  $chips.innerHTML = Object.entries(TYPES).map(([k, l]) => {
    const rs = k === 'all' ? ROWS : ROWS.filter(r => r.t === k);
    const m2 = rs.reduce((s, r) => s + r.m2, 0);
    return `<button class="type" type="button" data-type="${k}" aria-pressed="${k === 'all'}"><span class="type__name">${l}</span><span class="type__n num">${rs.length} obras · ${fmt.format(m2)} m²</span></button>`;
  }).join('');
  $chips.addEventListener('click', e => {
    const b = e.target.closest('.type'); if (!b) return;
    state.type = b.dataset.type;
    $chips.querySelectorAll('.type').forEach(c => c.setAttribute('aria-pressed', c === b));
    render();
  });
  $('#worksHead').addEventListener('click', e => {
    const b = e.target.closest('[data-sort]'); if (!b || b.dataset.sort === 'n') return;
    const k = b.dataset.sort;
    state.dir = state.sort === k ? -state.dir : -1; state.sort = k;
    render();
  });

  function render() {
    // dir -1: largest first, dir 1: smallest first
    const list = ROWS.filter(r => state.type === 'all' || r.t === state.type)
      .sort((a, b) => (a[state.sort] - b[state.sort]) * state.dir || a.n.localeCompare(b.n));
    $works.innerHTML = list.map(r => `<li><button type="button" class="work" data-id="${r.id}" aria-current="false">
      <span class="work__name">${r.n}${r.imgs ? '' : '<i class="work__nophoto" title="Sin fotos en el archivo"></i>'}<small>${r.p}${r.live ? ' · en obra' : ''}</small></span>
      <span class="work__n num">${fmt.format(r.m2)} m²</span><span class="work__n work__y num">${r.per}</span><span class="work__n work__usd num">${money(r)}</span></button></li>`).join('');
    document.querySelectorAll('#worksHead [data-sort]').forEach(b => b.setAttribute('aria-sort', b.dataset.sort === state.sort ? (state.dir === -1 ? 'descending' : 'ascending') : 'none'));
    const keep = list.find(r => r.id === state.sel);
    select((keep || list.find(r => r.imgs) || list[0]).id, 0, true);
  }

  function select(id, img = 0, quiet) {
    const r = ROWS.find(x => x.id === id); if (!r) return;
    state.sel = id; state.img = img;
    document.querySelectorAll('.work').forEach(b => b.setAttribute('aria-current', b.dataset.id === id));
    $('#vName').textContent = r.n; $('#vWhere').textContent = r.p + (r.live ? ' · en obra' : '');
    $('#vM2').textContent = fmt.format(r.m2) + ' m²'; $('#vY').textContent = r.per; $('#vUsd').textContent = money(r);
    $('#vScope').textContent = r.scope;
    if (r.imgs) {
      $thumbs.innerHTML = r.imgs > 1 ? Array.from({ length: r.imgs }, (_, i) => `<button type="button" data-i="${i}" aria-label="Foto ${i + 1} de ${r.imgs}" aria-current="${i === img}"><img src="img/obras/${r.id}-${i + 1}.jpg" alt=""></button>`).join('') : '';
      let im = $stage.querySelector('img');
      if (!im) { $stage.innerHTML = ''; im = new Image(); $stage.appendChild(im); }
      const next = new Image();
      next.onload = () => {
        im.src = next.src; im.alt = `${r.n}, ${r.p}`;
        // small sources stay sharp: never drawn much past 1.7x their own size, and never distorted
        const nw = next.naturalWidth, nh = next.naturalHeight;
        const k = Math.min(1.7, ($stage.clientWidth * .92) / nw, ($stage.clientHeight * .92) / nh);
        im.style.width = Math.round(nw * k) + 'px'; im.style.height = Math.round(nh * k) + 'px';
        im.classList.remove('is-in'); void im.offsetWidth; if (!reduce) im.classList.add('is-in');
      };
      next.src = `img/obras/${r.id}-${img + 1}.jpg`;
    } else {
      $thumbs.innerHTML = '';
      $stage.innerHTML = `<div class="viewer__none">${fmt.format(r.m2)} m²<small>${r.per}</small></div>`;
    }
  }

  $works.addEventListener('click', e => { const b = e.target.closest('.work'); if (b) select(b.dataset.id); });
  $works.addEventListener('focusin', e => { const b = e.target.closest('.work'); if (b && b.dataset.id !== state.sel) select(b.dataset.id); });
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    $works.addEventListener('pointerover', e => { const b = e.target.closest('.work'); if (b && b.dataset.id !== state.sel) select(b.dataset.id); });
  }
  $thumbs.addEventListener('click', e => { const b = e.target.closest('button'); if (b) select(state.sel, +b.dataset.i); });
  // on a phone the thumbnails are hidden: a tap on the photo moves to the next one
  $stage.addEventListener('click', () => { const r = ROWS.find(x => x.id === state.sel); if (r && r.imgs > 1) select(r.id, (state.img + 1) % r.imgs); });
  render();

  /* count-up of the heading, once */
  const cnt = $('#countObras');
  if (cnt && !reduce) {
    const to = +cnt.dataset.to; let done = false;
    new IntersectionObserver((es, o) => { if (!es[0].isIntersecting || done) return; done = true; o.disconnect();
      const t0 = performance.now(); const tick = t => { const k = Math.min(1, (t - t0) / 1100); cnt.textContent = Math.round(to * (1 - Math.pow(1 - k, 4))); if (k < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, { threshold: .6 }).observe(cnt);
  }

  /* ---------- nav over the hero turns solid; a yellow line shows how far down you are ---------- */
  const bar = document.createElement('div'); bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true'); nav.appendChild(bar);
  const onScroll = () => {
    nav.classList.toggle('is-top', scrollY < 40);
    const h = document.documentElement.scrollHeight - innerHeight;
    bar.style.transform = `scaleX(${h > 0 ? Math.min(1, scrollY / h) : 0})`;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();


  /* ---------- quote form: validate on submit, errors under their field ---------- */
  const form = $('form.form'), status = $('#formStatus');
  form.addEventListener('submit', e => {
    let first = null, bad = 0;
    form.querySelectorAll('input').forEach(i => {
      const err = document.getElementById(i.getAttribute('aria-describedby'));
      const ok = i.type === 'email' ? /.+@.+\..+/.test(i.value.trim()) : i.name === 'superficie' ? /^\d[\d.,]*$/.test(i.value.trim()) : i.value.trim().length > 1;
      i.setAttribute('aria-invalid', !ok); err.hidden = ok;
      if (!ok) { bad++; first = first || i; }
    });
    if (bad) { e.preventDefault(); first.focus(); status.textContent = bad === 1 ? 'Falta corregir 1 campo.' : `Faltan corregir ${bad} campos.`; }
    else status.textContent = 'Se abre su programa de correo con el pedido listo para enviar.';
  });
})();
