DROP INDEX IF EXISTS "Campaign_country_idx";
DROP INDEX IF EXISTS "Campaign_device_idx";

ALTER TABLE "Campaign"
RENAME COLUMN "country" TO "countries";

ALTER TABLE "Campaign"
ALTER COLUMN "countries"
TYPE TEXT[]
USING ARRAY["countries"];

ALTER TABLE "Campaign"
ALTER COLUMN "countries"
SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Campaign"
RENAME COLUMN "device" TO "devices";

ALTER TABLE "Campaign"
ALTER COLUMN "devices"
TYPE TEXT[]
USING ARRAY["devices"];

ALTER TABLE "Campaign"
ALTER COLUMN "devices"
SET DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "Campaign"
RENAME COLUMN "category" TO "categories";

ALTER TABLE "Campaign"
ALTER COLUMN "categories"
TYPE TEXT[]
USING (
  CASE
    WHEN "categories" IS NULL
      THEN ARRAY[]::TEXT[]
    ELSE ARRAY["categories"]
  END
);

ALTER TABLE "Campaign"
ALTER COLUMN "categories"
SET NOT NULL;

ALTER TABLE "Campaign"
ALTER COLUMN "categories"
SET DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "Campaign_countries_idx"
ON "Campaign"
USING GIN ("countries");

CREATE INDEX "Campaign_devices_idx"
ON "Campaign"
USING GIN ("devices");

CREATE INDEX "Campaign_categories_idx"
ON "Campaign"
USING GIN ("categories");
