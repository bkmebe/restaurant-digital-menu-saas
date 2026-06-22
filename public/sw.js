// Service Worker for offline support
const CACHE_NAME = 'rdm-cache-v1'
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
]

// Install: cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    })
  )
})

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event

  // API requests: network first with timeout
  if (request.url.includes('/api/')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request)
      })
    )
    return
  }

  // Static assets: cache first
  if (request.url.match(/\.(png|jpg|jpeg|gif|svg|css|js|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const cloned = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
        return response
      }))
    )
    return
  }

  // Menu pages: stale while revalidate
  if (request.url.includes('/menu/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()))
          return response
        })
        return cached || fetchPromise
      })
    )
    return
  }

  // Default: network first
  event.respondWith(
    fetch(request).catch(() => caches.match('/offline'))
  )
})

// Background sync for offline orders
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function syncOfflineOrders() {
  // Implement: read from IndexedDB, submit each order, remove on success
  const db = await openDB()
  const orders = await db.getAll('offline-orders')
  
  for (const order of orders) {
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(order.data),
      })
      if (response.ok) {
        await db.delete('offline-orders', order.id)
      }
    } catch (err) {
      console.error('Failed to sync order:', order.id)
    }
  }
}

async function openDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('rdm-offline', 1)
    request.onupgradeneeded = () => {
      request.result.createObjectStore('offline-orders', { keyPath: 'id' })
      request.result.createObjectStore('offline-requests', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
  })
}
