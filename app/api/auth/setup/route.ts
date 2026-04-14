import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterPassword } = body as { masterPassword?: string };

    if (!masterPassword || masterPassword.length < 8) {
      return NextResponse.json(
        { error: 'Master password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Ensure no user exists yet
    const existingUser = await prisma.user.findFirst();
    if (existingUser) {
      return NextResponse.json(
        { error: 'Vault already set up. Please unlock instead.' },
        { status: 409 }
      );
    }

    const masterHash = await bcrypt.hash(masterPassword, 12);
    const user = await prisma.user.create({
      data: { masterHash },
    });

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'VAULT_UNLOCKED',
        credName: 'Initial setup',
      },
    });

    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ message: 'Vault created successfully' }, { status: 201 });
  } catch (error) {
    console.error('[setup]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
