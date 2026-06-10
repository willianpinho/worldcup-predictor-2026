-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Prediction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "matchId" INTEGER NOT NULL,
    "model" TEXT NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'web',
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
INSERT INTO "new_Prediction" ("confidence", "createdAt", "id", "matchId", "model", "predA", "predB", "probDraw", "probWinA", "probWinB", "reasoning", "updatedAt") SELECT "confidence", "createdAt", "id", "matchId", "model", "predA", "predB", "probDraw", "probWinA", "probWinB", "reasoning", "updatedAt" FROM "Prediction";
DROP TABLE "Prediction";
ALTER TABLE "new_Prediction" RENAME TO "Prediction";
CREATE UNIQUE INDEX "Prediction_matchId_model_condition_key" ON "Prediction"("matchId", "model", "condition");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
