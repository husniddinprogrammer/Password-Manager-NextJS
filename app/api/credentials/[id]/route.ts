import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import zxcvbn from 'zxcvbn';
import {
  decryptCredentialFields,
  decryptField,
  encryptCredentialFields,
  passwordFingerprint,
} from '@/lib/server/credential-crypto';
import {
  canManageCredential,
  canViewCredential,
  getTeamAccess,
} from '@/lib/server/credential-permissions';

function getStrengthScore(password: string): number {
  return zxcvbn(password).score;
}

export async function GET(
  request: NextRequest,
  context: RouteContext<'/api/credentials/[id]'>
) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;

    const credential = await prisma.credential.findFirst({
      where: {
        id,
      },
      include: {
        team: { select: { id: true, name: true } },
      },
    });

    if (!credential) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    let canEdit = credential.userId === session.userId;
    if (credential.scope === 'team' && credential.teamId) {
      const access = await getTeamAccess(credential.teamId, session.userId);
      if (!access || !canViewCredential(access.role)) {
        return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
      }
      canEdit = canManageCredential(access.role);
    } else if (credential.userId !== session.userId) {
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

    const decrypted = decryptCredentialFields(credential);

    return NextResponse.json({
      data: {
        ...credential,
        ...decrypted,
        teamName: credential.team?.name ?? null,
        team: undefined,
        canEdit,
        strength: decrypted.password ? getStrengthScore(decrypted.password) : undefined,
      },
    });
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
  context: RouteContext<'/api/credentials/[id]'>
) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.credential.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (existing.scope === 'team' && existing.teamId) {
      const access = await getTeamAccess(existing.teamId, session.userId);
      if (!access || !canManageCredential(access.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to edit this credential' },
          { status: 403 }
        );
      }
    } else if (existing.userId !== session.userId) {
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

    const nextUsername = username ?? decryptField(existing.username);
    const nextPassword = password ?? decryptField(existing.password);
    const nextNotes = notes !== undefined ? notes || '' : decryptField(existing.notes ?? '');
    const strength = getStrengthScore(nextPassword);

    if (strength < 2) {
      return NextResponse.json(
        { error: 'Password is too weak', strength },
        { status: 400 }
      );
    }

    const encrypted = encryptCredentialFields({
      username: nextUsername,
      password: nextPassword,
      notes: nextNotes,
    });

    const updated = await prisma.credential.update({
      where: { id },
      data: {
        name: name ?? existing.name,
        url: url !== undefined ? url || null : existing.url,
        username: encrypted.username,
        password: encrypted.password,
        passwordHash: passwordFingerprint(nextPassword),
        notes: encrypted.notes,
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

    return NextResponse.json({
      data: {
        ...updated,
        ...decryptCredentialFields(updated),
        canEdit: true,
        strength,
      },
    });
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
  context: RouteContext<'/api/credentials/[id]'>
) {
  try {
    const session = await requireAuth(request);
    const { id } = await context.params;

    const existing = await prisma.credential.findFirst({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 404 });
    }

    if (existing.scope === 'team' && existing.teamId) {
      const access = await getTeamAccess(existing.teamId, session.userId);
      if (!access || !canManageCredential(access.role)) {
        return NextResponse.json(
          { error: 'You do not have permission to delete this credential' },
          { status: 403 }
        );
      }
    } else if (existing.userId !== session.userId) {
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
