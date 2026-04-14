import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const credentials = await prisma.credential.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: 'asc' },
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      note: 'Credential fields (username, password, notes) are AES-256 encrypted. Use your master password to decrypt.',
      count: credentials.length,
      credentials: credentials.map((c) => ({
        id: c.id,
        name: c.name,
        url: c.url,
        username: c.username,
        password: c.password,
        notes: c.notes,
        category: c.category,
        tags: c.tags,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    };

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'VAULT_EXPORTED',
      },
    });

    const json = JSON.stringify(exportData, null, 2);
    const filename = `vault-export-${new Date().toISOString().split('T')[0]}.json`;

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[export]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
