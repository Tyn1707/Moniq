-- CreateTable
CREATE TABLE "holdings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shares" DECIMAL NOT NULL,
    "avgBuyPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "holdings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "price_cache" (
    "symbol" TEXT NOT NULL PRIMARY KEY,
    "price" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "previousClose" DECIMAL,
    "shortName" TEXT,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "holdings_userId_idx" ON "holdings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "holdings_userId_symbol_key" ON "holdings"("userId", "symbol");
