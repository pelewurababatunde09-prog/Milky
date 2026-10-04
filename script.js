/* ============================
   SEARCH SUGGESTIONS
   ============================ */
(function () {
  const toggle = document.getElementById('suggestToggle');
  const suggestions = document.getElementById('searchSuggestions');
  const input = document.getElementById('searchInput');
  const items = document.querySelectorAll('.suggest-item');

  if (!toggle || !suggestions || !input) return;

  function openSuggestions() {
    suggestions.classList.add('open');
    suggestions.setAttribute('aria-hidden', 'false');
    toggle.classList.add('open');
  }

  function closeSuggestions() {
    suggestions.classList.remove('open');
    suggestions.setAttribute('aria-hidden', 'true');
    toggle.classList.remove('open');
  }

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    suggestions.classList.contains('open') ? closeSuggestions() : openSuggestions();
  });

  input.addEventListener('focus', openSuggestions);

  items.forEach(item => {
    item.addEventListener('click', () => {
      closeSuggestions();
      const filter = item.dataset.filter;
      const targetTab = document.querySelector(`.filter[data-filter="${filter}"]`);
      if (targetTab) targetTab.click();
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrap')) closeSuggestions();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSuggestions();
  });
})();

/* ============================
   FILTER TABS
   ============================ */
(function () {
  const filters = document.querySelectorAll('.filter');
  const cards = document.querySelectorAll('.card');

  if (!filters.length || !cards.length) return;

  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;

      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');

      cards.forEach(card => {
        const tags = card.dataset.tags || '';
        card.style.display = (filter === 'all' || tags.includes(filter)) ? '' : 'none';
      });
    });
  });
})();

/* ============================
   LIVE SEARCH
   ============================ */
(function () {
  const input = document.getElementById('searchInput');
  const cards = document.querySelectorAll('.card');

  if (!input || !cards.length) return;

  input.addEventListener('input', () => {
    const query = input.value.toLowerCase().trim();

    if (query.length > 0) {
      document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
      const allBtn = document.querySelector('.filter[data-filter="all"]');
      if (allBtn) allBtn.classList.add('active');
    }

    cards.forEach(card => {
      const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
      const desc = card.querySelector('.card-desc')?.textContent.toLowerCase() || '';
      const tags = (card.dataset.tags || '').toLowerCase();

      const match = query === '' ||
        title.includes(query) ||
        desc.includes(query) ||
        tags.includes(query);

      card.style.display = match ? '' : 'none';
    });
  });
})();