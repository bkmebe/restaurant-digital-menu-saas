const CACHE_NAME = 'rdm-cache-v3'
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
]

const API_TIMEOUT_MS = 5000

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    })
  )
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== 'GET') {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request))
    return
  }

  if (request.destination === 'document' && url.pathname !== '/') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline'))
    )
    return
  }

  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(cacheFirst(request))
    return
  }

  event.respondWith(
    fetch(request).catch(() => caches.match('/offline'))
  )
})

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-mutations') {
    event.waitUntil(syncMutations())
  }
  if (event.tag === 'sync-orders') {
    event.waitUntil(syncOfflineOrders())
  }
})

async function networkFirstWithTimeout(request) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), API_TIMEOUT_MS)
  )

  try {
    const response = await Promise.race([fetch(request), timeoutPromise])
    if (response.ok) {
      const cloned = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached || caches.match('/offline')
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cloned = response.clone()
      caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned))
    }
    return response
  } catch {
    return caches.match('/offline')
  }
}

async function syncMutations() {
  const db = await openDB()
  const mutations = await db.getAll('offline-mutations')

  for (const mutation of mutations) {
    try {
      const response = await fetch(mutation.endpoint, {
        method: mutation.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mutation.body),
      })
      if (response.ok) {
        await db.delete('offline-mutations', mutation.id)
      }
    } catch (err) {
      console.error('Failed to sync mutation:', mutation.id, err)
    }
  }
}

async function syncOfflineOrders() {
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
      console.error('Failed to sync order:', order.id, err)
    }
  }
}

async function openDB() {
  return new Promise((resolve) => {
    const request = indexedDB.open('rdm-offline', 1)
    request.onupgradeneeded = () => {
      const stores = ['offline-orders', 'offline-mutations', 'offline-requests']
      stores.forEach((name) => {
        if (!request.result.objectStoreNames.contains(name)) {
          request.result.createObjectStore(name, { keyPath: 'id' })
        }
      })
    }
    request.onsuccess = () => resolve(request.result)
  })
}
