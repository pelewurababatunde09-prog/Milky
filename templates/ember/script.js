(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  const emailOk = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  /* ---------- Settings: edit these for the real restaurant ---------- */
  const TIMEZONE = 'Europe/London';      // the restaurant's local time zone
  const LAST_SEATING_BEFORE_CLOSE = 1;   // hours before closing for the last booking
  const MAX_DAYS_AHEAD = 90;
  // Day 0 = Sunday. [opens, closes] in 24-hour time, or null when closed.
  const HOURS = { 0:[12,21], 1:null, 2:[17,22], 3:[17,22], 4:[17,22], 5:[12,23], 6:[12,23] };
  const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

  $('#year').textContent = new Date().getFullYear();

  /* ---------- Time helpers (restaurant time zone) ---------- */
  const fmtHour = (h, m = 0) => {
    const ap = h >= 12 ? 'pm' : 'am', hh = h % 12 || 12;
    return `${hh}${m ? ':' + String(m).padStart(2, '0') : ''} ${ap}`;
  };
  const venueNow = () => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TIMEZONE, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t).value;
    const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday'));
    return { day, h: +g('hour') % 24, m: +g('minute'), date: `${g('year')}-${g('month')}-${g('day')}` };
  };

  /* ---------- Open / closed status and today's hours ---------- */
  function updateStatus() {
    const n = venueNow(), today = HOURS[n.day];
    const mins = n.h * 60 + n.m;
    let text, open = false;
    if (today && mins >= today[0] * 60 && mins < today[1] * 60) {
      text = `Open now, until ${fmtHour(today[1])}`; open = true;
    } else if (today && mins < today[0] * 60) {
      text = `Closed now, opens today at ${fmtHour(today[0])}`;
    } else {
      let d = (n.day + 1) % 7, add = 1;
      while (!HOURS[d] && add < 7) { d = (d + 1) % 7; add++; }
      text = `Closed now, opens ${add === 1 ? 'tomorrow' : DAYS[d]} at ${fmtHour(HOURS[d][0])}`;
    }
    $$('.js-status').forEach(el => el.textContent = text);
    const eb = $('.eyebrow'); if (eb) eb.classList.toggle('is-closed', !open);
    $$('.hours tr').forEach(r => r.classList.toggle('today', +r.dataset.day === n.day));
  }
  updateStatus();
  setInterval(updateStatus, 60000);

  /* ---------- Header, mobile nav, scroll-to-top ---------- */
  const header = $('#siteHeader'), toTop = $('#toTop');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 8);
    toTop.classList.toggle('show', scrollY > 800);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0 }));

  const nav = $('#nav'), navBtn = $('#navBtn');
  const setNav = open => {
    nav.classList.toggle('open', open);
    navBtn.setAttribute('aria-expanded', open);
    navBtn.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  };
  navBtn.addEventListener('click', () => setNav(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });

  /* Highlight current section in the nav */
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

  /* Hide the mobile action bar while the booking form is on screen */
  const mbar = $('#mbar');
  new IntersectionObserver(es => es.forEach(e => mbar.classList.toggle('hide', e.isIntersecting)), { threshold: .15 })
    .observe($('#reserve'));

  /* ---------- Reveal on scroll ---------- */
  const targets = $$('.story-text, .story-imgs figure, .sig article, .source-text > *, .events article, .press figure, .visit-info > *, .faq details, .head');
  targets.forEach(el => el.classList.add('reveal'));
  const io = new IntersectionObserver(es => es.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: .1 });
  targets.forEach(el => io.observe(el));

  /* ---------- Image fallback ---------- */
  $$('img').forEach(img => img.addEventListener('error', () => img.classList.add('broken'), { once: true }));

  /* ---------- Menu tabs (keyboard accessible) ---------- */
  const tabs = $$('[role=tab]'), panels = $$('[role=tabpanel]');
  const activeDiets = () => $$('.chip[aria-pressed=true]').map(c => c.dataset.diet);
  function selectTab(tab, focus = false) {
    tabs.forEach(t => { const on = t === tab; t.setAttribute('aria-selected', on); t.tabIndex = on ? 0 : -1; });
    panels.forEach(p => p.hidden = p.id !== tab.getAttribute('aria-controls'));
    if (focus) tab.focus();
    applyDiets();
  }
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => selectTab(t));
    t.addEventListener('keydown', e => {
      const k = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault();
      selectTab(tabs[(k + tabs.length) % tabs.length], true);
    });
  });

  /* Dietary filter */
  function applyDiets() {
    const active = activeDiets();
    const panel = panels.find(p => !p.hidden);
    let shown = 0;
    $$('.dish', panel).forEach(d => {
      const have = (d.dataset.diet || '').split(/\s+/).filter(Boolean);
      const ok = active.every(a => have.includes(a));
      d.hidden = !ok; if (ok) shown++;
    });
    $('#menuEmpty').hidden = shown > 0;
    $('#menuCount').textContent = active.length
      ? `${shown} dish${shown === 1 ? '' : 'es'} shown in this section`
      : '';
  }
  $$('.chip').forEach(c => c.addEventListener('click', () => {
    c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') !== 'true');
    applyDiets();
  }));

  /* ---------- Lightbox ---------- */
  const shots = $$('.shot'), lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let idx = 0;
  const show = i => {
    idx = (i + shots.length) % shots.length;
    const s = shots[idx];
    lbImg.src = s.dataset.big; lbImg.alt = $('img', s).alt; lbCap.textContent = s.dataset.title;
  };
  shots.forEach((s, i) => s.addEventListener('click', () => { show(i); lb.showModal(); }));
  $('#lbClose').addEventListener('click', () => lb.close());
  $('#lbPrev').addEventListener('click', () => show(idx - 1));
  $('#lbNext').addEventListener('click', () => show(idx + 1));
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  lb.addEventListener('click', e => { if (e.target === lb) lb.close(); });

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

  /* ---------- Reservation form ---------- */
  const form = $('#form'), dateEl = $('#date'), timeEl = $('#time'), guestsEl = $('#guests');
  const qDate = $('#qDate'), qGuests = $('#qGuests');
  const err = $('#formError'), ok = $('#formOk'), groupInfo = $('#groupInfo');

  const todayStr = venueNow().date;
  const maxDate = (() => { const d = new Date(todayStr + 'T12:00:00'); d.setDate(d.getDate() + MAX_DAYS_AHEAD); return d.toISOString().slice(0, 10); })();
  [dateEl, qDate].forEach(el => { el.min = todayStr; el.max = maxDate; });

  const dayOf = str => new Date(str + 'T12:00:00').getDay();

  function buildTimes() {
    timeEl.innerHTML = '';
    if (!dateEl.value) { timeEl.add(new Option('Choose a date first', '')); return; }
    const hrs = HOURS[dayOf(dateEl.value)];
    if (!hrs) {
      timeEl.add(new Option('Closed on this day', ''));
      return;
    }
    timeEl.add(new Option('Choose a time', ''));
    const now = venueNow();
    const lastStart = (hrs[1] - LAST_SEATING_BEFORE_CLOSE) * 60;
    for (let t = hrs[0] * 60; t <= lastStart; t += 30) {
      if (dateEl.value === now.date && t <= now.h * 60 + now.m + 30) continue; // skip times too soon
      const h = Math.floor(t / 60), m = t % 60;
      timeEl.add(new Option(fmtHour(h, m), `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`));
    }
    if (timeEl.options.length === 1) timeEl.options[0].text = 'No more tables today online. Please call.';
  }
  dateEl.addEventListener('change', buildTimes);
  guestsEl.addEventListener('change', () => { groupInfo.hidden = guestsEl.value !== '9+'; });
  buildTimes();

  /* Quick search in the hero fills the main form */
  $('#quick').addEventListener('submit', e => {
    e.preventDefault();
    if (qDate.value) { dateEl.value = qDate.value; buildTimes(); }
    guestsEl.value = qGuests.value;
    groupInfo.hidden = guestsEl.value !== '9+';
    $('#reserve').scrollIntoView();
    (qDate.value ? timeEl : dateEl).focus({ preventScroll: true });
  });

  /* Event buttons pre-select the occasion */
  $$('[data-occasion]').forEach(a => a.addEventListener('click', () => {
    $('#occasion').value = a.dataset.occasion;
  }));

  const fail = (text, field) => { err.textContent = text; form.elements[field].focus(); };
  form.addEventListener('submit', e => {
    e.preventDefault();
    err.textContent = ''; ok.hidden = true;
    const d = new FormData(form);
    if (d.get('website')) return; // honeypot: bots fill this in
    if (!d.get('date')) return fail('Please choose a date.', 'date');
    if (!HOURS[dayOf(d.get('date'))]) return fail(`We are closed on ${DAYS[dayOf(d.get('date'))]}s. Please pick another day.`, 'date');
    if (!d.get('time')) return fail('Please choose a time.', 'time');
    if (!(d.get('name') || '').trim()) return fail('Please tell us your name.', 'name');
    if (!emailOk((d.get('email') || '').trim())) return fail('Please enter a valid email address.', 'email');
    if ((d.get('phone') || '').replace(/\D/g, '').length < 7) return fail('Please enter a phone number we can reach you on.', 'phone');
    if (!d.get('consent')) return fail('Please agree to the Privacy Policy to continue.', 'consent');
    // TODO: send data to your booking system or a form service here.
    form.reset(); buildTimes(); groupInfo.hidden = true;
    ok.hidden = false;
  });

  /* ---------- Newsletter ---------- */
  const news = $('#newsForm'), nEmail = $('#newsEmail'), nConsent = $('#newsConsent');
  const nErr = $('#newsError'), nOk = $('#newsOk');
  news.addEventListener('submit', e => {
    e.preventDefault();
    nErr.textContent = ''; nOk.hidden = true;
    if (!emailOk(nEmail.value.trim())) { nErr.textContent = 'Please enter a valid email address.'; return nEmail.focus(); }
    if (!nConsent.checked) { nErr.textContent = 'Please tick the box to agree to receive emails.'; return nConsent.focus(); }
    // TODO: connect to your email service (Mailchimp, Buttondown, etc.) here.
    news.reset(); nOk.hidden = false;
  });

  /* ---------- Init ---------- */
  applyDiets();
})();