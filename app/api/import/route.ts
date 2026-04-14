import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  encryptCredentialFields,
  maybeDecryptField,
  passwordFingerprint,
} from '@/lib/server/credential-crypto';
import {
  canManageCredential,
  getTeamAccess,
} from '@/lib/server/credential-permissions';

type ImportedCredential = {
  id?: string;
  name?: string;
  url?: string | null;
  username?: string;
  password?: string;
  notes?: string | null;
  category?: string;
  tags?: string[];
  scope?: string;
  teamId?: string | null;
};

type ImportPayload = {
  credentials?: ImportedCredential[];
};

type NormalizedCredential = {
  name: string;
  url: string | null;
  username: string;
  password: string;
  notes: string | null;
  category: string;
  tags: string[];
  scope: 'personal' | 'team';
  teamId: string | null;
};

function isJsonLike(value: unknown): value is ImportPayload | ImportedCredential[] {
  return typeof value === 'object' && value !== null;
}

function extractImportedCredentials(input: unknown): ImportedCredential[] {
  if (!isJsonLike(input)) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray((input as ImportPayload).credentials)) {
    return (input as ImportPayload).credentials ?? [];
  }
  return [];
}

function normalizeImportedCredential(item: ImportedCredential): NormalizedCredential | null {
  const username = maybeDecryptField(item.username).trim();
  const password = maybeDecryptField(item.password);

  if (!username || !password) return null;

  return {
    name: (item.name?.trim() || username),
    url: item.url?.trim() || null,
    username,
    password,
    notes: maybeDecryptField(item.notes)?.trim() || null,
    category: item.category?.trim() || 'General',
    tags: Array.isArray(item.tags) ? item.tags.filter(Boolean) : [],
    scope: item.scope === 'team' && item.teamId ? 'team' : 'personal',
    teamId: item.scope === 'team' && item.teamId ? item.teamId : null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request);
    const body = await request.json();
    const imported = extractImportedCredentials(body);

    if (imported.length === 0) {
      return NextResponse.json({ error: 'No credentials found in JSON' }, { status: 400 });
    }

    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId: session.userId },
      select: { teamId: true },
    });
    const accessibleTeamIds = teamMemberships.map((m) => m.teamId);

    const existingCredentials = await prisma.credential.findMany({
      where: {
        OR: [
          { userId: session.userId, scope: 'personal' },
          { scope: 'team', teamId: { in: accessibleTeamIds } },
        ],
      },
    });

    const existingNormalized = await Promise.all(
      existingCredentials.map(async (credential) => ({
        credential,
        username: maybeDecryptField(credential.username),
        password: maybeDecryptField(credential.password),
      }))
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const skippedItems: string[] = [];

    for (const item of imported) {
      const normalized = normalizeImportedCredential(item);
      if (!normalized) {
        skipped += 1;
        skippedItems.push(item.name || item.username || 'Unknown credential');
        continue;
      }

      if (normalized.scope === 'team' && normalized.teamId) {
        const access = await getTeamAccess(normalized.teamId, session.userId);
        if (!access || !canManageCredential(access.role)) {
          skipped += 1;
          skippedItems.push(`${normalized.name} (team permission denied)`);
          continue;
        }
      }

      const encrypted = encryptCredentialFields({
        username: normalized.username,
        password: normalized.password,
        notes: normalized.notes,
      });
      const passwordHash = passwordFingerprint(normalized.password);

      const match = existingNormalized.find(({ credential, username, password }) => {
        const sameScope =
          normalized.scope === 'team'
            ? credential.scope === 'team' && credential.teamId === normalized.teamId
            : credential.scope === 'personal' && credential.userId === session.userId;

        return sameScope && username === normalized.username && password === normalized.password;
      });

      if (match) {
        await prisma.credential.update({
          where: { id: match.credential.id },
          data: {
            name: normalized.name,
            url: normalized.url,
            username: encrypted.username,
            password: encrypted.password,
            passwordHash,
            notes: encrypted.notes,
            category: normalized.category,
            tags: normalized.tags,
          },
        });
        updated += 1;
        continue;
      }

      await prisma.credential.create({
        data: {
          userId: session.userId,
          name: normalized.name,
          url: normalized.url,
          username: encrypted.username,
          password: encrypted.password,
          passwordHash,
          notes: encrypted.notes,
          category: normalized.category,
          tags: normalized.tags,
          scope: normalized.scope,
          teamId: normalized.scope === 'team' ? normalized.teamId : null,
        },
      });
      created += 1;
    }

    await prisma.activityLog.create({
      data: {
        userId: session.userId,
        action: 'VAULT_IMPORTED',
        credName: `created:${created},updated:${updated},skipped:${skipped}`,
      },
    });

    return NextResponse.json({
      data: {
        created,
        updated,
        skipped,
        skippedItems,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[import]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
