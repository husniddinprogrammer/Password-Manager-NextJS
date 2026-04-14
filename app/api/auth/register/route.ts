import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';
import { rateLimit } from '@/lib/server/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, email, displayName, masterPassword } = body as {
      username?: string;
      email?: string;
      displayName?: string;
      masterPassword?: string;
    };

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!rateLimit(`register:${ip}`, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429 }
      );
    }

    if (!username || !email || !masterPassword) {
      return NextResponse.json(
        { error: 'username, email, and masterPassword are required' },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_-]{3,20}$/.test(username)) {
      return NextResponse.json(
        { error: 'Username must be 3–20 chars: lowercase letters, numbers, _ or -' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    if (masterPassword.length < 8) {
      return NextResponse.json(
        { error: 'Master password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    const masterHash = await bcrypt.hash(masterPassword, 12);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        displayName: displayName?.trim() || username,
        masterHash,
        role: 'member',
      },
    });

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'VAULT_UNLOCKED', credName: 'Account created' },
    });

    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        message: 'Account created',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[register]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
