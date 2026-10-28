-- AlterTable
ALTER TABLE "WeddingEvent" ADD COLUMN     "tagline" TEXT,
ALTER COLUMN "type" DROP NOT NULL;

-- Carry existing labels over to the new field. Only fills empty taglines; "type" values are kept.
UPDATE "WeddingEvent" SET "tagline" = "type" WHERE "tagline" IS NULL AND "type" IS NOT NULL;
