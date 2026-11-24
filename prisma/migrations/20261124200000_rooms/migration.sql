-- CreateEnum
CREATE TYPE "LobbyStatus" AS ENUM ('WAITING', 'RUNNING', 'FINISHED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TEACHER';

-- AlterTable
ALTER TABLE "GameSession" ADD COLUMN     "lobbyId" UUID;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleSub" TEXT,
ADD COLUMN     "isGuest" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Lobby" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "hostId" UUID NOT NULL,
    "campaignId" UUID,
    "title" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "LobbyStatus" NOT NULL DEFAULT 'WAITING',
    "maxPlayers" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Lobby_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LobbyPlayer" (
    "id" UUID NOT NULL,
    "lobbyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionId" UUID,
    "nickname" TEXT NOT NULL,
    "color" INTEGER NOT NULL DEFAULT 0,
    "kicked" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dir" TEXT NOT NULL DEFAULT 'down',
    "moving" BOOLEAN NOT NULL DEFAULT false,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "phrase" TEXT,
    "phraseAt" TIMESTAMP(3),
    "progress" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,
    "outcome" "SessionOutcome",
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,

    CONSTRAINT "LobbyPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lobby_organizationId_createdAt_idx" ON "Lobby"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Lobby_code_idx" ON "Lobby"("code");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPlayer_sessionId_key" ON "LobbyPlayer"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPlayer_lobbyId_userId_key" ON "LobbyPlayer"("lobbyId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "LobbyPlayer_lobbyId_nickname_key" ON "LobbyPlayer"("lobbyId", "nickname");

-- CreateIndex
CREATE INDEX "GameSession_lobbyId_idx" ON "GameSession"("lobbyId");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lobby" ADD CONSTRAINT "Lobby_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_lobbyId_fkey" FOREIGN KEY ("lobbyId") REFERENCES "Lobby"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LobbyPlayer" ADD CONSTRAINT "LobbyPlayer_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A code may be reused once its room is finished.
CREATE UNIQUE INDEX "Lobby_open_code_key" ON "Lobby"("code") WHERE "status" <> 'FINISHED';
