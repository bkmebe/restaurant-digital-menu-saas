import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireTenant, requireRole, requireMutate } from '@/lib/utils/tenant'

export async function GET() {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('restaurant_id', tenant.restaurantId)
    .order('full_name')

  if (error) {
    return NextResponse.json({ error: { code: 'DB_ERROR', message: 'Database error occurred' } }, { status: 500 })
  }
  return NextResponse.json({ data })
}

export async function POST(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

  const body = await request.json()
  const { email, password, full_name, phone, role, national_id, fayda_number, salary, hire_date } = body

  const supabase = await createServerSupabaseClient()
  const adminClient = createAdminSupabaseClient()

  const restaurantId = tenant.restaurantId
  const organizationId = tenant.organizationId
  const restaurantCode = restaurantId?.slice(0, 4).toUpperCase() || 'XXXX'
  const digitalEmployeeId = `RMD-${restaurantCode}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

  // Create auth user
  const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: { code: 'AUTH_CREATE_ERROR', message: 'Failed to create user' } }, { status: 400 })
  }

  const userId = authUser.user.id

  // Create profile
  const { error: profileError } = await supabase.from('profiles').insert({
    id: userId,
    restaurant_id: restaurantId,
    organization_id: organizationId,
    role,
    full_name,
    phone,
  })

  if (profileError) {
    // Rollback: delete the auth user
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: { code: 'PROFILE_ERROR', message: 'Profile operation failed' } }, { status: 400 })
  }

  // Create employee record
  const { data: employee, error: empError } = await supabase.from('employees').insert({
    profile_id: userId,
    restaurant_id: restaurantId,
    full_name,
    phone,
    email,
    role,
    national_id,
    fayda_number: fayda_number || null,
    salary,
    hire_date,
    digital_employee_id: digitalEmployeeId,
  }).select().single()

  if (empError) {
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: { code: 'EMPLOYEE_ERROR', message: 'Employee operation failed' } }, { status: 400 })
  }

  return NextResponse.json({ data: employee, message: 'Employee created with login account' }, { status: 201 })
}

export async function PUT(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

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
  const { ['id']: _, ...updateData } = body

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .eq('restaurant_id', tenant.restaurantId)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: 'Failed to update record' } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Employee updated' })
}

export async function DELETE(request: Request) {
  const tenant = await requireTenant()
  if (tenant instanceof NextResponse) return tenant

  const roleError = requireRole(tenant, 'admin')
  if (roleError) return roleError

  const mutateError = requireMutate(tenant)
  if (mutateError) return mutateError

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
  const { error } = await supabase.from('employees').delete().eq('id', id).eq('restaurant_id', tenant.restaurantId)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: 'Failed to delete record' } }, { status: 400 })
  }
  return NextResponse.json({ message: 'Employee deleted' })
}
