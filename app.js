(() => {
'use strict';

const PLACES = window.PLACES;
const rabbit = window.rabbit;
const BY_ID = Object.fromEntries(PLACES.map(p => [p.id, p]));
const CAT = { kcd: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4l-9.5 9.5M8 11l5 5M9.5 14.5L5 19"/></svg></span>', label: 'KCD', color: '#c4ae3a' }, bar: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 10h2a2 2 0 0 1 0 5h-2M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2"/></svg></span>', label: 'Bar', color: '#c4503b' }, sight: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6z"/></svg></span>', label: 'Sehenswert', color: '#6f95ad' }, food: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/></svg></span>', label: 'Essen', color: '#7fa95c' } };
const FILTERS = [['all', 'Alle'], ['kcd', 'KCD'], ['sight', 'Sehen'], ['trip', 'Ausflug'], ['city', 'Prag'], ['bar', 'Bars'], ['veg', 'Veggie'], ['vegan', 'Vegan'], ['top', 'Beliebt']];
const FICON = {
  all: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
  kcd: '<path d="M20 4l-9.5 9.5M8 11l5 5M9.5 14.5L5 19"/>',
  sight: '<path d="M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6z"/>',
  trip: '<path d="M5 19L19 5M10 5h9v9"/>',
  city: '<path d="M6 21V9l3-2 3 2 3-2 3 2v12zM10 21v-5h4v5"/>',
  bar: '<path d="M5 8h10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 10h2a2 2 0 0 1 0 5h-2"/>',
  veg: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/>',
  vegan: '<path d="M12 21V10M12 10C12 6 9 4 5 4c0 4 2 6 7 6zM12 13c0-3 2-5 6-5 0 4-2 5-6 5z"/>',
  top: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
const RANKS = [[0, 'Bauernjunge'], [5, 'Knecht'], [12, 'Knappe'], [20, 'Söldner'], [32, 'Ritter'], [48, 'Held von Böhmen']];
const KEY = 'prag-quest.v1';
const PRAGUE = [50.0875, 14.4213];

// ---------- State ----------
const def = () => ({ days: 4, start: '', plan: [[], [], [], []], fav: [], visited: [], filter: 'all', room: '', rev: 0, by: '', entries: {} });
let S = def();
try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) {}
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
const save = () => { store(); sync.onLocalChange(); };
function fitPlan() { while (S.plan.length < S.days) S.plan.push([]); S.plan.length = S.days; }
fitPlan();
if (!S.by) { S.by = Math.random().toString(36).slice(2, 10); store(); }

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isTrip = p => !!p.trip;
const matches = (p, f) => f === 'all' || (f === 'kcd' && p.cat === 'kcd') || (f === 'sight' && p.cat === 'sight') || (f === 'bar' && p.cat === 'bar') ||
  (f === 'veg' && p.cat === 'food') || (f === 'vegan' && p.diet === 'vegan') || (f === 'city' && !isTrip(p)) || (f === 'trip' && isTrip(p)) || (f === 'top' && score(p.id) > 0);
function km(a, b) {
  const r = x => x * Math.PI / 180, dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2200); }
const planned = id => S.plan.some(d => d.includes(id));
const dayLabel = i => {
  if (!S.start) return `Tag ${i + 1}`;
  const d = new Date(S.start + 'T12:00'); d.setDate(d.getDate() + i);
  return `Tag ${i + 1} · ${d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}`;
};

// ---------- Tabs ----------
function show(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
  document.querySelectorAll('.tabs button').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  if (view === 'map') setTimeout(() => { map.invalidateSize(); drawMarkers(); }, 50);
  if (view === 'plan') renderPlan();
  if (view === 'quest') renderQuest();
  if (view === 'cash') renderCash();
  if (view === 'lang') renderLang();
  if (view === 'list') renderList();
}
document.querySelectorAll('.tabs button').forEach(b => b.onclick = () => show(b.dataset.view));

// ---------- Filters ----------
function renderChips() {
  const html = FILTERS.map(([k, l]) => `<button class="sh ${S.filter === k ? 'on' : ''}" data-f="${k}"><span class="sd"><span class="si"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true">${FICON[k]}</svg></span></span></span><em>${l}</em></button>`).join('');
  ['#chips-map', '#chips-list'].forEach(sel => {
    const el = $(sel); el.innerHTML = html;
    el.onclick = e => { const f = e.target.closest('[data-f]'); if (!f) return; S.filter = f.dataset.f; save(); renderChips(); renderList(); drawMarkers(); };
  });
}

// ---------- Map ----------
// Ohne Leaflet (z. B. erster Start offline) bleibt die App ohne Karte nutzbar.
const HAS_MAP = typeof L !== 'undefined';
const map = HAS_MAP ? L.map('map', { zoomControl: false }).setView(PRAGUE, 12) : { invalidateSize() {} };
if (!HAS_MAP) $('#map').innerHTML = '<div class="empty" style="margin:16px">Karte nicht geladen – bitte einmal online öffnen. „Entdecken“ und „Plan“ funktionieren trotzdem.</div>';
else L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
const layer = HAS_MAP ? L.layerGroup().addTo(map) : { clearLayers() {} };
let me = null;
function drawMarkers() {
  if (!HAS_MAP) return;
  layer.clearLayers();
  const lab = map.getZoom() >= 14;
  PLACES.filter(p => matches(p, S.filter)).forEach(p => {
    const c = CAT[p.cat], v = S.visited.includes(p.id);
    const icon = L.divIcon({ className: '', iconSize: [26, 30], iconAnchor: [13, 30],
      html: `<div class="pin" style="opacity:${v ? .6 : 1}"><span class="in" style="--c:${c.color}">${v ? '<span class="ic"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>' : c.icon}</span></div>` });
    L.marker([p.lat, p.lng], { icon }).addTo(layer).on('click', () => openPlace(p.id))
      .bindTooltip(esc(p.name), { permanent: lab, direction: 'right', offset: [10, -14], className: 'map-label' });
  });
}
if (HAS_MAP) map.on('zoomend', drawMarkers);
$('#btn-locate').onclick = () => {
  if (!HAS_MAP || !navigator.geolocation) return toast('Kein GPS verfügbar');
  navigator.geolocation.getCurrentPosition(pos => {
    const ll = [pos.coords.latitude, pos.coords.longitude];
    if (me) me.setLatLng(ll); else me = L.circleMarker(ll, { radius: 8, color: '#fff', fillColor: '#3b82f6', fillOpacity: 1 }).addTo(map);
    map.setView(ll, 14);
  }, () => toast('Standort nicht verfügbar'), { enableHighAccuracy: true, timeout: 8000 });
};


// ---------- Bilder (Wikipedia) & Hasen ----------
const IMG_KEY = 'prag-quest.img.v1';
let IMGS = {}; try { IMGS = JSON.parse(localStorage.getItem(IMG_KEY)) || {}; } catch (_) {}
const saveImgs = () => { try { localStorage.setItem(IMG_KEY, JSON.stringify(IMGS)); } catch (_) {} };
const POSE_FOR = p => p.trip ? 'attack' : p.cat === 'kcd' ? (p.epoch ? 'walk' : 'guard') : p.cat === 'bar' ? 'trumpet' : 'peek';
const rabbitOf = p => { const i = Math.max(0, PLACES.indexOf(p)); const n = window.RABBIT_COLORS.length; return [window.RABBIT_COLORS[i % n], window.RABBIT_POSES[Math.floor(i / n) % 10]]; };
const RB_FOR = rabbitOf;
const imgTag = m => `<img loading="lazy" alt="" src="${esc(m.src)}" data-alt="${esc(m.alt || '')}"><a class="credit" href="${esc(m.page)}" target="_blank" rel="noopener">Foto: Wikipedia</a>`;
function picHTML(p) {
  const m = IMGS[p.id], ok = m && m.src;
  return `<div class="pic ${ok ? '' : 'ph'}" data-pic="${p.id}">${ok ? imgTag(m) : rabbit(...RB_FOR(p))}</div>`;
}
async function loadImg(p) {
  const c = IMGS[p.id]; if (c && (c.src || c.no)) return c;
  try {
    const r = await fetch(`https://${p.wiki.slice(0, 2)}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(p.wiki.slice(3).replace(/ /g, '_'))}`);
    if (r.status === 404) IMGS[p.id] = { no: 1 };
    else if (!r.ok) return null;
    else { const j = await r.json(), t = j.thumbnail && j.thumbnail.source; IMGS[p.id] = t ? { src: t.replace(/\/\d+px-/, '/500px-'), alt: t, page: j.content_urls.desktop.page } : { no: 1 }; }
  } catch (_) { return null; }
  saveImgs(); return IMGS[p.id];
}
function hydrate(root) {
  hydratePhotos(root);
  root.querySelectorAll('[data-pic]').forEach(el => {
    const p = BY_ID[el.dataset.pic]; if (!p || !p.wiki || (IMGS[p.id] && IMGS[p.id].src)) return;
    loadImg(p).then(m => { if (m && m.src && el.isConnected) { el.classList.remove('ph'); el.innerHTML = imgTag(m); } });
  });
}
// Kaputtes Foto: erst die Original-Vorschau versuchen, dann zurück zum Hasen.
document.addEventListener('error', e => {
  const im = e.target, pic = im.tagName === 'IMG' && im.closest('.pic'); if (!pic) return;
  if (im.dataset.alt && im.src !== im.dataset.alt) { im.src = im.dataset.alt; return; }
  const p = BY_ID[pic.dataset.pic]; pic.classList.add('ph'); pic.innerHTML = rabbit(...RB_FOR(p));
}, true);
const isPlace = p => p.area !== 'überall';
const mapsQ = p => encodeURIComponent(`${p.name} ${p.area} Tschechien`);
const linksHTML = p => !isPlace(p) ? '' : `<div class="actions links">
  <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${mapsQ(p)}">Google Maps</a>
  <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}&travelmode=walking">Route</a>
  <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=${mapsQ(p)}">Fotos</a>${p.web ? `<a class="btn small" target="_blank" rel="noopener" href="${esc(p.web)}">Website</a>` : ''}</div>`;

// ---------- Gruppe: Mitglieder, Stimmen, Notizen, Zeiten ----------
const nameOf = id => ((S.entries['m:' + id] || {}).v || {}).n || 'Unbekannt';
const members = () => {
  const ids = Object.keys(S.entries).filter(k => k.startsWith('m:') && S.entries[k].v).map(k => k.slice(2));
  if (!ids.includes(S.by)) ids.push(S.by);
  return ids;
};
const myVotes = () => (S.entries['v:' + S.by] || {}).v || { u: [], d: [] };
function tally(id) {
  const t = { up: [], down: [] };
  Object.entries(S.entries).forEach(([k, e]) => {
    if (k[0] !== 'v' || !e.v) return;
    if ((e.v.u || []).includes(id)) t.up.push(k.slice(2));
    if ((e.v.d || []).includes(id)) t.down.push(k.slice(2));
  });
  return t;
}
const score = id => { const t = tally(id); return t.up.length - t.down.length; };
const noteOf = id => (S.entries['n:' + id] || {}).v || null;
const timeOf = id => (S.entries['t:' + id] || {}).v || '';
const noteHTML = id => { const n = noteOf(id); return n ? `<div class="note"><b>Notiz</b> ${esc(n.t)} <i>– ${esc(nameOf(n.a))}</i></div>` : ''; };

// ---------- Cards ----------
function card(p) {
  const v = S.visited.includes(p.id), f = S.fav.includes(p.id), tl = tally(p.id), mv = myVotes();
  const who = [tl.up.length ? 'Dafür: ' + tl.up.map(nameOf).join(', ') : '', tl.down.length ? 'Dagegen: ' + tl.down.map(nameOf).join(', ') : ''].filter(Boolean).join(' · ');
  return `<article class="card ${p.cat}" data-id="${p.id}">
    ${picHTML(p)}
    <h3>${CAT[p.cat].icon}<span>${esc(p.name)}</span></h3>
    <div class="meta"><span>${esc(p.area)}</span>
      ${p.diet === 'vegan' ? '<span class="tag vegan">vegan</span>' : p.diet === 'veg' ? '<span class="tag veg">vegetarisch</span>' : ''}
      ${p.trip ? `<span class="tag trip">Ausflug ${esc(p.trip)}</span>` : ''}${p.cat === 'kcd' && !p.epoch ? '<span class="tag game">Im Spiel</span>' : ''}${v ? '<span class="tag">besucht</span>' : ''}</div>
    ${p.kcd ? `<div class="kcdnote ${p.epoch ? 'epoch' : ''}">${esc(p.kcd)}</div>` : ''}
    <p>${esc(p.desc)}</p>
    ${p.how ? `<div class="how"><b>Anreise</b> ${esc(p.how)}</div>` : ''}
    ${hoursHTML(p)}
    <div class="actions">
      <button class="btn small ${f ? 'on' : ''}" data-a="fav">${f ? '★ Favorit' : '☆ Favorit'}</button>
      <button class="btn small ${planned(p.id) ? 'on' : ''}" data-a="plan">${planned(p.id) ? '✓ Im Plan' : '+ Plan'}</button>
      <button class="btn small ${v ? 'on' : ''}" data-a="visit">${v ? 'Zurücksetzen' : 'Einchecken'}</button>
    </div>
    <div class="actions votes">
      <button class="btn small ${mv.u.includes(p.id) ? 'on' : ''}" data-a="up">▲ Dafür ${tl.up.length || ''}</button>
      <button class="btn small ${mv.d.includes(p.id) ? 'on' : ''}" data-a="down">▼ Dagegen ${tl.down.length || ''}</button>
      <button class="btn small" data-a="note">${noteOf(p.id) ? 'Notiz ändern' : 'Notiz'}</button>
      <button class="btn small" data-a="photo">Foto</button>
      ${isPlace(p) ? '<button class="btn small" data-a="hours">Zeiten</button>' : ''}
      ${p.cat === 'bar' ? '<button class="btn small" data-a="beer">Bier loggen</button>' : ''}
    </div>
    ${who ? `<div class="who">${esc(who)}</div>` : ''}
    ${noteHTML(p.id)}
    <div class="myphoto" data-photo="${p.id}"></div>
    ${linksHTML(p)}</article>`;
}
const ACT = {
  fav: id => toggleFav(id), plan: id => pickDay(id), visit: id => checkIn(id),
  up: id => vote(id, 'u'), down: id => vote(id, 'd'), note: id => openNote(id), photo: id => takePhoto(id), hours: id => openHours(id), beer: id => openBeer(id)
};
let selId = null;
const GROUPS = [['kcd', 'KCD-Schauplätze'], ['sight', 'Sehenswürdigkeiten'], ['bar', 'Bars & Brauereien'], ['food', 'Essen & Veggie']];
function rowHTML(p) {
  const sel = selId === p.id, sc = score(p.id);
  const mark = [S.visited.includes(p.id) ? '✓' : '', S.fav.includes(p.id) ? '★' : '', sc > 0 ? '▲' + sc : ''].filter(Boolean).join(' ');
  return `<div class="qrow ${sel ? 'sel' : ''}" data-row="${p.id}"><span class="qsh" style="--c:${CAT[p.cat].color}">${CAT[p.cat].icon}</span>
    <span class="qt">${esc(p.name)}<small>${esc(p.area)}${p.trip ? ' · Ausflug ' + esc(p.trip) : ''}</small></span><span class="qm">${mark}</span></div>` +
    (sel ? `<div class="qdetail">${card(p)}</div>` : '');
}
function renderList() {
  let items = PLACES.filter(p => matches(p, S.filter));
  const top = S.filter === 'top';
  if (top) items.sort((a, b) => score(b.id) - score(a.id));
  const groups = top ? [['top', 'Beliebteste Orte']] : GROUPS;
  const el = $('#list');
  el.innerHTML = groups.map(([c, l]) => {
    const ps = top ? items : items.filter(p => p.cat === c); if (!ps.length) return '';
    return `<div class="log"><div class="log-head">${CAT[c] ? CAT[c].icon : ''}<span>${l}</span><b>${ps.filter(p => S.visited.includes(p.id)).length}/${ps.length}</b></div>${ps.map(rowHTML).join('')}</div>`;
  }).join('') || `<div class="empty">${rabbit('orange', 'stop', 'rb-empty')}<br>${top ? 'Noch keine Stimmen. Gebt Orten ein ▲.' : 'Keine Treffer.'}</div>`;
  hydrate(el);
}
$('#list').onclick = e => {
  const im = e.target.closest('.myphoto img'); if (im) return viewPhoto(im.closest('[data-photo]').dataset.photo);
  const b = e.target.closest('[data-a]'); if (b) return ACT[b.dataset.a](b.closest('[data-id]').dataset.id);
  const r = e.target.closest('[data-row]'); if (!r) return;
  selId = selId === r.dataset.row ? null : r.dataset.row; renderList();
  const s = $('#list .qrow.sel'); if (s) s.scrollIntoView({ block: 'start', behavior: 'smooth' });
};
function openPlace(id) {
  const p = BY_ID[id];
  $('#sheet-body').innerHTML = card(p) + '<button class="btn" id="sheet-close" style="width:100%">Schließen</button>';
  $('#sheet-body').onclick = e => {
    if (e.target.id === 'sheet-close') return closeSheet();
    const im = e.target.closest('.myphoto img'); if (im) return viewPhoto(id);
    const b = e.target.closest('[data-a]'); if (!b) return;
    ACT[b.dataset.a](id);
    if (['fav', 'up', 'down'].includes(b.dataset.a)) openPlace(id);
  };
  $('#sheet').hidden = false; hydrate($('#sheet-body'));
}
const closeSheet = () => { $('#sheet').hidden = true; };
$('#sheet').onclick = e => { if (e.target.id === 'sheet') closeSheet(); };
function refresh() { save(); renderList(); drawMarkers(); renderRank(); renderPlan(); renderQuest(); renderCash(); }

function toggleFav(id) { S.fav = S.fav.includes(id) ? S.fav.filter(x => x !== id) : [...S.fav, id]; refresh(); }
function vote(id, dir) {
  const cur = myVotes(), v = { u: cur.u.filter(x => x !== id), d: cur.d.filter(x => x !== id) };
  if (!cur[dir].includes(id)) v[dir].push(id);
  sync.setEntry('v:' + S.by, v); refresh();
}
function openNote(id) {
  const n = noteOf(id);
  $('#sheet-body').innerHTML = `<h2>Notiz · ${esc(BY_ID[id].name)}</h2>
    <p>Reservierung, Treffpunkt, Tipp. Alle in der Gruppe sehen die Notiz.</p>
    <textarea id="note-t" maxlength="400" rows="4" style="width:100%">${esc(n ? n.t : '')}</textarea>
    <div class="row" style="margin-top:10px"><button class="btn gold" id="note-save">Speichern</button><button class="btn" id="note-del">Löschen</button><button class="btn" id="sheet-close">Abbrechen</button></div>`;
  $('#sheet-body').onclick = e => {
    const i = e.target.id;
    if (i === 'sheet-close') return closeSheet();
    if (i === 'note-save' || i === 'note-del') {
      const t = i === 'note-del' ? '' : $('#note-t').value.trim();
      sync.setEntry('n:' + id, t ? { t, a: S.by } : null); closeSheet(); refresh();
    }
  };
  $('#sheet').hidden = false; $('#note-t').focus();
}
function pickDay(id) {
  if (planned(id)) { S.plan = S.plan.map(d => d.filter(x => x !== id)); refresh(); return toast('Aus Plan entfernt'); }
  $('#sheet-body').innerHTML = `<h2>${esc(BY_ID[id].name)} – an welchem Tag?</h2><div class="row">` +
    S.plan.map((_, i) => `<button class="btn" data-day="${i}">${dayLabel(i)}</button>`).join('') + '</div>';
  $('#sheet-body').onclick = e => {
    const d = e.target.dataset.day; if (d === undefined) return;
    S.plan[+d].push(id); closeSheet(); refresh(); toast('Zum Plan hinzugefügt');
  };
  $('#sheet').hidden = false;
}
function checkIn(id) {
  const p = BY_ID[id];
  if (S.visited.includes(id)) { S.visited = S.visited.filter(x => x !== id); return refresh(); }
  const done = () => { S.visited.push(id); refresh(); showUnlock(p); };
  const manual = () => { if (confirm('Nicht in der Nähe erkannt. Trotzdem als besucht markieren?')) done(); };
  if (!navigator.geolocation) return manual();
  navigator.geolocation.getCurrentPosition(pos => {
    const d = km({ lat: pos.coords.latitude, lng: pos.coords.longitude }, p);
    d < 0.3 ? done() : manual();
  }, manual, { enableHighAccuracy: true, timeout: 8000 });
}
function showUnlock(p) {
  const n = S.visited.length, rk = RANKS.find(([min]) => min === n);
  $('#sheet-body').innerHTML = `<h2>Neuer Hase freigeschaltet</h2><div class="dice roll">${rabbit(...rabbitOf(p), 'rb-dice')}</div>
    <p style="text-align:center">${esc(p.name)}<br><small style="color:var(--mut)">${n} von ${PLACES.length} Hasen gesammelt${rk ? ` · neuer Rang: ${rk[1]}` : ''}</small></p>
    <div class="row"><button class="btn gold" id="u-photo">Foto machen</button><button class="btn" id="sheet-close">Weiter</button></div>`;
  $('#sheet-body').onclick = e => { if (e.target.id === 'sheet-close') closeSheet(); if (e.target.id === 'u-photo') { closeSheet(); takePhoto(p.id); } };
  $('#sheet').hidden = false;
}

// ---------- Öffnungszeiten (von der Gruppe eingetragen) ----------
const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'], WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const hoursOf = id => { const e = S.entries['h:' + id]; return e ? e.v : (BY_ID[id].h || null); };
const hoursText = h => [h.o && h.e ? `${h.o}–${h.e}` : '', (h.c || []).length ? 'geschlossen: ' + h.c.map(d => DAYS[d]).join(', ') : '', h.n || ''].filter(Boolean).join(' · ');
function openState(h, now = new Date()) {
  const d = now.getDay();
  if ((h.c || []).includes(d)) return { open: false, msg: `${WD[d]} geschlossen` };
  if (h.o && h.e) {
    const t = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (h.e < h.o) return t >= h.o || t < h.e ? { open: true, msg: `bis ${h.e}` } : { open: false, msg: `öffnet ${h.o}` }; // über Mitternacht
    if (t < h.o) return { open: false, msg: `öffnet ${h.o}` };
    if (t >= h.e) return { open: false, msg: `schloss ${h.e}` };
    return { open: true, msg: `bis ${h.e}` };
  }
  return null;
}
function hoursHTML(p) {
  const h = hoursOf(p.id);
  if (!h) return p.hint ? `<div class="hours hintline">${esc(p.hint)}</div>` : '';
  const st = openState(h);
  return `<div class="hours"><b>Zeiten</b> ${esc(hoursText(h))}${h.s === 'osm' ? ' <small>(OSM)</small>' : h.s === 'web' ? ' <small>(Web, bitte prüfen)</small>' : ''}${st ? ` <span class="st ${st.open ? 'on' : 'off'}">${st.open ? 'Jetzt geöffnet' : 'Jetzt zu'} · ${esc(st.msg)}</span>` : ''}</div>`;
}
function openHours(id) {
  const h = hoursOf(id) || { c: [], o: '', e: '', n: '' }, closed = new Set(h.c || []);
  $('#sheet-body').innerHTML = `<h2>Öffnungszeiten · ${esc(BY_ID[id].name)}</h2>
    <p>Trag ein, was bei Google Maps oder auf der Website steht. Alle in der Gruppe sehen es und werden im Plan gewarnt.</p>
    <div class="chips-wrap" id="h-days"><span>Ruhetage:</span>${[1, 2, 3, 4, 5, 6, 0].map(d => `<button class="chip ${closed.has(d) ? 'on' : ''}" data-d="${d}">${DAYS[d]}</button>`).join('')}</div>
    <div class="row"><label>Öffnet<input id="h-o" type="time" value="${esc(h.o || '')}"></label><label>Schließt<input id="h-e" type="time" value="${esc(h.e || '')}"></label></div>
    <label class="gl">Hinweis<input id="h-n" maxlength="120" value="${esc(h.n || '')}" placeholder="z. B. Küche bis 21 Uhr"></label>
    <div class="row"><button class="btn" id="h-osm">Von OpenStreetMap laden</button></div><div id="h-found"></div>
    <div class="row"><button class="btn gold" id="h-save">Speichern</button><button class="btn" id="h-del">Löschen</button><button class="btn" id="sheet-close">Abbrechen</button></div>`;
  $('#sheet-body').onclick = e => {
    const d = e.target.dataset.d; if (d !== undefined) { const n = +d; closed.has(n) ? closed.delete(n) : closed.add(n); return e.target.classList.toggle('on'); }
    const i = e.target.id;
    if (i === 'sheet-close') return closeSheet();
    if (i === 'h-osm') {
      $('#h-found').innerHTML = '<p class="hint">Suche…</p>';
      return findOsmHours(BY_ID[id]).then(f => {
        if (!f) return $('#h-found').innerHTML = '<p class="hint">Bei OpenStreetMap ist für diesen Ort nichts eingetragen. Prüf Google Maps und trag es selbst ein.</p>';
        const pr = parseOH(f.oh);
        $('#h-found').innerHTML = `<div class="note"><b>Gefunden</b> ${esc(f.name)}: ${esc(f.oh)}<br><button class="btn small" id="h-take" style="margin-top:6px">Übernehmen</button></div>`;
        $('#h-take').onclick = () => { closed.clear(); (pr.c || []).forEach(d => closed.add(d)); document.querySelectorAll('#h-days .chip').forEach(c => c.classList.toggle('on', closed.has(+c.dataset.d))); $('#h-o').value = pr.o || ''; $('#h-e').value = pr.e || ''; $('#h-n').value = pr.n || ''; $('#h-found').dataset.osm = '1'; toast('Übernommen – bitte Speichern'); };
      }).catch(() => { $('#h-found').innerHTML = '<p class="hint">OpenStreetMap ist gerade nicht erreichbar. Später nochmal.</p>'; });
    }
    if (i === 'h-save' || i === 'h-del') {
      const v = { c: [...closed], o: $('#h-o').value, e: $('#h-e').value, n: $('#h-n').value.trim() }; if ($('#h-found').dataset.osm) v.s = 'osm';
      sync.setEntry('h:' + id, i === 'h-del' || (!v.c.length && !v.o && !v.e && !v.n) ? null : v); closeSheet(); refresh();
    }
  };
  $('#sheet').hidden = false;
}
const dayDate = i => { if (!S.start) return null; const d = new Date(S.start + 'T12:00'); d.setDate(d.getDate() + i); return d; };
function planWarn(id, i) {
  const d = dayDate(i); if (!d) return '';
  const p = BY_ID[id], h = hoursOf(id), w = d.getDay(), out = [];
  if (h) {
    if ((h.c || []).includes(w)) out.push(`${WD[w]} geschlossen`);
    else { const t = timeOf(id), wrap = h.e && h.o && h.e < h.o; if (t && h.o && !wrap && t < h.o) out.push(`Öffnet erst um ${h.o}`); if (t && h.e && !wrap && t >= h.e) out.push(`Schließt um ${h.e}`); if (t && wrap && t >= h.e && t < h.o) out.push(`Öffnet erst um ${h.o}`); }
  } else if (p.hint && w === 1) out.push('Montag: oft geschlossen, bitte prüfen');
  return out.map(x => `<div class="warn">${esc(x)}</div>`).join('');
}


// ---------- Öffnungszeiten aus OpenStreetMap ----------
const CYC = [1, 2, 3, 4, 5, 6, 0], DAYIDX = { Mo: 1, Tu: 2, We: 3, Th: 4, Fr: 5, Sa: 6, Su: 0 };
function expandDays(s) {
  const out = [];
  for (const tok of s.split(',').map(x => x.trim()).filter(Boolean)) {
    const m = tok.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/); if (!m) return null;
    const a = CYC.indexOf(DAYIDX[m[1]]); if (!m[2]) { out.push(CYC[a]); continue; }
    for (let i = a; ; i = (i + 1) % 7) { out.push(CYC[i]); if (CYC[i] === DAYIDX[m[2]]) break; }
  }
  return out;
}
// Teilmenge der OSM-Syntax (Wochentage, Zeiten, off). Alles andere bleibt als Hinweistext.
function parseOH(str) {
  str = String(str || '').trim(); if (!str) return null;
  if (str === '24/7') return { c: [], o: '00:00', e: '23:59', n: '24/7' };
  const raw = { c: [], o: '', e: '', n: str.slice(0, 120) };
  if (/sunrise|sunset|week|"|\[|easter/i.test(str)) return raw;
  const open = {};
  for (const rule of str.split(';').map(x => x.trim()).filter(Boolean)) {
    if (/^(PH|SH)\b/.test(rule)) continue;
    const m = rule.match(/^([A-Za-z,\- ]*?)\s*((?:\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(?:\s*,\s*)?)+|off|closed)$/i); if (!m) return raw;
    const days = m[1].trim() ? expandDays(m[1].trim().replace(/\s*-\s*/g, '-')) : CYC; if (!days) return raw;
    const v = m[2].toLowerCase();
    days.forEach(d => { open[d] = /off|closed/.test(v) ? [] : v.split(',').map(x => x.trim().split('-').map(t => t.trim().padStart(5, '0'))); });
  }
  const od = CYC.filter(d => open[d] && open[d].length); if (!od.length) return raw;
  const key = d => JSON.stringify(open[d]), uni = od.every(d => key(d) === key(od[0])) && open[od[0]].length === 1;
  return { c: CYC.filter(d => !(open[d] && open[d].length)), o: uni ? open[od[0]][0][0] : '', e: uni ? open[od[0]][0][1] : '', n: uni ? '' : str.slice(0, 120) };
}
const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 1);
const GENERIC = new Set(['bar', 'pub', 'cafe', 'cafe', 'cafe', 'restaurant', 'restaurace', 'kloster', 'klaster', 'burg', 'schloss', 'hrad', 'zamek', 'hospoda', 'hostinec', 'pivnice', 'pivovar', 'brauerei', 'dum', 'der', 'die', 'das', 'und', 'the', 'bistro', 'klosterbrauerei', 'biergarten', 'sady', 'pivovarsky']);
function nameScore(a, b) {
  const x = norm(a).filter(w => !GENERIC.has(w)), y = norm(b).filter(w => !GENERIC.has(w));
  if (!x.length || !y.length) return 0;
  const shared = x.filter(w => y.includes(w) || y.some(v => v.length > 3 && w.length > 3 && (v.includes(w) || w.includes(v)))).length;
  return shared / Math.min(x.length, y.length);
}
async function findOsmHours(p) {
  const q = `[out:json][timeout:20];nwr["opening_hours"](around:300,${p.lat},${p.lng});out tags center 30;`;
  const r = await fetch('https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(q));
  if (!r.ok) throw new Error('osm ' + r.status);
  const best = (await r.json()).elements.map(e => ({ name: (e.tags.name || ''), oh: e.tags.opening_hours, s: nameScore(p.name.replace(/\(.*\)/, ''), e.tags.name || '') }))
    .filter(e => e.s >= 0.5).sort((a, b) => b.s - a.s)[0];
  return best || null;
}

// ---------- Bier-Tagebuch ----------
const BEERS = ['Pilsner Urquell', 'Gambrinus', 'Kozel hell', 'Kozel dunkel', 'Budweiser Budvar', 'Staropramen', 'Bernard', 'Krušovice', 'Starobrno', 'Radegast', 'Svijany', 'Matuška', 'Únětické pivo', 'Klosterbier (Strahov)', 'Hausbrauerei-Bier', 'Fruchtbier', 'Weizenbier', 'Alkoholfrei'];
const BEER_RANKS = [[0, 'Wasserträger'], [1, 'Durstiger Knecht'], [3, 'Bierprüfer'], [6, 'Zapfmeister'], [10, 'Humpenmeister'], [15, 'Bierkönig von Böhmen']];
const beerRank = n => BEER_RANKS.reduce((r, [min, name]) => n >= min ? name : r, BEER_RANKS[0][1]);
const allBeers = () => Object.entries(S.entries).filter(([k, e]) => k[0] === 'b' && e.v).map(([k, e]) => ({ k, ...e.v })).sort((a, b) => b.t - a.t);
const uniqBeers = (list, m) => new Set(list.filter(b => b.m === m).map(b => b.w.toLowerCase())).size;
function openBeer(placeId) {
  let rate = 0;
  $('#sheet-body').innerHTML = `<h2>Bier loggen${placeId ? ' · ' + esc(BY_ID[placeId].name) : ''}</h2>
    <label class="gl">Welches Bier?<input id="bw" list="beer-list" maxlength="40" placeholder="z. B. Pilsner Urquell"></label>
    <datalist id="beer-list">${BEERS.map(b => `<option value="${esc(b)}">`).join('')}</datalist>
    <div class="chips-wrap" id="b-rate"><span>Bewertung:</span>${[1, 2, 3, 4, 5].map(n => `<button class="chip" data-r="${n}">${'★'.repeat(n)}</button>`).join('')}</div>
    <div class="row"><button class="btn gold" id="b-save">Eintragen</button><button class="btn" id="sheet-close">Abbrechen</button></div>`;
  $('#sheet-body').onclick = e => {
    const r = e.target.dataset.r; if (r) { rate = +r; return document.querySelectorAll('#b-rate .chip').forEach(c => c.classList.toggle('on', +c.dataset.r === rate)); }
    if (e.target.id === 'sheet-close') return closeSheet();
    if (e.target.id === 'b-save') {
      const w = $('#bw').value.trim(); if (!w) return toast('Biername eintragen');
      const before = beerRank(uniqBeers(allBeers(), S.by));
      sync.setEntry('b:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), { m: S.by, w, r: rate, p: placeId || '', t: Date.now() });
      const n = uniqBeers(allBeers(), S.by), after = beerRank(n);
      closeSheet(); refresh(); toast(after !== before ? `Neuer Titel: ${after}` : `Prost! ${n} verschiedene Biere`);
    }
  };
  $('#sheet').hidden = false;
}

// ---------- Offline-Karte ----------
const lon2x = (lon, z) => Math.floor((lon + 180) / 360 * 2 ** z);
const lat2y = (lat, z) => { const r = lat * Math.PI / 180; return Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * 2 ** z); };
function tileList() {
  const set = new Set(), add = (b, zs) => zs.forEach(z => { for (let x = lon2x(b[1], z); x <= lon2x(b[3], z); x++) for (let y = lat2y(b[2], z); y <= lat2y(b[0], z); y++) set.add(`${z}/${x}/${y}`); });
  add([50.058, 14.385, 50.100, 14.455], [12, 13, 14, 15, 16]); // Prager Zentrum bis Straßenebene
  add([49.99, 14.30, 50.14, 14.60], [11, 12]);                  // Prag gesamt, grob
  PLACES.filter(isTrip).forEach(p => add([p.lat - .02, p.lng - .03, p.lat + .02, p.lng + .03], [12, 13, 14])); // Ausflugsziele: Übersicht
  return [...set];
}
async function saveOfflineMap(progress) {
  const cache = await caches.open('prag-quest-tiles'), queue = tileList(), total = queue.length; let done = 0, fail = 0;
  const worker = async () => {
    while (queue.length) {
      const url = `https://tile.openstreetmap.org/${queue.shift()}.png`;
      try { if (!(await cache.match(url))) { const r = await fetch(url, { mode: 'cors' }); r.ok ? await cache.put(url, r) : fail++; } } catch (_) { fail++; }
      progress(++done, total, fail); await new Promise(r => setTimeout(r, 90));
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (fail < total / 2) { S.offline = Date.now(); store(); }
  return fail;
}
function openOffline() {
  const n = tileList().length, when = S.offline ? new Date(S.offline).toLocaleDateString('de-DE') : '';
  $('#sheet-body').innerHTML = `<h2>Offline-Karte</h2>
    <p>Speichert Prag (bis auf Straßenebene) und die Umgebung der Ausflugsziele (Übersicht) auf dem Handy, damit die Karte auch ohne Netz im Zug oder Ausland geht. Etwa ${n} Kacheln, ca. ${Math.round(n * 18 / 1000)} MB. Am besten im WLAN.</p>
    ${when ? `<p class="hint">Zuletzt gespeichert am ${when}.</p>` : ''}
    <div class="bar-out"><div class="bar-in" id="off-bar" style="width:0"></div></div><p class="hint" id="off-msg"></p>
    <div class="row"><button class="btn gold" id="off-go">${when ? 'Aktualisieren' : 'Jetzt speichern'}</button><button class="btn" id="off-del">Löschen</button><button class="btn" id="sheet-close">Schließen</button></div>
    <p class="hint">Kartendaten von OpenStreetMap. Es werden bewusst nur wenige Kacheln geladen, bitte nicht wiederholt starten.</p>`;
  $('#sheet-body').onclick = async e => {
    if (e.target.id === 'sheet-close') return closeSheet();
    if (!window.caches) return toast('Offline-Speicher nicht verfügbar');
    if (e.target.id === 'off-del') { await caches.delete('prag-quest-tiles'); S.offline = 0; store(); return openOffline(); }
    if (e.target.id === 'off-go') {
      e.target.disabled = true;
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
      const fail = await saveOfflineMap((d, t, f) => { $('#off-bar').style.width = (d / t * 100) + '%'; $('#off-msg').textContent = `${d} / ${t} Kacheln${f ? ` (${f} fehlgeschlagen)` : ''}`; });
      toast(fail ? 'Teilweise gespeichert' : 'Offline-Karte gespeichert'); openOffline();
    }
  };
  $('#sheet').hidden = false;
}
$('#btn-offline').onclick = openOffline;

// ---------- Fotos (nur auf diesem Gerät, IndexedDB) ----------
const idbDo = (mode, fn) => new Promise((res, rej) => {
  const r = indexedDB.open('prag-quest', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('p');
  r.onerror = () => rej(r.error);
  r.onsuccess = () => { const t = r.result.transaction('p', mode), q = fn(t.objectStore('p')); t.oncomplete = () => res(q && q.result); t.onerror = () => rej(t.error); };
});
const photoGet = id => idbDo('readonly', s => s.get(id)).catch(() => null);
const photoPut = (id, v) => idbDo('readwrite', s => s.put(v, id));
const photoDel = id => idbDo('readwrite', s => s.delete(id));
const photoAll = () => idbDo('readonly', s => s.getAll()).catch(() => []);
const shrink = file => new Promise((res, rej) => {
  const url = URL.createObjectURL(file), im = new Image();
  im.onload = () => {
    const k = Math.min(1, 800 / Math.max(im.width, im.height)), c = document.createElement('canvas');
    c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .72));
  };
  im.onerror = rej; im.src = url;
});
let PHOTO_FOR = null;
function takePhoto(id) { PHOTO_FOR = id; $('#photo-in').click(); }
$('#photo-in').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f || !PHOTO_FOR) return;
  try { await photoPut(PHOTO_FOR, { id: PHOTO_FOR, img: await shrink(f), ts: Date.now() }); toast('Foto gespeichert'); }
  catch (_) { toast('Foto konnte nicht gespeichert werden'); }
  renderList(); renderQuest();
};
async function viewPhoto(id) {
  const v = await photoGet(id); if (!v) return;
  $('#sheet-body').innerHTML = `<h2>${esc(BY_ID[id].name)}</h2><img src="${v.img}" alt="" style="width:100%;border:2px solid var(--gold)">
    <p style="margin-top:8px">Dieses Foto liegt nur auf deinem Gerät.</p>
    <div class="row"><button class="btn" id="ph-del">Foto löschen</button><button class="btn" id="sheet-close">Schließen</button></div>`;
  $('#sheet-body').onclick = async e => {
    if (e.target.id === 'sheet-close') return closeSheet();
    if (e.target.id === 'ph-del') { await photoDel(id); closeSheet(); renderList(); renderQuest(); }
  };
  $('#sheet').hidden = false;
}
function hydratePhotos(root) {
  root.querySelectorAll('[data-photo]').forEach(el => photoGet(el.dataset.photo).then(v => { if (v && el.isConnected) el.innerHTML = `<img src="${v.img}" alt="Dein Foto"><span>Dein Foto</span>`; }));
}

// ---------- Wetter (Open-Meteo) ----------
let WX = {};
try { const c = JSON.parse(localStorage.getItem('prag-quest.wx')); if (c && Date.now() - c.ts < 3 * 3600e3) WX = c.data; } catch (_) {}
async function loadWeather() {
  try {
    const j = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.0875&longitude=14.4213&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FPrague&forecast_days=16')).json();
    WX = {}; j.daily.time.forEach((d, i) => { WX[d] = { c: j.daily.weathercode[i], hi: j.daily.temperature_2m_max[i], lo: j.daily.temperature_2m_min[i], r: j.daily.precipitation_probability_max[i] }; });
    try { localStorage.setItem('prag-quest.wx', JSON.stringify({ ts: Date.now(), data: WX })); } catch (_) {}
    renderPlan();
  } catch (_) {}
}
const WMO = c => c === 0 ? 'Klar' : c <= 2 ? 'Heiter' : c === 3 ? 'Bewölkt' : c <= 48 ? 'Nebel' : c <= 57 ? 'Niesel' : c <= 67 ? 'Regen' : c <= 77 ? 'Schnee' : c <= 82 ? 'Schauer' : c <= 86 ? 'Schneeschauer' : 'Gewitter';
function wxHTML(i) {
  if (!S.start) return '';
  const d = new Date(S.start + 'T12:00'); d.setDate(d.getDate() + i);
  const w = WX[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`];
  if (!w) return '';
  return `<div class="wx">${WMO(w.c)} · ${Math.round(w.hi)}° / ${Math.round(w.lo)}° · Regen ${w.r ?? 0} %${(w.r ?? 0) >= 60 ? ' – Tipp: Klöster, Museen und Bars einplanen' : ''}</div>`;
}

// ---------- Plan ----------
const transitUrl = (a, b) => `https://www.google.com/maps/dir/?api=1&origin=${a}&destination=${b}&travelmode=transit`;
function legHTML(a, b) {
  const d = km(a, b), pt = x => `${x.lat},${x.lng}`;
  if (a.trip || b.trip) return `<div class="leg">${d.toFixed(0)} km Luftlinie · <a href="${transitUrl(pt(a), pt(b))}" target="_blank" rel="noopener">Verbindung prüfen</a></div>`;
  if (d < 1.2) return `<div class="leg">~${Math.max(1, Math.round(d * 1.3 / 4.5 * 60))} min zu Fuß</div>`;
  return `<div class="leg">ÖPNV ca. ${Math.round(d * 1.4 / 20 * 60 + 8)} min · <a href="${transitUrl(pt(a), pt(b))}" target="_blank" rel="noopener">Verbindung</a></div>`;
}
function renderPlan() {
  const sel = $('#days-count');
  sel.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${n === S.days ? 'selected' : ''}>${n}</option>`).join('');
  $('#start-date').value = S.start;
  const focus = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.t;
  if (focus) return; // Uhrzeit-Eingabe nicht durch Sync-Updates überschreiben
  $('#plan').innerHTML = S.plan.map((ids, i) => {
    let dist = 0;
    const rows = ids.map((id, j) => {
      const p = BY_ID[id];
      let leg = '';
      if (j > 0) { dist += km(BY_ID[ids[j - 1]], p); leg = legHTML(BY_ID[ids[j - 1]], p); }
      return leg + `<article class="card ${p.cat}" data-id="${id}" data-day="${i}"><h3>${CAT[p.cat].icon}<span>${esc(p.name)}</span></h3>
        <div class="meta"><span>${esc(p.area)}</span>${p.trip ? `<span class="tag trip">Ausflug ${esc(p.trip)}</span>` : ''}</div>
        <label class="timerow">Uhrzeit <input type="time" data-t="${id}" value="${esc(timeOf(id))}"></label>
        ${planWarn(id, i)}
        ${p.how ? `<div class="how"><b>Anreise</b> ${esc(p.how)} <a href="${transitUrl('Praha hlavní nádraží', p.lat + ',' + p.lng)}" target="_blank" rel="noopener">ÖPNV-Route</a></div>` : ''}
        ${noteHTML(id)}
        <div class="actions"><button class="btn small" data-m="-1">↑</button><button class="btn small" data-m="1">↓</button><button class="btn small" data-a="note">Notiz</button><button class="btn small" data-m="x">✕ Entfernen</button></div></article>`;
    }).join('');
    const route = ids.length ? `<a class="btn small" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/${ids.map(id => BY_ID[id].lat + ',' + BY_ID[id].lng).join('/')}/data=!4m2!4m1!3e2">Route</a>` : '';
    const sort = ids.length > 1 ? `<button class="btn small" data-sort="${i}">Nach Uhrzeit</button>` : '';
    return `<section class="day"><h2><span>${dayLabel(i)}</span><small>${ids.length} Stopps${dist ? ` · ${dist.toFixed(1)} km` : ''} ${sort} ${route}</small></h2>${wxHTML(i)}${rows || `<div class="empty">${rabbit('grey', 'point', 'rb-empty')}<br>Noch leer. Füge Orte über „Entdecken“ hinzu.</div>`}</section>`;
  }).join('') + (S.start ? '' : '<p class="hint">Tipp: Mit einem Startdatum zeigt jeder Tag die Wettervorhersage (bis 16 Tage im Voraus).</p>');
}
$('#plan').onclick = e => {
  const s = e.target.closest('[data-sort]');
  if (s) {
    const day = S.plan[+s.dataset.sort], key = id => timeOf(id) || '99:99';
    day.sort((a, b) => key(a).localeCompare(key(b))); return refresh();
  }
  const n = e.target.closest('[data-a="note"]'); if (n) return openNote(n.closest('[data-id]').dataset.id);
  const b = e.target.closest('[data-m]'); if (!b) return;
  const c = b.closest('[data-id]'), day = S.plan[+c.dataset.day], i = day.indexOf(c.dataset.id), m = b.dataset.m;
  if (m === 'x') day.splice(i, 1);
  else { const j = i + +m; if (j < 0 || j >= day.length) return; [day[i], day[j]] = [day[j], day[i]]; }
  refresh();
};
$('#plan').onchange = e => {
  const t = e.target.dataset.t; if (!t) return;
  sync.setEntry('t:' + t, e.target.value || null); e.target.blur(); renderPlan();
};
$('#days-count').onchange = e => {
  const n = +e.target.value;
  if (n < S.plan.length && S.plan.slice(n).some(d => d.length) && !confirm('Die letzten Tage enthalten Orte. Die Orte fallen aus dem Plan. Fortfahren?')) return renderPlan();
  S.days = n; fitPlan(); refresh();
  if (S.start) loadWeather();
};
$('#start-date').onchange = e => { S.start = e.target.value; refresh(); if (S.start) loadWeather(); };

// Auto-Plan: Ausflüge bekommen eigene Tage, Stadtziele werden per Nearest-Neighbor zu Tagesrouten gruppiert, Bars ans Ende.
function autoPlan(ids, emptyMsg) {
  const favs = ids.map(id => BY_ID[id]).filter(Boolean);
  if (!favs.length) return toast(emptyMsg);
  if (S.plan.some(d => d.length) && !confirm('Bestehenden Plan ersetzen?')) return;
  const trips = favs.filter(isTrip), city = favs.filter(p => !isTrip(p));
  const days = Array.from({ length: S.days }, () => []);
  const tripDays = [];
  trips.forEach(p => { const g = tripDays.find(d => km(d[0], p) < 25); g ? g.push(p) : tripDays.push([p]); });
  const cityDays = Math.max(1, S.days - tripDays.length);
  const perDay = Math.ceil(city.length / cityDays) || 1;
  const rest = [...city.filter(p => p.cat !== 'bar'), ...city.filter(p => p.cat === 'bar')];
  let cur = { lat: PRAGUE[0], lng: PRAGUE[1] };
  const chunks = [];
  while (rest.length) {
    const chunk = [];
    while (chunk.length < perDay && rest.length) {
      const nonBar = rest.filter(p => p.cat !== 'bar');
      const pool = nonBar.length && chunk.length < perDay - 1 ? nonBar : rest;
      pool.sort((a, b) => km(cur, a) - km(cur, b));
      const p = pool[0]; rest.splice(rest.indexOf(p), 1); chunk.push(p); cur = p;
    }
    chunks.push(chunk);
  }
  const all = [...chunks, ...tripDays];
  all.slice(0, S.days).forEach((g, i) => days[i] = g.map(p => p.id));
  const dropped = all.slice(S.days).flat().length;
  S.plan = days; refresh();
  toast(dropped ? `${dropped} Orte passen nicht – mehr Tage wählen` : 'Plan erstellt');
}
$('#btn-auto').onclick = () => autoPlan(S.fav, 'Erst ein paar Favoriten markieren');
$('#btn-auto-vote').onclick = () => autoPlan(PLACES.filter(p => score(p.id) > 0).sort((a, b) => score(b.id) - score(a.id)).map(p => p.id), 'Noch keine Orte mit mehr ▲ als ▼');

$('#btn-hours').onclick = async () => {
  const ids = [...new Set(S.plan.flat())].filter(id => isPlace(BY_ID[id]) && !hoursOf(id));
  if (!ids.length) return toast('Für alle Orte im Plan gibt es schon Zeiten');
  let ok = 0, miss = 0; const btn = $('#btn-hours'); btn.disabled = true;
  for (const [n, id] of ids.entries()) {
    btn.textContent = `Lade ${n + 1}/${ids.length}…`;
    try { const f = await findOsmHours(BY_ID[id]); const pr = f && parseOH(f.oh); if (pr) { sync.setEntry('h:' + id, { ...pr, s: 'osm' }); ok++; } else miss++; } catch (_) { miss++; }
    await new Promise(r => setTimeout(r, 1500));
  }
  btn.disabled = false; btn.textContent = 'Öffnungszeiten laden';
  refresh(); toast(`${ok} Zeiten geladen${miss ? `, ${miss} nicht gefunden` : ''}`);
};
$('#btn-share').onclick = async () => {
  const txt = S.plan.map((ids, i) => `${dayLabel(i)}:\n` + (ids.map(id => ` • ${timeOf(id) ? timeOf(id) + ' ' : ''}${BY_ID[id].name}`).join('\n') || ' –')).join('\n\n');
  try { navigator.share ? await navigator.share({ title: 'Prag-Plan', text: txt }) : (await navigator.clipboard.writeText(txt), toast('Plan kopiert')); } catch (_) {}
};

// ---------- Würfel ----------
const DICE_CATS = [['all', 'Alles'], ['food', 'Restaurant'], ['bar', 'Bar'], ['vegan', 'Vegan'], ['kcd', 'KCD-Ort'], ['sight', 'Sehenswert'], ['trip', 'Ausflug']];
let diceCat = 'all';
const dicePool = c => PLACES.filter(p => isPlace(p) && (c === 'all' || (c === 'food' && p.cat === 'food') || (c === 'bar' && p.cat === 'bar') ||
  (c === 'vegan' && p.diet === 'vegan') || (c === 'kcd' && p.cat === 'kcd') || (c === 'sight' && p.cat === 'sight') || (c === 'trip' && isTrip(p))));
function rollDice() {
  const pool = dicePool(diceCat), p = pool[Math.floor(Math.random() * pool.length)];
  $('#sheet-body').innerHTML = `<h2>Das Schicksal wählt…</h2>
    <div class="chips dice-chips">${DICE_CATS.map(([k, l]) => `<button class="chip ${diceCat === k ? 'on' : ''}" data-c="${k}">${l}</button>`).join('')}</div>
    <div class="dice roll">${rabbit('mustard', 'trumpet', 'rb-dice')}</div>` + card(p) +
    `<div class="row"><button class="btn gold" id="again">Nochmal würfeln</button><button class="btn" id="sheet-close">Schließen</button></div>`;
  hydrate($('#sheet-body'));
  $('#sheet-body').onclick = e => {
    const c = e.target.dataset.c; if (c) { diceCat = c; return rollDice(); }
    if (e.target.id === 'again') return rollDice();
    if (e.target.id === 'sheet-close') return closeSheet();
    const im = e.target.closest('.myphoto img'); if (im) return viewPhoto(p.id);
    const b = e.target.closest('[data-a]'); if (!b) return;
    ACT[b.dataset.a](p.id);
    if (['fav', 'up', 'down'].includes(b.dataset.a)) { $('#sheet-body article').outerHTML = card(p); hydrate($('#sheet-body')); }
  };
}
$('#btn-dice').onclick = () => { rollDice(); $('#sheet').hidden = false; };

// ---------- Sprache (Tschechisch) ----------
const CZ = window.CZECH;
let czSec = 'all', czQ = '';
const FLAG = { V: ['vegetarisch', 'veg'], VG: ['vegan', 'vegan'], F: ['Fleisch', 'meat'], '?': ['nachfragen', 'ask'] };
function renderLang() {
  $('#cz-intro').innerHTML = `<details><summary>Aussprache in 30 Sekunden</summary><div class="cz-ab">${window.CZ_INTRO.map(([a, b]) => `<div><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div></details>`;
  $('#cz-chips').innerHTML = [['all', 'Alle'], ...CZ.map(s => [s.id, s.title])].map(([k, l]) => `<button class="chip ${czSec === k ? 'on' : ''}" data-s="${k}">${esc(l)}</button>`).join('');
  const q = czQ.toLowerCase().trim();
  const html = CZ.map((s, si) => {
    if (czSec !== 'all' && s.id !== czSec) return '';
    const items = s.items.map((it, ii) => [it, ii]).filter(([it]) => !q || it.slice(0, 3).join(' ').toLowerCase().includes(q));
    if (!items.length) return '';
    return `<h3 class="sec">${esc(s.title)}</h3>${s.note ? `<p class="hint">${esc(s.note)}</p>` : ''}` + items.map(([it, ii]) => `<div class="cz" data-k="${si}:${ii}">
      <div class="cz-de">${esc(it[0])}${it[3] ? ` <span class="fl ${FLAG[it[3]][1]}">${FLAG[it[3]][0]}</span>` : ''}</div>
      <div class="cz-cs">${esc(it[1])}</div><div class="cz-pr">${esc(it[2])}</div>
      <div class="actions"><button class="btn small" data-z="show">Zeigen</button><button class="btn small" data-z="say">Hören</button></div></div>`).join('');
  }).join('');
  $('#cz-list').innerHTML = html || `<div class="empty">${rabbit('orange', 'stop', 'rb-empty')}<br>Nichts gefunden.</div>`;
}
$('#cz-chips').onclick = e => { const s = e.target.dataset.s; if (!s) return; czSec = s; renderLang(); };
$('#cz-q').oninput = e => { czQ = e.target.value; renderLang(); };
function sayCz(t) {
  if (!window.speechSynthesis) return toast('Vorlesen nicht verfügbar');
  const u = new SpeechSynthesisUtterance(t); u.lang = 'cs-CZ';
  const v = speechSynthesis.getVoices().find(x => x.lang.replace('_', '-').toLowerCase().startsWith('cs'));
  if (v) u.voice = v; else toast('Keine tschechische Stimme installiert, klingt evtl. deutsch');
  speechSynthesis.cancel(); speechSynthesis.speak(u);
}
$('#cz-list').onclick = e => {
  const b = e.target.closest('[data-z]'); if (!b) return;
  const [si, ii] = b.closest('[data-k]').dataset.k.split(':').map(Number), it = CZ[si].items[ii];
  if (b.dataset.z === 'say') return sayCz(it[1]);
  $('#sheet-body').innerHTML = `<div class="cz-big"><div class="cz-big-cs">${esc(it[1])}</div><div class="cz-big-de">${esc(it[0])}</div></div>
    <div class="row"><button class="btn gold" id="cz-say">Hören</button><button class="btn" id="sheet-close">Schließen</button></div>`;
  $('#sheet-body').onclick = ev => { if (ev.target.id === 'sheet-close') closeSheet(); if (ev.target.id === 'cz-say') sayCz(it[1]); };
  $('#sheet').hidden = false;
};

// ---------- Quest ----------
const RANK_RB = [['mustard', 'stand'], ['grey', 'peek'], ['orange', 'point'], ['orange', 'stop'], ['red', 'attack'], ['mustard', 'burst']];
const rankIdx = n => RANKS.reduce((r, [min], i) => n >= min ? i : r, 0);
function rankOf(n) { let r = RANKS[0][1]; RANKS.forEach(([min, name]) => { if (n >= min) r = name; }); return r; }
const renderRank = () => { $('#rank').innerHTML = `Rang<b>${rankOf(S.visited.length)}</b>${S.visited.length}/${PLACES.length} Orte`; };
let questTab = 'orte';
function renderQuest() {
  const n = S.visited.length, pct = Math.round(n / PLACES.length * 100);
  const head = `<div class="quest-head">${rabbit(...RANK_RB[rankIdx(n)], 'rb-rank')}<div><h2 class="quest-title">${rankOf(n)}</h2><div class="quest-sub">${n} von ${PLACES.length} Orten besucht</div></div></div>
    <div class="bar-out"><div class="bar-in" style="width:${pct}%"></div></div>
    <div class="chips">${[['orte', 'Orte'], ['hasen', 'Hasen'], ['bier', 'Bier'], ['fotos', 'Fotos']].map(([k, l]) => `<button class="chip ${questTab === k ? 'on' : ''}" data-qt="${k}">${l}</button>`).join('')}</div>`;
  const body = { orte: questOrte, hasen: questHasen, bier: questBier, fotos: questFotos }[questTab]();
  $('#quest').className = 'quest'; $('#quest').innerHTML = head + body.html; if (body.after) body.after();
}
function questOrte() {
  const sets = [['kcd', 'KCD-Schauplätze'], ['sight', 'Sehenswürdigkeiten'], ['bar', 'Bars & Brauereien'], ['food', 'Veggie-Essen']], n = S.visited.length;
  return { html: `<div class="rb-row">${RANKS.map(([min, name], i) => `<div class="rb-slot ${n >= min ? 'got' : ''}">${rabbit(...RANK_RB[i], 'rb-mini')}<span>${name}</span><small>ab ${min}</small></div>`).join('')}</div>` +
    sets.map(([c, l]) => {
      const ps = PLACES.filter(p => p.cat === c), k = ps.filter(p => S.visited.includes(p.id)).length;
      return `<h3><span>${l}</span><span>${k}/${ps.length}</span></h3>` + ps.map(p => `<div class="badge ${S.visited.includes(p.id) ? 'done' : ''}">${CAT[c].icon}<span>${esc(p.name)}</span></div>`).join('');
    }).join('') + `<p class="hint" style="margin-top:16px">Checke dich vor Ort per GPS (≤300 m) ein, um Hasen, Abzeichen und Ränge freizuschalten.</p>` };
}
function questHasen() {
  const got = PLACES.filter(p => S.visited.includes(p.id)).length;
  return { html: `<h3><span>Hasen-Sammlung</span><span>${got}/${PLACES.length}</span></h3><p class="hint">Jeder Ort hat seinen eigenen Hasen. Er wird beim Einchecken freigeschaltet.</p>
    <div class="rbgrid">${PLACES.map(p => { const g = S.visited.includes(p.id); return `<button class="rbc ${g ? 'got' : ''}" data-rb="${p.id}">${rabbit(...rabbitOf(p), 'rb-mini')}<span>${g ? esc(p.name) : '???'}</span></button>`; }).join('')}</div>` };
}
function questBier() {
  const list = allBeers(), mine = list.filter(b => b.m === S.by), n = uniqBeers(list, S.by);
  const board = members().map(m => { const bs = list.filter(b => b.m === m), rs = bs.filter(b => b.r); return { m, u: uniqBeers(list, m), t: bs.length, avg: rs.length ? rs.reduce((s, b) => s + b.r, 0) / rs.length : 0 }; }).sort((a, b) => b.u - a.u || b.t - a.t);
  return { html: `<h3><span>Dein Titel</span><span>${n} verschiedene</span></h3><div class="beer-title">${beerRank(n)}</div>
    <button class="btn gold" data-bnew="1" style="width:100%;margin:8px 0 4px">Bier eintragen</button>
    <h3><span>Rangliste</span></h3>${board.map((r, i) => `<div class="bal"><span>${i + 1}. ${esc(nameOf(r.m))}${r.m === S.by ? ' (ich)' : ''}<br><small style="color:var(--mut)">${beerRank(r.u)}</small></span><span>${r.u} Sorten · ${r.t} Gläser${r.avg ? ' · ' + r.avg.toFixed(1) + ' ★' : ''}</span></div>`).join('')}
    <h3><span>Mein Tagebuch</span><span>${mine.length}</span></h3>` +
    (mine.length ? mine.map(b => `<div class="exp"><div><b>${esc(b.w)}</b><br><small>${b.p && BY_ID[b.p] ? esc(BY_ID[b.p].name) + ' · ' : ''}${new Date(b.t).toLocaleDateString('de-DE')}${b.r ? ' · ' + '★'.repeat(b.r) : ''}</small></div><span></span><button class="btn small" data-bdel="${esc(b.k)}" aria-label="Löschen">✕</button></div>`).join('') : '<div class="empty">Noch kein Bier eingetragen.</div>') };
}
function questFotos() {
  return { html: `<h3><span>Foto-Album</span><span id="album-n"></span></h3><div class="album" id="album"></div>`, after() {
    photoAll().then(all => {
      const el = $('#album'); if (!el) return;
      all.sort((a, b) => b.ts - a.ts); $('#album-n').textContent = all.length;
      el.innerHTML = all.length ? all.map(v => `<button class="alb" data-ph="${v.id}"><img src="${v.img}" alt=""><span>${esc((BY_ID[v.id] || {}).name || '')}</span></button>`).join('') : '<div class="empty">Noch keine Fotos. Tippe bei einem Ort auf „Foto“.</div>';
    });
  } };
}
$('#quest').onclick = e => {
  const t = e.target.closest('[data-qt]'); if (t) { questTab = t.dataset.qt; return renderQuest(); }
  const b = e.target.closest('[data-ph]'); if (b) return viewPhoto(b.dataset.ph);
  const r = e.target.closest('[data-rb]'); if (r && S.visited.includes(r.dataset.rb)) { const p = BY_ID[r.dataset.rb]; $('#sheet-body').innerHTML = `<h2>${esc(p.name)}</h2><div class="dice">${rabbit(...rabbitOf(p), 'rb-dice')}</div><button class="btn" id="sheet-close" style="width:100%">Schließen</button>`; $('#sheet-body').onclick = ev => { if (ev.target.id === 'sheet-close') closeSheet(); }; return $('#sheet').hidden = false; }
  if (e.target.closest('[data-bnew]')) return openBeer();
  const d = e.target.closest('[data-bdel]'); if (d && confirm('Eintrag löschen?')) { sync.setEntry(d.dataset.bdel, null); renderQuest(); }
};

// ---------- Kasse: Umrechner & Ausgaben ----------
let RATE = { r: 24.5, est: true };
try { const c = JSON.parse(localStorage.getItem('prag-quest.rate')); if (c && c.r) RATE = c; } catch (_) {}
async function loadRate() {
  if (RATE.ts && Date.now() - RATE.ts < 12 * 3600e3) return;
  for (const u of ['https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CZK', 'https://api.frankfurter.app/latest?from=EUR&to=CZK']) {
    try { const j = await (await fetch(u)).json(); if (j.rates && j.rates.CZK) { RATE = { r: j.rates.CZK, d: j.date, ts: Date.now() }; try { localStorage.setItem('prag-quest.rate', JSON.stringify(RATE)); } catch (_) {} renderCash(); return; } } catch (_) {}
  }
}
const nf = (n, d = 0) => n.toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
const czk = n => `${nf(n)} Kč`, eur = n => `${nf(n / RATE.r, 2)} €`;
const cashSkip = new Set();
function renderRate() { $('#rate').textContent = `1 € = ${nf(RATE.r, 2)} Kč · ${RATE.est ? 'geschätzter Kurs, offline' : 'Stand ' + RATE.d}`; }
$('#cv-eur').oninput = e => { const v = parseFloat(e.target.value.replace(',', '.')); $('#cv-czk').value = isNaN(v) ? '' : nf(v * RATE.r, 0).replace(/\./g, ''); };
$('#cv-czk').oninput = e => { const v = parseFloat(e.target.value.replace(',', '.')); $('#cv-eur').value = isNaN(v) ? '' : (v / RATE.r).toFixed(2); };
function renderCash() {
  renderRate();
  const ms = members(), payer = $('#x-payer'), keep = payer.value || S.by;
  payer.innerHTML = ms.map(m => `<option value="${m}" ${m === keep ? 'selected' : ''}>${esc(nameOf(m))}${m === S.by ? ' (ich)' : ''}</option>`).join('');
  $('#x-for').innerHTML = '<span>Aufteilen auf:</span>' + ms.map(m => `<button class="chip ${cashSkip.has(m) ? '' : 'on'}" data-m="${m}">${esc(nameOf(m))}</button>`).join('');
  const xs = Object.entries(S.entries).filter(([k, e]) => k[0] === 'x' && e.v).map(([k, e]) => ({ k, ...e.v })).sort((a, b) => b.t - a.t);
  const bal = Object.fromEntries(ms.map(m => [m, 0]));
  xs.forEach(x => { const f = (x.f && x.f.length ? x.f : ms); bal[x.p] = (bal[x.p] || 0) + x.a; f.forEach(m => { bal[m] = (bal[m] || 0) - x.a / f.length; }); });
  const pos = [], neg = [];
  Object.entries(bal).forEach(([m, v]) => { if (v > 0.5) pos.push([m, v]); else if (v < -0.5) neg.push([m, -v]); });
  pos.sort((a, b) => b[1] - a[1]); neg.sort((a, b) => b[1] - a[1]);
  const pays = []; let i = 0, j = 0;
  while (i < neg.length && j < pos.length) { const x = Math.min(neg[i][1], pos[j][1]); pays.push(`${esc(nameOf(neg[i][0]))} zahlt ${esc(nameOf(pos[j][0]))} <b>${czk(x)}</b> <small>(${eur(x)})</small>`); neg[i][1] -= x; pos[j][1] -= x; if (neg[i][1] < 0.5) i++; if (pos[j][1] < 0.5) j++; }
  const total = xs.reduce((s, x) => s + x.a, 0);
  $('#cash-out').innerHTML = xs.length ? `<h3 class="sec">Stand</h3><div class="sumline">Gesamt <b>${czk(total)}</b> <small>(${eur(total)})</small></div>` +
    Object.entries(bal).map(([m, v]) => `<div class="bal"><span>${esc(nameOf(m))}</span><span class="${v >= 0 ? 'pos' : 'neg'}">${v >= 0 ? '+' : '−'}${czk(Math.abs(v))}</span></div>`).join('') +
    `<h3 class="sec">Ausgleich</h3>${pays.length ? pays.map(p => `<div class="pay">${p}</div>`).join('') : '<div class="empty">Alles ausgeglichen.</div>'}
     <h3 class="sec">Ausgaben</h3>` + xs.map(x => `<div class="exp"><div><b>${esc(x.w)}</b><br><small>${esc(nameOf(x.p))} bezahlt · ${x.f && x.f.length ? x.f.map(m => esc(nameOf(m))).join(', ') : 'alle'}</small></div>
       <div class="amt">${czk(x.a)}<br><small>${x.c === '€' ? nf(x.o, 2) + ' €' : eur(x.a)}</small></div><button class="btn small" data-del="${esc(x.k)}" aria-label="Löschen">✕</button></div>`).join('')
    : `<div class="empty">${rabbit('mustard', 'trumpet', 'rb-empty')}<br>Noch keine Ausgaben. Trag die erste ein.</div>`;
}
$('#x-for').onclick = e => { const m = e.target.dataset.m; if (!m) return; cashSkip.has(m) ? cashSkip.delete(m) : cashSkip.add(m); renderCash(); };
$('#cash-out').onclick = e => { const k = e.target.dataset.del; if (k && confirm('Ausgabe löschen?')) { sync.setEntry(k, null); renderCash(); } };
$('#x-add').onclick = () => {
  const amt = parseFloat($('#x-amt').value.replace(',', '.'));
  if (!(amt > 0)) return toast('Betrag eingeben');
  const cur = $('#x-cur').value, a = cur === '€' ? amt * RATE.r : amt, ms = members(), f = ms.filter(m => !cashSkip.has(m));
  if (!f.length) return toast('Mindestens eine Person auswählen');
  sync.setEntry('x:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), { w: $('#x-what').value.trim().slice(0, 40) || 'Ausgabe', a: Math.round(a * 100) / 100, c: cur, o: amt, p: $('#x-payer').value || S.by, f: f.length === ms.length ? null : f, t: Date.now() });
  $('#x-what').value = ''; $('#x-amt').value = ''; renderCash(); toast('Eingetragen');
};

// ---------- Gruppen-Sync ----------
// Plan/Favoriten/Tage/Start: ein Snapshot (Topic pq-<raum>), letzter Stand gewinnt.
// Kleine Einträge (Stimmen, Notizen, Uhrzeiten, Ausgaben, Namen): je Schlüssel eine Nachricht (Topic pq-<raum>-e), pro Schlüssel gewinnt der neueste.
// Standort: flüchtig, nur solange jemand ihn freiwillig teilt. ntfy.sh behält Nachrichten nur ~12 h; beim Öffnen stellt jedes Gerät fehlende Stände wieder ein.
const LIVE = {};
const liveLayer = HAS_MAP ? L.layerGroup().addTo(map) : null;
function drawLive() {
  if (!HAS_MAP) return;
  liveLayer.clearLayers();
  const now = Date.now();
  Object.values(LIVE).forEach(e => {
    if (!e.v || e.by === S.by || now - e.ts > 10 * 60000) return;
    L.circleMarker([e.v.la, e.v.lo], { radius: 9, color: '#f1e6c2', weight: 2, fillColor: '#8f2d1f', fillOpacity: 1 })
      .bindTooltip(`${esc(e.v.n || 'Gruppe')} · vor ${Math.max(1, Math.round((now - e.ts) / 60000))} min`, { permanent: true, direction: 'top', className: 'live-tip' }).addTo(liveLayer);
  });
}
setInterval(drawLive, 30000);

const sync = (() => {
  const BASE = window.NTFY_BASE || 'https://ntfy.sh';
  const snap = () => JSON.stringify({ days: S.days, start: S.start, plan: S.plan, fav: S.fav });
  let last = snap(), es = null, ees = null, timer = null, status = 'off';
  const topic = () => 'pq-' + S.room, etopic = () => 'pq-' + S.room + '-e';
  const newer = d => d.rev > S.rev || (d.rev === S.rev && d.by > S.by);
  const isNew = (e, cur) => !cur || e.ts > cur.ts || (e.ts === cur.ts && e.by > cur.by);
  const setStatus = s => { status = s; const b = $('#btn-group'); if (b) { b.dataset.s = s; b.title = s; } };
  const renderEntries = () => { renderList(); renderPlan(); renderCash(); renderQuest(); };

  function apply(d) {
    if (!d || typeof d.rev !== 'number' || !Array.isArray(d.plan) || !Array.isArray(d.fav) || !newer(d)) return;
    Object.assign(S, { days: d.days, start: d.start || '', plan: d.plan, fav: d.fav, rev: d.rev });
    fitPlan(); last = snap(); store();
    renderList(); drawMarkers(); renderRank(); renderPlan(); renderQuest();
  }
  function applyEntry(e) {
    if (!e || typeof e.k !== 'string' || e.k.length > 40 || typeof e.ts !== 'number' || typeof e.by !== 'string') return false;
    if (e.k[0] === 'l') { LIVE[e.k] = e; drawLive(); return false; }
    if (!isNew(e, S.entries[e.k])) return false;
    S.entries[e.k] = { v: e.v, ts: e.ts, by: e.by }; return true;
  }
  async function post(t, body) {
    if (body.length > 3800) return;
    try { await fetch(`${BASE}/${t}`, { method: 'POST', body }); setStatus('on'); } catch (_) { setStatus('offline'); }
  }
  const push = () => S.room && post(topic(), JSON.stringify({ rev: S.rev, by: S.by, days: S.days, start: S.start, plan: S.plan, fav: S.fav }));
  const pushEntry = e => S.room && post(etopic(), JSON.stringify(e));
  const parseLines = txt => txt.split('\n').filter(Boolean).map(l => { try { const m = JSON.parse(l); return m.event === 'message' ? JSON.parse(m.message) : null; } catch (_) { return null; } }).filter(Boolean);

  async function pull() {
    if (!S.room) return;
    try {
      let best = null;
      parseLines(await (await fetch(`${BASE}/${topic()}/json?poll=1&since=all`)).text()).forEach(d => { if (!best || d.rev > best.rev) best = d; });
      setStatus('on');
      if (best && newer(best)) apply(best);
      else if (!best || S.rev > best.rev) { if (!S.rev) S.rev = Date.now(); store(); push(); }
      // Einträge: neueste übernehmen, lokal neuere oder fehlende wieder einstellen
      const remote = {};
      parseLines(await (await fetch(`${BASE}/${etopic()}/json?poll=1&since=all`)).text()).forEach(e => { if (e && typeof e.k === 'string' && (!remote[e.k] || isNew(e, remote[e.k]))) remote[e.k] = e; });
      let changed = false;
      Object.values(remote).forEach(e => { if (applyEntry(e)) changed = true; });
      Object.entries(S.entries).forEach(([k, c]) => { const r = remote[k]; if (!r || isNew({ ts: c.ts, by: c.by }, r)) pushEntry({ k, v: c.v, ts: c.ts, by: c.by }); });
      if (changed) { store(); renderEntries(); }
    } catch (_) { setStatus('offline'); }
  }
  function listen() {
    [es, ees].forEach(x => x && x.close());
    if (!S.room || !window.EventSource) return;
    es = new EventSource(`${BASE}/${topic()}/sse`);
    es.onopen = () => setStatus('on'); es.onerror = () => setStatus('offline');
    es.onmessage = ev => { try { apply(JSON.parse(JSON.parse(ev.data).message)); } catch (_) {} };
    ees = new EventSource(`${BASE}/${etopic()}/sse`);
    ees.onmessage = ev => { try { if (applyEntry(JSON.parse(JSON.parse(ev.data).message))) { store(); renderEntries(); } } catch (_) {} };
  }
  function start() { if (!S.room) return setStatus('off'); setStatus('connecting'); pull().then(listen); }
  const api = {
    get status() { return status; },
    link: () => `${location.origin}${location.pathname}#room=${S.room}`,
    onLocalChange() {
      if (!S.room || snap() === last) return;
      last = snap(); S.rev = Date.now(); store();
      clearTimeout(timer); timer = setTimeout(push, 300);
    },
    setEntry(k, v) {
      const e = { k, v, ts: Date.now(), by: S.by };
      if (k[0] === 'l') LIVE[k] = e; else { S.entries[k] = { v, ts: e.ts, by: e.by }; store(); }
      pushEntry(e);
    },
    create() {
      const b = crypto.getRandomValues(new Uint8Array(12));
      S.room = Array.from(b, x => x.toString(36).padStart(2, '0')).join('').slice(0, 20);
      S.rev = Date.now(); store(); push(); Object.entries(S.entries).forEach(([k, c]) => pushEntry({ k, v: c.v, ts: c.ts, by: c.by })); listen(); setStatus('on');
    },
    join(code) {
      const m = String(code).match(/room=([a-z0-9]{8,40})/i) || String(code).trim().match(/^([a-z0-9]{8,40})$/i);
      if (!m) return false;
      S.room = m[1].toLowerCase(); S.rev = 0; store(); start(); return true;
    },
    leave() { setLive(false); [es, ees].forEach(x => x && x.close()); S.room = ''; store(); setStatus('off'); },
    start, pull
  };
  window.addEventListener('online', () => api.pull());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) api.pull(); });
  return api;
})();

// Standort teilen: nur freiwillig, nur in der Gruppe, nicht gespeichert.
let liveOn = false, liveWatch = null, liveLast = 0;
function setLive(on) {
  if (on === liveOn) return;
  liveOn = on;
  if (on) {
    if (!navigator.geolocation) { liveOn = false; return toast('Kein GPS verfügbar'); }
    liveWatch = navigator.geolocation.watchPosition(pos => {
      if (Date.now() - liveLast < 30000) return; liveLast = Date.now();
      sync.setEntry('l:' + S.by, { la: +pos.coords.latitude.toFixed(5), lo: +pos.coords.longitude.toFixed(5), n: nameOf(S.by) });
    }, () => { toast('Standort nicht verfügbar'); setLive(false); }, { enableHighAccuracy: true, maximumAge: 20000 });
  } else {
    if (liveWatch != null) navigator.geolocation.clearWatch(liveWatch); liveWatch = null; liveLast = 0;
    if (S.room) sync.setEntry('l:' + S.by, null);
  }
}

function openGroup() {
  const inRoom = !!S.room;
  const label = { on: 'Verbunden', connecting: 'Verbinde…', offline: 'Offline – Änderungen werden nachgereicht', off: '' }[sync.status] || '';
  const nameBox = `<label class="gl">Dein Name in der Gruppe<input id="g-name" maxlength="20" value="${esc(nameOf(S.by))}"></label>`;
  $('#sheet-body').innerHTML = inRoom
    ? `<h2>Gruppe</h2><p>${esc(label)}. Plan, Favoriten, Stimmen, Notizen, Uhrzeiten und Kasse sind für alle mit diesem Link gleich. Check-ins und Fotos bleiben persönlich.</p>
       ${nameBox}
       <p>Mitglieder: ${members().map(m => esc(nameOf(m))).join(', ')}</p>
       <input id="g-link" readonly value="${esc(sync.link())}" style="width:100%;margin-bottom:10px">
       <div class="row"><button class="btn gold" id="g-copy">Link kopieren</button><button class="btn" id="g-share">Teilen</button></div>
       <div class="row"><button class="btn ${liveOn ? 'on' : ''}" id="g-live">${liveOn ? 'Standort-Teilen beenden' : 'Meinen Standort teilen'}</button></div>
       <p class="hint">Standort-Teilen ist freiwillig und nur für Gruppenmitglieder sichtbar, solange es an ist (max. 10 Minuten alt). Es wird nicht gespeichert.</p>
       <div class="row"><button class="btn" id="g-leave">Gruppe verlassen</button><button class="btn" id="sheet-close">Schließen</button></div>`
    : `<h2>Gruppe</h2><p>Plant gemeinsam: Alle mit dem Link sehen und bearbeiten denselben Plan. Jeder, der den Link kennt, kann mitmachen.</p>
       ${nameBox}
       <div class="row"><button class="btn gold" id="g-new">Neue Gruppe starten</button></div>
       <p>Oder einer Gruppe beitreten:</p>
       <input id="g-code" placeholder="Link oder Code einfügen" style="width:100%;margin-bottom:10px">
       <div class="row"><button class="btn" id="g-join">Beitreten</button><button class="btn" id="sheet-close">Schließen</button></div>`;
  $('#sheet-body').onchange = e => { if (e.target.id === 'g-name') { const n = e.target.value.trim().slice(0, 20); if (n) { sync.setEntry('m:' + S.by, { n }); renderCash(); renderList(); } } };
  $('#sheet-body').onclick = async e => {
    const id = e.target.id;
    if (id === 'sheet-close') return closeSheet();
    if (id === 'g-new') { sync.create(); openGroup(); toast('Gruppe gestartet – Link teilen'); }
    if (id === 'g-join') { if (sync.join($('#g-code').value)) { closeSheet(); toast('Gruppe beigetreten'); } else toast('Link oder Code ungültig'); }
    if (id === 'g-leave') { sync.leave(); openGroup(); }
    if (id === 'g-live') { setLive(!liveOn); openGroup(); }
    if (id === 'g-copy') { try { await navigator.clipboard.writeText(sync.link()); toast('Link kopiert'); } catch (_) { $('#g-link').select(); toast('Link markiert – manuell kopieren'); } }
    if (id === 'g-share') { try { await navigator.share({ title: 'Prag Quest Gruppe', url: sync.link() }); } catch (_) { try { await navigator.clipboard.writeText(sync.link()); toast('Link kopiert'); } catch (_) {} } }
  };
  $('#sheet').hidden = false;
}
$('#btn-group').onclick = openGroup;

// ---------- Init ----------
if (!S.entries['m:' + S.by]) { const N = ['Heinrich', 'Hans', 'Theresa', 'Radzig', 'Johanka', 'Hanush', 'Divish', 'Kunhuta', 'Bernard', 'Sasha']; S.entries['m:' + S.by] = { v: { n: N[Math.floor(Math.random() * N.length)] }, ts: 1, by: S.by }; store(); }
const hashRoom = (location.hash.match(/room=([a-z0-9]{8,40})/i) || [])[1];
if (hashRoom && hashRoom.toLowerCase() !== S.room) { sync.join(hashRoom); toast('Gruppe beigetreten'); } else sync.start();
$('#logo').innerHTML = rabbit('orange', 'guard', 'rb-logo');
renderChips(); renderRank(); drawMarkers(); renderList(); renderPlan(); renderCash();
loadRate(); if (S.start) loadWeather();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
