(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  const PAGE = 12;

  /* ---------- Catalogue (read from the cards already in the HTML) ---------- */
  const grid = $('#templateGrid');
  const items = $$('.card', grid).map((el, i) => {
    const tags = (el.dataset.tags || '').toLowerCase().split(/\s+/).filter(Boolean);
    const title = $('.card-title', el).textContent.trim();
    const desc = $('.card-desc', el).textContent.trim();
    const alt = $('img', el)?.alt || '';
    return {
      el, i, title, desc,
      price: tags.includes('free') ? 'free' : 'paid',
      cats: tags.filter(t => t !== 'free' && t !== 'paid'),
      hay: `${title} ${desc} ${alt} ${tags.join(' ')} ${tags.includes('free') ? 'free' : 'premium paid'}`.toLowerCase()
    };
  });

  const state = { q: '', cat: 'all', price: 'all', sort: 'featured', shown: PAGE };
  const VALID_CAT = new Set($$('input[name=cat]').map(r => r.value));
  const VALID_PRICE = new Set(['all', 'free', 'paid']);
  const VALID_SORT = new Set(['featured', 'az', 'free', 'paid']);

  const searchInput = $('#searchInput'), searchClear = $('#searchClear');
  const sortSelect = $('#sortSelect');
  const countEl = $('#resultCount'), emptyEl = $('#emptyState');
  const moreWrap = $('#moreWrap'), moreBtn = $('#moreBtn'), moreStatus = $('#moreStatus');

  /* ---------- URL state ---------- */
  const readURL = () => {
    const p = new URLSearchParams(location.search);
    state.q = (p.get('q') || '').slice(0, 80);
    const c = p.get('cat'), pr = p.get('price'), s = p.get('sort');
    if (c && VALID_CAT.has(c)) state.cat = c;
    if (pr && VALID_PRICE.has(pr)) state.price = pr;
    if (s && VALID_SORT.has(s)) state.sort = s;
  };
  const writeURL = () => {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.cat !== 'all') p.set('cat', state.cat);
    if (state.price !== 'all') p.set('price', state.price);
    if (state.sort !== 'featured') p.set('sort', state.sort);
    const qs = p.toString();
    try { history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash); } catch {}
  };

  /* ---------- Filtering, sorting, rendering ---------- */
  const norm = s => s.toLowerCase().trim();
  const matchQ = (it, terms) => terms.every(t => it.hay.includes(t));
  const sorters = {
    featured: (a, b) => a.i - b.i,
    az: (a, b) => a.title.localeCompare(b.title),
    free: (a, b) => (a.price === b.price ? a.i - b.i : a.price === 'free' ? -1 : 1),
    paid: (a, b) => (a.price === b.price ? a.i - b.i : a.price === 'paid' ? -1 : 1)
  };

  function render({ resetShown = true } = {}) {
    if (resetShown) state.shown = PAGE;
    const terms = norm(state.q).split(/\s+/).filter(Boolean);
    const passQ = it => matchQ(it, terms);
    const passCat = it => state.cat === 'all' || it.cats.includes(state.cat);
    const passPrice = it => state.price === 'all' || it.price === state.price;

    const matches = items.filter(it => passQ(it) && passCat(it) && passPrice(it)).sort(sorters[state.sort]);
    const matchSet = new Set(matches);
    const rest = items.filter(it => !matchSet.has(it));

    const frag = document.createDocumentFragment();
    matches.forEach((it, idx) => { it.el.hidden = idx >= state.shown; frag.appendChild(it.el); });
    rest.forEach(it => { it.el.hidden = true; frag.appendChild(it.el); });
    grid.appendChild(frag);

    // Faceted counts
    $$('[data-count-cat]').forEach(el => {
      const v = el.dataset.countCat;
      el.textContent = items.filter(it => passQ(it) && passPrice(it) && (v === 'all' || it.cats.includes(v))).length;
    });
    $$('[data-count-price]').forEach(el => {
      const v = el.dataset.countPrice;
      el.textContent = items.filter(it => passQ(it) && passCat(it) && (v === 'all' || it.price === v)).length;
    });

    const total = matches.length, visible = Math.min(total, state.shown);
    countEl.textContent = total
      ? `${total} template${total === 1 ? '' : 's'}${state.q ? ` for “${state.q.trim()}”` : ''}`
      : 'No templates found';
    emptyEl.hidden = total > 0;
    grid.hidden = total === 0;
    moreWrap.hidden = total <= visible;
    moreStatus.textContent = `Showing ${visible} of ${total}`;

    searchClear.hidden = !state.q;
    $('#clearFilters').hidden = !(state.cat !== 'all' || state.price !== 'all' || state.q);
    $$('input[name=cat]').forEach(r => r.checked = r.value === state.cat);
    $$('input[name=price]').forEach(r => r.checked = r.value === state.price);
    sortSelect.value = state.sort;
    writeURL();
  }

  /* ---------- Controls ---------- */
  let timer;
  searchInput.addEventListener('input', () => {
    clearTimeout(timer);
    closeSuggest();
    timer = setTimeout(() => { state.q = searchInput.value; render(); }, 150);
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = ''; state.q = ''; render(); searchInput.focus();
  });
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    clearTimeout(timer);
    state.q = searchInput.value; render(); closeSuggest();
    $('#templates').scrollIntoView();
    $('#marketTitle').setAttribute('tabindex', '-1');
    $('#marketTitle').focus({ preventScroll: true });
  });
  $$('input[name=cat]').forEach(r => r.addEventListener('change', () => { state.cat = r.value; render(); }));
  $$('input[name=price]').forEach(r => r.addEventListener('change', () => { state.price = r.value; render(); }));
  sortSelect.addEventListener('change', () => { state.sort = sortSelect.value; render(); });

  const clearAll = () => {
    state.q = ''; state.cat = 'all'; state.price = 'all'; state.sort = 'featured';
    searchInput.value = ''; render();
  };
  $('#clearFilters').addEventListener('click', clearAll);
  $('#emptyClear').addEventListener('click', clearAll);

  moreBtn.addEventListener('click', () => {
    const before = state.shown;
    state.shown += PAGE;
    render({ resetShown: false });
    const firstNew = $$('.card', grid).filter(c => !c.hidden)[before];
    if (firstNew) firstNew.focus({ preventScroll: false });
  });

  /* Press "/" to search */
  addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName) && !e.metaKey && !e.ctrlKey) {
      e.preventDefault(); searchInput.focus();
    }
  });

  /* ---------- Search suggestions ---------- */
  const wrap = $('#searchWrap'), panel = $('#searchSuggestions'), toggle = $('#suggestToggle');
  function openSuggest() { panel.hidden = false; toggle.setAttribute('aria-expanded', 'true'); }
  function closeSuggest() { panel.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
  toggle.addEventListener('click', () => (panel.hidden ? openSuggest() : closeSuggest()));
  searchInput.addEventListener('focus', () => { if (!searchInput.value) openSuggest(); });
  document.addEventListener('click', e => { if (!wrap.contains(e.target)) closeSuggest(); });
  wrap.addEventListener('keydown', e => {
    const links = $$('.suggest-item', panel);
    const i = links.indexOf(document.activeElement);
    if (e.key === 'Escape') { closeSuggest(); searchInput.focus(); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (panel.hidden) openSuggest();
      (links[i + 1] || links[0]).focus();
    }
    if (e.key === 'ArrowUp' && i >= 0) { e.preventDefault(); (links[i - 1] || searchInput).focus(); }
  });
  $$('.suggest-item', panel).forEach(a => a.addEventListener('click', () => {
    const f = a.dataset.filter;
    if (f && VALID_CAT.has(f)) { state.cat = f; state.price = 'all'; render(); }
    closeSuggest();
  }));

  /* ---------- Mobile filters drawer ---------- */
  const filters = $('#filters'), scrim = $('#scrim'), filterOpen = $('#filterOpen');
  const setFilters = open => {
    filters.classList.toggle('open', open);
    scrim.hidden = !open;
    filterOpen.setAttribute('aria-expanded', open);
    document.body.classList.toggle('lock', open);
    if (open) $('input', filters).focus(); else if (matchMedia('(max-width:1000px)').matches) filterOpen.focus();
  };
  filterOpen.addEventListener('click', () => setFilters(true));
  scrim.addEventListener('click', () => setFilters(false));
  $('#applyFilters').addEventListener('click', () => setFilters(false));
  addEventListener('keydown', e => { if (e.key === 'Escape' && filters.classList.contains('open')) setFilters(false); });
  scrim.hidden = true;

  /* ---------- Placeholder cards (href="#") ---------- */
  const toast = $('#toast'); let toastTimer;
  const say = msg => {
    toast.textContent = msg; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  };
  grid.addEventListener('click', e => {
    const a = e.target.closest('a.card');
    if (a && a.getAttribute('href') === '#') { e.preventDefault(); say('This template is coming soon.'); }
  });

  /* ---------- Header, nav, to-top ---------- */
  const header = $('#siteHeader'), toTop = $('#toTop');
  const onScroll = () => {
    header.classList.toggle('scrolled', scrollY > 8);
    toTop.classList.toggle('show', scrollY > 700);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => scrollTo({ top: 0 }));

  const menuBtn = $('#menuBtn'), nav = $('#headerNav');
  const setMenu = open => {
    nav.classList.toggle('open', open);
    menuBtn.setAttribute('aria-expanded', open);
    menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuBtn.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });

  /* Highlight the current section in the nav */
  const links = $$('a', nav);
  const sections = links.map(a => $(a.getAttribute('href'))).filter(Boolean);
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) links.forEach(a => {
        if (a.getAttribute('href') === '#' + en.target.id) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => spy.observe(s));

  /* ---------- Legal dialog ---------- */
  const legal = $('#legal');
  $$('[data-legal]').forEach(b => b.addEventListener('click', () => {
    $$('section', legal).forEach(s => s.hidden = s.id !== b.dataset.legal);
    legal.showModal();
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

  /* ---------- Image fallback ---------- */
  $$('.card-image img').forEach(img => img.addEventListener('error', () => {
    img.removeAttribute('src');
    img.style.visibility = 'hidden';
  }, { once: true }));

  /* ---------- Init ---------- */
  readURL();
  searchInput.value = state.q;
  render();
})();