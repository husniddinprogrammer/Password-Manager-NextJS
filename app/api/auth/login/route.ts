import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';
import { rateLimit, resetRateLimit } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { identifier, masterPassword } = body as {
      identifier?: string;
      masterPassword?: string;
    };

    if (!identifier || !masterPassword) {
      return NextResponse.json(
        { error: 'identifier and masterPassword are required' },
        { status: 400 }
      );
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!rateLimit(`login:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    // Find by username (exact) OR email (case-insensitive)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: { equals: identifier, mode: 'insensitive' } },
        ],
      },
    });

    if (!user) {
      // Generic message to avoid user enumeration
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(masterPassword, user.masterHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    resetRateLimit(`login:${ip}`);

    try {
      await prisma.activityLog.create({
        data: { userId: user.id, action: 'VAULT_UNLOCKED' },
      });
    } catch { /* non-critical */ }

    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('[login]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
