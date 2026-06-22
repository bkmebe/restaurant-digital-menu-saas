import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-guard'

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { planId } = await request.json()
    const supabase = await createServerSupabaseClient()

    if (planId) {
      await supabase.from('subscriptions').insert({
        organization_id: auth.profile.organization_id,
        plan_id: planId,
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
    }

    await supabase
      .from('organizations')
      .update({
        onboarding_step: 6,
        setup_completed: true,
      })
      .eq('id', auth.profile.organization_id)

    return NextResponse.json({ data: { completed: true } })
  } catch {
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Failed to complete onboarding' } },
      { status: 500 }
    )
  }
}
