import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

function getCredentialKey(): Buffer {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret) {
    throw new Error('CREDENTIALS_SECRET environment variable is required');
  }

  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptField(plaintext: string): string {
  if (!plaintext) return '';

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getCredentialKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join('.');
}

export function decryptField(payload: string): string {
  if (!payload) return '';

  const [ivBase64, tagBase64, encryptedBase64] = payload.split('.');
  if (!ivBase64 || !tagBase64 || !encryptedBase64) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getCredentialKey(),
    Buffer.from(ivBase64, 'base64')
  );
  decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function encryptCredentialFields(input: {
  username: string;
  password: string;
  notes?: string | null;
}) {
  return {
    username: encryptField(input.username),
    password: encryptField(input.password),
    notes: input.notes ? encryptField(input.notes) : null,
  };
}

export function decryptCredentialFields(input: {
  username: string;
  password: string;
  notes?: string | null;
}) {
  return {
    username: decryptField(input.username),
    password: decryptField(input.password),
    notes: input.notes ? decryptField(input.notes) : null,
  };
}

export function passwordFingerprint(password: string): string {
  const secret = process.env.CREDENTIALS_SECRET;
  if (!secret) {
    throw new Error('CREDENTIALS_SECRET environment variable is required');
  }

  return crypto.createHmac('sha256', secret).update(password).digest('hex');
}
