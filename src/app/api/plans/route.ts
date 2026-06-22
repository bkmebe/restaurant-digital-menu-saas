import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly')

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: 'Failed to fetch plans' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ data })
}
