'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X, Loader2 } from 'lucide-react'

interface CreateBackupDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

export function CreateBackupDialog({ open, onClose, onCreated }: CreateBackupDialogProps) {
  const { t } = useLanguage()
  const [backupType, setBackupType] = useState<'manual' | 'on_demand'>('manual')
  const [notes, setNotes] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleCreate = async () => {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_type: backupType, notes: notes || undefined }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return }
      onCreated()
      onClose()
    } catch {
      setError('Network error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{t('backups.createBackup')}</h3>
          <Button variant="ghost" size="icon-sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium">{t('backups.type')}</label>
            <div className="flex gap-2">
              <Badge
                variant={backupType === 'manual' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => setBackupType('manual')}
              >
                {t('backups.typeManual')}
              </Badge>
              <Badge
                variant={backupType === 'on_demand' ? 'default' : 'outline'}
                className="cursor-pointer px-3 py-1.5"
                onClick={() => setBackupType('on_demand')}
              >
                {t('backups.typeOnDemand')}
              </Badge>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">{t('backups.notes')}</label>
            <textarea
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('backups.notesPlaceholder')}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={creating}>
              {t('backups.cancel')}
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {t('backups.startBackup')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
