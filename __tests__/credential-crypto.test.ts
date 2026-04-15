import { describe, it, expect, beforeAll, vi } from 'vitest';

// Provide a test secret before importing the module
beforeAll(() => {
  process.env.CREDENTIALS_SECRET = 'test-secret-that-is-long-enough-for-hkdf-32-bytes!!';
});

// Dynamic import so env is set before module-level code runs
const getCrypto = () => import('../lib/server/credential-crypto');

describe('encryptField / decryptField', () => {
  it('round-trips a plain string', async () => {
    const { encryptField, decryptField } = await getCrypto();
    const original = 'hunter2';
    expect(decryptField(encryptField(original))).toBe(original);
  });

  it('produces different ciphertexts for the same input (random IV)', async () => {
    const { encryptField } = await getCrypto();
    const a = encryptField('same');
    const b = encryptField('same');
    expect(a).not.toBe(b);
  });

  it('returns empty string for empty input', async () => {
    const { encryptField, decryptField } = await getCrypto();
    expect(encryptField('')).toBe('');
    expect(decryptField('')).toBe('');
  });

  it('throws on tampered ciphertext', async () => {
    const { encryptField, decryptField } = await getCrypto();
    const ct = encryptField('secret');
    const tampered = ct.slice(0, -4) + 'XXXX';
    expect(() => decryptField(tampered)).toThrow();
  });

  it('throws on invalid payload format', async () => {
    const { decryptField } = await getCrypto();
    expect(() => decryptField('not-a-valid-payload')).toThrow('Invalid encrypted payload');
  });
});

describe('maybeDecryptField', () => {
  it('decrypts a valid GCM payload', async () => {
    const { encryptField, maybeDecryptField } = await getCrypto();
    const ct = encryptField('hello');
    expect(maybeDecryptField(ct)).toBe('hello');
  });

  it('returns the original string and warns when decryption fails (legacy plaintext)', async () => {
    const { maybeDecryptField } = await getCrypto();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = maybeDecryptField('plaintext-value');
    expect(result).toBe('plaintext-value');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('GCM decryption failed'));
    warnSpy.mockRestore();
  });

  it('returns empty string for null/undefined', async () => {
    const { maybeDecryptField } = await getCrypto();
    expect(maybeDecryptField(null)).toBe('');
    expect(maybeDecryptField(undefined)).toBe('');
  });
});

describe('encryptCredentialFields / decryptCredentialFields', () => {
  it('round-trips username, password, and notes', async () => {
    const { encryptCredentialFields, decryptCredentialFields } = await getCrypto();
    const input = { username: 'alice', password: 'P@ssw0rd!', notes: 'my note' };
    const enc = encryptCredentialFields(input);
    const dec = decryptCredentialFields(enc);
    expect(dec).toEqual({ username: 'alice', password: 'P@ssw0rd!', notes: 'my note' });
  });

  it('handles null notes', async () => {
    const { encryptCredentialFields, decryptCredentialFields } = await getCrypto();
    const enc = encryptCredentialFields({ username: 'bob', password: 'abc', notes: null });
    const dec = decryptCredentialFields(enc);
    expect(dec.notes).toBeNull();
  });
});

describe('passwordFingerprint', () => {
  it('returns the same HMAC for the same password', async () => {
    const { passwordFingerprint } = await getCrypto();
    expect(passwordFingerprint('secret')).toBe(passwordFingerprint('secret'));
  });

  it('returns different HMACs for different passwords', async () => {
    const { passwordFingerprint } = await getCrypto();
    expect(passwordFingerprint('abc')).not.toBe(passwordFingerprint('xyz'));
  });

  it('returns a 64-char hex string', async () => {
    const { passwordFingerprint } = await getCrypto();
    expect(passwordFingerprint('test')).toMatch(/^[0-9a-f]{64}$/);
  });
});
