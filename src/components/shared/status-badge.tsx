'use client'

import { Badge } from '@/components/ui/badge'

interface StatusBadgeProps {
  status: string
  mapping: Record<string, string>
}

export function StatusBadge({ status, mapping }: StatusBadgeProps) {
  const variant = mapping[status] || 'default' as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'
  return <Badge variant={variant as 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'}>{status}</Badge>
}
