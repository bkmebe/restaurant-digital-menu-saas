import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(getRateLimitIdentifier(request), '/api/auth/register', 5, 60)
  if (rateLimitError) return rateLimitError

  let body: Record<string, string>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' } },
      { status: 400 }
    )
  }

  const { restaurantName, fullName, email, phone, password } = body

  if (!restaurantName || !fullName || !email || !password) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'restaurantName, fullName, email and password are required' } },
      { status: 400 }
    )
  }

  const hasMinLength = password.length >= 10
  const hasUppercase = /[A-Z]/.test(password)
  const hasLowercase = /[a-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)

  if (!hasMinLength || !hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message:
            'Password must be at least 10 characters and include an uppercase letter, ' +
            'a lowercase letter, a number, and a special character.',
        },
      },
      { status: 400 }
    )
  }

  try {
    const adminClient = createAdminSupabaseClient()

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    })

    if (authError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: authError.message } },
        { status: 400 }
      )
    }

    const orgSlug = restaurantName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'restaurant'

    const { data: setupData, error: setupError } = await adminClient.rpc('create_restaurant_setup', {
      org_name: restaurantName,
      org_slug: orgSlug,
      user_id: authData.user.id,
      user_email: email,
      user_full_name: fullName,
      user_phone: phone || '',
    })

    if (setupError) {
      await adminClient.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: { code: 'SETUP_ERROR', message: setupError.message } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      data: {
        user: { id: authData.user.id, email },
        organization: setupData,
        signInRequired: true,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed'
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    )
  }
}
