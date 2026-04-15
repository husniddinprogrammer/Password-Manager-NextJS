/**
 * One-time migration: re-encrypts all credential fields from the legacy
 * SHA-256-derived key to the new HKDF-derived key.
 *
 * Run once after deploying the HKDF change:
 *   npx tsx scripts/migrate-credential-keys.ts
 *
 * Safe to re-run: credentials already on the new key will fail legacy
 * decryption and be skipped automatically.
 */

import 'dotenv/config';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const HKDF_INFO = Buffer.from('teamvault-credential-encryption-v1', 'utf8');

function legacyKey(): Buffer {
  const s = process.env.CREDENTIALS_SECRET!;
  return crypto.createHash('sha256').update(s).digest();
}

function newKey(): Buffer {
  const s = process.env.CREDENTIALS_SECRET!;
  return Buffer.from(
    crypto.hkdfSync('sha256', Buffer.from(s, 'utf8'), Buffer.alloc(0), HKDF_INFO, 32)
  );
}

function decryptGCM(payload: string, key: Buffer): string | null {
  try {
    const parts = payload.split('.');
    if (parts.length !== 3) return null;
    const [ivB64, tagB64, ctB64] = parts;
    const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    return null;
  }
}

function encryptGCM(plaintext: string, key: Buffer): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), encrypted.toString('base64')].join('.');
}

async function main() {
  if (!process.env.CREDENTIALS_SECRET) {
    console.error('CREDENTIALS_SECRET is not set');
    process.exit(1);
  }

  const oldKey = legacyKey();
  const nKey = newKey();

  const credentials = await prisma.credential.findMany({
    select: { id: true, username: true, password: true, notes: true },
  });

  console.log(`Found ${credentials.length} credentials to process…`);
  let migrated = 0;
  let skipped = 0;

  for (const cred of credentials) {
    const username = decryptGCM(cred.username, oldKey);
    const password = decryptGCM(cred.password, oldKey);

    if (username === null || password === null) {
      // Already on new key (or corrupted) — skip
      skipped++;
      continue;
    }

    const notes = cred.notes ? decryptGCM(cred.notes, oldKey) : null;

    await prisma.credential.update({
      where: { id: cred.id },
      data: {
        username: encryptGCM(username, nKey),
        password: encryptGCM(password, nKey),
        notes: notes !== null ? encryptGCM(notes, nKey) : null,
      },
    });
    migrated++;
  }

  console.log(`Done. Migrated: ${migrated}, Skipped (already new key): ${skipped}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
