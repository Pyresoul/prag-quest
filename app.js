(() => {
'use strict';

const PLACES = window.PLACES;
const rabbit = window.rabbit;
const BY_ID = Object.fromEntries(PLACES.map(p => [p.id, p]));
const CAT = { kcd: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4l-9.5 9.5M8 11l5 5M9.5 14.5L5 19"/></svg></span>', label: 'KCD', color: '#a07a22' }, bar: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 10h2a2 2 0 0 1 0 5h-2M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2"/></svg></span>', label: 'Bar', color: '#8f2d1f' }, food: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/></svg></span>', label: 'Essen', color: '#4c6b3a' } };
const FILTERS = [['all', 'Alle'], ['kcd', 'KCD'], ['trip', 'Ausflüge'], ['city', 'Nur Prag'], ['bar', 'Bars'], ['veg', 'Veggie'], ['vegan', 'Vegan'], ['top', 'Beliebt']];
const RANKS = [[0, 'Bauernjunge'], [4, 'Knecht'], [9, 'Knappe'], [15, 'Söldner'], [22, 'Ritter'], [30, 'Held von Böhmen']];
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
const matches = (p, f) => f === 'all' || (f === 'kcd' && p.cat === 'kcd') || (f === 'bar' && p.cat === 'bar') ||
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
  const html = FILTERS.map(([k, l]) => `<button class="chip ${S.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('');
  ['#chips-map', '#chips-list'].forEach(sel => {
    const el = $(sel); el.innerHTML = html;
    el.onclick = e => { const f = e.target.dataset.f; if (!f) return; S.filter = f; save(); renderChips(); renderList(); drawMarkers(); };
  });
}

// ---------- Map ----------
// Ohne Leaflet (z. B. erster Start offline) bleibt die App ohne Karte nutzbar.
const HAS_MAP = typeof L !== 'undefined';
const map = HAS_MAP ? L.map('map', { zoomControl: false }).setView(PRAGUE, 12) : { invalidateSize() {} };
if (!HAS_MAP) $('#map').innerHTML = '<div class="empty" style="margin:16px">Karte nicht geladen – bitte einmal online öffnen. „Entdecken“ und „Plan“ funktionieren trotzdem.</div>';
else L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '© OpenStreetMap' }).addTo(map);
const layer = HAS_MAP ? L.layerGroup().addTo(map) : { clearLayers() {} };
let me = null;
function drawMarkers() {
  if (!HAS_MAP) return;
  layer.clearLayers();
  PLACES.filter(p => matches(p, S.filter)).forEach(p => {
    const c = CAT[p.cat], v = S.visited.includes(p.id);
    const icon = L.divIcon({ className: '', iconSize: [28, 32], iconAnchor: [14, 32],
      html: `<div class="pin" style="--c:${c.color};opacity:${v ? .6 : 1}">${v ? '<span class="ic"><svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg></span>' : c.icon}</div>` });
    L.marker([p.lat, p.lng], { icon }).addTo(layer).on('click', () => openPlace(p.id));
  });
}
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
const COLORS = ['mustard', 'orange', 'grey', 'red'];
const RB_FOR = p => [COLORS[[...p.id].reduce((s, ch) => s + ch.charCodeAt(0), 0) % COLORS.length], POSE_FOR(p)];
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
  <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/search?tbm=isch&q=${mapsQ(p)}">Fotos</a></div>`;

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
    </div>
    ${who ? `<div class="who">${esc(who)}</div>` : ''}
    ${noteHTML(p.id)}
    <div class="myphoto" data-photo="${p.id}"></div>
    ${linksHTML(p)}</article>`;
}
const ACT = {
  fav: id => toggleFav(id), plan: id => pickDay(id), visit: id => checkIn(id),
  up: id => vote(id, 'u'), down: id => vote(id, 'd'), note: id => openNote(id), photo: id => takePhoto(id)
};
function bindCards(root) {
  root.onclick = e => {
    const im = e.target.closest('.myphoto img'); if (im) return viewPhoto(im.closest('[data-photo]').dataset.photo);
    const b = e.target.closest('[data-a]'); if (!b) return;
    ACT[b.dataset.a](b.closest('[data-id]').dataset.id);
  };
}
function renderList() {
  let items = PLACES.filter(p => matches(p, S.filter));
  if (S.filter === 'top') items.sort((a, b) => score(b.id) - score(a.id));
  const el = $('#list');
  el.innerHTML = items.map(card).join('') || `<div class="empty">${rabbit('orange', 'stop', 'rb-empty')}<br>${S.filter === 'top' ? 'Noch keine Stimmen. Gebt Orten ein ▲.' : 'Keine Treffer.'}</div>`;
  bindCards(el); hydrate(el);
}
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
  const done = msg => { S.visited.push(id); closeSheet(); refresh(); toast(msg); };
  const manual = () => { if (confirm('Nicht in der Nähe erkannt. Trotzdem als besucht markieren?')) done('Als besucht markiert'); };
  if (!navigator.geolocation) return manual();
  navigator.geolocation.getCurrentPosition(pos => {
    const d = km({ lat: pos.coords.latitude, lng: pos.coords.longitude }, p);
    d < 0.3 ? done('Eingecheckt! Mach ein Foto.') : manual();
  }, manual, { enableHighAccuracy: true, timeout: 8000 });
}

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
$('#btn-share').onclick = async () => {
  const txt = S.plan.map((ids, i) => `${dayLabel(i)}:\n` + (ids.map(id => ` • ${timeOf(id) ? timeOf(id) + ' ' : ''}${BY_ID[id].name}`).join('\n') || ' –')).join('\n\n');
  try { navigator.share ? await navigator.share({ title: 'Prag-Plan', text: txt }) : (await navigator.clipboard.writeText(txt), toast('Plan kopiert')); } catch (_) {}
};

// ---------- Würfel ----------
const DICE_CATS = [['all', 'Alles'], ['food', 'Restaurant'], ['bar', 'Bar'], ['vegan', 'Vegan'], ['kcd', 'KCD-Ort'], ['trip', 'Ausflug']];
let diceCat = 'all';
const dicePool = c => PLACES.filter(p => isPlace(p) && (c === 'all' || (c === 'food' && p.cat === 'food') || (c === 'bar' && p.cat === 'bar') ||
  (c === 'vegan' && p.diet === 'vegan') || (c === 'kcd' && p.cat === 'kcd') || (c === 'trip' && isTrip(p))));
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
$('#btn-phrases').onclick = () => show('lang');

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
function renderQuest() {
  const sets = [['kcd', 'KCD-Schauplätze'], ['bar', 'Bars & Brauereien'], ['food', 'Veggie-Essen']];
  const pct = Math.round(S.visited.length / PLACES.length * 100);
  $('#quest').className = 'quest'; $('#quest').innerHTML = `<div class="quest-head">${rabbit(...RANK_RB[rankIdx(S.visited.length)], 'rb-rank')}<div><h2 class="quest-title">${rankOf(S.visited.length)}</h2><div class="quest-sub">${S.visited.length} von ${PLACES.length} Orten besucht</div></div></div>
    <div class="bar-out"><div class="bar-in" style="width:${pct}%"></div></div>
    <div class="rb-row">${RANKS.map(([min, name], i) => `<div class="rb-slot ${S.visited.length >= min ? 'got' : ''}">${rabbit(...RANK_RB[i], 'rb-mini')}<span>${name}</span><small>ab ${min}</small></div>`).join('')}</div>
    <h3><span>Foto-Album</span><span id="album-n"></span></h3><div class="album" id="album"></div>` +
    sets.map(([c, l]) => {
      const ps = PLACES.filter(p => p.cat === c), n = ps.filter(p => S.visited.includes(p.id)).length;
      return `<h3><span>${l}</span><span>${n}/${ps.length}</span></h3>` +
        ps.map(p => `<div class="badge ${S.visited.includes(p.id) ? 'done' : ''}">${CAT[c].icon}<span>${esc(p.name)}</span></div>`).join('');
    }).join('') +
    `<p style="color:var(--mut);font-size:14px;margin-top:16px;font-style:italic">Checke dich vor Ort per GPS (≤300 m) ein und mach ein Foto, um Abzeichen und Ränge freizuschalten.</p>`;
  photoAll().then(all => {
    const el = $('#album'); if (!el) return;
    all.sort((a, b) => b.ts - a.ts);
    $('#album-n').textContent = all.length;
    el.innerHTML = all.length ? all.map(v => `<button class="alb" data-ph="${v.id}"><img src="${v.img}" alt=""><span>${esc((BY_ID[v.id] || {}).name || '')}</span></button>`).join('') : '<div class="empty">Noch keine Fotos. Tippe bei einem Ort auf „Foto“.</div>';
  });
}
$('#quest').onclick = e => { const b = e.target.closest('[data-ph]'); if (b) viewPhoto(b.dataset.ph); };

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
