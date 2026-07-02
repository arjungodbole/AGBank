"use server";

import { prisma } from "@/lib/prisma";

export const createTransaction = async (transaction: CreateTransactionProps) => {
  try {
    const documentData = {
      channel: "online",
      category: "Transfer",
      ...transaction,
    };

    const newTransaction = await prisma.transaction.create({
      data: documentData,
    });

    return newTransaction;
  } catch (error: any) {
    console.error("❌ createTransaction failed:", error?.message || error);
    return null;
  }
};

export const getTransactionsByBankId = async ({
  bankId,
}: getTransactionsByBankIdProps) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        OR: [{ senderBankId: bankId }, { recieverBankId: bankId }],
      },
    });

    return {
      total: transactions.length,
      documents: transactions,
    };
  } catch (error) {
    return {
      total: 0,
      documents: [],
    };
  }
};
