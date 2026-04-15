-- Rename passwordHash to passwordFingerprint.
-- The field stores an HMAC fingerprint used for reuse detection,
-- not a password hash — the old name was misleading.
ALTER TABLE "Credential" RENAME COLUMN "passwordHash" TO "passwordFingerprint";

-- Update the index name to match the new column name
DROP INDEX IF EXISTS "Credential_passwordHash_idx";
CREATE INDEX "Credential_passwordFingerprint_idx" ON "Credential"("passwordFingerprint");
