import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id: teamId, userId: targetUserId } = await params;

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Owner can remove anyone; member can remove themselves
    const isSelf = targetUserId === session.userId;
    const isOwner = team.ownerId === session.userId;

    if (!isOwner && !isSelf) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (isOwner && targetUserId === session.userId) {
      return NextResponse.json({ error: 'Owner cannot leave the team' }, { status: 400 });
    }

    await prisma.teamMember.delete({
      where: { teamId_userId: { teamId, userId: targetUserId } },
    });

    return NextResponse.json({ message: 'Member removed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id/members/:userId DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id: teamId, userId: targetUserId } = await params;
    const { role } = await request.json() as { role?: string };

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (!role) {
      return NextResponse.json({ error: 'role is required' }, { status: 400 });
    }

    const updated = await prisma.teamMember.update({
      where: { teamId_userId: { teamId, userId: targetUserId } },
      data: { role: role === 'OWNER' ? 'OWNER' : 'MEMBER' },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id/members/:userId PATCH]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
