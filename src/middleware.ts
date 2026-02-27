import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (pathname === '/api/webhook' || pathname === '/api/setup') {
    return NextResponse.next();
  }

  if (pathname === '/login' || pathname === '/setup') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    if (pathname === '/api/auth/login') {
      return NextResponse.next();
    }
    
    const authCookie = request.cookies.get('auth');
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    return NextResponse.next();
  }

  const authCookie = request.cookies.get('auth');
  const configCheck = await fetch(new URL('/api/setup', request.url).toString(), {
    method: 'HEAD',
  });

  const needsSetup = !configCheck.ok;

  if (needsSetup) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  if (pathname === '/') {
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
