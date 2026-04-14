import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { canViewCredential, getTeamAccess } from '@/lib/server/credential-permissions';

type ExportSelection = {
  mode?: 'all' | 'team' | 'credential';
  teamId?: string;
  credentialId?: string;
};

type ExportScopeMeta = {
  mode: 'all' | 'team' | 'credential';
  teamId?: string | null;
  teamName?: string | null;
  credentialId?: string | null;
  credentialName?: string | null;
};

async function getAccessibleTeamIds(userId: string): Promise<string[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    select: { teamId: true },
  });

  const ownedTeams = await prisma.team.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });

  return Array.from(new Set([
    ...memberships.map((m) => m.teamId),
    ...ownedTeams.map((t) => t.id),
  ]));
}

async function buildExportData(
  sessionUserId: string,
  selection: ExportSelection
) {
  const accessibleTeamIds = await getAccessibleTeamIds(sessionUserId);
  const mode = selection.mode ?? 'all';

  if (mode === 'team') {
    if (!selection.teamId) {
      return { error: 'teamId is required', status: 400 as const };
    }

    const access = await getTeamAccess(selection.teamId, sessionUserId);
    if (!access || !canViewCredential(access.role)) {
      return { error: 'You do not have access to this team', status: 403 as const };
    }

    const team = await prisma.team.findUnique({
      where: { id: selection.teamId },
      select: { id: true, name: true },
    });

    const credentials = await prisma.credential.findMany({
      where: { scope: 'team', teamId: selection.teamId },
      include: {
        team: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return {
      scope: { mode: 'team' as const, teamId: team?.id ?? selection.teamId, teamName: team?.name ?? null },
      credentials,
    };
  }

  if (mode === 'credential') {
    if (!selection.credentialId) {
      return { error: 'credentialId is required', status: 400 as const };
    }

    const credential = await prisma.credential.findFirst({
      where: {
        id: selection.credentialId,
        OR: [
          { userId: sessionUserId, scope: 'personal' },
          { scope: 'team', teamId: { in: accessibleTeamIds } },
        ],
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!credential) {
      return { error: 'Credential not found', status: 404 as const };
    }

    return {
      scope: { mode: 'credential' as const, credentialId: credential.id, credentialName: credential.name },
      credentials: [credential],
    };
  }

  const credentials = await prisma.credential.findMany({
    where: {
      OR: [
        { userId: sessionUserId, scope: 'personal' },
        { scope: 'team', teamId: { in: accessibleTeamIds } },
      ],
    },
    include: {
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return {
    scope: { mode: 'all' as const },
    credentials,
  };
}

function createExportResponse(exportData: {
  scope: ExportScopeMeta;
  credentials: Array<{
    id: string;
    name: string;
    url: string | null;
    username: string;
    password: string;
    notes: string | null;
    category: string;
    tags: string[];
    scope: string;
    teamId: string | null;
    createdAt: Date;
    updatedAt: Date;
    team?: { id: string; name: string } | null;
  }>;
}) {
  const json = JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      version: '2.0',
      note: 'Credential fields are encrypted at rest and exported as stored by the server.',
      scope: exportData.scope,
      count: exportData.credentials.length,
      credentials: exportData.credentials.map((c) => ({
        id: c.id,
        name: c.name,
        url: c.url,
        username: c.username,
        password: c.password,
        notes: c.notes,
        category: c.category,
        tags: c.tags,
        scope: c.scope,
        teamId: c.teamId,
        teamName: c.team?.name ?? null,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    },
    null,
    2
  );

  const filename = `vault-export-${new Date().toISOString().split('T')[0]}.json`;

  return new NextResponse(json, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const exportData = await buildExportData(session.userId, { mode: 'all' });

    if ('error' in exportData) {
      return NextResponse.json({ error: exportData.error }, { status: exportData.status });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'VAULT_EXPORTED',
      },
    });

    return createExportResponse(exportData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[export GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const selection = await request.json() as ExportSelection;
    const exportData = await buildExportData(session.userId, selection);

    if ('error' in exportData) {
      return NextResponse.json({ error: exportData.error }, { status: exportData.status });
    }

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'VAULT_EXPORTED',
        credName:
          selection.mode === 'team'
            ? `team:${selection.teamId}`
            : selection.mode === 'credential'
              ? `credential:${selection.credentialId}`
              : 'all',
      },
    });

    return createExportResponse(exportData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[export POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
