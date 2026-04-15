-- Create enum types
CREATE TYPE "UserRole" AS ENUM ('admin', 'member');
CREATE TYPE "CredentialScope" AS ENUM ('personal', 'team');
CREATE TYPE "ActivityAction" AS ENUM (
  'CREDENTIAL_CREATED',
  'CREDENTIAL_UPDATED',
  'CREDENTIAL_DELETED',
  'CREDENTIAL_VIEWED',
  'PASSWORD_COPIED',
  'USERNAME_COPIED',
  'VAULT_UNLOCKED',
  'VAULT_LOCKED',
  'MASTER_PASSWORD_CHANGED',
  'VAULT_EXPORTED',
  'VAULT_IMPORTED'
);

-- Migrate User.role: TEXT -> UserRole enum
ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "UserRole"
  USING "role"::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'member'::"UserRole";

-- Migrate Credential.scope: TEXT -> CredentialScope enum
ALTER TABLE "Credential" ALTER COLUMN "scope" DROP DEFAULT;
ALTER TABLE "Credential"
  ALTER COLUMN "scope" TYPE "CredentialScope"
  USING "scope"::"CredentialScope";
ALTER TABLE "Credential" ALTER COLUMN "scope" SET DEFAULT 'personal'::"CredentialScope";

-- Migrate ActivityLog.action: TEXT -> ActivityAction enum
ALTER TABLE "ActivityLog"
  ALTER COLUMN "action" TYPE "ActivityAction"
  USING "action"::"ActivityAction";

-- Add performance indexes
CREATE INDEX "Credential_userId_idx" ON "Credential"("userId");
CREATE INDEX "Credential_scope_idx" ON "Credential"("scope");
CREATE INDEX "Credential_passwordHash_idx" ON "Credential"("passwordHash");
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");
