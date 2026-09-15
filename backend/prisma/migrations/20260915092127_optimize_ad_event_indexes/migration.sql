-- DropIndex
DROP INDEX "AdEvent_campaignId_idx";

-- DropIndex
DROP INDEX "AdEvent_createdAt_idx";

-- DropIndex
DROP INDEX "AdEvent_eventType_idx";

-- DropIndex
DROP INDEX "AdEvent_userId_idx";

-- CreateIndex
CREATE INDEX "AdEvent_campaignId_eventType_createdAt_idx" ON "AdEvent"("campaignId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "AdEvent_userId_campaignId_eventType_createdAt_idx" ON "AdEvent"("userId", "campaignId", "eventType", "createdAt");
