/*
  Warnings:

  - You are about to drop the column `heroImagePosition` on the `WeddingSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WeddingSettings" DROP COLUMN "heroImagePosition",
ADD COLUMN     "heroImageHeight" INTEGER,
ADD COLUMN     "heroImageOffsetX" INTEGER,
ADD COLUMN     "heroImageOffsetY" INTEGER;
