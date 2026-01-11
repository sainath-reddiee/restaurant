import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('Error exchanging code for session:', error);
      return NextResponse.redirect(new URL('/login', requestUrl.origin));
    }

    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (profile) {
        switch (profile.role) {
          case 'SUPER_ADMIN':
            return NextResponse.redirect(new URL('/admin', requestUrl.origin));
          case 'RESTAURANT':
            return NextResponse.redirect(new URL('/dashboard', requestUrl.origin));
          case 'CUSTOMER':
          default:
            return NextResponse.redirect(new URL('/', requestUrl.origin));
        }
      }
    }
  }

  return NextResponse.redirect(new URL('/', requestUrl.origin));
}
