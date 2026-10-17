// Middleware helper to refresh session and enforce role-based access
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === '/login';

  // Unauthenticated users are redirected to login
  if (!user && !isLoginPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role;

    // Authenticated users accessing login or root are routed to their designated dashboard
    if (isLoginPage || pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = role === 'admin' ? '/admin' : '/user';
      return NextResponse.redirect(url);
    }

    // Prevent cross-role access
    if (role === 'user' && pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/user';
      return NextResponse.redirect(url);
    }

    if (role === 'admin' && pathname.startsWith('/user')) {
      const url = request.nextUrl.clone();
      url.pathname = '/admin';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
