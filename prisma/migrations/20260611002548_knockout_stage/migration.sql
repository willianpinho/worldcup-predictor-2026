-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Match" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "extId" TEXT,
    "stage" TEXT NOT NULL DEFAULT 'GROUP',
    "matchNum" INTEGER,
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
    "pensA" INTEGER,
    "pensB" INTEGER,
    "round" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Match" ("city", "country", "createdAt", "extId", "groupName", "id", "kickoff", "round", "scoreA", "scoreB", "status", "teamA", "teamB", "updatedAt", "venue") SELECT "city", "country", "createdAt", "extId", "groupName", "id", "kickoff", "round", "scoreA", "scoreB", "status", "teamA", "teamB", "updatedAt", "venue" FROM "Match";
DROP TABLE "Match";
ALTER TABLE "new_Match" RENAME TO "Match";
CREATE UNIQUE INDEX "Match_extId_key" ON "Match"("extId");
CREATE UNIQUE INDEX "Match_matchNum_key" ON "Match"("matchNum");
CREATE INDEX "Match_groupName_idx" ON "Match"("groupName");
CREATE INDEX "Match_kickoff_idx" ON "Match"("kickoff");
CREATE INDEX "Match_stage_idx" ON "Match"("stage");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
