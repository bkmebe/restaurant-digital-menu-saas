'use client'

import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/hooks/use-language'

interface FaydaStatusBadgeProps {
  status: 'pending' | 'verified' | 'failed' | 'expired'
}

export function FaydaStatusBadge({ status }: FaydaStatusBadgeProps) {
  const { t } = useLanguage()

  const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    verified: 'default',
    pending: 'secondary',
    failed: 'destructive',
    expired: 'outline',
  }

  const colorMap: Record<string, string> = {
    verified: 'bg-emerald-500/15 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-500/15 text-amber-600 border-amber-200',
    failed: '',
    expired: 'text-muted-foreground',
  }

  return (
    <Badge
      variant={variantMap[status] || 'outline'}
      className={status !== 'failed' ? colorMap[status] : undefined}
    >
      {t(`fayda.status.${status}`)}
    </Badge>
  )
}
