'use client'

import { useLanguage } from '@/hooks/use-language'
import { Badge } from '@/components/ui/badge'
import type { LoyaltyTier } from '@/types/enterprise'

const tierColors: Record<LoyaltyTier, string> = {
  bronze: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  silver: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  gold: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  platinum: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
}

interface LoyaltyTierBadgeProps {
  tier: LoyaltyTier
}

export function LoyaltyTierBadge({ tier }: LoyaltyTierBadgeProps) {
  const { t } = useLanguage()
  return (
    <Badge className={tierColors[tier] || ''}>
      {t(`crm.tier.${tier}`)}
    </Badge>
  )
}
