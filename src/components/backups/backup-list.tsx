'use client'

import { useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useBackups } from '@/hooks/use-backups'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { HardDrive, Trash2, Download, RefreshCw } from 'lucide-react'

const statusColors: Record<string, string> = {
  in_progress: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
  completed: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
  failed: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
}

const typeLabels: Record<string, string> = {
  daily: 'backups.typeDaily',
  manual: 'backups.typeManual',
  on_demand: 'backups.typeOnDemand',
}

export function BackupList({ onCreate }: { onCreate: () => void }) {
  const { t, locale } = useLanguage()
  const { data, total, loading, error, fetchBackups, deleteBackup } = useBackups()

  useEffect(() => {
    fetchBackups()
  }, [fetchBackups])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'am' ? 'am-ET' : 'om-ET', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '—'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('backups.confirmDelete'))) return
    const ok = await deleteBackup(id)
    if (ok) fetchBackups()
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-lg">
          <HardDrive className="h-5 w-5" />
          {t('backups.title')}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchBackups()}>
            <RefreshCw className="mr-1 h-4 w-4" />
            {t('backups.refresh')}
          </Button>
          <Button size="sm" onClick={onCreate}>
            {t('backups.createBackup')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
            <HardDrive className="h-8 w-8" />
            <p>{t('backups.noBackups')}</p>
            <Button variant="link" size="sm" onClick={onCreate}>
              {t('backups.createFirst')}
            </Button>
          </div>
        )}

        {!loading && !error && data.length > 0 && (
          <div className="space-y-2">
            {data.map((backup) => (
              <div
                key={backup.id}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/50 p-3 transition-colors hover:bg-accent/50"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {t(typeLabels[backup.backup_type] || 'backups.typeManual')}
                    </span>
                    <Badge className={statusColors[backup.status] || ''} variant="outline">
                      {t(`backups.status${backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}`)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDate(backup.started_at)}</span>
                    <span>{formatBytes(backup.size_bytes)}</span>
                    {backup.status === 'completed' && backup.completed_at && (
                      <span>{t('backups.completedIn')} {Math.round((new Date(backup.completed_at).getTime() - new Date(backup.started_at).getTime()) / 1000)}s</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {backup.file_url && (
                    <Button variant="ghost" size="icon-sm" asChild>
                      <a href={backup.file_url} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(backup.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="mt-4 text-xs text-muted-foreground">
            {t('backups.showing')} {data.length} {t('backups.of')} {total}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
