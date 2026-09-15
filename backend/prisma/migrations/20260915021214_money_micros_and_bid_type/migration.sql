CREATE TYPE "BidType" AS ENUM ('CPI', 'CPC');

ALTER TABLE "Campaign"
ADD COLUMN "bidType" "BidType" NOT NULL DEFAULT 'CPI';

ALTER TABLE "Campaign"
RENAME COLUMN "totalBudget" TO "totalBudgetMicros";

ALTER TABLE "Campaign"
RENAME COLUMN "dailyBudget" TO "dailyBudgetMicros";

ALTER TABLE "Campaign"
RENAME COLUMN "bidPrice" TO "bidPriceMicros";

ALTER TABLE "Campaign"
RENAME COLUMN "spent" TO "spentMicros";

ALTER TABLE "Campaign"
ALTER COLUMN "spentMicros" DROP DEFAULT;

ALTER TABLE "Campaign"
ALTER COLUMN "totalBudgetMicros"
TYPE BIGINT
USING ROUND("totalBudgetMicros" * 1000000)::BIGINT;

ALTER TABLE "Campaign"
ALTER COLUMN "dailyBudgetMicros"
TYPE BIGINT
USING ROUND("dailyBudgetMicros" * 1000000)::BIGINT;

ALTER TABLE "Campaign"
ALTER COLUMN "bidPriceMicros"
TYPE BIGINT
USING ROUND("bidPriceMicros" * 1000000)::BIGINT;

ALTER TABLE "Campaign"
ALTER COLUMN "spentMicros"
TYPE BIGINT
USING ROUND("spentMicros" * 1000000)::BIGINT;

ALTER TABLE "Campaign"
ALTER COLUMN "spentMicros" SET DEFAULT 0;

ALTER TABLE "AdEvent"
RENAME COLUMN "cost" TO "costMicros";

ALTER TABLE "AdEvent"
ALTER COLUMN "costMicros" DROP DEFAULT;

ALTER TABLE "AdEvent"
ALTER COLUMN "costMicros"
TYPE BIGINT
USING ROUND("costMicros" * 1000000)::BIGINT;

ALTER TABLE "AdEvent"
ALTER COLUMN "costMicros" SET DEFAULT 0;
