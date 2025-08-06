"use server";
import { Client, Account, Databases, Users } from "node-appwrite";
import { cookies } from "next/headers";

export async function createSessionClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!);

  const session = await (await cookies()).get("appwrite-session");
  if (!session || !session.value) {
    throw new Error("No session");
  }

  client.setSession(session.value);

  return {
    get account() {
      return new Account(client);
    },
  };
}

export async function createAdminClient() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    .setKey(process.env.NEXT_APPWRITE_KEY!);

  console.log("🔍 Debug Environment Variables:");
  console.log("Endpoint:", process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
  console.log("Project:", process.env.NEXT_PUBLIC_APPWRITE_PROJECT);
  console.log("API Key exists:", !!process.env.NEXT_APPWRITE_KEY);
  console.log("API Key prefix:", process.env.NEXT_APPWRITE_KEY?.substring(0, 20) + "...");
  console.log("Database ID:", process.env.APPWRITE_DATABASE_ID);
  console.log("Transaction Collection ID:", process.env.APPWRITE_TRANSACTION_COLLECTION_ID);
  console.log("Bank Collection ID:", process.env.APPWRITE_BANK_COLLECTION_ID);

  return {
    get account() {
      return new Account(client);
    },
    get database(){
        return new Databases(client);
    },
    get user(){
        return new Users(client);
    }
  };
}


