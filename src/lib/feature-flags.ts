export const FEATURES = {
  attendance: process.env.NEXT_PUBLIC_FEATURE_ATTENDANCE === 'true',
  eod: process.env.NEXT_PUBLIC_FEATURE_EOD === 'true',
  tips: process.env.NEXT_PUBLIC_FEATURE_TIPS === 'true',
  fayda: process.env.NEXT_PUBLIC_FEATURE_FAYDA === 'true',
  receipts: process.env.NEXT_PUBLIC_FEATURE_RECEIPTS === 'true',
  shifts: process.env.NEXT_PUBLIC_FEATURE_SHIFTS === 'true',
  backups: process.env.NEXT_PUBLIC_FEATURE_BACKUPS === 'true',
  forecasts: process.env.NEXT_PUBLIC_FEATURE_FORECASTS === 'true',
  offline: process.env.NEXT_PUBLIC_FEATURE_OFFLINE === 'true',
  reservations: process.env.NEXT_PUBLIC_FEATURE_RESERVATIONS === 'true',
  crm: process.env.NEXT_PUBLIC_FEATURE_CRM === 'true',
  reviews: process.env.NEXT_PUBLIC_FEATURE_REVIEWS === 'true',
  notifications: process.env.NEXT_PUBLIC_FEATURE_NOTIFICATIONS === 'true',
  loyalty: process.env.NEXT_PUBLIC_FEATURE_LOYALTY === 'true',
  supplierAnalytics: process.env.NEXT_PUBLIC_FEATURE_SUPPLIER_ANALYTICS === 'true',
  advancedReporting: process.env.NEXT_PUBLIC_FEATURE_ADVANCED_REPORTING === 'true',
} as const

export type FeatureKey = keyof typeof FEATURES

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key]
}
