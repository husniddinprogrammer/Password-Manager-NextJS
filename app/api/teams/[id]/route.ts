import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

async function getTeamAccess(teamId: string, userId: string) {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      members: { select: { userId: true, role: true } },
    },
  });
  if (!team) return { team: null, isOwner: false, isMember: false };
  const isOwner = team.ownerId === userId;
  const isMember = team.members.some((m) => m.userId === userId);
  return { team, isOwner, isMember };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const { team, isMember, isOwner } = await getTeamAccess(id, session.userId);

    if (!team || (!isMember && !isOwner)) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const full = await prisma.team.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, displayName: true, email: true } },
          },
          orderBy: { joinedAt: 'asc' },
        },
        _count: { select: { credentials: true } },
      },
    });

    return NextResponse.json({
      data: {
        ...full,
        isOwner,
        myRole: isOwner ? 'OWNER' : (team.members.find((m) => m.userId === session.userId)?.role ?? 'MEMBER'),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const { team, isOwner } = await getTeamAccess(id, session.userId);

    if (!team || !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { name, description } = await request.json() as { name?: string; description?: string };

    const updated = await prisma.team.update({
      where: { id },
      data: {
        name: name?.trim() ?? team.name,
        description: description !== undefined ? (description?.trim() || null) : team.description,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const { team, isOwner } = await getTeamAccess(id, session.userId);

    if (!team || !isOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    await prisma.team.delete({ where: { id } });

    return NextResponse.json({ message: 'Team deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
