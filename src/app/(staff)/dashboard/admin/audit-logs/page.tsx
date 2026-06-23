'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { AuditLog } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { formatDateTime } from '@/lib/utils/format'

export default function AuditLogsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    supabase.from('audit_logs')
      .select('*')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setLogs(data as AuditLog[])
        setLoading(false)
      })
  }, [profile?.restaurant_id])

  const columns: Column[] = [
    { key: 'created_at', header: t('audit.date'), render: (l: Record<string, unknown>) => formatDateTime(l.created_at as string) },
    { key: 'action', header: t('audit.action') },
    { key: 'table_name', header: t('audit.table') },
    { key: 'actor_id', header: t('audit.actor'), render: (l: Record<string, unknown>) => (l.actor_id as string)?.slice(0, 8) || 'System' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('audit.title')}</h1>
      <DataTable columns={columns} data={logs as unknown as Record<string, unknown>[]} loading={loading} />
    </div>
  )
}
