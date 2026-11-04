CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "entityId" TEXT,
    "actionTab" TEXT NOT NULL DEFAULT 'DASHBOARD',
    "eventKey" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "notifications_userId_eventKey_key" ON "notifications"("userId", "eventKey");
CREATE INDEX "notifications_companyId_userId_resolvedAt_createdAt_idx" ON "notifications"("companyId", "userId", "resolvedAt", "createdAt");
CREATE INDEX "notifications_companyId_type_resolvedAt_idx" ON "notifications"("companyId", "type", "resolvedAt");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
