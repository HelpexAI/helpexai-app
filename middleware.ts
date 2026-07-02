import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const AUTH_ROUTES = ['/login', '/signup', '/verify-email', '/forgot-password']

function safeInternalPath(value: string | null) {
  return value?.startsWith('/') && !value.startsWith('//') ? value : null
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
  const requestedCategory = request.nextUrl.searchParams.get('category')
  const isProductAuthFlow = requestedCategory === 'legal' || requestedCategory === 'business'
  if (!isAuthRoute) return NextResponse.next({ request })

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect authenticated users away from auth routes
  if (isAuthRoute && user && !isProductAuthFlow) {
    const next = safeInternalPath(request.nextUrl.searchParams.get('next'))
    return NextResponse.redirect(new URL(next ?? '/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/login',
    '/signup',
    '/verify-email',
  ],
}
