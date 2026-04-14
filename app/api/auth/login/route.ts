import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';

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

    // Find by username OR email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
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

    await prisma.activityLog.create({
      data: { userId: user.id, action: 'VAULT_UNLOCKED' },
    });

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
