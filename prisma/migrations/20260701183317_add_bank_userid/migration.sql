/*
  Warnings:

  - Added the required column `userId` to the `Bank` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Bank" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bankId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "fundingSourceUrl" TEXT NOT NULL,
    "shareableId" TEXT NOT NULL
);
INSERT INTO "new_Bank" ("accessToken", "accountId", "bankId", "fundingSourceUrl", "id", "shareableId") SELECT "accessToken", "accountId", "bankId", "fundingSourceUrl", "id", "shareableId" FROM "Bank";
DROP TABLE "Bank";
ALTER TABLE "new_Bank" RENAME TO "Bank";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
