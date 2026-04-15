/**
 * Integration tests for auth API routes (login, register, unlock).
 * Prisma is mocked so no real DB is needed.
 */
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-long-enough-for-hs256!!';
  process.env.CREDENTIALS_SECRET = 'test-credential-secret-long-enough-32b!!';
});

// ── mock Prisma ───────────────────────────────────────────────────────────────
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    activityLog: { create: vi.fn().mockResolvedValue({}) },
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ set: vi.fn(), delete: vi.fn() }),
}));

import { prisma } from '@/lib/prisma';

function post(path: string, body: unknown) {
  return new NextRequest(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 when identifier is missing', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(post('/api/auth/login', { masterPassword: 'pass' }));
    expect(res.status).toBe(400);
  });

  it('returns 401 for unknown user', async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce(null);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(
      post('/api/auth/login', { identifier: 'ghost', masterPassword: 'pass' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 401 for wrong password', async () => {
    const hash = await bcrypt.hash('correct', 4);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'u1', username: 'alice', email: null, displayName: null,
      role: 'member', masterHash: hash, createdAt: new Date(),
    } as never);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(
      post('/api/auth/login', { identifier: 'alice', masterPassword: 'wrong' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 200 and user data on success', async () => {
    const hash = await bcrypt.hash('correct', 4);
    vi.mocked(prisma.user.findFirst).mockResolvedValueOnce({
      id: 'u1', username: 'alice', email: 'a@b.com', displayName: 'Alice',
      role: 'member', masterHash: hash, createdAt: new Date(),
    } as never);
    const { POST } = await import('@/app/api/auth/login/route');
    const res = await POST(
      post('/api/auth/login', { identifier: 'alice', masterPassword: 'correct' })
    );
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.user.username).toBe('alice');
    expect(json.user).not.toHaveProperty('masterHash');
  });
});

// ── POST /api/auth/register ───────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 400 for invalid username', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(
      post('/api/auth/register', {
        username: 'A B!',
        email: 'test@test.com',
        masterPassword: 'StrongPass1!',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 400 for short master password', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(
      post('/api/auth/register', {
        username: 'alice',
        email: 'alice@test.com',
        masterPassword: 'short',
      })
    );
    expect(res.status).toBe(400);
  });

  it('returns 409 when username is taken', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'existing' } as never);
    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(
      post('/api/auth/register', {
        username: 'alice',
        email: 'new@test.com',
        masterPassword: 'StrongPass1!',
      })
    );
    expect(res.status).toBe(409);
  });

  it('returns 201 on successful registration', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.user.create).mockResolvedValueOnce({
      id: 'new-user', username: 'bob', email: 'bob@test.com',
      displayName: 'Bob', role: 'member', masterHash: 'hash', createdAt: new Date(),
    } as never);
    const { POST } = await import('@/app/api/auth/register/route');
    const res = await POST(
      post('/api/auth/register', {
        username: 'bob',
        email: 'bob@test.com',
        masterPassword: 'StrongPass1!',
      })
    );
    expect(res.status).toBe(201);
  });
});
