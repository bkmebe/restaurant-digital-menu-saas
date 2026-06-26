'use client'

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { offlineDB, type OfflineMutation } from '@/lib/utils/offline-db'
import { toast } from 'sonner'

interface OnlineStatus {
  isOnline: boolean
  wasOffline: boolean
}

interface OfflineQueue {
  count: number
  mutations: OfflineMutation[]
  enqueue: (endpoint: string, method: string, body: unknown) => Promise<void>
  dequeue: (id: string) => Promise<void>
  clear: () => Promise<void>
  sync: () => Promise<void>
  isSyncing: boolean
}

interface OfflineContextValue {
  onlineStatus: OnlineStatus
  queue: OfflineQueue
}

const OfflineContext = createContext<OfflineContextValue | null>(null)

export function OfflineProvider({ children }: { children: ReactNode }) {
  const [isOnline, setIsOnline] = useState(true)
  const [wasOffline, setWasOffline] = useState(false)
  const [mutations, setMutations] = useState<OfflineMutation[]>([])
  const [isSyncing, setIsSyncing] = useState(false)
  const syncInProgress = useRef(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    const handleOnline = () => {
      setIsOnline(true)
      setWasOffline(true)
    }
    const handleOffline = () => {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    offlineDB.getMutations().then(setMutations).catch(() => {})
  }, [])

  const enqueue = useCallback(async (endpoint: string, method: string, body: unknown) => {
    const mutation: OfflineMutation = {
      id: crypto.randomUUID(),
      endpoint,
      method,
      body,
      createdAt: Date.now(),
      retries: 0,
    }
    await offlineDB.addMutation(mutation)
    setMutations(prev => [...prev, mutation])
    toast.info('Action queued for when you\'re back online')
  }, [])

  const dequeue = useCallback(async (id: string) => {
    await offlineDB.deleteMutation(id)
    setMutations(prev => prev.filter(m => m.id !== id))
  }, [])

  const clearQueue = useCallback(async () => {
    await offlineDB.clearMutations()
    setMutations([])
  }, [])

  const sync = useCallback(async () => {
    if (syncInProgress.current) return
    syncInProgress.current = true
    setIsSyncing(true)

    const pending = await offlineDB.getMutations()
    let successCount = 0
    let failCount = 0

    for (const mutation of pending) {
      try {
        const response = await fetch(mutation.endpoint, {
          method: mutation.method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.body),
        })
        if (response.ok) {
          await offlineDB.deleteMutation(mutation.id)
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    const remaining = await offlineDB.getMutations()
    setMutations(remaining)
    setIsSyncing(false)
    syncInProgress.current = false

    if (successCount > 0) {
      toast.success(`Synced ${successCount} queued action${successCount > 1 ? 's' : ''}${failCount > 0 ? ` (${failCount} failed)` : ''}`)
    }
  }, [])

  useEffect(() => {
    if (wasOffline && isOnline && mutations.length > 0) {
      setWasOffline(false)
      sync()
    }
  }, [wasOffline, isOnline, mutations.length, sync])

  return (
    <OfflineContext.Provider
      value={{
        onlineStatus: { isOnline, wasOffline },
        queue: { count: mutations.length, mutations, enqueue, dequeue, clear: clearQueue, sync, isSyncing },
      }}
    >
      {children}
    </OfflineContext.Provider>
  )
}

export function useOnlineStatus(): OnlineStatus {
  const ctx = useContext(OfflineContext)
  if (!ctx) return { isOnline: true, wasOffline: false }
  return ctx.onlineStatus
}

export function useOfflineQueue(): OfflineQueue {
  const ctx = useContext(OfflineContext)
  if (!ctx) {
    return {
      count: 0,
      mutations: [],
      enqueue: async () => {},
      dequeue: async () => {},
      clear: async () => {},
      sync: async () => {},
      isSyncing: false,
    }
  }
  return ctx.queue
}
