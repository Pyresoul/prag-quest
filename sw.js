const CACHE = 'prag-quest-v12', TILES = 'prag-quest-tiles';
const SHELL = ['./', 'index.html', 'styles.css', 'data.js', 'czech.js', 'rabbits.js', 'app.js', 'manifest.webmanifest', 'icon.svg',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE && x !== TILES).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  // Kartenkacheln: erst Cache (Offline-Karte), sonst Netz und als normale (nicht-opake) Antwort merken.
  if (u.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(u.href); if (hit) return hit;
      try { const r = await fetch(u.href, { mode: 'cors' }); if (r.ok) c.put(u.href, r.clone()); return r; } catch (_) { return Response.error(); }
    }));
    return;
  }
  // App-Shell und Schriften: Stale-while-revalidate. Sync (ntfy), Wikipedia und andere APIs immer live.
  if (!(u.origin === location.origin || /^(cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname))) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request);
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
