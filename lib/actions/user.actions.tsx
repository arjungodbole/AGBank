"use server";

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
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const SESSION_COOKIE = "appwrite-session";

// Compatibility shim: components still read `$id`, so mirror `id` -> `$id`.
const withId = (row: any) => ({ ...row, $id: row.id });

// Create a session row and store its id in the cookie.
const createSession = async (userId: string) => {
  const session = await prisma.session.create({ data: { userId } });
  (await cookies()).set(SESSION_COOKIE, session.id, {
    path: "/",
    httpOnly: true,
    sameSite: "strict",
    secure: true,
  });
};

export const getUserInfo = async ({ userId }: getUserInfoProps) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return user ? withId(user) : null;
  } catch (error) {
    return null;
  }
};

export const signIn = async ({ email, password }: signInProps) => {
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) return null;

    await createSession(user.id);

    return withId(user);
  } catch (error) {
    return null;
  }
};

export const signUp = async ({ password, ...userData }: SignUpParams) => {
  const { email, firstName, lastName } = userData;

  try {
    const dwollaCustomerUrl = await createDwollaCustomer({
      ...userData,
      type: "personal",
    });

    if (!dwollaCustomerUrl) {
      return null;
    }

    const dwollaCustomerId = extractCustomerIdFromUrl(dwollaCustomerUrl);

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        firstName,
        lastName,
        password: hashedPassword,
        dwollaCustomerId,
        dwollaCustomerUrl,
      },
    });

    await createSession(newUser.id);

    return withId(newUser);
  } catch (error) {
    console.error("signUp server error:", error);
    return null;
  }
};

export async function getLoggedInUser() {
  try {
    const sessionId = (await cookies()).get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) return null;

    return withId(user);
  } catch (error) {
    return null;
  }
}

export const logoutAccount = async () => {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

    if (sessionId) {
      await prisma.session.delete({ where: { id: sessionId } }).catch(() => {});
    }

    cookieStore.delete(SESSION_COOKIE);
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
    return null;
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
  try {
    const bankAccount = await prisma.bank.create({
      data: {
        userId,
        bankId,
        accountId: accountID, // column: incoming variable
        accessToken,
        fundingSourceUrl,
        shareableId,
      },
    });
    return bankAccount;
  } catch (error) {
    return null;
  }
};

export const exchangePublicToken = async ({
  publicToken,
  user,
}: exchangePublicTokenProps) => {
  try {
    console.log("Starting exchangePublicToken for user:", user.$id);
    console.log("Dwolla Customer ID:", user.dwollaCustomerId);

    // Check if user has Dwolla customer ID
    if (!user.dwollaCustomerId) {
      console.log("Missing Dwolla Customer ID - returning null");
      return null;
    }

    console.log("Exchanging public token...");
    const response = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });
    console.log("Plaid exchange response:", response.data);

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;
    console.log(
      "New access token generated:",
      accessToken ? "success" : "failed"
    );

    console.log("Getting accounts from Plaid...");
    const accountsResponse = await plaidClient.accountsGet({
      access_token: accessToken,
    });
    console.log("Plaid accounts response:", accountsResponse.data);
    console.log(
      "Number of accounts found:",
      accountsResponse.data.accounts.length
    );

    // Process all accounts, not just the first one
    const bankAccounts = [];
    for (const accountData of accountsResponse.data.accounts) {
      console.log("Processing account:", accountData.name, accountData.subtype);

      const request: ProcessorTokenCreateRequest = {
        access_token: accessToken,
        account_id: accountData.account_id,
        processor: "dwolla" as ProcessorTokenCreateRequestProcessorEnum,
      };

      const processorTokenResponse = await plaidClient.processorTokenCreate(
        request
      );
      const processorToken = processorTokenResponse.data.processor_token;

      const fundingSourceUrl = await addFundingSource({
        dwollaCustomerId: user.dwollaCustomerId,
        processorToken,
        bankName: accountData.name,
      });

      if (!fundingSourceUrl) {
        console.log(
          "Failed to create funding source for account:",
          accountData.name
        );
        continue; // Skip this account but continue with others
      }

      console.log("Creating bank account for:", accountData.name);
      const bankAccount = await createBankAccount({
        userId: user.$id,
        bankId: itemId,
        accountID: accountData.account_id,
        accessToken,
        fundingSourceUrl,
        shareableId: encryptId(accountData.account_id),
      });

      if (bankAccount) {
        bankAccounts.push(bankAccount);
        console.log("Bank account created successfully for:", accountData.name);
      }
    }
    console.log("Total bank accounts created:", bankAccounts.length);

    revalidatePath("/");

    return parseStringify({
      publicTokenExchange: "complete",
      accountsCreated: bankAccounts.length,
    });
  } catch (error) {
    console.log("Error in exchangePublicToken:", error);
    // Return null instead of throwing to avoid serialization issues
    return null;
  }
};

// Shim a bank row to the shape components expect ($id + accountID).
const shapeBank = (bank: any) => ({
  ...bank,
  $id: bank.id,
  accountID: bank.accountId,
});

export const getBanks = async ({ userId }: getBanksProps) => {
  try {
    const banks = await prisma.bank.findMany({ where: { userId } });
    return banks.map(shapeBank);
  } catch (error) {
    return null;
  }
};

export const getBank = async ({ documentId }: getBankProps) => {
  try {
    const bank = await prisma.bank.findUnique({ where: { id: documentId } });
    return bank ? shapeBank(bank) : null;
  } catch (error) {
    return null;
  }
};

export const getBankByAccountId = async ({
  accountId,
}: getBankByAccountIdProps) => {
  try {
    const bank = await prisma.bank.findFirst({ where: { accountId } });
    return bank ? shapeBank(bank) : null;
  } catch (error) {
    return null;
  }
};
