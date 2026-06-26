'use client'

import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { EODHistoryTable } from '@/components/eod/eod-history-table'
import { FileSpreadsheet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function EODHistoryPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)

  if (!isManagement) {
    return (
      <div className="space-y-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('sidebar.eod')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('error.unauthorizedDesc')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('eod.history')}
        </h1>
        <Link href="/dashboard/eod">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <EODHistoryTable
        onSelect={(id) => window.location.href = `/dashboard/eod/${id}`}
      />
    </div>
  )
}
