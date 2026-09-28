-- CreateTable
CREATE TABLE "reference_counters" (
    "scope" VARCHAR(20) NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reference_counters_pkey" PRIMARY KEY ("scope","year")
);
-- Custom: sane values only.
ALTER TABLE "reference_counters"
  ADD CONSTRAINT "reference_counters_value_check" CHECK ("value" >= 0),
  ADD CONSTRAINT "reference_counters_year_check" CHECK ("year" BETWEEN 2000 AND 2999);

-- Custom: continue numbering after any quote requests that already exist.
INSERT INTO "reference_counters" ("scope", "year", "value", "updated_at")
SELECT 'quote', CAST(split_part("reference_number", '-', 2) AS INTEGER), MAX(CAST(split_part("reference_number", '-', 3) AS INTEGER)), CURRENT_TIMESTAMP
FROM "quote_requests"
WHERE "reference_number" ~ '^Q-[0-9]{4}-[0-9]{6}$'
GROUP BY split_part("reference_number", '-', 2)
ON CONFLICT ("scope", "year") DO NOTHING;
