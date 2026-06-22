import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET(request: Request) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'csv'
  const range = searchParams.get('range') || 'daily'
  const restaurantId = searchParams.get('restaurantId')

  if (!restaurantId) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'restaurantId required' } }, { status: 400 })
  }

  let data: Record<string, unknown>[] = []
  let filename = ''

  if (range === 'daily_sales') {
    const { data: result } = await supabase.from('mv_daily_sales').select('*').eq('restaurant_id', restaurantId).order('date', { ascending: false })
    data = result || []
    filename = 'daily-sales'
  } else if (range === 'menu_performance') {
    const { data: result } = await supabase.from('mv_menu_performance').select('*').eq('restaurant_id', restaurantId).order('total_revenue', { ascending: false })
    data = result || []
    filename = 'menu-performance'
  } else if (range === 'staff_performance') {
    const { data: result } = await supabase.from('mv_staff_performance').select('*').eq('restaurant_id', restaurantId).order('orders_handled', { ascending: false })
    data = result || []
    filename = 'staff-performance'
  }

  if (type === 'json') {
    return NextResponse.json({ data })
  }

  // CSV export
  if (data.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const firstRow = data[0]!
  const headers = Object.keys(firstRow)
  const csvRows = [
    headers.join(','),
    ...data.map(row => headers.map(h => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(',')),
  ]

  const csv = csvRows.join('\n')

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
