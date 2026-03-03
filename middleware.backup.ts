import { type NextRequest, NextResponse } from 'next/server'

/**
 * Backup: lightweight middleware (no Supabase). Re-enable by renaming back to middleware.ts
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname
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
