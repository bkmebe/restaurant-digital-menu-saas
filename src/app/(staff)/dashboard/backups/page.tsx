'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { BackupList } from '@/components/backups/backup-list'
import { CreateBackupDialog } from '@/components/backups/create-backup-dialog'
import { HardDrive } from 'lucide-react'

export default function BackupsPage() {
  const { t } = useLanguage()
  const [createOpen, setCreateOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <HardDrive className="h-6 w-6" />
          {t('sidebar.backups')}
        </h1>
      </div>

      <BackupList key={refreshKey} onCreate={() => setCreateOpen(true)} />
      <CreateBackupDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  )
}
