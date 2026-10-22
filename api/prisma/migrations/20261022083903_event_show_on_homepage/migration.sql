-- AlterTable
ALTER TABLE "WeddingEvent" ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- Keep the existing ceremony/reception cards visible after this flag is introduced.
UPDATE "WeddingEvent" SET "showOnHomepage" = true WHERE lower(trim("type")) IN ('ceremony', 'reception');
