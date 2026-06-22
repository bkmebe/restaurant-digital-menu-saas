import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('payrolls')
    .select('*')
    .eq('restaurant_id', auth.profile.restaurant_id)
    .order('year', { ascending: false })
    .order('month', { ascending: false })

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: error.message } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const body = await request.json()

  const { employee_id, month, year, salary, bonuses, deductions } = body
  const netPay = (salary || 0) + (bonuses || 0) - (deductions || 0)

  const { data, error } = await supabase.from('payrolls').insert({
    restaurant_id: body.restaurant_id,
    employee_id,
    month,
    year,
    salary: salary || 0,
    bonuses: bonuses || 0,
    deductions: deductions || 0,
    net_pay: netPay,
  }).select().single()

  if (error) return NextResponse.json({ error: { code: 'CREATE_ERROR', message: error.message } }, { status: 400 })
  return NextResponse.json({ data, message: 'Payroll entry created' }, { status: 201 })
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'admin')
  if (roleError) return roleError

  const { searchParams } = new URL(request.url)
  let id = searchParams.get('id')

  if (!id) {
    try {
      const body = await request.json()
      id = body.id
    } catch {}
  }

  if (!id) {
    return NextResponse.json({ message: 'No id provided' })
  }

  const supabase = await createServerSupabaseClient()
  const body = await request.json().catch(() => ({}))
  const { ['id']: _, employee_id, month, year, salary, bonuses, deductions, ...rest } = body

  const netPay = (salary ?? 0) + (bonuses ?? 0) - (deductions ?? 0)

  const { data, error } = await supabase
    .from('payrolls')
    .update({
      ...rest,
      ...(employee_id !== undefined && { employee_id }),
      ...(month !== undefined && { month }),
      ...(year !== undefined && { year }),
      ...(salary !== undefined && { salary }),
      ...(bonuses !== undefined && { bonuses }),
      ...(deductions !== undefined && { deductions }),
      ...(salary !== undefined || bonuses !== undefined || deductions !== undefined ? { net_pay: netPay } : {}),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Payroll entry updated' })
}
