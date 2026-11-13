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

// The chosen map style, shared by all maps (localStorage "pot-map-style").
const STYLE_KEY = 'pot-map-style';
const mapStyle = {
  current: null,
  get() {
    if (this.current === null) { try { this.current = localStorage.getItem(STYLE_KEY) || ''; } catch (e) { this.current = ''; } }
    return this.current;
  },
  set(id) {
    this.current = id;
    try { localStorage.setItem(STYLE_KEY, id); } catch (e) { /* private mode */ }
    document.dispatchEvent(new Event('pot:mapstyle'));
  },
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
  // Map styles (hugo.toml → params.map.styles), switchable with buttons in the top-right corner.
  // The choice is remembered and applies to every map, on this page and later ones.
  const styles = data.styles || [];
  let tiles = null;
  const buttons = [];
  function useStyle(id) {
    const style = styles.find((s) => s.id === id) || styles[0];
    if (!style) return;
    if (tiles) map.removeLayer(tiles);
    tiles = L.tileLayer(style.tiles, { maxZoom: style.maxZoom, attribution: style.attribution, subdomains: style.subdomains }).addTo(map);
    tiles.bringToBack();
    map.setMaxZoom(style.maxZoom);
    el.dataset.mapStyle = style.id;
    el.classList.toggle('map--photo', !!style.photo);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === style.id)));
  }
  if (styles.length > 1) {
    const StyleControl = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const box = L.DomUtil.create('div', 'map-styles');
        box.setAttribute('role', 'group');
        box.setAttribute('aria-label', el.dataset.styleLabel || 'Map style');
        styles.forEach((s) => {
          const b = L.DomUtil.create('button', '', box);
          b.type = 'button';
          b.dataset.style = s.id;
          b.textContent = s.name;
          b.addEventListener('click', () => mapStyle.set(s.id));
          buttons.push(b);
        });
        L.DomEvent.disableClickPropagation(box);
        L.DomEvent.disableScrollPropagation(box);
        return box;
      },
    });
    map.addControl(new StyleControl());
    document.addEventListener('pot:mapstyle', () => useStyle(mapStyle.get()));
  }
  useStyle(mapStyle.get());

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
    marker.kind = m.kind;
    marker.addTo(all);
    markers.push(marker);
  });

  // Markers that overlap on screen would cover each other. After every zoom:
  // - start/finish and stay markers that overlap sit side by side around their points, and so
  //   does a stage number on the same spot as one of them (a stay where the next stage starts);
  // - any other stage number that would cover a marker is hidden until you zoom in far enough.
  //   Spreading those too would push a long trail's numbers far off the line when zoomed out.
  const GAP = 6;
  const SAME = 200;   // metres: markers closer than this mark the same place
  function spread() {
    const pts = markers.map((mk) => map.latLngToLayerPoint(mk.getLatLng()));
    const touch = (a, b) => pts[a].distanceTo(pts[b]) < (markers[a].size + markers[b].size) / 2 + GAP;
    const fixed = markers.map((_, i) => i).filter((i) => markers[i].kind !== 'stage');
    const stages = markers.map((_, i) => i).filter((i) => markers[i].kind === 'stage');
    const done = new Set();
    const boxes = [];
    const show = (k, left) => {
      const m = markers[k];
      const el = m.getElement();
      if (el) { el.style.display = ''; el.style.marginLeft = `${left}px`; }
      boxes.push({ x: pts[k].x + left, y: pts[k].y - m.size / 2, w: m.size, h: m.size });
    };
    fixed.forEach((i) => {
      if (done.has(i)) return;
      const group = [i];
      fixed.forEach((j) => { if (!done.has(j) && j !== i && group.some((k) => touch(k, j))) group.push(j); });
      stages.forEach((j) => { if (group.some((k) => touch(k, j) && markers[k].getLatLng().distanceTo(markers[j].getLatLng()) < SAME)) group.push(j); });
      group.forEach((k) => done.add(k));
      const width = group.reduce((w, k) => w + markers[k].size, 0) + GAP * (group.length - 1);
      let x = -width / 2;
      group.forEach((k) => { show(k, group.length > 1 ? x : -markers[k].size / 2); x += markers[k].size + GAP; });
    });
    const hits = (b) => boxes.some((o) => b.x < o.x + o.w + GAP && o.x < b.x + b.w + GAP && b.y < o.y + o.h + GAP && o.y < b.y + b.h + GAP);
    stages.forEach((k) => {
      if (done.has(k)) return;
      const m = markers[k];
      const box = { x: pts[k].x - m.size / 2, y: pts[k].y - m.size / 2, w: m.size, h: m.size };
      if (hits(box)) {
        const el = m.getElement();
        if (el) el.style.display = 'none';
      } else show(k, -m.size / 2);
    });
  }

  if (!('mineHidden' in el.dataset)) mine.addTo(map);
  const bounds = focus.getLayers().length ? focus.getBounds() : all.getBounds();
  if (mine.getLayers().length && map.hasLayer(mine)) bounds.extend(mine.getBounds());
  // Keep markers clear of the controls in the top corners (zoom, map styles) and of the
  // credits at the bottom, which wrap to more lines on a phone. The corners can still change
  // size after this (web fonts arriving, another map style's credits), so fit again when they
  // do, until the visitor moves or zooms the map themselves.
  const corners = [...el.querySelectorAll('.leaflet-top, .leaflet-bottom')];
  const height = (sel) => { const c = el.querySelector(sel); return c ? c.offsetHeight : 0; };
  const clear = 18;   // half the largest marker (26 px) plus a little room
  let fitting = false;
  let moved = false;
  function fit() {
    const top = Math.max(height('.leaflet-top.leaflet-left'), height('.leaflet-top.leaflet-right'));
    const bottom = Math.max(height('.leaflet-bottom.leaflet-left'), height('.leaflet-bottom.leaflet-right'));
    fitting = true;
    if (bounds.isValid()) map.fitBounds(bounds, { paddingTopLeft: [28, Math.max(28, top + clear)], paddingBottomRight: [28, Math.max(28, bottom + clear)], animate: false });
    else map.setView([52.1, 5.3], 7, { animate: false });
    fitting = false;
    spread();
  }
  fit();
  map.on('dragstart zoomstart', () => { if (!fitting) moved = true; });
  if (window.ResizeObserver) {
    const watch = new ResizeObserver(() => { if (moved) watch.disconnect(); else fit(); });
    corners.forEach((c) => watch.observe(c));
  }
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
