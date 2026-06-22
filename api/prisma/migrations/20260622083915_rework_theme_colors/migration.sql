/*
  Warnings:

  - You are about to drop the column `themeRose` on the `WeddingSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "WeddingSettings" DROP COLUMN "themeRose",
ADD COLUMN     "themeInverseBackground" TEXT,
ADD COLUMN     "themeOverlayScrim" TEXT,
ADD COLUMN     "themeOverlayText" TEXT,
ADD COLUMN     "themeSurface" TEXT;
