'use client'

import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/hooks/use-language'

interface Props {
  status: 'pending' | 'verified' | 'rejected' | 'disputed'
}

export function PaymentVerificationStatusBadge({ status }: Props) {
  const { t } = useLanguage()

  const styles: Record<string, string> = {
    verified: 'bg-emerald-500/15 text-emerald-600 border-emerald-200',
    pending: 'bg-amber-500/15 text-amber-600 border-amber-200',
    rejected: '',
    disputed: 'bg-purple-500/15 text-purple-600 border-purple-200',
  }

  return (
    <Badge variant={status === 'rejected' ? 'destructive' : 'outline'} className={status !== 'rejected' ? styles[status] : undefined}>
      {t(`payment.verification.status.${status}`)}
    </Badge>
  )
}
