import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/admin'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(getRateLimitIdentifier(request), '/api/auth/register', 5, 60)
  if (rateLimitError) return rateLimitError

  try {
    const { email, password, fullName, phone, restaurantName } = await request.json()

    if (!email || !password || !fullName || !restaurantName) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Password must be at least 6 characters' } },
        { status: 400 }
      )
    }

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
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Registration failed' } },
      { status: 500 }
    )
  }
}
