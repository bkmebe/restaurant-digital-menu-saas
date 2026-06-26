'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Coupon } from '@/types/enterprise'
import { Tag, CalendarDays, Users, DollarSign, Percent } from 'lucide-react'
import { useState } from 'react'

interface CouponCardProps {
  coupon: Coupon
  onToggleActive?: (id: string, active: boolean) => void
  onDelete?: (id: string) => void
}

export function CouponCard({ coupon, onToggleActive, onDelete }: CouponCardProps) {
  const { t } = useLanguage()
  const [deleting, setDeleting] = useState(false)

  const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date()
  const usagePercent = coupon.usage_limit ? Math.round((coupon.current_uses / coupon.usage_limit) * 100) : null

  return (
    <Card className={`border-border/60 bg-card/70 shadow-sm ${!coupon.is_active ? 'opacity-60' : ''}`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Tag className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-mono font-bold">{coupon.code}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={coupon.is_active ? 'success' : 'secondary'}>
            {coupon.is_active ? t('crm.active') : t('crm.inactive')}
          </Badge>
          <Badge variant="outline" className="text-xs">{coupon.type}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {coupon.type === 'percentage' ? <Percent className="h-3.5 w-3.5" /> : <DollarSign className="h-3.5 w-3.5" />}
            <span>{coupon.type === 'percentage' ? `${coupon.value}%` : `$${parseFloat(coupon.value.toString()).toFixed(2)}`}
              {coupon.max_discount ? ` (max $${parseFloat(coupon.max_discount.toString()).toFixed(2)})` : ''}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5" />
            <span>{t('crm.minOrder')}: $${parseFloat(coupon.min_order_amount.toString()).toFixed(2)}</span>
          </div>
          {coupon.usage_limit && (
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5" />
              <span>{coupon.current_uses}/{coupon.usage_limit} {t('crm.used')}</span>
              {usagePercent !== null && (
                <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${usagePercent >= 90 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${usagePercent}%` }} />
                </div>
              )}
            </div>
          )}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{new Date(coupon.starts_at).toLocaleDateString()}{coupon.expires_at ? ` - ${new Date(coupon.expires_at).toLocaleDateString()}` : ''}</span>
          </div>
          {coupon.description && <p className="text-xs italic">{coupon.description}</p>}
          {isExpired && <p className="text-xs text-destructive">{t('crm.expired')}</p>}
        </div>
        <div className="mt-3 flex gap-2">
          {onToggleActive && coupon.is_active && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onToggleActive(coupon.id, false)}>
              {t('crm.deactivate')}
            </Button>
          )}
          {onToggleActive && !coupon.is_active && (
            <Button variant="outline" size="sm" className="text-xs" onClick={() => onToggleActive(coupon.id, true)}>
              {t('crm.activate')}
            </Button>
          )}
          {onDelete && (
            <Button variant="destructive" size="sm" className="text-xs" onClick={async () => { setDeleting(true); await onDelete(coupon.id); setDeleting(false) }} disabled={deleting}>
              {t('crm.delete')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
