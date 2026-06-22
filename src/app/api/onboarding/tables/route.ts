import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-guard'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { tables } = await request.json()

    if (!Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Tables array is required' } },
        { status: 400 }
      )
    }

    const supabase = await createServerSupabaseClient()
    const restaurantId = auth.profile.restaurant_id

    const tableRows = tables.map((t: { tableNumber: number; capacity: number }) => ({
      restaurant_id: restaurantId,
      table_number: t.tableNumber,
      capacity: t.capacity || 4,
    }))

    const { data, error } = await supabase
      .from('tables')
      .insert(tableRows)
      .select()

    if (error) {
      return NextResponse.json(
        { error: { code: 'DB_ERROR', message: error.message } },
        { status: 500 }
      )
    }

    await supabase
      .from('organizations')
      .update({ onboarding_step: 4 })
      .eq('id', auth.profile.organization_id)

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to create tables' } },
      { status: 500 }
    )
  }
}
