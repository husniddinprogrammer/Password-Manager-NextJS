import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const PROTECTED_PATHS = ['/vault', '/settings', '/teams'];
const COOKIE_NAME = 'vault-session';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CSRF: reject cross-origin mutation requests to /api ───────────────────
  if (pathname.startsWith('/api/') && MUTATION_METHODS.has(request.method)) {
    const origin = request.headers.get('origin');
    if (origin) {
      try {
        const originHost = new URL(origin).host;
        const host = request.headers.get('host') ?? '';
        if (originHost !== host) {
          return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: 'CSRF check failed' }, { status: 403 });
      }
    }
  }

  // ── JWT gate: protect page routes ────────────────────────────────────────
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    await jwtVerify(token, secret);
  } catch {
    // Token missing, expired, or invalid — redirect to login
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/vault/:path*', '/settings/:path*', '/teams/:path*', '/api/:path*'],
};
