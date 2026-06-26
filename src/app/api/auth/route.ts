import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/utils/rate-limit'

export async function POST(request: Request) {
  const rateLimitError = await checkRateLimit(getRateLimitIdentifier(request), '/api/auth', 10, 60)
  if (rateLimitError) return rateLimitError

  const supabase = await createServerSupabaseClient()
  let email: string, password: string
  try {
    const body = await request.json()
    email = body.email
    password = body.password
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION', message: 'Invalid JSON body' } }, { status: 400 })
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: 'Authentication failed' } }, { status: 401 })
  }

  return NextResponse.json({ data: { user: data.user, session: data.session } })
}

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } }, { status: 401 })
  }

  return NextResponse.json({ data: { user: session.user } })
}