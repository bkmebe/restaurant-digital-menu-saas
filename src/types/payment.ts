export interface PaymentConfigFormData {
  provider: 'telebirr' | 'cbe_birr' | 'bank' | 'qr'
  label: string
  account_name: string
  account_number: string
  qr_image_url?: string
  payment_link?: string
  bank_name?: string
  is_active: boolean
  sort_order: number
}
