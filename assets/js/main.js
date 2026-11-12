// Small progressive enhancements. Everything works without JavaScript.

// Mobile menu
const header = document.querySelector('.site-header');
const toggle = document.querySelector('.nav-toggle');
if (header && toggle) {
  toggle.addEventListener('click', () => {
    const open = header.classList.toggle('nav-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
}

// Filter chips: <div data-filter-group="x"><button data-filter="all|value">…
// Items: <… data-filter-item="x" data-tags="value other">
document.querySelectorAll('[data-filter-group]').forEach((group) => {
  const name = group.dataset.filterGroup;
  const items = document.querySelectorAll(`[data-filter-item="${name}"]`);
  const buttons = group.querySelectorAll('[data-filter]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.filter;
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      items.forEach((item) => {
        const tags = (item.dataset.tags || '').split(' ');
        item.hidden = !(value === 'all' || tags.includes(value));
      });
      // hide year headings without visible rows
      document.querySelectorAll(`[data-filter-heading="${name}"]`).forEach((h) => {
        const section = h.closest('[data-filter-block]');
        if (!section) return;
        const visible = section.querySelectorAll(`[data-filter-item="${name}"]:not([hidden])`).length;
        section.hidden = visible === 0;
      });
    });
  });
});

// YouTube: load the (privacy-enhanced) player only after a click
document.querySelectorAll('[data-youtube]').forEach((box) => {
  const btn = box.querySelector('button');
  if (!btn) return;
  btn.addEventListener('click', () => {
    const id = box.dataset.youtube;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
    iframe.title = box.dataset.title || 'YouTube video';
    iframe.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    box.replaceChildren(iframe);
  });
});

// Language: remember an explicit choice, and suggest the visitor's own language
// (from the browser) when they land on a page in the other one.
const LANG_KEY = 'pot-lang';
const storage = {
  get() { try { return localStorage.getItem(LANG_KEY); } catch (e) { return null; } },
  set(v) { try { localStorage.setItem(LANG_KEY, v); } catch (e) { /* private mode */ } },
};
document.querySelectorAll('[data-set-lang]').forEach((el) => {
  el.addEventListener('click', () => {
    storage.set(el.dataset.setLang);
    if ('dismiss' in el.dataset) el.closest('.lang-suggest').hidden = true;
  });
});
const suggestions = document.querySelectorAll('[data-suggest]');
if (suggestions.length && !storage.get()) {
  const offered = [...suggestions].map((s) => s.dataset.suggest);
  const pageLang = document.documentElement.lang.slice(0, 2);
  const browser = (navigator.languages || [navigator.language || ''])
    .map((l) => String(l).toLowerCase().slice(0, 2))
    .find((l) => l === pageLang || offered.includes(l));
  if (browser && browser !== pageLang) {
    const banner = document.querySelector(`[data-suggest="${browser}"]`);
    if (banner) banner.hidden = false;
  }
}
