import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const supabase = await createServerSupabaseClient()
  const organizationId = tenant.organizationId

  const [orgResult, restaurantResult, tablesResult, categoriesResult, plansResult] = await Promise.all([
    supabase.from('organizations').select('onboarding_step, setup_completed').eq('id', organizationId).single(),
    supabase.from('restaurants').select('*').eq('id', tenant.restaurantId).single(),
    supabase.from('tables').select('id').eq('restaurant_id', tenant.restaurantId),
    supabase.from('categories').select('id').eq('restaurant_id', tenant.restaurantId),
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
