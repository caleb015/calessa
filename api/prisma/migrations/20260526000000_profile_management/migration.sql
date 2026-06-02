-- Add name and primaryProvider to User
ALTER TABLE "User" ADD COLUMN "name" TEXT;
ALTER TABLE "User" ADD COLUMN "primaryProvider" TEXT NOT NULL DEFAULT 'local';

-- Backfill primaryProvider from existing provider column
UPDATE "User" SET "primaryProvider" = "provider";

-- Create LinkedProvider table
CREATE TABLE "LinkedProvider" (
  "id"         TEXT NOT NULL,
  "userId"     TEXT NOT NULL,
  "provider"   TEXT NOT NULL,
  "providerId" TEXT NOT NULL,
  "linkedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LinkedProvider_pkey" PRIMARY KEY ("id")
);

-- Backfill LinkedProvider from existing provider/providerId on User
INSERT INTO "LinkedProvider" ("id", "userId", "provider", "providerId")
SELECT gen_random_uuid()::text, "id", "provider", COALESCE("providerId", "id")
FROM "User";

-- Add foreign key and unique constraints
ALTER TABLE "LinkedProvider"
  ADD CONSTRAINT "LinkedProvider_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "LinkedProvider_provider_providerId_key" ON "LinkedProvider"("provider", "providerId");
CREATE UNIQUE INDEX "LinkedProvider_userId_provider_key" ON "LinkedProvider"("userId", "provider");

-- Drop old provider columns from User
ALTER TABLE "User" DROP COLUMN "provider";
ALTER TABLE "User" DROP COLUMN "providerId";
