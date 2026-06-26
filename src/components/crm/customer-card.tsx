'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoyaltyTierBadge } from '@/components/crm/loyalty-tier-badge'
import type { CustomerProfile } from '@/types/enterprise'
import { User, Phone, Mail, Tag, TrendingUp, Award } from 'lucide-react'
import Link from 'next/link'

interface CustomerCardProps {
  customer: CustomerProfile
}

export function CustomerCard({ customer }: CustomerCardProps) {
  const { t } = useLanguage()
  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">
          <Link href={`/dashboard/customers/${customer.id}`} className="hover:underline">
            {customer.name}
          </Link>
        </CardTitle>
        <LoyaltyTierBadge tier={customer.loyalty_tier} />
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 text-sm text-muted-foreground">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{customer.total_visits} {t('crm.visits')} &mdash; ${parseFloat(customer.total_spent.toString()).toFixed(2)}</span>
          </div>
          {customer.points_balance !== undefined && (
            <div className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5" />
              <span>{customer.points_balance} {t('crm.points')}</span>
            </div>
          )}
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" />
              <div className="flex flex-wrap gap-1">
                {customer.tags.slice(0, 3).map(tag => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{tag}</span>
                ))}
                {customer.tags.length > 3 && <span className="text-xs">+{customer.tags.length - 3}</span>}
              </div>
            </div>
          )}
        </div>
        <div className="mt-3">
          <Button variant="outline" size="sm" className="w-full text-xs" asChild>
            <Link href={`/dashboard/customers/${customer.id}`}>
              <User className="mr-1 h-3 w-3" /> {t('crm.viewProfile')}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
