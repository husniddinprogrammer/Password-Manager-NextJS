import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { masterPassword } = body as { masterPassword?: string };

    if (!masterPassword) {
      return NextResponse.json({ error: 'Master password is required' }, { status: 400 });
    }

    const user = await prisma.user.findFirst();
    if (!user) {
      return NextResponse.json(
        { error: 'No vault found. Please set up first.' },
        { status: 404 }
      );
    }

    const isValid = await bcrypt.compare(masterPassword, user.masterHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid master password' }, { status: 401 });
    }

    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: 'VAULT_UNLOCKED',
      },
    });

    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({ message: 'Unlocked successfully' });
  } catch (error) {
    console.error('[unlock]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
