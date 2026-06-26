'use client'

import { useOnlineStatus, useOfflineQueue } from '@/hooks/use-offline'
import { useLanguage } from '@/hooks/use-language'
import { WifiOff, RefreshCw } from 'lucide-react'

export function OfflineBanner() {
  const { isOnline } = useOnlineStatus()
  const { count, sync, isSyncing } = useOfflineQueue()
  const { t } = useLanguage()

  if (isOnline && count === 0) return null

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-2 text-sm shadow-lg transition-all ${
        isOnline ? 'bg-blue-600 text-white' : 'bg-amber-600 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {count} {t('offline.pending')}
          </span>
          {!isSyncing && (
            <button
              onClick={sync}
              className="ml-2 underline hover:no-underline"
            >
              {t('offline.sync')}
            </button>
          )}
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4" />
          <span>{t('offline.offline')}</span>
          {count > 0 && (
            <span className="ml-1">
              &middot; {count} {t('offline.pending')}
            </span>
          )}
        </>
      )}
    </div>
  )
}
