import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json({ isAuthenticated: false });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, email: true, displayName: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ isAuthenticated: false });
    }

    return NextResponse.json({ isAuthenticated: true, user });
  } catch (error) {
    console.error('[check]', error);
    return NextResponse.json({ isAuthenticated: false });
  }
}
