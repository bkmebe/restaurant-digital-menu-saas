'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { useApproveEOD } from '@/hooks/use-eod'
import { EODReport } from '@/components/eod/eod-report'
import { ApprovalPanel } from '@/components/eod/approval-panel'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function EODDetailPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const params = useParams()
  const id = params?.id as string
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [report, setReport] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  const isManagement = profile && ['admin', 'manager', 'owner', 'system_admin'].includes(profile.role)
  const isAdmin = profile && ['admin'].includes(profile.role)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/eod/${id}`)
      .then(res => res.json())
      .then(body => {
        setData(body.data || null)
      })
      .catch(() => {})
    fetch(`/api/eod/report?id=${id}`)
      .then(res => res.json())
      .then(body => {
        if (body.data) setData(body.data)
        if (body.report) setReport(body.report as Record<string, unknown>)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FileSpreadsheet className="h-6 w-6" />
          {t('eod.reportTitle')}
        </h1>
        <Link href="/dashboard/eod/history">
          <Button variant="outline" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
        </Link>
      </div>

      <EODReport data={data} report={report} />

      {data && isAdmin && (
        <ApprovalPanel
          eodClosingId={data.id as string}
          status={data.status as string}
          onApproved={() => {
            fetch(`/api/eod/${id}`)
              .then(res => res.json())
              .then(body => setData(body.data || null))
          }}
        />
      )}
    </div>
  )
}
