-- CreateTable
CREATE TABLE "Campaign" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "landingPageUrl" TEXT NOT NULL,
    "totalBudget" DOUBLE PRECISION NOT NULL,
    "dailyBudget" DOUBLE PRECISION NOT NULL,
    "bidPrice" DOUBLE PRECISION NOT NULL,
    "country" TEXT NOT NULL,
    "device" TEXT NOT NULL,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdEvent" (
    "id" SERIAL NOT NULL,
    "eventId" TEXT NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Campaign_country_idx" ON "Campaign"("country");

-- CreateIndex
CREATE INDEX "Campaign_device_idx" ON "Campaign"("device");

-- CreateIndex
CREATE INDEX "Campaign_isActive_idx" ON "Campaign"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "AdEvent_eventId_key" ON "AdEvent"("eventId");

-- CreateIndex
CREATE INDEX "AdEvent_campaignId_idx" ON "AdEvent"("campaignId");

-- CreateIndex
CREATE INDEX "AdEvent_userId_idx" ON "AdEvent"("userId");

-- CreateIndex
CREATE INDEX "AdEvent_eventType_idx" ON "AdEvent"("eventType");

-- CreateIndex
CREATE INDEX "AdEvent_createdAt_idx" ON "AdEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "AdEvent" ADD CONSTRAINT "AdEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
