import { NextResponse } from 'next/server'

const SUPABASE_URL = 'https://siuwuqitzuejlpvsujdy.supabase.co'

async function handleRequest(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const pathname = path.join('/')
  const url = new URL(pathname, SUPABASE_URL)
  url.search = new URL(request.url).search

  const headers = new Headers()
  const forwardHeaders = ['authorization', 'apikey', 'content-type', 'x-client-info', 'accept', 'accept-language', 'x-supabase-api-version']
  for (const h of forwardHeaders) {
    const val = request.headers.get(h)
    if (val) headers.set(h, val)
  }
  headers.set('x-client-info', `supabase-ssr/${process.env.NEXT_PUBLIC_APP_NAME || 'ssr'} proxy`)

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    fetchOptions.body = await request.blob()
  }

  const response = await fetch(url.toString(), fetchOptions)

  const responseHeaders = new Headers()
  for (const [key, value] of response.headers.entries()) {
    if (!['set-cookie', 'transfer-encoding'].includes(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  const body = response.status === 204 ? null : await response.blob()

  return new NextResponse(body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  })
}

export const GET = handleRequest
export const POST = handleRequest
export const PUT = handleRequest
export const PATCH = handleRequest
export const DELETE = handleRequest
export const OPTIONS = handleRequest
