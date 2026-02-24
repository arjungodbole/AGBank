"use server";

import { ID,Query } from "node-appwrite";
import { createAdminClient } from "../appwrite";
import { getLoggedInUser } from "./user.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
} = process.env;

const GAMES_COLLECTION_ID = process.env.GAMES_COLLECTION_ID!;

interface ChipDenomination {
  color: string;
  value: number;
}

interface CreateGroupParams {
  createdBy: string;
  name?: string;
  chipDenominations?: ChipDenomination[];
}

interface JoinGroupParams {
  userId: string;
  referralCode: string;
}

// Your existing function
export async function createGroup({ createdBy, name, chipDenominations = [] }: CreateGroupParams) {
  try {
    const { database } = await createAdminClient();
    
    // Use default name if none provided
    const groupName = name || "Poker Game";
    const groupId = Math.random().toString(36).slice(2, 10);
    
    // Create game in Appwrite
    const game = await database.createDocument(
      DATABASE_ID!,
      GAMES_COLLECTION_ID,
      ID.unique(),
      {
        groupId: groupId,
        name: groupName,
        hostUserId: createdBy,
        status: 'active',
        createdAt: new Date().toISOString(),
        chipDenominations: JSON.stringify(chipDenominations),
      }
    );
    
    return {
      id: groupId,
      name: groupName,
      createdBy,
      referralCode: groupId,
      chipDenominations,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create group. Please try again.");
  }
}

// Server action that works with FormData from your form
export async function createGroupFromForm(formData: FormData) {
  const name = formData.get("name") as string;
  const chipDenominationsRaw = formData.get("chipDenominations") as string;
  console.log("chipDenominationsRaw:", chipDenominationsRaw);
  const chipDenominations = chipDenominationsRaw
    ? JSON.parse(chipDenominationsRaw)
    : [];
  console.log("chipDenominations:", chipDenominations);

  const user = await getLoggedInUser();
  const createdBy = user.$id;

  try {
    const group = await createGroup({
      createdBy,
      name: name?.trim() || undefined,
      chipDenominations,
    });

    return group;
  } catch (error) {
    console.error(error);
    throw new Error("Failed to create group. Please try again.");
  }
}

export async function joinGroupWithReferral({ userId, referralCode }: JoinGroupParams) {
  try {
    const { database } = await createAdminClient();
    
    // Look up the game by groupId (which is used as referral code)
    const gamesResponse = await database.listDocuments(
      DATABASE_ID!,
      GAMES_COLLECTION_ID,
      [Query.equal('groupId', referralCode)]
    );
    
    if (gamesResponse.documents.length === 0) {
      throw new Error("Invalid referral code. Game not found.");
    }
    
    const game = gamesResponse.documents[0];
    
    if (game.status !== 'active') {
      throw new Error("This game has ended and is no longer accepting players.");
    }
    
    // Return the group info so user can be redirected
    return {
      id: game.groupId,
      name: game.name,
      referralCode: game.groupId,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to join group. Please check the referral code and try again.");
  }
}