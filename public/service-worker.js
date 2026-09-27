// Shell se verzuje zvlášť – při výměně ikon nebo index.html zvyš jen jeho
// číslo, ať uživatel nepřijde o stažené dlaždice mapy.
const SHELL_CACHE = 'mapa-shell-v2'
const ASSET_CACHE = 'mapa-assets-v2'
const TILE_CACHE = 'mapa-tiles-v1'
const TILE_LIMIT = 600

const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  const keep = [SHELL_CACHE, ASSET_CACHE, TILE_CACHE]
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

// Dlaždice mapy se v cache drží, ale počet je omezený, ať nezaberou celý disk.
async function trimCache(name, limit) {
  const cache = await caches.open(name)
  const keys = await cache.keys()
  if (keys.length <= limit) return
  await Promise.all(keys.slice(0, keys.length - limit).map((key) => cache.delete(key)))
}

// Soubory bez hashe v názvu (manifest, ikony) se musí umět obnovit – vrátíme
// je z cache hned, ale na pozadí stáhneme novou verzi pro příští spuštění.
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  const network = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)
  return cached || network
}

async function cacheFirst(request, cacheName, limit) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response.ok || response.type === 'opaque') {
    await cache.put(request, response.clone())
    if (limit) trimCache(cacheName, limit)
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Dlaždice OpenStreetMap – offline pak funguje to, co už bylo načtené.
  if (url.hostname.endsWith('tile.openstreetmap.org')) {
    event.respondWith(cacheFirst(request, TILE_CACHE, TILE_LIMIT).catch(() => Response.error()))
    return
  }

  if (url.origin !== self.location.origin) return

  // Navigace: nejdřív síť (kvůli nové verzi), offline padá zpět na uloženou appku.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('./index.html', { ignoreSearch: true }).then((cached) => cached || Response.error()),
      ),
    )
    return
  }

  // Build assety mají v názvu hash, ty se nikdy nemění pod rukama.
  if (url.pathname.includes('/assets/')) {
    event.respondWith(cacheFirst(request, ASSET_CACHE).catch(() => caches.match(request)))
    return
  }

  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE))
})
