'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useApproveEOD } from '@/hooks/use-eod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AlertTriangle, CheckCircle, RotateCcw, XCircle, ThumbsUp, ThumbsDown } from 'lucide-react'

interface ApprovalPanelProps {
  eodClosingId?: string
  status?: string
  onApproved?: () => void
}

export function ApprovalPanel({ eodClosingId, status, onApproved }: ApprovalPanelProps) {
  const { t } = useLanguage()
  const { approve, reopen, loading, error } = useApproveEOD()
  const [notes, setNotes] = useState('')
  const [action, setAction] = useState<'approve' | 'reject' | 'reopen' | null>(null)

  if (!eodClosingId || !status) {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('eod.noData')}</p>
        </CardContent>
      </Card>
    )
  }

  if (status === 'approved') {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm ring-1 ring-emerald-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-emerald-600">
            <CheckCircle className="h-5 w-5" />
            {t('approval.approved')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{t('approval.approvedDesc')}</p>
          <Button
            variant="outline"
            className="gap-2 w-full"
            onClick={async () => {
              setAction('reopen')
              await reopen(eodClosingId, notes || undefined)
              onApproved?.()
              setAction(null)
            }}
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : <RotateCcw className="h-4 w-4" />}
            {t('approval.reopen')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (status !== 'closed') {
    return (
      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">{t('approval.waitingForClose')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm ring-1 ring-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ThumbsUp className="h-5 w-5 text-amber-500" />
          {t('approval.pendingApproval')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{t('approval.pendingDesc')}</p>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">{t('approval.notes')}</label>
          <textarea
            className="w-full rounded-lg border border-input bg-background p-3 text-sm min-h-[80px]"
            placeholder={t('approval.notesPlaceholder')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="default"
            className="flex-1 gap-2"
            disabled={loading}
            onClick={async () => {
              setAction('approve')
              await approve(eodClosingId, 'approved', notes || undefined)
              onApproved?.()
              setAction(null)
            }}
          >
            {loading && action === 'approve' ? <LoadingSpinner size="sm" /> : <ThumbsUp className="h-4 w-4" />}
            {t('approval.approve')}
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            disabled={loading}
            onClick={async () => {
              setAction('reject')
              await approve(eodClosingId, 'rejected', notes || undefined)
              onApproved?.()
              setAction(null)
            }}
          >
            {loading && action === 'reject' ? <LoadingSpinner size="sm" /> : <ThumbsDown className="h-4 w-4" />}
            {t('approval.reject')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
