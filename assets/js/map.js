/* global L */
// Draws the trail / track maps. Data comes from Hugo (parsed GPX) as JSON inside each .map element.

// Colours come from the CSS custom properties (--route-*); maps look the same in both themes.
const STYLE = {
  official: { color: '--route-official', weight: 4, dashArray: '9 7', casing: 7 },
  faded: { color: '--route-faded', weight: 3, dashArray: '5 7', casing: 0 },
  'stage-a': { color: '--route-a', weight: 5, casing: 8 },
  'stage-b': { color: '--route-b', weight: 5, casing: 8 },
  mine: { color: '--route-mine', weight: 4.5, casing: 8 },
  'mine-b': { color: '--route-mine-b', weight: 4.5, casing: 8 },
};
const css = (el, name) => getComputedStyle(el).getPropertyValue(name).trim();

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
  const order = { faded: 0, official: 1, 'stage-a': 1, 'stage-b': 1, mine: 2, 'mine-b': 2 };
  (data.layers || [])
    .filter((l) => l.points && l.points.length > 1)
    .sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1))
    .forEach((layer) => {
      const s = STYLE[layer.kind] || STYLE.official;
      const group = layer.kind.startsWith('mine') ? mine : all;
      if (s.casing) {
        L.polyline(layer.points, { color: css(el, '--route-casing'), weight: s.casing, opacity: 0.9, interactive: false }).addTo(group);
      }
      const line = L.polyline(layer.points, { color: css(el, s.color), weight: s.weight, dashArray: s.dashArray, lineCap: 'round', lineJoin: 'round' });
      if (layer.name) line.bindTooltip(esc(layer.name), { sticky: true });
      if (layer.url) line.on('click', () => { window.location.href = layer.url; });
      line.addTo(group);
      if (layer.kind !== 'faded') line.addTo(focus);
    });

  // Every marker is at least 24×24 px to click or tap (WCAG 2.5.8), also the small start/finish dot.
  const markers = [];
  (data.markers || []).forEach((m) => {
    let html = '';
    let size = 24;
    if (m.kind === 'stay') { html = `<span class="mk mk--stay">${TENT}</span>`; size = 26; }
    else if (m.kind === 'stage') { html = `<span class="mk mk--stage">${esc(m.label)}</span>`; }
    else { html = '<span class="mk mk--end"></span>'; }
    const icon = L.divIcon({ html, className: 'mk-hit', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
    const marker = L.marker([m.lat, m.lon], { icon, keyboard: true, title: m.title || m.label || '' });
    marker.bindPopup(m.popup || m.url ? popup({ label: m.popup || m.label, url: m.url }) : esc(m.label));
    marker.size = size;
    marker.addTo(all);
    markers.push(marker);
  });

  // Markers on (nearly) the same spot, like a stay where the next stage starts, would cover each
  // other. After every zoom, put markers that overlap on screen side by side around their point.
  const GAP = 6;
  function spread() {
    const pts = markers.map((mk) => map.latLngToLayerPoint(mk.getLatLng()));
    const done = new Set();
    markers.forEach((mk, i) => {
      if (done.has(i)) return;
      const group = [i];
      for (let j = i + 1; j < markers.length; j++) {
        if (!done.has(j) && group.some((k) => pts[k].distanceTo(pts[j]) < (markers[k].size + markers[j].size) / 2 + GAP)) group.push(j);
      }
      const width = group.reduce((w, k) => w + markers[k].size, 0) + GAP * (group.length - 1);
      let x = -width / 2;
      group.forEach((k) => {
        const m = markers[k];
        done.add(k);
        const el = m.getElement();
        if (el) el.style.marginLeft = `${group.length > 1 ? x : -m.size / 2}px`;
        x += m.size + GAP;
      });
    });
  }

  if (!('mineHidden' in el.dataset)) mine.addTo(map);
  const bounds = focus.getLayers().length ? focus.getBounds() : all.getBounds();
  if (mine.getLayers().length && map.hasLayer(mine)) bounds.extend(mine.getBounds());
  // keep markers clear of the map credits, which wrap to more lines on a phone
  const credits = map.attributionControl ? map.attributionControl.getContainer().offsetHeight : 0;
  if (bounds.isValid()) map.fitBounds(bounds, { paddingTopLeft: [28, 28], paddingBottomRight: [28, 28 + credits] });
  else map.setView([52.1, 5.3], 7);
  spread();
  map.on('zoomend', spread);

  // Optional toggle button for "my tracks"
  document.querySelectorAll(`[data-map-toggle="${el.id}"]`).forEach((btn) => {
    btn.hidden = mine.getLayers().length === 0;
    btn.addEventListener('click', () => {
      const on = map.hasLayer(mine);
      if (on) map.removeLayer(mine); else mine.addTo(map);
      btn.setAttribute('aria-pressed', String(!on));
      const label = btn.querySelector('[data-label]');
      if (label) label.textContent = on ? (el.dataset.show || 'Show my tracks') : (el.dataset.showing || 'Showing my tracks');
    });
  });
}

document.querySelectorAll('.map').forEach(initMap);
