import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  const allCookies = req.cookies.getAll()

  // FIX: Look for Supabase auth token with correct naming pattern
  // Supabase uses: sb-<project-ref>-auth-token or sb-localhost-auth-token
  const authTokenCookie = allCookies.find(cookie =>
    (cookie.name.startsWith('sb-') && cookie.name.includes('-auth-token')) &&
    !cookie.name.includes('code-verifier')
  )

  // FIX: For protected routes, allow client-side auth check instead of forcing middleware redirect
  // This prevents redirect loops and allows AuthProvider to handle session
  if (!authTokenCookie?.value) {
    // Let the client-side handle authentication for these routes
    // The AuthProvider and page components will redirect if needed
    return res
  }

  try {
    let authData;
    try {
      authData = JSON.parse(authTokenCookie.value);
    } catch (e) {
      // Invalid cookie, let client-side handle it
      return res;
    }

    if (!authData?.access_token) {
      return res
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authData.access_token}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser(authData.access_token)

    if (!user) {
      return res
    }

    // Only check role-based authorization, don't redirect to login
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return res
    }

    const role = profile.role

    // Only enforce role-based redirects
    if (path.startsWith('/admin')) {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    if (path.startsWith('/dashboard')) {
      if (role === 'CUSTOMER') {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }

    return res
  } catch (error) {
    console.error('Middleware error:', error);
    // Let client-side handle errors
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/profile/:path*'],
}
