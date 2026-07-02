/*
  Warnings:

  - Added the required column `groupId` to the `Game` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gameId` to the `Player` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Game" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "groupId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "chipDenominations" TEXT NOT NULL
);
INSERT INTO "new_Game" ("chipDenominations", "createdAt", "hostUserId", "id", "name", "status") SELECT "chipDenominations", "createdAt", "hostUserId", "id", "name", "status" FROM "Game";
DROP TABLE "Game";
ALTER TABLE "new_Game" RENAME TO "Game";
CREATE TABLE "new_Player" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "buyIns" TEXT NOT NULL,
    "cashOuts" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "joinedAt" TEXT NOT NULL
);
INSERT INTO "new_Player" ("buyIns", "cashOuts", "id", "joinedAt", "status", "userId", "userName") SELECT "buyIns", "cashOuts", "id", "joinedAt", "status", "userId", "userName" FROM "Player";
DROP TABLE "Player";
ALTER TABLE "new_Player" RENAME TO "Player";
CREATE TABLE "new_Transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderBankId" TEXT NOT NULL,
    "recieverId" TEXT NOT NULL,
    "recieverBankId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "channel" TEXT,
    "category" TEXT
);
INSERT INTO "new_Transaction" ("amount", "category", "channel", "email", "id", "recieverBankId", "recieverId", "senderBankId", "senderId") SELECT "amount", "category", "channel", "email", "id", "recieverBankId", "recieverId", "senderBankId", "senderId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
