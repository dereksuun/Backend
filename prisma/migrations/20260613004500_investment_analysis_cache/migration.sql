-- CreateTable
CREATE TABLE "InvestmentAnalysisCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "indexes" JSONB NOT NULL,
    "analysis" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentAnalysisCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InvestmentAnalysisCache_userId_ticker_inputHash_key" ON "InvestmentAnalysisCache"("userId", "ticker", "inputHash");

-- CreateIndex
CREATE INDEX "InvestmentAnalysisCache_userId_ticker_expiresAt_idx" ON "InvestmentAnalysisCache"("userId", "ticker", "expiresAt");

-- AddForeignKey
ALTER TABLE "InvestmentAnalysisCache" ADD CONSTRAINT "InvestmentAnalysisCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
