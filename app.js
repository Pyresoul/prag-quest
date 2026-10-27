(() => {
'use strict';

const PLACES = window.PLACES;
const rabbit = window.rabbit;
const BY_ID = Object.fromEntries(PLACES.map(p => [p.id, p]));
const CAT = { kcd: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4l-9.5 9.5M8 11l5 5M9.5 14.5L5 19"/></svg></span>', label: 'KCD', color: '#a07a22' }, bar: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h10v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM15 10h2a2 2 0 0 1 0 5h-2M7 5c0-1 1-1 1-2M11 5c0-1 1-1 1-2"/></svg></span>', label: 'Bar', color: '#8f2d1f' }, food: { icon: '<span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14zM5 19l8-8"/></svg></span>', label: 'Essen', color: '#4c6b3a' } };
const FILTERS = [['all', 'Alle'], ['kcd', 'KCD'], ['trip', 'Ausflüge'], ['city', 'Nur Prag'], ['bar', 'Bars'], ['veg', 'Veggie'], ['vegan', 'Vegan']];
const RANKS = [[0, 'Bauernjunge'], [4, 'Knecht'], [9, 'Knappe'], [15, 'Söldner'], [22, 'Ritter'], [30, 'Held von Böhmen']];
const KEY = 'prag-quest.v1';
const PRAGUE = [50.0875, 14.4213];

// ---------- State ----------
const def = () => ({ days: 4, start: '', plan: [[], [], [], []], fav: [], visited: [], filter: 'all', room: '', rev: 0, by: '' });
let S = def();
try { S = Object.assign(def(), JSON.parse(localStorage.getItem(KEY)) || {}); } catch (_) {}
const store = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
const save = () => { store(); sync.onLocalChange(); };
function fitPlan() { while (S.plan.length < S.days) S.plan.push([]); S.plan.length = S.days; }
fitPlan();

// ---------- Helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isTrip = p => !!p.trip;
const matches = (p, f) => f === 'all' || (f === 'kcd' && p.cat === 'kcd') || (f === 'bar' && p.cat === 'bar') ||
  (f === 'veg' && p.cat === 'food') || (f === 'vegan' && p.diet === 'vegan') || (f === 'city' && !isTrip(p)) || (f === 'trip' && isTrip(p));
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
const POSE_FOR = p => p.trip ? 'point' : p.cat === 'kcd' ? (p.epoch ? 'stand' : 'guard') : p.cat === 'bar' ? 'trumpet' : 'lens';
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

// ---------- Cards ----------
function card(p) {
  const v = S.visited.includes(p.id), f = S.fav.includes(p.id);
  return `<article class="card ${p.cat}" data-id="${p.id}">
    ${picHTML(p)}
    <h3>${CAT[p.cat].icon}<span>${esc(p.name)}</span></h3>
    <div class="meta"><span>${esc(p.area)}</span>
      ${p.diet === 'vegan' ? '<span class="tag vegan">vegan</span>' : p.diet === 'veg' ? '<span class="tag veg">vegetarisch</span>' : ''}
      ${p.trip ? `<span class="tag trip">Ausflug ${esc(p.trip)}</span>` : ''}${p.cat === 'kcd' && !p.epoch ? '<span class="tag game">Im Spiel</span>' : ''}${v ? '<span class="tag">besucht</span>' : ''}</div>
    ${p.kcd ? `<div class="kcdnote ${p.epoch ? 'epoch' : ''}">${esc(p.kcd)}</div>` : ''}
    <p>${esc(p.desc)}</p>
    <div class="actions">
      <button class="btn small ${f ? 'on' : ''}" data-a="fav">${f ? '★ Favorit' : '☆ Favorit'}</button>
      <button class="btn small ${planned(p.id) ? 'on' : ''}" data-a="plan">${planned(p.id) ? '✓ Im Plan' : '+ Plan'}</button>
      <button class="btn small ${v ? 'on' : ''}" data-a="visit">${v ? 'Zurücksetzen' : 'Einchecken'}</button>
    </div>${linksHTML(p)}</article>`;
}
function bindCards(root) {
  root.onclick = e => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const id = b.closest('[data-id]').dataset.id;
    ({ fav: () => toggleFav(id), plan: () => pickDay(id), visit: () => checkIn(id) })[b.dataset.a]();
  };
}
function renderList() {
  const items = PLACES.filter(p => matches(p, S.filter));
  const el = $('#list');
  el.innerHTML = items.map(card).join('') || `<div class="empty">${rabbit('orange', 'stop', 'rb-empty')}<br>Keine Treffer.</div>`;
  bindCards(el); hydrate(el);
}
function openPlace(id) {
  const p = BY_ID[id];
  $('#sheet-body').innerHTML = card(p) + '<button class="btn" id="sheet-close" style="width:100%">Schließen</button>';
  $('#sheet-body').onclick = e => { if (e.target.id === 'sheet-close') return closeSheet(); bindClick(e); };
  $('#sheet').hidden = false; hydrate($('#sheet-body'));
  function bindClick(e) {
    const b = e.target.closest('[data-a]'); if (!b) return;
    ({ fav: () => toggleFav(id), plan: () => pickDay(id), visit: () => checkIn(id) })[b.dataset.a]();
    if (b.dataset.a === 'fav') openPlace(id);
  }
}
const closeSheet = () => { $('#sheet').hidden = true; };
$('#sheet').onclick = e => { if (e.target.id === 'sheet') closeSheet(); };
function refresh() { save(); renderList(); drawMarkers(); renderRank(); renderPlan(); renderQuest(); }

function toggleFav(id) { S.fav = S.fav.includes(id) ? S.fav.filter(x => x !== id) : [...S.fav, id]; refresh(); }
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
    d < 0.3 ? done('Eingecheckt!') : manual();
  }, manual, { enableHighAccuracy: true, timeout: 8000 });
}

// ---------- Plan ----------
function renderPlan() {
  const sel = $('#days-count');
  sel.innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `<option ${n === S.days ? 'selected' : ''}>${n}</option>`).join('');
  $('#start-date').value = S.start;
  $('#plan').innerHTML = S.plan.map((ids, i) => {
    let dist = 0;
    const rows = ids.map((id, j) => {
      const p = BY_ID[id];
      let leg = '';
      if (j > 0) { const d = km(BY_ID[ids[j - 1]], p); dist += d; leg = `<div class="leg">↓ ${d.toFixed(1)} km Luftlinie · ${d < 8 ? `~${Math.max(1, Math.round(d * 1.3 / 4.5 * 60))} min zu Fuß` : 'mit Zug/Auto'}</div>`; }
      return leg + `<article class="card ${p.cat}" data-id="${id}" data-day="${i}"><h3>${CAT[p.cat].icon}<span>${esc(p.name)}</span></h3>
        <div class="meta"><span>${esc(p.area)}</span>${p.trip ? `<span class="tag trip">Ausflug ${esc(p.trip)}</span>` : ''}</div>
        <div class="actions"><button class="btn small" data-m="-1">↑</button><button class="btn small" data-m="1">↓</button><button class="btn small" data-m="x">✕ Entfernen</button></div></article>`;
    }).join('');
    const route = ids.length ? `<a class="btn small" style="text-decoration:none" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/${ids.map(id => BY_ID[id].lat + ',' + BY_ID[id].lng).join('/')}/data=!4m2!4m1!3e2">Route</a>` : '';
    return `<section class="day"><h2><span>${dayLabel(i)}</span><small>${ids.length} Stopps${dist ? ` · ${dist.toFixed(1)} km` : ''} ${route}</small></h2>${rows || `<div class="empty">${rabbit('grey', 'point', 'rb-empty')}<br>Noch leer. Füge Orte über „Entdecken“ hinzu.</div>`}</section>`;
  }).join('');
}
$('#plan').onclick = e => {
  const b = e.target.closest('[data-m]'); if (!b) return;
  const c = b.closest('[data-id]'), day = S.plan[+c.dataset.day], i = day.indexOf(c.dataset.id), m = b.dataset.m;
  if (m === 'x') day.splice(i, 1);
  else { const j = i + +m; if (j < 0 || j >= day.length) return; [day[i], day[j]] = [day[j], day[i]]; }
  refresh();
};
$('#days-count').onchange = e => {
  const n = +e.target.value;
  if (n < S.plan.length && S.plan.slice(n).some(d => d.length) && !confirm('Die letzten Tage enthalten Orte. Die Orte fallen aus dem Plan. Fortfahren?')) return renderPlan();
  S.days = n; fitPlan(); refresh();
};
$('#start-date').onchange = e => { S.start = e.target.value; refresh(); };

// Auto-Plan: Ausflüge bekommen eigene Tage, Stadtziele werden per Nearest-Neighbor zu Tagesrouten gruppiert, Bars ans Ende.
$('#btn-auto').onclick = () => {
  const favs = S.fav.map(id => BY_ID[id]).filter(Boolean);
  if (!favs.length) return toast('Erst ein paar Favoriten markieren');
  if (S.plan.some(d => d.length) && !confirm('Bestehenden Plan durch Auto-Plan ersetzen?')) return;
  const trips = favs.filter(isTrip), city = favs.filter(p => !isTrip(p));
  const days = Array.from({ length: S.days }, () => []);
  // Ausflüge nach Nähe zueinander gruppieren: je ein Tag, nahe Ziele (<25 km) zusammen.
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
};
$('#btn-share').onclick = async () => {
  const txt = S.plan.map((ids, i) => `${dayLabel(i)}:\n` + (ids.map(id => ` • ${BY_ID[id].name}`).join('\n') || ' –')).join('\n\n');
  try { navigator.share ? await navigator.share({ title: 'Prag-Plan', text: txt }) : (await navigator.clipboard.writeText(txt), toast('Plan kopiert')); } catch (_) {}
};

// ---------- Würfel ----------
$('#btn-dice').onclick = () => {
  const pool = PLACES.filter(p => p.cat !== 'kcd' && matches(p, S.filter === 'bar' || S.filter === 'veg' || S.filter === 'vegan' ? S.filter : 'all'));
  const roll = () => {
    const p = pool[Math.floor(Math.random() * pool.length)];
    $('#sheet-body').innerHTML = `<h2>Das Schicksal wählt…</h2><div class="dice roll">${rabbit('mustard', 'trumpet', 'rb-dice')}</div>` + card(p) +
      `<div class="row"><button class="btn gold" id="again">Nochmal würfeln</button><button class="btn" id="sheet-close">Schließen</button></div>`;
    hydrate($('#sheet-body'));
    $('#sheet-body').onclick = e => {
      if (e.target.id === 'again') return roll();
      if (e.target.id === 'sheet-close') return closeSheet();
      const b = e.target.closest('[data-a]'); if (!b) return;
      ({ fav: () => toggleFav(p.id), plan: () => pickDay(p.id), visit: () => checkIn(p.id) })[b.dataset.a]();
    };
  };
  roll(); $('#sheet').hidden = false;
};
$('#btn-phrases').onclick = () => {
  $('#sheet-body').innerHTML = '<h2>Tschechisch für Veggies &amp; Bier</h2><table>' +
    window.PHRASES.map(([de, cz]) => `<tr><td>${esc(de)}</td><td>${esc(cz)}</td></tr>`).join('') +
    '</table><button class="btn" id="sheet-close" style="width:100%;margin-top:12px">Schließen</button>';
  $('#sheet-body').onclick = e => { if (e.target.id === 'sheet-close') closeSheet(); };
  $('#sheet').hidden = false;
};

// ---------- Quest ----------
const RANK_RB = [['mustard', 'stand'], ['grey', 'lens'], ['orange', 'point'], ['orange', 'stop'], ['red', 'guard'], ['mustard', 'burst']];
const rankIdx = n => RANKS.reduce((r, [min], i) => n >= min ? i : r, 0);
function rankOf(n) { let r = RANKS[0][1]; RANKS.forEach(([min, name]) => { if (n >= min) r = name; }); return r; }
const renderRank = () => { $('#rank').innerHTML = `Rang<b>${rankOf(S.visited.length)}</b>${S.visited.length}/${PLACES.length} Orte`; };
function renderQuest() {
  const sets = [['kcd', 'KCD-Schauplätze'], ['bar', 'Bars & Brauereien'], ['food', 'Veggie-Essen']];
  const pct = Math.round(S.visited.length / PLACES.length * 100);
  $('#quest').className = 'quest'; $('#quest').innerHTML = `<div class="quest-head">${rabbit(...RANK_RB[rankIdx(S.visited.length)], 'rb-rank')}<div><h2 class="quest-title">${rankOf(S.visited.length)}</h2><div class="quest-sub">${S.visited.length} von ${PLACES.length} Orten besucht</div></div></div>
    <div class="bar-out"><div class="bar-in" style="width:${pct}%"></div></div>
    <div class="rb-row">${RANKS.map(([min, name], i) => `<div class="rb-slot ${S.visited.length >= min ? 'got' : ''}">${rabbit(...RANK_RB[i], 'rb-mini')}<span>${name}</span><small>ab ${min}</small></div>`).join('')}</div>` +
    sets.map(([c, l]) => {
      const ps = PLACES.filter(p => p.cat === c), n = ps.filter(p => S.visited.includes(p.id)).length;
      return `<h3><span>${l}</span><span>${n}/${ps.length}</span></h3>` +
        ps.map(p => `<div class="badge ${S.visited.includes(p.id) ? 'done' : ''}">${CAT[c].icon}<span>${esc(p.name)}</span></div>`).join('');
    }).join('') +
    `<p style="color:var(--mut);font-size:14px;margin-top:16px;font-style:italic">Checke dich vor Ort per GPS (≤300 m) ein, um Abzeichen und Ränge freizuschalten.</p>`;
}


// ---------- Gruppen-Sync ----------
// Favoriten, Plan, Tage und Startdatum werden pro Gruppe über ntfy.sh geteilt (Raum-Code = geheimer Topic-Name).
// Check-ins bleiben persönlich. Konflikte: der zuletzt gespeicherte Stand gewinnt.
const sync = (() => {
  const BASE = window.NTFY_BASE || 'https://ntfy.sh';
  if (!S.by) S.by = Math.random().toString(36).slice(2, 10);
  const snap = () => JSON.stringify({ days: S.days, start: S.start, plan: S.plan, fav: S.fav });
  let last = snap(), es = null, timer = null, status = 'off';
  const topic = () => 'pq-' + S.room;
  const newer = d => d.rev > S.rev || (d.rev === S.rev && d.by > S.by);
  const setStatus = s => { status = s; const b = $('#btn-group'); if (b) { b.dataset.s = s; b.title = s; } };

  function apply(d) {
    if (!d || typeof d.rev !== 'number' || !Array.isArray(d.plan) || !Array.isArray(d.fav) || !newer(d)) return;
    Object.assign(S, { days: d.days, start: d.start || '', plan: d.plan, fav: d.fav, rev: d.rev, by: S.by });
    S.rev = d.rev; fitPlan(); last = snap(); store();
    renderList(); drawMarkers(); renderRank(); renderPlan(); renderQuest();
  }
  async function push() {
    if (!S.room) return;
    const body = JSON.stringify({ rev: S.rev, by: S.by, days: S.days, start: S.start, plan: S.plan, fav: S.fav });
    try { await fetch(`${BASE}/${topic()}`, { method: 'POST', body }); setStatus('on'); } catch (_) { setStatus('offline'); }
  }
  async function pull() {
    if (!S.room) return;
    try {
      const txt = await (await fetch(`${BASE}/${topic()}/json?poll=1&since=all`)).text();
      let best = null;
      txt.split('\n').filter(Boolean).forEach(l => { try { const m = JSON.parse(l); if (m.event === 'message') { const d = JSON.parse(m.message); if (!best || d.rev > best.rev) best = d; } } catch (_) {} });
      setStatus('on');
      if (best && newer(best)) apply(best);
      else if (!best || S.rev > best.rev) { if (!S.rev) S.rev = Date.now(); store(); push(); } // Raum leer oder abgelaufen: lokalen Stand wieder einstellen
    } catch (_) { setStatus('offline'); }
  }
  function listen() {
    if (es) es.close();
    if (!S.room || !window.EventSource) return;
    es = new EventSource(`${BASE}/${topic()}/sse`);
    es.onopen = () => setStatus('on');
    es.onerror = () => setStatus('offline');
    es.onmessage = e => { try { apply(JSON.parse(JSON.parse(e.data).message)); } catch (_) {} };
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
    create() {
      const b = crypto.getRandomValues(new Uint8Array(12));
      S.room = Array.from(b, x => x.toString(36).padStart(2, '0')).join('').slice(0, 20);
      S.rev = Date.now(); store(); push(); listen(); setStatus('on');
    },
    join(code) {
      const m = String(code).match(/room=([a-z0-9]{8,40})/i) || String(code).trim().match(/^([a-z0-9]{8,40})$/i);
      if (!m) return false;
      S.room = m[1].toLowerCase(); S.rev = 0; store(); start(); return true;
    },
    leave() { if (es) es.close(); S.room = ''; store(); setStatus('off'); },
    start, pull
  };
  window.addEventListener('online', () => api.pull());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) api.pull(); });
  return api;
})();

function openGroup() {
  const inRoom = !!S.room;
  const label = { on: 'Verbunden', connecting: 'Verbinde…', offline: 'Offline – Änderungen werden nachgereicht', off: '' }[sync.status] || '';
  $('#sheet-body').innerHTML = inRoom
    ? `<h2>Gruppe</h2><p>${esc(label)}. Favoriten und Plan sind für alle mit diesem Link gleich. Check-ins bleiben persönlich.</p>
       <input id="g-link" readonly value="${esc(sync.link())}" style="width:100%;margin-bottom:10px">
       <div class="row"><button class="btn gold" id="g-copy">Link kopieren</button><button class="btn" id="g-share">Teilen</button></div>
       <div class="row"><button class="btn" id="g-leave">Gruppe verlassen</button><button class="btn" id="sheet-close">Schließen</button></div>`
    : `<h2>Gruppe</h2><p>Plant gemeinsam: Alle mit dem Link sehen und bearbeiten denselben Plan und dieselben Favoriten. Jeder, der den Link kennt, kann mitmachen.</p>
       <div class="row"><button class="btn gold" id="g-new">Neue Gruppe starten</button></div>
       <p>Oder einer Gruppe beitreten:</p>
       <input id="g-code" placeholder="Link oder Code einfügen" style="width:100%;margin-bottom:10px">
       <div class="row"><button class="btn" id="g-join">Beitreten</button><button class="btn" id="sheet-close">Schließen</button></div>`;
  $('#sheet-body').onclick = async e => {
    const id = e.target.id;
    if (id === 'sheet-close') return closeSheet();
    if (id === 'g-new') { sync.create(); openGroup(); toast('Gruppe gestartet – Link teilen'); }
    if (id === 'g-join') { if (sync.join($('#g-code').value)) { closeSheet(); toast('Gruppe beigetreten'); } else toast('Link oder Code ungültig'); }
    if (id === 'g-leave') { sync.leave(); openGroup(); }
    if (id === 'g-copy') { try { await navigator.clipboard.writeText(sync.link()); toast('Link kopiert'); } catch (_) { $('#g-link').select(); toast('Link markiert – manuell kopieren'); } }
    if (id === 'g-share') { try { await navigator.share({ title: 'Prag Quest Gruppe', url: sync.link() }); } catch (_) { try { await navigator.clipboard.writeText(sync.link()); toast('Link kopiert'); } catch (_) {} } }
  };
  $('#sheet').hidden = false;
}
$('#btn-group').onclick = openGroup;

// ---------- Init ----------
const hashRoom = (location.hash.match(/room=([a-z0-9]{8,40})/i) || [])[1];
if (hashRoom && hashRoom.toLowerCase() !== S.room) { sync.join(hashRoom); toast('Gruppe beigetreten'); } else sync.start();
$('#logo').innerHTML = rabbit('orange', 'guard', 'rb-logo');
renderChips(); renderRank(); drawMarkers(); renderList(); renderPlan();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
