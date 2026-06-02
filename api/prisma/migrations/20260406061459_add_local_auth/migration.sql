-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT,
ALTER COLUMN "provider" SET DEFAULT 'local',
ALTER COLUMN "providerId" DROP NOT NULL;
