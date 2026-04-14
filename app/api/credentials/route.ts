import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);

    // Get teams the user belongs to
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.userId },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    const credentials = await prisma.credential.findMany({
      where: {
        OR: [
          { userId: session.userId },
          { teamId: { in: teamIds }, scope: 'team' },
        ],
      },
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = credentials.map((c) => ({
      ...c,
      teamName: c.team?.name ?? null,
      team: undefined,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();

    const { name, url, username, password, notes, category, tags, scope, teamId } = body as {
      name?: string;
      url?: string;
      username?: string;
      password?: string;
      notes?: string;
      category?: string;
      tags?: string[];
      scope?: string;
      teamId?: string;
    };

    if (!name || !username || !password) {
      return NextResponse.json(
        { error: 'name, username, and password are required' },
        { status: 400 }
      );
    }

    const credScope = scope === 'team' && teamId ? 'team' : 'personal';

    // For team credentials, verify user is a member
    if (credScope === 'team' && teamId) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId: session.userId } },
      });
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!membership && team?.ownerId !== session.userId) {
        return NextResponse.json({ error: 'Not a member of this team' }, { status: 403 });
      }
    }

    const credential = await prisma.credential.create({
      data: {
        userId: session.userId,
        name,
        url: url || null,
        username,
        password,
        notes: notes || null,
        category: category || 'General',
        tags: tags || [],
        scope: credScope,
        teamId: credScope === 'team' ? teamId : null,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREDENTIAL_CREATED',
        credentialId: credential.id,
        credName: name,
      },
    });

    return NextResponse.json({ data: credential }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
