-- CreateEnum
CREATE TYPE "InvestmentInstitution" AS ENUM ('B3', 'XP', 'INTER', 'NUBANK', 'ITAU', 'OTHER');

-- CreateEnum
CREATE TYPE "InvestmentImportStatus" AS ENUM ('PREVIEWED', 'CONFIRMED', 'NEEDS_REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvestmentMovementType" AS ENUM ('BUY', 'SELL', 'DIVIDEND', 'JCP', 'INCOME', 'POSITION', 'DEPOSIT', 'WITHDRAWAL', 'OTHER');

-- CreateTable
CREATE TABLE "InvestmentPlatform" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" "InvestmentInstitution" NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentAsset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "name" TEXT,
    "assetType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentImportBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platformId" TEXT,
    "institution" "InvestmentInstitution" NOT NULL,
    "fileType" TEXT NOT NULL,
    "status" "InvestmentImportStatus" NOT NULL DEFAULT 'PREVIEWED',
    "sourceHash" TEXT NOT NULL,
    "summary" JSONB NOT NULL,
    "issues" JSONB NOT NULL,
    "importedRows" JSONB NOT NULL,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentImportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT,
    "platformId" TEXT,
    "importBatchId" TEXT,
    "movementType" "InvestmentMovementType" NOT NULL,
    "assetType" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(65,30),
    "unitPriceCents" INTEGER,
    "totalCents" INTEGER NOT NULL,
    "feesCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "averagePriceCents" INTEGER NOT NULL DEFAULT 0,
    "investedCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPosition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPlatform_userId_institution_name_key" ON "InvestmentPlatform"("userId", "institution", "name");

-- CreateIndex
CREATE INDEX "InvestmentPlatform_userId_institution_idx" ON "InvestmentPlatform"("userId", "institution");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentAsset_userId_ticker_key" ON "InvestmentAsset"("userId", "ticker");

-- CreateIndex
CREATE INDEX "InvestmentAsset_userId_assetType_idx" ON "InvestmentAsset"("userId", "assetType");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentImportBatch_userId_sourceHash_key" ON "InvestmentImportBatch"("userId", "sourceHash");

-- CreateIndex
CREATE INDEX "InvestmentImportBatch_userId_createdAt_idx" ON "InvestmentImportBatch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "InvestmentMovement_userId_occurredAt_idx" ON "InvestmentMovement"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "InvestmentMovement_userId_movementType_idx" ON "InvestmentMovement"("userId", "movementType");

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentPosition_userId_assetId_platformId_key" ON "InvestmentPosition"("userId", "assetId", "platformId");

-- CreateIndex
CREATE INDEX "InvestmentPosition_userId_idx" ON "InvestmentPosition"("userId");

-- AddForeignKey
ALTER TABLE "InvestmentPlatform" ADD CONSTRAINT "InvestmentPlatform_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentAsset" ADD CONSTRAINT "InvestmentAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentImportBatch" ADD CONSTRAINT "InvestmentImportBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentImportBatch" ADD CONSTRAINT "InvestmentImportBatch_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "InvestmentPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentMovement" ADD CONSTRAINT "InvestmentMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentMovement" ADD CONSTRAINT "InvestmentMovement_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentMovement" ADD CONSTRAINT "InvestmentMovement_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "InvestmentPlatform"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentMovement" ADD CONSTRAINT "InvestmentMovement_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "InvestmentImportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "InvestmentAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPosition" ADD CONSTRAINT "InvestmentPosition_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "InvestmentPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;
