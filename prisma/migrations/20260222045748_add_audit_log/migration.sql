-- CreateEnum
CREATE TYPE "ActorType" AS ENUM ('ADMIN', 'VOTER', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LogCategory" AS ENUM ('AUTH', 'VOTE', 'ELECTION', 'POSITION', 'CANDIDATE', 'PARTYLIST', 'VOTER_MGMT', 'ADMIN_MGMT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "LogSeverity" AS ENUM ('INFO', 'WARNING', 'ERROR');

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorType" "ActorType" NOT NULL,
    "actorId" TEXT,
    "actorName" TEXT,
    "action" TEXT NOT NULL,
    "category" "LogCategory" NOT NULL,
    "severity" "LogSeverity" NOT NULL DEFAULT 'INFO',
    "targetType" TEXT,
    "targetId" TEXT,
    "targetName" TEXT,
    "detail" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "AuditLog"("timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_category_idx" ON "AuditLog"("category");

-- CreateIndex
CREATE INDEX "AuditLog_severity_idx" ON "AuditLog"("severity");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
