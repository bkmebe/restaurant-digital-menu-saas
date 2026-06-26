import type { CustomerProfile, Coupon, LoyaltyTier } from '@/types/enterprise'

const TIER_THRESHOLDS: Record<LoyaltyTier, number> = {
  bronze: 0,
  silver: 5000,
  gold: 15000,
  platinum: 30000,
}

const TIER_POINTS_MULTIPLIER: Record<LoyaltyTier, number> = {
  bronze: 1,
  silver: 1.25,
  gold: 1.5,
  platinum: 2,
}

const TIER_ORDER: LoyaltyTier[] = ['bronze', 'silver', 'gold', 'platinum']

export function calculateLoyaltyTier(totalSpent: number): LoyaltyTier {
  if (totalSpent >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (totalSpent >= TIER_THRESHOLDS.gold) return 'gold'
  if (totalSpent >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export function calculatePoints(amountSpent: number, tier: LoyaltyTier): number {
  const basePoints = Math.floor(amountSpent / 10)
  return Math.floor(basePoints * TIER_POINTS_MULTIPLIER[tier])
}

export function getNextTier(currentTier: LoyaltyTier): LoyaltyTier | null {
  const idx = TIER_ORDER.indexOf(currentTier)
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return null
  return TIER_ORDER[idx + 1] as LoyaltyTier
}

export function getTierProgress(currentTier: LoyaltyTier, totalSpent: number): { current: number; next: number; progress: number } {
  const idx = TIER_ORDER.indexOf(currentTier)
  const currentThreshold = TIER_THRESHOLDS[currentTier]
  if (idx < 0 || idx >= TIER_ORDER.length - 1) {
    return { current: currentThreshold, next: currentThreshold, progress: 100 }
  }
  const nextTier = TIER_ORDER[idx + 1] as LoyaltyTier
  const nextThreshold = TIER_THRESHOLDS[nextTier]
  const progress = Math.min(100, Math.floor(((totalSpent - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
  return { current: currentThreshold, next: nextThreshold, progress }
}

export function validateCoupon(coupon: Coupon, customer: CustomerProfile, orderAmount: number): { valid: boolean; reason?: string; discount?: number } {
  if (!coupon.is_active) {
    return { valid: false, reason: 'Coupon is not active' }
  }

  const now = new Date()
  if (now < new Date(coupon.starts_at)) {
    return { valid: false, reason: 'Coupon has not started yet' }
  }
  if (coupon.expires_at && now > new Date(coupon.expires_at)) {
    return { valid: false, reason: 'Coupon has expired' }
  }

  if (coupon.usage_limit && coupon.current_uses >= coupon.usage_limit) {
    return { valid: false, reason: 'Coupon usage limit reached' }
  }

  if (orderAmount < coupon.min_order_amount) {
    return { valid: false, reason: `Minimum order amount of ${coupon.min_order_amount} not met` }
  }

  if (coupon.applicable_customer_tags && coupon.applicable_customer_tags.length > 0) {
    const customerTags = customer.tags || []
    const hasMatchingTag = coupon.applicable_customer_tags.some(tag => customerTags.includes(tag))
    if (!hasMatchingTag) {
      return { valid: false, reason: 'Coupon not applicable for this customer segment' }
    }
  }

  let discount = 0
  switch (coupon.type) {
    case 'percentage':
      discount = (orderAmount * coupon.value) / 100
      if (coupon.max_discount) discount = Math.min(discount, coupon.max_discount)
      break
    case 'fixed_amount':
      discount = coupon.value
      break
    case 'free_item':
    case 'bogof':
      discount = coupon.value
      break
  }

  return { valid: true, discount: Math.min(discount, orderAmount) }
}

export function filterCampaignTargets(campaign: { target_customer_tags: string[] }, customers: CustomerProfile[]): CustomerProfile[] {
  if (!campaign.target_customer_tags || campaign.target_customer_tags.length === 0) {
    return customers
  }
  return customers.filter(customer => {
    const customerTags = customer.tags || []
    return campaign.target_customer_tags.some(tag => customerTags.includes(tag))
  })
}
