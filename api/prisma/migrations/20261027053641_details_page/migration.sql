-- CreateTable
CREATE TABLE "DetailsPage" (
    "id" TEXT NOT NULL,
    "headerEyebrow" TEXT,
    "headerTitle" TEXT,
    "location" TEXT,
    "showAddToCalendar" BOOLEAN NOT NULL DEFAULT true,
    "ctaEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ctaHeading" TEXT,
    "ctaSubtext" TEXT,
    "ctaButtonLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DetailsPage_pkey" PRIMARY KEY ("id")
);
