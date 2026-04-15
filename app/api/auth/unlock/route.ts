import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { createToken, requireAuth, setSessionCookie } from '@/lib/auth';
import { rateLimit, resetRateLimit } from '@/lib/server/rate-limit';
import { unlockSchema, zodErrorMessage } from '@/lib/server/schemas';

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const parsed = unlockSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }
    const { masterPassword } = parsed.data;

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    if (!rateLimit(`unlock:${session.userId}:${ip}`, 10, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many unlock attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await bcrypt.compare(masterPassword, user.masterHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid master password' }, { status: 401 });
    }

    resetRateLimit(`unlock:${session.userId}:${ip}`);

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
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[unlock]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
