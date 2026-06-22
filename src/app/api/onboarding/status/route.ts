import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const supabase = await createServerSupabaseClient()
  const organizationId = auth.profile.organization_id

  const [orgResult, restaurantResult, tablesResult, categoriesResult, plansResult] = await Promise.all([
    supabase.from('organizations').select('onboarding_step, setup_completed').eq('id', organizationId).single(),
    supabase.from('restaurants').select('*').eq('id', auth.profile.restaurant_id).single(),
    supabase.from('tables').select('id').eq('restaurant_id', auth.profile.restaurant_id),
    supabase.from('categories').select('id').eq('restaurant_id', auth.profile.restaurant_id),
    supabase.from('subscription_plans').select('*').eq('is_active', true).order('price_monthly'),
  ])

  return NextResponse.json({
    data: {
      step: orgResult.data?.onboarding_step || 0,
      completed: orgResult.data?.setup_completed || false,
      restaurant: restaurantResult.data || null,
      tableCount: tablesResult.data?.length || 0,
      categoryCount: categoriesResult.data?.length || 0,
      plans: plansResult.data || [],
    },
  })
}
