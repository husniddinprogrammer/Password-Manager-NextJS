import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAuth, clearSessionCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const { masterPassword } = body as { masterPassword?: string };

    if (!masterPassword) {
      return NextResponse.json({ error: 'masterPassword is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(masterPassword, user.masterHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect master password' }, { status: 401 });
    }

    // Cascade delete handles credentials and activity logs
    await prisma.user.delete({ where: { id: session.userId } });
    await clearSessionCookie();

    return NextResponse.json({ message: 'All data cleared' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[clear-data]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
