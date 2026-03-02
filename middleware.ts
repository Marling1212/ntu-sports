import { type NextRequest, NextResponse } from 'next/server'

/**
 * Lightweight middleware that does NOT import Supabase (avoids Edge bundle size
 * and Node API issues). Admin auth is enforced by cookie presence here and by
 * getSession/getUser in server components.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Protect admin routes (except login and signup): require Supabase auth cookie
  if (
    path.startsWith('/admin') &&
    !path.startsWith('/admin/login') &&
    !path.startsWith('/admin/signup')
  ) {
    const hasAuthCookie = request.cookies.getAll().some((c) => c.name.startsWith('sb-'))
    if (!hasAuthCookie) {
      const url = request.nextUrl.clone()
      url.pathname = '/admin/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
