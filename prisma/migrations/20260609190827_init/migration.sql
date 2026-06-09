-- CreateTable
CREATE TABLE "Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extId" TEXT,
    "groupName" TEXT NOT NULL,
    "teamA" TEXT NOT NULL,
    "teamB" TEXT NOT NULL,
    "venue" TEXT,
    "city" TEXT,
    "country" TEXT,
    "kickoff" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "predA" INTEGER NOT NULL,
    "predB" INTEGER NOT NULL,
    "probWinA" REAL,
    "probDraw" REAL,
    "probWinB" REAL,
    "confidence" TEXT,
    "reasoning" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Prediction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_extId_key" ON "Match"("extId");

-- CreateIndex
CREATE INDEX "Match_groupName_idx" ON "Match"("groupName");

-- CreateIndex
CREATE INDEX "Match_kickoff_idx" ON "Match"("kickoff");

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_matchId_model_key" ON "Prediction"("matchId", "model");
