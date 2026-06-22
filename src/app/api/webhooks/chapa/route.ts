import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { verifyPayment, verifyWebhookSignature } from '@/lib/payments/chapa'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('x-chapa-signature') || ''

  // Verify signature FIRST before any processing
  if (!verifyWebhookSignature(signature, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const supabase = await createServerSupabaseClient()

  // Log webhook event after verification
  await supabase.from('payment_webhook_events').insert({
    provider: 'chapa',
    raw_body: JSON.parse(body),
    headers: Object.fromEntries(request.headers),
    signature,
  })

  const event = JSON.parse(body)
  const txRef = event.tx_ref

  if (event.event === 'charge.completed' || event.event === 'charge.success') {
    const verification = await verifyPayment(txRef)

    if (verification.status === 'success' && verification.data.status === 'success') {
      await supabase.from('payment_transactions').update({
        status: 'completed',
        paid_at: new Date().toISOString(),
        provider_reference: event.id || txRef,
      }).eq('provider_reference', txRef)
    }
  }

  return NextResponse.json({ received: true })
}
