import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  try {
    const { name, address, phone, email, currency, taxRate, logoUrl } = await request.json()
    const supabase = await createServerSupabaseClient()

    const updates: Record<string, unknown> = {}
    if (name) updates.name = name
    if (address) updates.address = address
    if (phone) updates.phone = phone
    if (email) updates.email = email
    if (currency) updates.currency = currency
    if (taxRate !== undefined) updates.tax_rate = taxRate
    if (logoUrl) updates.logo_url = logoUrl

    const { data, error } = await supabase
      .from('restaurants')
      .update(updates)
      .eq('id', tenant.restaurantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: 'Database error occurred' } },
        { status: 500 }
      )
    }

    await supabase
      .from('organizations')
      .update({ onboarding_step: 3 })
      .eq('id', tenant.organizationId)

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to update restaurant' } },
      { status: 500 }
    )
  }
}
