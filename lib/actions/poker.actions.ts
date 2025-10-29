"use server";

interface CreatePokerSessionParams {
  createdBy: string;
  referralCode: string;
}

// Example stub. Replace with your real DB call / persistence logic
export async function createPokerSession({
  createdBy,
  referralCode,
}: CreatePokerSessionParams) {
  // Save to your database
  const session = {
    id: Math.random().toString(36).substring(2, 9), // temporary unique id
    createdBy,
    referralCode,
    createdAt: new Date(),
  };

  // TODO: Replace with real database insert, e.g. using Prisma, Mongo, etc.

  return session;
}