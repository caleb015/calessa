-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN     "guestId" TEXT;

-- CreateTable
CREATE TABLE "GallerySettings" (
    "id" TEXT NOT NULL,
    "uploadsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "heading" TEXT,
    "subtext" TEXT,
    "buttonLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GallerySettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryImage_guestId_idx" ON "GalleryImage"("guestId");

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
