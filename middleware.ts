import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/dashboard', '/documents', '/conversations', '/billing', '/settings', '/select-workspace']
const AUTH_ROUTES = ['/login', '/signup', '/verify-email']

export async function middleware(request: NextRequest) {
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

  const pathname = request.nextUrl.pathname

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_ROUTES.some(r => pathname.startsWith(r))

  if (isProtected && user) {
    const { data: accounts } = await supabase
      .from('accounts')
      .select('category_slug, deletion_requested_at')
      .eq('user_id', user.id)

    if (accounts?.some(account => account.deletion_requested_at)) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('account', 'deletion-requested')
      return NextResponse.redirect(url)
    }

    if (!accounts?.length) {
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'no_accounts')
      return NextResponse.redirect(url)
    }

    const activeCategory = request.cookies.get('helpex_active_workspace')?.value
    const activeAccountExists = accounts.some(account => account.category_slug === activeCategory)

    if (accounts.length > 1 && !activeAccountExists && pathname !== '/select-workspace') {
      const url = request.nextUrl.clone()
      url.pathname = '/select-workspace'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (accounts.length === 1 && !activeAccountExists) {
      supabaseResponse.cookies.set('helpex_active_workspace', accounts[0].category_slug, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      })
    }
  }

  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth routes
  const isAuthRoute = AUTH_ROUTES.some(r => pathname.startsWith(r))
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
