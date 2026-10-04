(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Header, progress bar, scroll-to-top ---------- */
  const header = $('#siteHeader'), toTop = $('#toTop'), bar = $('#progress');
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = (max > 0 ? Math.min(100, (scrollY / max) * 100) : 0) + '%';
    header.classList.toggle('scrolled', scrollY > 8);
    toTop.classList.toggle('show', scrollY > 800);
  };
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0 }));

  /* ---------- Mobile nav ---------- */
  const nav = $('#nav'), navBtn = $('#navBtn');
  const setNav = open => {
    nav.classList.toggle('open', open);
    navBtn.setAttribute('aria-expanded', open);
    navBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  navBtn.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  /* Highlight the current section in the nav */
  const links = $$('a:not(.btn)', nav);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) links.forEach(a => {
        if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  links.map(a => $(a.getAttribute('href'))).filter(Boolean).forEach(s => spy.observe(s));

  /* ---------- Reveal on scroll ---------- */
  const targets = $$('.about-text, .now, .project, .rows > li, .principles article, .stack > div, .words figure, .posts li, .contact-info > *');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .1 });
  targets.forEach(el => io.observe(el));

  /* ---------- Image fallback ---------- */
  $$('img').forEach(img => img.addEventListener('error', () => img.classList.add('broken'), { once: true }));

  /* ---------- Project filter ---------- */
  const chips = $$('.chip'), projects = $$('.project'), count = $('#workCount');
  chips.forEach(chip => chip.addEventListener('click', () => {
    chips.forEach(c => c.setAttribute('aria-pressed', c === chip));
    const f = chip.dataset.filter;
    let n = 0;
    projects.forEach(p => { const show = f === 'all' || p.dataset.cat === f; p.hidden = !show; if (show) n++; });
    count.textContent = `${n} project${n === 1 ? '' : 's'} shown`;
  }));

  /* ---------- Case studies ---------- */
  const caseDlg = $('#caseDialog');
  const openCase = id => {
    $$('article', caseDlg).forEach(a => a.hidden = a.id !== 'case-' + id);
    caseDlg.showModal();
    caseDlg.scrollTop = 0;
  };
  $$('[data-case]').forEach(el => el.addEventListener('click', () => openCase(el.dataset.case)));
  $('#caseClose').addEventListener('click', () => caseDlg.close());
  caseDlg.addEventListener('click', e => { if (e.target === caseDlg) caseDlg.close(); });

  /* ---------- Playground ---------- */
  const demo = $('#demo'), radius = $('#pgRadius'), pad = $('#pgPad'), outline = $('#pgOutline');
  const code = $('#pgCode');
  const update = () => {
    const accent = $('input[name=accent]:checked').value;
    demo.style.setProperty('--r', radius.value + 'px');
    demo.style.setProperty('--p', pad.value + 'px');
    demo.style.setProperty('--accent-demo', accent);
    demo.classList.toggle('outline', outline.checked);
    $('#outRadius').textContent = radius.value + 'px';
    $('#outPad').textContent = pad.value + 'px';
    const btn = outline.checked
      ? `  background: transparent;\n  color: var(--accent);`
      : `  background: var(--accent);\n  color: #fff;`;
    code.textContent =
`.card {
  --accent: ${accent};
  padding: ${pad.value}px;
  border-radius: ${radius.value}px;
  border: 1px solid #d5d4ce;
  background: #fff;
}

.card .button {
${btn}
  border: 2px solid var(--accent);
  border-radius: ${Math.round(radius.value / 2)}px;
  padding: 0.55rem 1rem;
}`;
  };
  [radius, pad, outline, ...$$('input[name=accent]')].forEach(el => el.addEventListener('input', update));
  update();

  /* Clipboard helper with a fallback for older browsers */
  const copy = async (text, msgEl, ok, btn, label) => {
    let done = false;
    try { await navigator.clipboard.writeText(text); done = true; }
    catch {
      const t = document.createElement('textarea');
      t.value = text; t.style.position = 'fixed'; t.style.opacity = '0';
      document.body.appendChild(t); t.select();
      try { done = document.execCommand('copy'); } catch {}
      t.remove();
    }
    msgEl.textContent = done ? ok : 'Could not copy. Please select the text and copy it manually.';
    if (done) { btn.textContent = 'Copied'; setTimeout(() => { btn.textContent = label; msgEl.textContent = ''; }, 2000); }
  };
  $('#copyCss').addEventListener('click', e => copy(code.textContent, $('#copyMsg'), 'CSS copied to clipboard.', e.currentTarget, 'Copy CSS'));
  $('#copyMail').addEventListener('click', e => copy($('#mailText').textContent.trim(), $('#mailMsg'), 'Email address copied.', e.currentTarget, 'Copy email'));

  /* ---------- Legal dialogs ---------- */
  const legal = $('#legal');
  $$('[data-legal]').forEach(b => b.addEventListener('click', () => {
    $$('section', legal).forEach(s => s.hidden = s.id !== b.dataset.legal);
    if (!legal.open) legal.showModal();
  }));
  $('#legalClose').addEventListener('click', () => legal.close());
  legal.addEventListener('click', e => { if (e.target === legal) legal.close(); });

  /* ---------- Cookie consent ---------- */
  const cookie = $('#cookie');
  const decide = v => { store.set('consent', v); cookie.hidden = true; /* load analytics here only if v === 'yes' */ };
  if (!store.get('consent')) cookie.hidden = false;
  $('#cookieYes').addEventListener('click', () => decide('yes'));
  $('#cookieNo').addEventListener('click', () => decide('no'));
  $('#cookieSettings').addEventListener('click', () => { cookie.hidden = false; });

  /* ---------- Contact form ---------- */
  const form = $('#form'), err = $('#formError'), ok = $('#formOk');
  const fail = (text, field) => { err.textContent = text; form.elements[field].focus(); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = ''; ok.hidden = true;
    const d = new FormData(form);
    if (d.get('website')) return; // honeypot: bots fill this in
    if (!(d.get('name') || '').trim()) return fail('Please tell me your name.', 'name');
    if (!emailOk((d.get('email') || '').trim())) return fail('Please enter a valid email address.', 'email');
    if ((d.get('message') || '').trim().length < 10) return fail('Please add a few more details so I can reply properly.', 'message');
    if (!d.get('consent')) return fail('Please agree to the Privacy Policy to continue.', 'consent');
    // TODO: send data to your backend or a form service (e.g. Formspree) here.
    form.reset();
    ok.hidden = false;
  });
})();
