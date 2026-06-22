import { createBrowserClient } from '@supabase/ssr'

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://siuwuqitzuejlpvsujdy.supabase.co'
}

function getCookiePrefix() {
  const url = getSupabaseUrl()
  return `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
}

export function createClient() {
  const supabaseUrl = getSupabaseUrl()

  return createBrowserClient(
    supabaseUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: { name: getCookiePrefix() },
    }
  )
}

export function createRealtimeClient() {
  return createBrowserClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions: { name: getCookiePrefix() },
      auth: { persistSession: false },
    }
  )
}
