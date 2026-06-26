import { createServerClient } from '@supabase/ssr'
import { NextResponse, NextRequest } from 'next/server'

const TENANT_HEADERS = {
  RESTAURANT_ID: 'x-tenant-restaurant-id',
  ROLE: 'x-tenant-role',
  USER_ID: 'x-tenant-user-id',
  ORGANIZATION_ID: 'x-tenant-organization-id',
} as const

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const cookiePrefix = `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`

  const supabase = createServerClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
      cookieOptions: { name: cookiePrefix },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const protectedPaths = ['/dashboard']
  const isProtected = protectedPaths.some(p => request.nextUrl.pathname.startsWith(p))

  if (isProtected && !session) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (session) {
    const pathname = request.nextUrl.pathname
    if (pathname.startsWith('/api/') || pathname.startsWith('/dashboard')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, role, restaurant_id, organization_id')
        .eq('id', session.user.id)
        .single()

      if (profile) {
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set(TENANT_HEADERS.RESTAURANT_ID, profile.restaurant_id || '')
        requestHeaders.set(TENANT_HEADERS.ROLE, profile.role)
        requestHeaders.set(TENANT_HEADERS.USER_ID, profile.id)
        if (profile.organization_id) {
          requestHeaders.set(TENANT_HEADERS.ORGANIZATION_ID, profile.organization_id)
        }

        const newRequest = new NextRequest(request, { headers: requestHeaders })
        supabaseResponse = NextResponse.next({ request: newRequest })
      }
    }
  }

  return supabaseResponse
}
