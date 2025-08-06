"use server";

import { ID, Query } from "node-appwrite";
import { createAdminClient, createSessionClient } from "../appwrite";
import { cookies } from "next/headers";
import { encryptId, extractCustomerIdFromUrl, parseStringify } from "../utils";
import {
  CountryCode,
  ProcessorTokenCreateRequest,
  ProcessorTokenCreateRequestProcessorEnum,
  Products,
} from "plaid";
import { plaidClient } from "@/lib/plaid";
import { revalidatePath } from "next/cache";
import { addFundingSource, createDwollaCustomer } from "./dwolla.actions";

const {
  APPWRITE_DATABASE_ID: DATABASE_ID,
  APPWRITE_USER_COLLECTION_ID: USER_COLLECTION_ID,
  APPWRITE_BANK_COLLECTION_ID: BANK_COLLECTION_ID,
} = process.env;

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const { database } = await createAdminClient();

    const user = await database.listDocuments(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    return parseStringify(user.documents[0]);
  } catch (error) {
    console.log(error);
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    const user = await getUserInfo({ userId: session.userId });

    return parseStringify(response);
  } catch (error) {
    console.error("Error", error);
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  let newUserAccount;

  try {
    const { account, database } = await createAdminClient();

    newUserAccount = await account.create(
      ID.unique(),
      email,
      password,
      `${firstName} ${lastName}`
    );

    if (!newUserAccount) throw new Error("Error creating user");

    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });

    if (!dwollaCustomerUrl) throw new Error("Error creating Dwolla customer");

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const newUser = await database.createDocument(
      DATABASE_ID!,
      USER_COLLECTION_ID!,
      ID.unique(),
      {
        ...userData,
        userId: newUserAccount.$id,
        dwollaCustomerId,
        dwollaCustomerUrl,
      }
    );

    const session = await account.createEmailPasswordSession(email, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return parseStringify(newUser);
  } catch (error) {
    console.error("Error", error);
  }
};

// ... your initilization functions

export async function getLoggedInUser() {
  try {
    const { account } = await createSessionClient();
    const result = await account.get();

    const user = await getUserInfo({ userId: result.$id });

    return parseStringify(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const { account } = await createSessionClient();

    (await cookies()).delete("appwrite-session");

    await account.deleteSession("current");
  } catch (error) {
    return null;
  }
};

export const createLinkToken = async (user: User) => {
  try {
    const tokenParams = {
      user: {
        client_user_id: user.$id,
      },
      client_name: "AGBank", // ← Change this line!
      products: ["auth", "transactions"] as Products[],
      language: "en",
      country_codes: ["US"] as CountryCode[],
    };

    const response = await plaidClient.linkTokenCreate(tokenParams);

    return parseStringify({ linkToken: response.data.link_token });
  } catch (error: any) {
    // Add better error logging to see what Plaid is actually rejecting
    console.error("❌ Plaid Error Details:", error.response?.data);
    console.error("❌ Status:", error.response?.status);
    console.error("❌ Full Error:", error);
    throw error;
  }
};
export const createBankAccount = async ({
  userId,
  bankId,
  accountID,
  accessToken,
  fundingSourceUrl,
  shareableId,
}: createBankAccountProps) => {
  console.log("📝 Creating bank account with data:", {
    userId,
    bankId,
    accountId: accountID,
    accessToken: !!accessToken,
    fundingSourceUrl,
    shareableId,
  }); // ← Add this

  try {
    const { database } = await createAdminClient();

    const bankAccount = await database.createDocument(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      ID.unique(),
      {
        userId,
        bankId,
        accountID, // ← Make sure this matches your Appwrite field name
        accessToken,
        fundingSourceUrl,
        shareableId,
      }
    );
    console.log("✅ Bank document created successfully:", bankAccount.$id); // ← Add this
    return parseStringify(bankAccount);
  } catch (error) {
    console.error("❌ Error creating bank document:", error); // ← Add this
    throw error; // ← Add this
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  console.log("🔄 Starting exchangePublicToken..."); // ← Add this
  console.log("📝 User:", user.$id); // ← Add this
  console.log("🔑 Public token exists:", !!publicToken); // ← Add this

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log("✅ Plaid exchange successful"); // ← Add this

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    console.log("🔐 Access token received:", !!accessToken); // ← Add this
    console.log("🏦 Item ID:", itemId); // ← Add this

    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    console.log("💳 Accounts response:", accountsResponse.data); // ← Add this

    const accountData = accountsResponse.data.accounts[0];
    console.log("📊 Account data:", accountData); // ← Add this

    const request: ProcessorTokenCreateRequest = {
      access_token: accessToken,
      account_id: accountData.account_id,
      processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
    };

    const processorTokenResponse = await plaidClient.processorTokenCreate(
      request
    );
    const processorToken = processorTokenResponse.data.processor_token;
    console.log("🏭 Processor token created"); // ← Add this

    const fundingSourceUrl = await addFundingSource({
      dwollaCustomerId: user.dwollaCustomerId,
      processorToken,
      bankName: accountData.name,
    });
    console.log("💰 Funding source URL:", fundingSourceUrl); // ← Add this

    if (!fundingSourceUrl) throw Error;

    console.log("🏦 About to create bank account..."); // ← Add this
    const bankAccount = await createBankAccount({
      userId: user.$id,
      bankId: itemId,
      accountID: accountData.account_id,
      accessToken,
      fundingSourceUrl,
      shareableId: encryptId(accountData.account_id),
    });
    console.log("✅ Bank account created:", bankAccount); // ← Add this

    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
    });
  } catch (error) {
    console.error("❌ Error in exchangePublicToken:", error); // ← Improve this
    throw error; // ← Add this to see the actual error
  }
};

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const { database } = await createAdminClient();

    const banks = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("userId", [userId])]
    );

    return parseStringify(banks.documents);
  } catch (error) {
    console.log(error);
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const { database } = await createAdminClient();

    if (!documentId) {
      console.log("No document ID provided");
      return null;
    }

    console.log("Searching for bank with ID:", documentId);

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("$id", documentId)]
    );

    if (bank.documents.length === 0) {
      console.log("No bank found with ID:", documentId);
      return null;
    }

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error in getBank:", error);
    return null;
  }
};

export const getBankByAccountId = async ({
  accountId,
}: getBankByAccountIdProps) => {
  try {
    const { database } = await createAdminClient();

    if (!accountId) {
      console.log("No document ID provided");
      return null;
    }

    const bank = await database.listDocuments(
      DATABASE_ID!,
      BANK_COLLECTION_ID!,
      [Query.equal("accountID", accountId)]
    );

    if (bank.documents.length === 0) {
      console.log("No bank found with ID:", accountId);
      return null;
    }

    return parseStringify(bank.documents[0]);
  } catch (error) {
    console.error("Error in getBank:", error);
    return null;
  }
};
