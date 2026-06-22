// Chapa Payment Gateway Integration
// Docs: https://developer.chapa.co

const CHAPA_API = process.env.CHAPA_API_URL || 'https://api.chapa.co/v1'
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || ''

export interface ChapaInitRequest {
  amount: number
  currency: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  tx_ref: string
  callback_url: string
  return_url: string
  customization?: {
    title: string
    description: string
  }
}

export interface ChapaInitResponse {
  status: 'success' | 'failed'
  message: string
  data: {
    checkout_url: string
    tx_ref: string
  }
}

export interface ChapaVerifyResponse {
  status: 'success' | 'failed'
  message: string
  data: {
    tx_ref: string
    amount: number
    currency: string
    status: string
  }
}

export async function initializePayment(payment: ChapaInitRequest): Promise<ChapaInitResponse> {
  const response = await fetch(`${CHAPA_API}/transaction/initialize`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CHAPA_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payment),
  })
  return response.json()
}

export async function verifyPayment(txRef: string): Promise<ChapaVerifyResponse> {
  const response = await fetch(`${CHAPA_API}/transaction/verify/${txRef}`, {
    headers: { 'Authorization': `Bearer ${CHAPA_SECRET_KEY}` },
  })
  return response.json()
}

export function verifyWebhookSignature(signature: string, body: string): boolean {
  const { timingSafeEqual } = require('crypto')
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', CHAPA_SECRET_KEY).update(body).digest('hex')
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}
