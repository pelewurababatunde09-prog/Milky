(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };

  $('#year').textContent = new Date().getFullYear();

  /* Scroll to top */
  const toTop = $('#toTop');
  const onScroll = () => toTop.classList.toggle('show', scrollY > 600);
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0 }));

  /* Mobile menu */
  const menuBtn = $('#menuBtn'), nav = $('#nav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Reveal on scroll */
  const targets = $$('.section-head, .statement p, .shot, .about-img, .about-text, .steps li, .rate, details, .contact > *');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .12 });
  targets.forEach(el => io.observe(el));

  /* Image fallback */
  $$('img').forEach(img => img.addEventListener('error', () => {
    img.style.background = '#1a1e21';
    img.removeAttribute('src');
  }, { once: true }));

  /* Work filter + structured row positions */
  const shots = $$('.shot');
  const layout = () => shots.filter(s => !s.hidden).forEach((s, i) => s.dataset.pos = i % 6);
  layout();
  $$('.chip').forEach(chip => chip.addEventListener('click', () => {
    $$('.chip').forEach(c => c.classList.toggle('is-active', c === chip));
    const f = chip.dataset.filter;
    shots.forEach(s => s.hidden = f !== 'all' && s.dataset.cat !== f);
    layout();
  }));

  /* Lightbox */
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let idx = 0;
  const visible = () => shots.filter(s => !s.hidden);
  const show = i => {
    const list = visible();
    idx = (i + list.length) % list.length;
    const s = list[idx];
    lbImg.src = s.dataset.big;
    lbImg.alt = $('img', s).alt;
    lbCap.textContent = s.dataset.title;
  };
  shots.forEach(s => s.addEventListener('click', () => { show(visible().indexOf(s)); lb.showModal(); }));
  $('#lbClose').addEventListener('click', () => lb.close());
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* Legal dialogs */
  const legal = $('#legal');
  const openLegal = id => {
    $$('section', legal).forEach(s => s.hidden = s.id !== id);
    legal.showModal();
  };
  $$('[data-legal]').forEach(b => b.addEventListener('click', () => openLegal(b.dataset.legal)));
  $('#legalClose').addEventListener('click', () => legal.close());
  legal.addEventListener('click', e => { if (e.target === legal) legal.close(); });

  /* Cookie consent */
  const cookie = $('#cookie');
  const decide = v => { store.set('consent', v); cookie.hidden = true; /* load analytics here only if v === 'yes' */ };
  if (!store.get('consent')) cookie.hidden = false;
  $('#cookieYes').addEventListener('click', () => decide('yes'));
  $('#cookieNo').addEventListener('click', () => decide('no'));
  $('#cookieSettings').addEventListener('click', () => { cookie.hidden = false; });

  /* Pre-select shoot type from package buttons */
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    $('#service').value = a.dataset.service;
  }));

  /* Form validation */
  const form = $('#form'), err = $('#formError'), ok = $('#formOk');
  const fail = (text, field) => { err.textContent = text; form.elements[field].focus(); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = ''; ok.hidden = true;
    const d = new FormData(form);
    const name = (d.get('name') || '').trim();
    const email = (d.get('email') || '').trim();
    const msg = (d.get('message') || '').trim();
    if (!name) return fail('Please tell me your name.', 'name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Please enter a valid email address.', 'email');
    if (msg.length < 10) return fail('Please add a few more details about your project.', 'message');
    if (!d.get('consent')) return fail('Please agree to the Privacy Policy to continue.', 'consent');
    // TODO: send data to your backend or a form service (e.g. Formspree) here.
    form.reset();
    ok.hidden = false;
  });
})();