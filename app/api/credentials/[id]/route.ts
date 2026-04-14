import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.userId },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    const credential = await prisma.credential.findFirst({
      where: {
        id,
        OR: [
          { userId: session.userId },
          { teamId: { in: teamIds }, scope: 'team' },
        ],
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREDENTIAL_VIEWED',
        credentialId: credential.id,
        credName: credential.name,
      },
    });

    return NextResponse.json({ data: credential });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials/:id GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth(request);
    const { id } = await params;
    const body = await request.json();

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.userId },
      select: { teamId: true },
    });
    const teamIds = teamMemberships.map((m) => m.teamId);

    const existing = await prisma.credential.findFirst({
      where: {
        id,
        OR: [
          { userId: session.userId },
          { teamId: { in: teamIds }, scope: 'team' },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    const { name, url, username, password, notes, category, tags } = body as {
      name?: string;
      url?: string;
      username?: string;
      password?: string;
      notes?: string;
      category?: string;
      tags?: string[];
    };

    const updated = await prisma.credential.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        url: url !== undefined ? url || null : existing.url,
        username: username ?? existing.username,
        password: password ?? existing.password,
        notes: notes !== undefined ? notes || null : existing.notes,
        category: category ?? existing.category,
        tags: tags ?? existing.tags,
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREDENTIAL_UPDATED',
        credentialId: updated.id,
        credName: updated.name,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials/:id PUT]', error);
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

    const existing = await prisma.credential.findFirst({
      where: { id, userId: session.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    await prisma.credential.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'CREDENTIAL_DELETED',
        credName: existing.name,
      },
    });

    return NextResponse.json({ message: 'Credential deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials/:id DELETE]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
