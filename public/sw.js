/**
 * Service worker de la PWA de costaleros.
 *
 * Estrategia:
 * - Navegación y peticiones a la API: network-first con respaldo en caché.
 * - Recursos estáticos (JS/CSS/imágenes): cache-first.
 * - Las escrituras (POST/PATCH/DELETE) no pasan por aquí: las encola la app
 *   en IndexedDB y las sincroniza al recuperar la conexión (ver `src/pwa`).
 */

const VERSION = 'v1'
const SHELL_CACHE = `cuadrilla-shell-${VERSION}`
const DATA_CACHE = `cuadrilla-data-${VERSION}`
const KEEP = [SHELL_CACHE, DATA_CACHE]

const SHELL_ASSETS = ['/', '/manifest.webmanifest', '/icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => !KEEP.includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

/** Background Sync: el navegador avisa cuando hay red y hay cola pendiente. */
self.addEventListener('sync', (event) => {
  if (event.tag === 'cuadrilla-sync') {
    event.waitUntil(notificarClientes())
  }
})

async function notificarClientes() {
  const clientes = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  for (const cliente of clientes) {
    cliente.postMessage({ type: 'SYNC_REQUEST' })
  }
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const respuesta = await fetch(request)
    if (respuesta && respuesta.ok) {
      cache.put(request, respuesta.clone())
    }
    return respuesta
  } catch (_error) {
    const guardada = await cache.match(request)
    if (guardada) return guardada
    if (request.mode === 'navigate') {
      const shell = await cache.match('/')
      if (shell) return shell
    }
    return new Response(JSON.stringify({ error: 'Sin conexión y sin copia local' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const guardada = await cache.match(request)
  if (guardada) return guardada
  const respuesta = await fetch(request)
  if (respuesta && respuesta.ok) {
    cache.put(request, respuesta.clone())
  }
  return respuesta
}

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, SHELL_CACHE))
    return
  }

  event.respondWith(cacheFirst(request, SHELL_CACHE))
})
