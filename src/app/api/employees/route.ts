import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { requireAuth, requireRole } from '@/lib/utils/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const roleError = requireRole(auth, 'manager')
  if (roleError) return roleError

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('restaurant_id', auth.profile.restaurant_id)
    .order('full_name')

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

  const body = await request.json()
  const { email, password, full_name, phone, role, national_id, salary, hire_date } = body

  const supabase = await createServerSupabaseClient()
  const adminClient = createAdminSupabaseClient()

  const restaurantId = auth.profile.restaurant_id
  const organizationId = auth.profile.organization_id
  const restaurantCode = restaurantId?.slice(0, 4).toUpperCase() || 'XXXX'
  const digitalEmployeeId = `RMD-${restaurantCode}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

  // Create auth user
  const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    return NextResponse.json({ error: { code: 'AUTH_CREATE_ERROR', message: createError.message } }, { status: 400 })
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
    return NextResponse.json({ error: { code: 'PROFILE_ERROR', message: profileError.message } }, { status: 400 })
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
    salary,
    hire_date,
    digital_employee_id: digitalEmployeeId,
  }).select().single()

  if (empError) {
    await adminClient.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: { code: 'EMPLOYEE_ERROR', message: empError.message } }, { status: 400 })
  }

  return NextResponse.json({ data: employee, message: 'Employee created with login account' }, { status: 201 })
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
  const { ['id']: _, ...updateData } = body

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: { code: 'UPDATE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ data, message: 'Employee updated' })
}

export async function DELETE(request: Request) {
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
  const { error } = await supabase.from('employees').delete().eq('id', id)

  if (error) {
    return NextResponse.json({ error: { code: 'DELETE_ERROR', message: error.message } }, { status: 400 })
  }
  return NextResponse.json({ message: 'Employee deleted' })
}
