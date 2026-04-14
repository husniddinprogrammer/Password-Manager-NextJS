import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: session.userId },
          { members: { some: { userId: session.userId } } },
        ],
      },
      include: {
        _count: { select: { members: true, credentials: true } },
        members: {
          where: { userId: session.userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = teams.map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description,
      createdAt: t.createdAt,
      ownerId: t.ownerId,
      isOwner: t.ownerId === session.userId,
      myRole: t.ownerId === session.userId ? 'owner' : (t.members[0]?.role ?? 'member'),
      _count: t._count,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const { name, description } = await request.json() as { name?: string; description?: string };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    const team = await prisma.team.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ownerId: session.userId,
        members: {
          create: { userId: session.userId, role: 'owner' },
        },
      },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
