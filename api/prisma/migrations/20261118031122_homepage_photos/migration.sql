-- AlterTable
ALTER TABLE "GalleryImage" ADD COLUMN     "showOnHomepage" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "WeddingSettings" ADD COLUMN     "rsvpBannerImageUrl" TEXT,
ADD COLUMN     "welcomeImageUrl" TEXT;
