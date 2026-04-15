/**
 * Integration tests for the credentials API routes.
 * Prisma is mocked so no real DB is needed.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';

// ── env setup ────────────────────────────────────────────────────────────────
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-long-enough-for-hs256!!';
  process.env.CREDENTIALS_SECRET = 'test-credential-secret-long-enough-32b!!';
});

// ── mock Prisma ───────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    credential: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
    },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

// ── mock next/headers (used by setSessionCookie) ──────────────────────────────
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn(), delete: vi.fn() }),
}));

import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';
import { encryptField } from '@/lib/server/credential-crypto';

async function makeAuthRequest(path: string, method: string, body?: unknown) {
  const token = await createToken('user-test-id');
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: `vault-session=${token}`,
      Origin: 'http://localhost',
      Host: 'localhost',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── GET /api/credentials ──────────────────────────────────────────────────────
describe('GET /api/credentials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns empty array when no credentials exist', async () => {
    const { GET } = await import('@/app/api/credentials/route');
    const req = await makeAuthRequest('/api/credentials', 'GET');
    const res = await GET(req);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data).toEqual([]);
  });

  it('decrypts and returns credentials', async () => {
    const encUsername = encryptField('alice');
    const encPassword = encryptField('secret123');

    vi.mocked(prisma.credential.findMany).mockResolvedValueOnce([
      {
        id: 'cred-1',
        userId: 'user-test-id',
        name: 'Test Site',
        url: null,
        username: encUsername,
        password: encPassword,
        passwordFingerprint: 'fp123',
        notes: null,
        category: 'General',
        tags: [],
        scope: 'personal',
        teamId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        team: null,
      } as never,
    ]);

    const { GET } = await import('@/app/api/credentials/route');
    const req = await makeAuthRequest('/api/credentials', 'GET');
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.data[0].username).toBe('alice');
    expect(json.data[0].password).toBe('secret123');
  });

  it('returns 401 without a valid session', async () => {
    const { GET } = await import('@/app/api/credentials/route');
    const req = new NextRequest('http://localhost/api/credentials', { method: 'GET' });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

// ── POST /api/credentials ─────────────────────────────────────────────────────
describe('POST /api/credentials', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a credential and returns 201', async () => {
    const created = {
      id: 'new-cred',
      userId: 'user-test-id',
      name: 'GitHub',
      url: 'https://github.com',
      username: encryptField('bob'),
      password: encryptField('StrongPass1!'),
      passwordFingerprint: 'fp',
      notes: null,
      category: 'Development',
      tags: [],
      scope: 'personal',
      teamId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.mocked(prisma.credential.create).mockResolvedValueOnce(created as never);

    const { POST } = await import('@/app/api/credentials/route');
    const req = await makeAuthRequest('/api/credentials', 'POST', {
      name: 'GitHub',
      url: 'https://github.com',
      username: 'bob',
      password: 'StrongPass1!',
      category: 'Development',
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(prisma.credential.create).toHaveBeenCalledOnce();
  });

  it('returns 400 for weak password', async () => {
    const { POST } = await import('@/app/api/credentials/route');
    const req = await makeAuthRequest('/api/credentials', 'POST', {
      name: 'Test',
      username: 'user',
      password: '123',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await import('@/app/api/credentials/route');
    const req = await makeAuthRequest('/api/credentials', 'POST', {
      username: 'user',
      password: 'StrongPass1!',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
