import { describe, it, expect } from 'vitest';

const getAuth = () => import('../lib/auth');

describe('createToken / verifyToken', () => {
  it('creates a token and verifies the userId', async () => {
    const { createToken, verifyToken } = await getAuth();
    const token = await createToken('user-123');
    const payload = await verifyToken(token);
    expect(payload.userId).toBe('user-123');
  });

  it('rejects a tampered token', async () => {
    const { createToken, verifyToken } = await getAuth();
    const token = await createToken('user-abc');
    const [h, p, s] = token.split('.');
    const tampered = `${h}.${p}.${s}xxxx`;
    await expect(verifyToken(tampered)).rejects.toThrow();
  });

  it('rejects a token signed with a different secret', async () => {
    const { SignJWT } = await import('jose');
    const { verifyToken } = await getAuth();
    const wrongKey = new TextEncoder().encode('wrong-secret');
    const bad = await new SignJWT({ userId: 'evil' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(wrongKey);
    await expect(verifyToken(bad)).rejects.toThrow();
  });

  it('throws on invalid payload (missing userId)', async () => {
    const { verifyToken } = await getAuth();
    // Craft a token where userId is a number instead of string
    const { SignJWT } = await import('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
    const token = await new SignJWT({ userId: 999 })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('8h')
      .sign(secret);
    await expect(verifyToken(token)).rejects.toThrow('Invalid token payload');
  });
});

describe('rate-limit', () => {
  it('allows requests within the limit', async () => {
    const { rateLimit } = await import('../lib/server/rate-limit');
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(`test-key-${Date.now()}-${i}`, 5, 60_000)).toBe(true);
    }
  });

  it('blocks after max attempts', async () => {
    const { rateLimit } = await import('../lib/server/rate-limit');
    const key = `block-test-${Date.now()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
  });

  it('resets the counter after resetRateLimit', async () => {
    const { rateLimit, resetRateLimit } = await import('../lib/server/rate-limit');
    const key = `reset-test-${Date.now()}`;
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000)).toBe(false);
    resetRateLimit(key);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
  });
});

describe('Zod schemas', () => {
  it('loginSchema rejects empty identifier', async () => {
    const { loginSchema } = await import('../lib/server/schemas');
    const result = loginSchema.safeParse({ identifier: '', masterPassword: 'pass' });
    expect(result.success).toBe(false);
  });

  it('registerSchema rejects invalid username', async () => {
    const { registerSchema } = await import('../lib/server/schemas');
    const result = registerSchema.safeParse({
      username: 'A B',
      email: 'a@b.com',
      masterPassword: 'longpassword',
    });
    expect(result.success).toBe(false);
  });

  it('registerSchema rejects short master password', async () => {
    const { registerSchema } = await import('../lib/server/schemas');
    const result = registerSchema.safeParse({
      username: 'alice',
      email: 'alice@example.com',
      masterPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('credentialCreateSchema rejects missing name', async () => {
    const { credentialCreateSchema } = await import('../lib/server/schemas');
    const result = credentialCreateSchema.safeParse({
      username: 'user',
      password: 'pass',
    });
    expect(result.success).toBe(false);
  });
});
