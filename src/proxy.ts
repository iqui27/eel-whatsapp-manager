import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/db-auth';

// Public routes — no auth required
const PUBLIC_PAGES = ['/login', '/setup'];
const PUBLIC_API = ['/api/auth/login', '/api/setup', '/api/webhook'];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public API routes
  if (PUBLIC_API.some(p => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Always allow public pages
  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
  }

  // Get the session token from the cookie
  const token = request.cookies.get('auth')?.value;
  const valid = await validateSession(token);

  // Protect all API routes
  if (pathname.startsWith('/api/')) {
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Protect all page routes — redirect to /login if not authenticated
  if (!valid) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
