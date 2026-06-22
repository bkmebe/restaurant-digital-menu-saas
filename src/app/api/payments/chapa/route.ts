import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { initializePayment } from '@/lib/payments/chapa'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'cashier')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { order_id, amount, email, phone, name } = await request.json()

  const txRef = `RMD-${order_id.slice(0, 8)}-${Date.now()}`

  const { data: payment, error } = await supabase.from('payment_transactions').insert({
    order_id,
    provider: 'chapa',
    amount,
    currency: 'ETB',
    status: 'pending',
    provider_reference: txRef,
  }).select().single()

  if (error) {
    return NextResponse.json({ error: { code: 'PAYMENT_ERROR', message: error.message } }, { status: 400 })
  }

  try {
    const result = await initializePayment({
      amount,
      currency: 'ETB',
      email: email || 'customer@restaurant.com',
      first_name: name?.split(' ')[0] || 'Customer',
      last_name: name?.split(' ').slice(1).join(' ') || '',
      phone,
      tx_ref: txRef,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/chapa`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/orders/${order_id}`,
      customization: { title: 'Restaurant Bill', description: `Order #${order_id.slice(0, 8)}` },
    })

    if (result.status === 'success') {
      await supabase.from('payment_transactions').update({
        checkout_url: result.data.checkout_url,
        status: 'processing',
      }).eq('id', payment.id)

      return NextResponse.json({ data: { checkout_url: result.data.checkout_url, tx_ref: txRef } })
    }

    return NextResponse.json({ error: { code: 'PROVIDER_ERROR', message: result.message } }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: { code: 'PROVIDER_ERROR', message: 'Payment initialization failed' } }, { status: 500 })
  }
}
