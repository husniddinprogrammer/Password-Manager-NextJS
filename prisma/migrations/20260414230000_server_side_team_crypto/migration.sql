CREATE TYPE "TeamRole" AS ENUM ('OWNER', 'MEMBER');

ALTER TABLE "Credential" ADD COLUMN "passwordHash" TEXT;

ALTER TABLE "TeamMember" ADD COLUMN "role_new" "TeamRole" NOT NULL DEFAULT 'MEMBER';

UPDATE "TeamMember"
SET "role_new" = CASE
  WHEN UPPER(COALESCE("role", 'MEMBER')) = 'OWNER' THEN 'OWNER'::"TeamRole"
  ELSE 'MEMBER'::"TeamRole"
END;

ALTER TABLE "TeamMember" DROP COLUMN "role";
ALTER TABLE "TeamMember" RENAME COLUMN "role_new" TO "role";
