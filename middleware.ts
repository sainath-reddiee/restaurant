import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const path = req.nextUrl.pathname

  const authToken = req.cookies.get('sb-access-token')?.value
  const refreshToken = req.cookies.get('sb-refresh-token')?.value

  if (!authToken || !refreshToken) {
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      }
    )

    const { data: { user } } = await supabase.auth.getUser(authToken)

    if (!user) {
      if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
        return NextResponse.redirect(new URL('/login', req.url))
      }
      return res
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    const role = profile.role

    if (path.startsWith('/admin')) {
      if (role !== 'SUPER_ADMIN') {
        const response = NextResponse.redirect(new URL('/', req.url))
        return response
      }
    }

    if (path.startsWith('/dashboard')) {
      if (role === 'CUSTOMER') {
        const response = NextResponse.redirect(new URL('/', req.url))
        return response
      }
    }

    return res
  } catch (error) {
    if (path.startsWith('/admin') || path.startsWith('/dashboard') || path.startsWith('/profile')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
    return res
  }
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/profile/:path*'],
}
