import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireTenant, requireMutate } from '@/lib/utils/tenant'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()

  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentication required' } },
      { status: 401 }
    )
  }

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { table_id, type, notes } = body
  if (!table_id || !type) {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'table_id and type are required' } }, { status: 400 })
  }

  // Get the table's restaurant_id
  const { data: table } = await supabase.from('tables').select('restaurant_id').eq('id', table_id).single()
  if (!table) {
    return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Table not found' } }, { status: 404 })
  }

  const { data, error } = await supabase.from('service_requests').insert({
    restaurant_id: table.restaurant_id,
    table_id,
    type,
    notes,
  }).select().single()

  if (error) return NextResponse.json({ error: { code: 'CREATE_ERROR', message: 'Failed to create record' } }, { status: 400 })
  return NextResponse.json({ data, message: 'Request sent' }, { status: 201 })
}
