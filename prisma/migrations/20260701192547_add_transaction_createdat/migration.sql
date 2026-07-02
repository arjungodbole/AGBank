-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
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
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_Transaction" ("amount", "category", "channel", "email", "id", "name", "recieverBankId", "recieverId", "senderBankId", "senderId") SELECT "amount", "category", "channel", "email", "id", "name", "recieverBankId", "recieverId", "senderBankId", "senderId" FROM "Transaction";
DROP TABLE "Transaction";
ALTER TABLE "new_Transaction" RENAME TO "Transaction";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
