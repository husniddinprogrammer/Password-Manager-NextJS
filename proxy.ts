import { NextRequest, NextResponse } from 'next/server';

const PROTECTED_PATHS = ['/vault', '/settings', '/teams'];
const COOKIE_NAME = 'vault-session';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vault/:path*', '/settings/:path*', '/teams/:path*'],
};
