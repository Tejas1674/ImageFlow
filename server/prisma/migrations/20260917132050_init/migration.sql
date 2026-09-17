-- CreateEnum
CREATE TYPE "ImageStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('JPEG', 'PNG', 'HEIC');

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFormat" "ImageFormat" NOT NULL,
    "originalMimeType" TEXT NOT NULL,
    "originalSizeBytes" INTEGER NOT NULL,
    "rawStorageKey" TEXT NOT NULL,
    "processedStorageKey" TEXT,
    "processedFormat" "ImageFormat",
    "width" INTEGER,
    "height" INTEGER,
    "status" "ImageStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReasons" JSONB,
    "perceptualHash" TEXT,
    "blurScore" DOUBLE PRECISION,
    "faceCount" INTEGER,
    "largestFaceAreaPct" DOUBLE PRECISION,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "duplicateOfImageId" TEXT,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Image_status_idx" ON "Image"("status");

-- CreateIndex
CREATE INDEX "Image_perceptualHash_idx" ON "Image"("perceptualHash");

-- CreateIndex
CREATE INDEX "Image_uploadedByUserId_idx" ON "Image"("uploadedByUserId");

-- CreateIndex
CREATE INDEX "Image_createdAt_idx" ON "Image"("createdAt");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_duplicateOfImageId_fkey" FOREIGN KEY ("duplicateOfImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
