/* global L */
// Draws the trail / track maps. Data comes from Hugo (parsed GPX) as JSON inside each .map element.

const STYLE = {
  official: { color: '#2F5D46', weight: 4, dashArray: '9 7', casing: 7 },
  faded: { color: '#8E9C8E', weight: 3, dashArray: '5 7', casing: 0 },
  'stage-a': { color: '#1E3D2F', weight: 5, casing: 8 },
  'stage-b': { color: '#4E8A68', weight: 5, casing: 8 },
  mine: { color: '#C8641E', weight: 4.5, casing: 8 },
};

const TENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" aria-hidden="true"><path d="M3 20L12 4l9 16H3z"/><path d="M9 20l3-5 3 5"/></svg>';

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function popup(m) {
  const label = esc(m.label);
  return m.url ? `<a href="${esc(m.url)}">${label}</a>` : label;
}

function initMap(el) {
  const json = el.querySelector('script[type="application/json"]');
  if (!json || !window.L) return;
  const data = JSON.parse(json.textContent);
  json.remove();

  const map = L.map(el, {
    scrollWheelZoom: false,
    zoomSnap: 0.25,
    attributionControl: true,
  });
  L.tileLayer(el.dataset.tiles, {
    maxZoom: Number(el.dataset.maxzoom) || 17,
    attribution: el.dataset.attribution,
    subdomains: 'abc',
  }).addTo(map);

  // Scroll-zoom only after the map is clicked, so the page keeps scrolling.
  map.once('click', () => map.scrollWheelZoom.enable());

  const all = L.featureGroup().addTo(map);
  const mine = L.featureGroup();
  const focus = L.featureGroup();

  // draw faded first, then official/stages, then my tracks on top
  const order = { faded: 0, official: 1, 'stage-a': 1, 'stage-b': 1, mine: 2 };
  (data.layers || [])
    .filter((l) => l.points && l.points.length > 1)
    .sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1))
    .forEach((layer) => {
      const s = STYLE[layer.kind] || STYLE.official;
      const group = layer.kind === 'mine' ? mine : all;
      if (s.casing) {
        L.polyline(layer.points, { color: '#ffffff', weight: s.casing, opacity: 0.9, interactive: false }).addTo(group);
      }
      const line = L.polyline(layer.points, { color: s.color, weight: s.weight, dashArray: s.dashArray, lineCap: 'round', lineJoin: 'round' });
      if (layer.name) line.bindTooltip(esc(layer.name), { sticky: true });
      if (layer.url) line.on('click', () => { window.location.href = layer.url; });
      line.addTo(group);
      if (layer.kind !== 'faded') line.addTo(focus);
    });

  (data.markers || []).forEach((m) => {
    let html = '';
    let size = 24;
    if (m.kind === 'stay') { html = `<span class="mk mk--stay">${TENT}</span>`; size = 26; }
    else if (m.kind === 'stage') { html = `<span class="mk mk--stage">${esc(m.label)}</span>`; }
    else { html = '<span class="mk mk--end"></span>'; size = 16; }
    const icon = L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    const marker = L.marker([m.lat, m.lon], { icon, keyboard: true, title: m.title || m.label || '' });
    if (m.popup || m.url) marker.bindPopup(popup({ label: m.popup || m.label, url: m.url }));
    marker.addTo(all);
  });

  if (!('mineHidden' in el.dataset)) mine.addTo(map);
  const bounds = focus.getLayers().length ? focus.getBounds() : all.getBounds();
  if (mine.getLayers().length && map.hasLayer(mine)) bounds.extend(mine.getBounds());
  if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
  else map.setView([52.1, 5.3], 7);

  // Optional toggle button for "my tracks"
  document.querySelectorAll(`[data-map-toggle="${el.id}"]`).forEach((btn) => {
    btn.hidden = mine.getLayers().length === 0;
    btn.addEventListener('click', () => {
      const on = map.hasLayer(mine);
      if (on) map.removeLayer(mine); else mine.addTo(map);
      btn.setAttribute('aria-pressed', String(!on));
      const label = btn.querySelector('[data-label]');
      if (label) label.textContent = on ? 'Show my tracks' : 'Showing my tracks';
    });
  });
}

document.querySelectorAll('.map').forEach(initMap);
