const DB_NAME = 'rdm-offline'
const DB_VERSION = 1

export interface OfflineMutation {
  id: string
  endpoint: string
  method: string
  body: unknown
  createdAt: number
  retries: number
}

export interface OfflineOrder {
  id: string
  data: unknown
  createdAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('offline-mutations')) {
        db.createObjectStore('offline-mutations', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('offline-orders')) {
        db.createObjectStore('offline-orders', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('offline-requests')) {
        db.createObjectStore('offline-requests', { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const offlineDB = {
  async addMutation(mutation: OfflineMutation): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-mutations', 'readwrite')
      tx.objectStore('offline-mutations').add(mutation)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async getMutations(): Promise<OfflineMutation[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-mutations', 'readonly')
      const request = tx.objectStore('offline-mutations').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async deleteMutation(id: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-mutations', 'readwrite')
      tx.objectStore('offline-mutations').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async clearMutations(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-mutations', 'readwrite')
      tx.objectStore('offline-mutations').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async addOrder(order: OfflineOrder): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-orders', 'readwrite')
      tx.objectStore('offline-orders').add(order)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async getOrders(): Promise<OfflineOrder[]> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-orders', 'readonly')
      const request = tx.objectStore('offline-orders').getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  },

  async deleteOrder(id: string): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-orders', 'readwrite')
      tx.objectStore('offline-orders').delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },

  async clearOrders(): Promise<void> {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('offline-orders', 'readwrite')
      tx.objectStore('offline-orders').clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  },
}
