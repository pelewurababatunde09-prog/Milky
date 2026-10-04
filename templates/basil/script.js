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

  /* Header and scroll-to-top */
  const header = $('#siteHeader'), toTop = $('#toTop');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 60);
    toTop.classList.toggle('show', scrollY > 800);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0 }));

  /* Full-screen menu (native dialog gives focus trap and Esc) */
  const menu = $('#menu');
  $('#menuOpen').addEventListener('click', () => menu.showModal());
  $('#menuClose').addEventListener('click', () => menu.close());
  $$('a', menu).forEach(a => a.addEventListener('click', () => menu.close()));

  /* Reveal on scroll */
  const targets = $$('.statement p, .section-intro, .look, .craft li, .svc-list li, .designer-copy > *, .press figure, .facts div, details, .news > *');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: .12 });
  targets.forEach(el => io.observe(el));

  /* Image fallback */
  $$('img').forEach(img => img.addEventListener('error', () => img.classList.add('broken'), { once: true }));

  /* Lookbook rail controls */
  const rail = $('#rail'), prev = $('#railPrev'), next = $('#railNext');
  const railState = () => {
    prev.disabled = rail.scrollLeft < 8;
    next.disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 8;
  };
  prev.addEventListener('click', () => rail.scrollBy({ left: -rail.clientWidth * .8, behavior: 'smooth' }));
  next.addEventListener('click', () => rail.scrollBy({ left: rail.clientWidth * .8, behavior: 'smooth' }));
  rail.addEventListener('scroll', railState, { passive: true });
  addEventListener('resize', railState);
  railState();

  /* Lightbox */
  const looks = $$('.look'), lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let idx = 0;
  const show = i => {
    idx = (i + looks.length) % looks.length;
    const l = looks[idx];
    lbImg.src = l.dataset.big;
    lbImg.alt = $('img', l).alt;
    lbCap.textContent = l.dataset.title;
  };
  looks.forEach((l, i) => l.addEventListener('click', () => { show(i); lb.showModal(); }));
  $('#lbClose').addEventListener('click', () => lb.close());
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

  /* Services: list swaps the sticky image */
  const rows = $$('#svcList li'), pics = $$('.svc-media img');
  const setSvc = i => {
    rows.forEach((r, n) => r.classList.toggle('active', n === i));
    pics.forEach((p, n) => p.classList.toggle('on', n === i));
  };
  rows.forEach((r, i) => {
    r.addEventListener('mouseenter', () => setSvc(i));
    r.addEventListener('focusin', () => setSvc(i));
  });
  setSvc(0);

  /* Legal dialogs */
  const legal = $('#legal');
  $$('[data-legal]').forEach(b => b.addEventListener('click', () => {
    $$('section', legal).forEach(s => s.hidden = s.id !== b.dataset.legal);
    if (!legal.open) legal.showModal();
  }));
  $('#legalClose').addEventListener('click', () => legal.close());
  legal.addEventListener('click', e => { if (e.target === legal) legal.close(); });

  /* Cookie consent */
  const cookie = $('#cookie');
  const decide = v => { store.set('consent', v); cookie.hidden = true; /* load analytics here only if v === 'yes' */ };
  if (!store.get('consent')) cookie.hidden = false;
  $('#cookieYes').addEventListener('click', () => decide('yes'));
  $('#cookieNo').addEventListener('click', () => decide('no'));
  $('#cookieSettings').addEventListener('click', () => { cookie.hidden = false; });

  /* Pre-fill the enquiry form from buttons */
  const service = $('#service'), message = $('#message');
  $$('[data-service]').forEach(a => a.addEventListener('click', () => {
    service.value = a.dataset.service;
    if (a.dataset.collection && !message.value.trim()) {
      message.value = `I would like to know more about the ${a.dataset.collection} collection.`;
    }
  }));

  /* Date: no past dates */
  const date = $('#date');
  date.min = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  /* Appointment form */
  const form = $('#form'), err = $('#formError'), ok = $('#formOk');
  const fail = (text, field) => { err.textContent = text; form.elements[field].focus(); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = ''; ok.hidden = true;
    const d = new FormData(form);
    if (!(d.get('name') || '').trim()) return fail('Please tell us your name.', 'name');
    if (!emailOk((d.get('email') || '').trim())) return fail('Please enter a valid email address.', 'email');
    if ((d.get('message') || '').trim().length < 10) return fail('Please add a few more details so we can prepare.', 'message');
    if (!d.get('consent')) return fail('Please agree to the Privacy Policy to continue.', 'consent');
    // TODO: send data to your backend or a form service (e.g. Formspree) here.
    form.reset();
    ok.hidden = false;
  });

  /* Newsletter form */
  const news = $('#newsForm'), newsEmail = $('#newsEmail'), newsConsent = $('#newsConsent');
  const newsErr = $('#newsError'), newsOk = $('#newsOk');
  news.addEventListener('submit', e => {
    e.preventDefault();
    newsErr.textContent = ''; newsOk.hidden = true;
    if (!emailOk(newsEmail.value.trim())) { newsErr.textContent = 'Please enter a valid email address.'; return newsEmail.focus(); }
    if (!newsConsent.checked) { newsErr.textContent = 'Please tick the box to agree to receive emails.'; return newsConsent.focus(); }
    // TODO: connect to your email service (Mailchimp, Buttondown, etc.) here.
    news.reset();
    newsOk.hidden = false;
  });
})();