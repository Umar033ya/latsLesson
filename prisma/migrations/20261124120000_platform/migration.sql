-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CodeKind" AS ENUM ('GROUP', 'PERSONAL');

-- CreateEnum
CREATE TYPE "SessionOutcome" AS ENUM ('ESCAPED', 'DISMISSED', 'DETAINED', 'TIMEOUT', 'LEFT');

-- AlterEnum
ALTER TYPE "OrganizationStatus" ADD VALUE 'INACTIVE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuestionType" ADD VALUE 'MULTI_SELECT';
ALTER TYPE "QuestionType" ADD VALUE 'TRUE_FALSE';
ALTER TYPE "QuestionType" ADD VALUE 'PUZZLE';

-- DropForeignKey
ALTER TABLE "GameResult" DROP CONSTRAINT "GameResult_subjectId_fkey";

-- DropForeignKey
ALTER TABLE "GameSession" DROP CONSTRAINT "GameSession_subjectId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "category" TEXT NOT NULL DEFAULT 'ADMIN',
ADD COLUMN     "ip" TEXT;

-- AlterTable
ALTER TABLE "GameAnswer" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "gateId" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "history" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "resolved" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "GameResult" ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "groupId" UUID,
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outcome" "SessionOutcome",
ALTER COLUMN "subjectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "campaignId" UUID,
ADD COLUMN     "checkpoint" JSONB,
ADD COLUMN     "checkpointSeq" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completionRequestId" TEXT,
ADD COLUMN     "config" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "flags" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "groupId" UUID,
ADD COLUMN     "hintsUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastSeenAt" TIMESTAMP(3),
ADD COLUMN     "maxScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outcome" "SessionOutcome",
ADD COLUMN     "slots" JSONB NOT NULL DEFAULT '[]',
ALTER COLUMN "subjectId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InvitationCode" ADD COLUMN     "groupId" UUID,
ADD COLUMN     "hint" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "kind" "CodeKind" NOT NULL DEFAULT 'GROUP',
ADD COLUMN     "label" TEXT,
ADD COLUMN     "lastUsedAt" TIMESTAMP(3),
ADD COLUMN     "studentId" UUID;

-- AlterTable
ALTER TABLE "Membership" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "groupId" UUID,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "note" TEXT,
ADD COLUMN     "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactName" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "internalNote" TEXT,
ADD COLUMN     "planId" UUID,
ADD COLUMN     "settings" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "subscriptionEndsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "hint" TEXT,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "RefreshToken" ADD COLUMN     "family" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "organizationId" UUID;

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "failedLogins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "homeOrganizationId" UUID,
ADD COLUMN     "lockedUntil" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Plan" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "maxStudents" INTEGER NOT NULL,
    "maxGroups" INTEGER NOT NULL,
    "maxCampaigns" INTEGER NOT NULL,
    "maxQuestions" INTEGER NOT NULL,
    "features" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" UUID,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCollection" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionQuestion" (
    "collectionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionQuestion_pkey" PRIMARY KEY ("collectionId","questionId")
);

-- CreateTable
CREATE TABLE "LearningMaterial" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "subjectId" UUID NOT NULL,
    "topicId" UUID,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "examples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "createdById" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "config" JSONB NOT NULL,
    "availableFrom" TIMESTAMP(3),
    "availableTo" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignGroup" (
    "campaignId" UUID NOT NULL,
    "groupId" UUID NOT NULL,

    CONSTRAINT "CampaignGroup_pkey" PRIMARY KEY ("campaignId","groupId")
);

-- CreateTable
CREATE TABLE "LaunchTicket" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "sessionId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LaunchTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Group_organizationId_name_key" ON "Group"("organizationId", "name");

-- CreateIndex
CREATE INDEX "QuestionCollection_organizationId_idx" ON "QuestionCollection"("organizationId");

-- CreateIndex
CREATE INDEX "CollectionQuestion_questionId_idx" ON "CollectionQuestion"("questionId");

-- CreateIndex
CREATE INDEX "LearningMaterial_organizationId_idx" ON "LearningMaterial"("organizationId");

-- CreateIndex
CREATE INDEX "LearningMaterial_subjectId_idx" ON "LearningMaterial"("subjectId");

-- CreateIndex
CREATE INDEX "Campaign_organizationId_status_idx" ON "Campaign"("organizationId", "status");

-- CreateIndex
CREATE INDEX "CampaignGroup_groupId_idx" ON "CampaignGroup"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "LaunchTicket_tokenHash_key" ON "LaunchTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "LaunchTicket_sessionId_idx" ON "LaunchTicket"("sessionId");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "GameResult_campaignId_idx" ON "GameResult"("campaignId");

-- CreateIndex
CREATE INDEX "InvitationCode_studentId_idx" ON "InvitationCode"("studentId");

-- CreateIndex
CREATE INDEX "InvitationCode_groupId_idx" ON "InvitationCode"("groupId");

-- CreateIndex
CREATE INDEX "Membership_groupId_idx" ON "Membership"("groupId");

-- CreateIndex
CREATE INDEX "Question_topicId_idx" ON "Question"("topicId");

-- CreateIndex
CREATE INDEX "RefreshToken_family_idx" ON "RefreshToken"("family");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeOrganizationId_fkey" FOREIGN KEY ("homeOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationCode" ADD CONSTRAINT "InvitationCode_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvitationCode" ADD CONSTRAINT "InvitationCode_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCollection" ADD CONSTRAINT "QuestionCollection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionQuestion" ADD CONSTRAINT "CollectionQuestion_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "QuestionCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionQuestion" ADD CONSTRAINT "CollectionQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignGroup" ADD CONSTRAINT "CampaignGroup_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchTicket" ADD CONSTRAINT "LaunchTicket_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LaunchTicket" ADD CONSTRAINT "LaunchTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameResult" ADD CONSTRAINT "GameResult_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

