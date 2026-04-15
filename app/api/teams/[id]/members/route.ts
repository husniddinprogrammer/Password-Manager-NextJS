import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id: teamId } = await params;

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: { members: { select: { userId: true } } },
    });

    const isMember = team?.members.some((m) => m.userId === session.userId) || team?.ownerId === session.userId;
    if (!team || !isMember) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const members = await prisma.teamMember.findMany({
      where: { teamId },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({ data: members });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id/members GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id: teamId } = await params;
    const { identifier, role = 'MEMBER' } = await request.json() as { identifier?: string; role?: string };

    const email = identifier?.trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team || team.ownerId !== session.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const targetUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'No user found with that email' }, { status: 404 });
    }

    if (targetUser.id === session.userId) {
      return NextResponse.json({ error: 'You are already the owner' }, { status: 400 });
    }

    const existing = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: targetUser.id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    const member = await prisma.teamMember.create({
      data: { teamId, userId: targetUser.id, role: role === 'OWNER' ? 'OWNER' : 'MEMBER' },
      include: {
        user: { select: { id: true, username: true, displayName: true, email: true } },
      },
    });

    return NextResponse.json({ data: member }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[teams/:id/members POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
