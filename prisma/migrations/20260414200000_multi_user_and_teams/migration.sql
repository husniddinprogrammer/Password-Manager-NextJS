-- AlterTable: add new user fields (nullable so existing rows are not broken)
ALTER TABLE "User" ADD COLUMN "username" TEXT;
ALTER TABLE "User" ADD COLUMN "email" TEXT;
ALTER TABLE "User" ADD COLUMN "displayName" TEXT;
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'member';

-- CreateIndex (unique, nullable columns allow multiple NULLs in PostgreSQL)
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AlterTable Credential: add scope + teamId
ALTER TABLE "Credential" ADD COLUMN "scope" TEXT NOT NULL DEFAULT 'personal';
ALTER TABLE "Credential" ADD COLUMN "teamId" TEXT;

-- CreateTable Team
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable TeamMember
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex unique composite
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- AddForeignKey Team.ownerId -> User
ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey TeamMember.teamId -> Team
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey TeamMember.userId -> User
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey Credential.teamId -> Team
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
