export const APP_NAME = 'Restaurant Digital Menu'
export const APP_DESCRIPTION = 'Digital menu and management system for Ethiopian restaurants'

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'am', label: 'Amharic', nativeLabel: 'አማርኛ' },
  { code: 'om', label: 'Afaan Oromo', nativeLabel: 'Afaan Oromoo' },
] as const

export const DEFAULT_LANGUAGE = 'en'

export const CURRENCY = 'ETB'

export const TABLE_STATUS_COLORS: Record<string, string> = {
  available: 'bg-green-100 text-green-800',
  occupied: 'bg-red-100 text-red-800',
  cleaning: 'bg-yellow-100 text-yellow-800',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800',
  preparing: 'bg-yellow-100 text-yellow-800',
  served: 'bg-green-100 text-green-800',
  paid: 'bg-gray-100 text-gray-800',
}

export const SERVICE_REQUEST_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-red-100 text-red-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
}

export const PAYMENT_PROVIDER_LOGOS: Record<string, string> = {
  telebirr: '/images/telebirr.png',
  cbe_birr: '/images/cbe-birr.png',
  bank: '/images/bank.png',
  qr: '/images/qr.png',
}
