CREATE TABLE "TimeLog" (
  "id" UUID NOT NULL,
  "organizationId" VARCHAR(100) NOT NULL,
  "projectId" VARCHAR(100) NOT NULL,
  "workItemId" INTEGER NOT NULL,
  "userId" VARCHAR(200) NOT NULL,
  "userDisplayName" VARCHAR(300) NOT NULL,
  "workDate" DATE NOT NULL,
  "hours" DECIMAL(5,2) NOT NULL,
  "activity" VARCHAR(100) NOT NULL,
  "note" VARCHAR(1000),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  "deletedAt" TIMESTAMPTZ(3),
  "version" INTEGER NOT NULL DEFAULT 1,
  "idempotencyKey" VARCHAR(100),
  CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeLog_organizationId_projectId_workItemId_workDate_idx"
  ON "TimeLog"("organizationId", "projectId", "workItemId", "workDate");
CREATE INDEX "TimeLog_userId_workDate_idx" ON "TimeLog"("userId", "workDate");
CREATE INDEX "TimeLog_organizationId_projectId_workDate_idx"
  ON "TimeLog"("organizationId", "projectId", "workDate");
CREATE UNIQUE INDEX "TimeLog_userId_idempotencyKey_key"
  ON "TimeLog"("userId", "idempotencyKey");

