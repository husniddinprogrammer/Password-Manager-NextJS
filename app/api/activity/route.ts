import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { ActivityAction } from '@/lib/types';
import { ActivityAction as PrismaActivityAction } from '@prisma/client';

const ALLOWED_ACTIONS = new Set<ActivityAction>([
  'CREDENTIAL_CREATED',
  'CREDENTIAL_UPDATED',
  'CREDENTIAL_DELETED',
  'CREDENTIAL_VIEWED',
  'PASSWORD_COPIED',
  'USERNAME_COPIED',
  'VAULT_UNLOCKED',
  'VAULT_LOCKED',
  'MASTER_PASSWORD_CHANGED',
  'VAULT_EXPORTED',
  'VAULT_IMPORTED',
]);

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const logs = await prisma.activityLog.findMany({
      where: { userId: session.userId },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json({ data: logs });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[activity GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const { action, credentialId, credName } = body as {
      action?: string;
      credentialId?: string;
      credName?: string;
    };

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    if (!ALLOWED_ACTIONS.has(action as ActivityAction)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const log = await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: action as PrismaActivityAction,
        credentialId: credentialId || null,
        credName: credName || null,
      },
    });

    return NextResponse.json({ data: log }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[activity POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
