import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import zxcvbn from 'zxcvbn';
import {
  maybeDecryptField,
  decryptField,
  encryptCredentialFields,
  passwordFingerprint,
} from '@/lib/server/credential-crypto';
import {
  canManageCredential,
  getTeamAccess,
} from '@/lib/server/credential-permissions';
import { credentialCreateSchema, zodErrorMessage } from '@/lib/server/schemas';

function getStrengthScore(password: string): number {
  return zxcvbn(password).score;
}

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

    const result = await Promise.all(
      credentials.map(async (c) => {
        // maybeDecryptField handles both new (GCM-wrapped) and old (plain CBC) formats gracefully
        const decrypted = {
          username: maybeDecryptField(c.username),
          password: maybeDecryptField(c.password),
          notes: c.notes ? maybeDecryptField(c.notes) : null,
        };

        let canEdit = c.userId === session.userId;
        if (c.scope === 'team' && c.teamId) {
          const access = await getTeamAccess(c.teamId, session.userId);
          canEdit = !!access && canManageCredential(access.role);
        }

        return {
          ...c,
          ...decrypted,
          teamName: c.team?.name ?? null,
          team: undefined,
          canEdit,
          strength: decrypted.password ? getStrengthScore(decrypted.password) : undefined,
        };
      })
    );

    const scopedCounts = new Map<string, number>();
    result.forEach((c) => {
      if (!c.passwordFingerprint) return;
      const scopeKey = c.scope === 'team' && c.teamId ? `team:${c.teamId}` : `user:${c.userId}`;
      const key = `${scopeKey}:${c.passwordFingerprint}`;
      scopedCounts.set(key, (scopedCounts.get(key) ?? 0) + 1);
    });

    const withReuse = result.map((c) => {
      const scopeKey = c.scope === 'team' && c.teamId ? `team:${c.teamId}` : `user:${c.userId}`;
      const key = c.passwordFingerprint ? `${scopeKey}:${c.passwordFingerprint}` : '';
      return {
        ...c,
        isReused: !!(c.passwordFingerprint && (scopedCounts.get(key) ?? 0) > 1),
      };
    });

    return NextResponse.json({ data: withReuse });
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
    const parsed = credentialCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: zodErrorMessage(parsed.error) }, { status: 400 });
    }
    const { name, url, username, password, notes, category, tags, scope, teamId } = parsed.data;

    const strength = getStrengthScore(password);
    if (strength < 2) {
      return NextResponse.json(
        { error: 'Password is too weak', strength },
        { status: 400 }
      );
    }

    const credScope = scope === 'team' && teamId ? 'team' : 'personal';

    let teamAccess: Awaited<ReturnType<typeof getTeamAccess>> = null;
    if (credScope === 'team' && teamId) {
      teamAccess = await getTeamAccess(teamId, session.userId);
      if (!teamAccess || !canManageCredential(teamAccess.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to create team credentials' },
          { status: 403 }
        );
      }
    }

    const encrypted = encryptCredentialFields({
      username,
      password,
      notes: notes || null,
    });
    const fingerprint = passwordFingerprint(password);

    const reusedCount = await prisma.credential.count({
      where: {
        passwordFingerprint: fingerprint,
        ...(credScope === 'team' && teamId
          ? { teamId, scope: 'team' }
          : { userId: session.userId, scope: 'personal' }),
      },
    });

    const credential = await prisma.credential.create({
      data: {
        userId: session.userId,
        name,
        url: url || null,
        username: encrypted.username,
        password: encrypted.password,
        passwordFingerprint: fingerprint,
        notes: encrypted.notes,
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

    return NextResponse.json(
      {
        data: {
          ...credential,
          username: decryptField(credential.username),
          password: decryptField(credential.password),
          notes: credential.notes ? decryptField(credential.notes) : null,
          isReused: reusedCount > 0,
          canEdit: credScope === 'team' ? !!teamAccess && canManageCredential(teamAccess.role) : true,
          strength,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[credentials POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
