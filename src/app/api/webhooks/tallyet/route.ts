import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { timingSafeEqual } from 'crypto'

const TALLYET_WEBHOOK_SECRET = process.env.TALLYET_WEBHOOK_SECRET || ''
const TALLYET_SIGNATURE_HEADER = process.env.TALLYET_SIGNATURE_HEADER || 'x-tallyet-signature'

function verifySignature(signature: string, body: string): boolean {
  if (!TALLYET_WEBHOOK_SECRET) return false
  const crypto = require('crypto')
  const expected = crypto.createHmac('sha256', TALLYET_WEBHOOK_SECRET).update(body).digest('hex')
  if (signature.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get(TALLYET_SIGNATURE_HEADER) || ''

  if (!verifySignature(signature, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: any
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { transaction_id, status, provider, amount, phone, reference, restaurant_id } = body

  if (!transaction_id) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'transaction_id is required' } }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()

  const verificationStatus = status === 'success' ? 'verified' : 'rejected'

  const { data, error } = await supabase
    .from('payment_verifications')
    .insert({
      restaurant_id: restaurant_id || null,
      provider: provider || 'telebirr',
      verification_method: 'api_verification',
      verification_reference: reference || null,
      amount: amount || null,
      currency: 'ETB',
      status: verificationStatus,
      verified_at: new Date().toISOString(),
      external_verification_id: transaction_id,
      external_verification_data: body,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }

  return NextResponse.json({ data, message: 'Verification recorded from TallyETBot' }, { status: 201 })
}
