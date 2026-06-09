-- AlterTable
ALTER TABLE "WeddingSettings" ADD COLUMN     "requireUniqueTableNames" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requireUniqueTableNumbers" BOOLEAN NOT NULL DEFAULT false;
