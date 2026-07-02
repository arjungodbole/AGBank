import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { createTransfer as createDwollaTransfer } from "@/lib/actions/dwolla.actions";
import { createTransaction } from "@/lib/actions/transaction.actions";
import { getBanks } from "@/lib/actions/user.actions";

const SETTLEMENT_NOTE = "Group session settlement";

type PlayerState = {
  id: string;
  userId: string;
  userName: string;
  status: string;
  buyIns: Array<{ amount: number }>;
  cashOuts: Array<{ amount: number }>;
};

type Participant = {
  player: PlayerState;
  bank: Bank;
  remaining: number;
};

type TransferLog = {
  from?: string;
  to?: string;
  amount?: string;
  status: "success" | "failed" | "skipped";
  reason?: string;
};

const parsePlayerDocuments = (docs: any[]): PlayerState[] =>
  docs.map((doc) => ({
    ...doc,
    buyIns: JSON.parse(doc.buyIns || "[]"),
    cashOuts: JSON.parse(doc.cashOuts || "[]"),
  }));

const sumEntries = (entries: Array<{ amount: number }>): number =>
  entries.reduce((sum, entry) => sum + Number(entry?.amount ?? 0), 0);

const roundCurrency = (value: number) => Number(value.toFixed(2));

const selectFundedBank = (banks?: any[] | null) =>
  banks?.find((bank) => bank?.fundingSourceUrl) ?? null;

const cache = new Map<string, any>();

const getPrimaryBank = async (userId: string) => {
  if (!userId) return null;

  if (cache.has(userId)) {
    return cache.get(userId);
  }

  try {
    const banks = await getBanks({ userId });
    const bank = selectFundedBank(banks);
    cache.set(userId, bank);
    return bank;
  } catch (error) {
    cache.set(userId, null);
    return null;
  }
};

const recordSettlementTransaction = async (
  amount: string,
  sender: Participant,
  receiver: Participant
) => {
  await createTransaction({
    name: SETTLEMENT_NOTE,
    amount,
    senderId: sender.player.userId,
    senderBankId: sender.bank.id,
    recieverId: receiver.player.userId,
    recieverBankId: receiver.bank.id,
    email: "settlements@agb.bank",
  });
};

const settleBalances = async (players: PlayerState[]): Promise<TransferLog[]> => {
  const payers: Participant[] = [];
  const payees: Participant[] = [];
  const logs: TransferLog[] = [];

  await Promise.all(
    players.map(async (player) => {
      const totalBuyIns = sumEntries(player.buyIns);
      const totalCashOuts = sumEntries(player.cashOuts);
      const net = roundCurrency(totalCashOuts - totalBuyIns);

      if (Math.abs(net) < 0.01) {
        return;
      }

      const bank = await getPrimaryBank(player.userId);

      if (!bank || !bank.fundingSourceUrl) {
        logs.push({
          status: "skipped",
          reason: "Missing linked funding source",
          from: net < 0 ? player.userId : undefined,
          to: net > 0 ? player.userId : undefined,
        });
        return;
      }

      const participant: Participant = {
        player,
        bank,
        remaining: Math.abs(net),
      };

      if (net > 0) {
        payees.push(participant);
      } else {
        payers.push(participant);
      }
    })
  );

  let payerIndex = 0;
  let payeeIndex = 0;

  while (payerIndex < payers.length && payeeIndex < payees.length) {
    const payer = payers[payerIndex];
    const payee = payees[payeeIndex];
    const amount = roundCurrency(Math.min(payer.remaining, payee.remaining));

    if (amount <= 0) {
      if (payer.remaining <= 0.01) payerIndex += 1;
      if (payee.remaining <= 0.01) payeeIndex += 1;
      continue;
    }

    const amountStr = amount.toFixed(2);

    const transferLocation = await createDwollaTransfer({
      sourceFundingSourceUrl: payer.bank.fundingSourceUrl,
      destinationFundingSourceUrl: payee.bank.fundingSourceUrl,
      amount: amountStr,
    });

    if (transferLocation) {
      await recordSettlementTransaction(amountStr, payer, payee);
      logs.push({
        from: payer.player.userId,
        to: payee.player.userId,
        amount: amountStr,
        status: "success",
      });
    } else {
      logs.push({
        from: payer.player.userId,
        to: payee.player.userId,
        amount: amountStr,
        status: "failed",
        reason: "Dwolla transfer failed",
      });
    }

    payer.remaining = roundCurrency(payer.remaining - amount);
    payee.remaining = roundCurrency(payee.remaining - amount);

    if (payer.remaining <= 0.01) payerIndex += 1;
    if (payee.remaining <= 0.01) payeeIndex += 1;
  }

  return logs;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params;

    // Get game
    const game = await prisma.game.findFirst({
      where: { groupId },
    });

    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    // Get players
    const playerRows = await prisma.player.findMany({
      where: { gameId: game.id },
    });

    const players = parsePlayerDocuments(playerRows);

    // Calculate total pool
    const totalPool = players.reduce((sum: number, player: PlayerState) => {
      if (player.status === "active") {
        return sum + sumEntries(player.buyIns);
      }
      return sum;
    }, 0);

    return NextResponse.json({
      id: game.id,
      groupId: game.groupId,
      name: game.name,
      hostUserId: game.hostUserId,
      status: game.status,
      players,
      totalPool,
      chipDenominations: JSON.parse(game.chipDenominations || "[]"),
    });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { action, hostUserId } = await request.json();
    const { groupId } = await params;

    if (action === "end_session") {
      // Get game
      const game = await prisma.game.findFirst({
        where: { groupId },
      });

      if (!game) {
        return NextResponse.json({ error: "Game not found" }, { status: 404 });
      }

      if (game.hostUserId !== hostUserId) {
        return NextResponse.json(
          { error: "Only the host can end the game" },
          { status: 403 }
        );
      }

      const playerRows = await prisma.player.findMany({
        where: { gameId: game.id },
      });

      const players = parsePlayerDocuments(playerRows);

      const transfers = await settleBalances(players);

      await prisma.game.update({
        where: { id: game.id },
        data: {
          status: "ended",
          endedAt: new Date().toISOString(),
        },
      });

      return NextResponse.json({ success: true, transfers });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
