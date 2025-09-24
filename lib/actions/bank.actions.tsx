"use server";

import {
  ACHClass,
  CountryCode,
  TransferAuthorizationCreateRequest,
  TransferCreateRequest,
  TransferNetwork,
  TransferType,
} from "plaid";

import { parseStringify } from "../utils";

import { getTransactionsByBankId } from "./transaction.actions";
import { getBanks, getBank } from "./user.actions";
import { plaidClient } from "../plaid";

const getCategoryFromName = (name: string): string => {
  if (!name) return "Other";

  const lowerName = name.toLowerCase();

  // Food & Dining - broad food keywords
  const foodKeywords = [
    "restaurant",
    "cafe",
    "coffee",
    "pizza",
    "burger",
    "kitchen",
    "diner",
    "grill",
    "bistro",
    "bakery",
    "donut",
    "bagel",
    "sandwich",
    "taco",
    "sushi",
    "bar",
    "pub",
    "brewery",
    "food",
    "eat",
    "meal",
    "lunch",
    "dinner",
    "starbucks",
    "mcdonald",
    "subway",
    "domino",
    "kfc",
    "wendys",
    "chipotle",
  ];
  // Transportation - travel and transport
  const transportKeywords = [
    "uber",
    "lyft",
    "taxi",
    "cab",
    "airlines",
    "airport",
    "flight",
    "bus",
    "train",
    "metro",
    "transit",
    "parking",
    "gas",
    "fuel",
    "shell",
    "exxon",
    "chevron",
    "bp",
    "car",
    "automotive",
    "repair",
    "mechanic",
    "rental",
  ];

  // Shopping - retail and purchases
  const shoppingKeywords = [
    "amazon",
    "target",
    "walmart",
    "store",
    "shop",
    "retail",
    "mall",
    "clothing",
    "apparel",
    "shoes",
    "electronics",
    "computer",
    "phone",
    "market",
    "mart",
    "depot",
    "goods",
    "supply",
    "purchase",
    "buy",
  ];

  // Entertainment - fun and leisure
  const entertainmentKeywords = [
    "netflix",
    "spotify",
    "movie",
    "theater",
    "cinema",
    "game",
    "gaming",
    "entertainment",
    "music",
    "streaming",
    "subscription",
    "youtube",
    "hulu",
    "disney",
    "concert",
    "event",
    "ticket",
    "gym",
    "fitness",
  ];

  // Healthcare - medical and health
  const healthKeywords = [
    "hospital",
    "clinic",
    "doctor",
    "medical",
    "pharmacy",
    "cvs",
    "walgreens",
    "health",
    "dental",
    "vision",
    "prescription",
    "medicine",
    "care",
  ];

  // Bills & Utilities
  const billsKeywords = [
    "electric",
    "electricity",
    "water",
    "gas",
    "utility",
    "phone",
    "internet",
    "cable",
    "insurance",
    "rent",
    "mortgage",
    "loan",
    "bill",
    "payment",
    "service",
    "monthly",
    "subscription",
  ];

  // Banking & Finance
  const bankingKeywords = [
    "bank",
    "credit",
    "debit",
    "atm",
    "fee",
    "interest",
    "transfer",
    "payment",
    "deposit",
    "withdrawal",
    "finance",
    "investment",
  ];

  // Education
  const educationKeywords = [
    "school",
    "university",
    "college",
    "education",
    "tuition",
    "book",
    "student",
    "learning",
    "course",
    "class",
  ];

  // Check each category
  if (foodKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Food & Dining";
  }

  if (transportKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Transportation";
  }

  if (shoppingKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Shopping";
  }

  if (entertainmentKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Entertainment";
  }

  if (healthKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Healthcare";
  }

  if (billsKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Bills & Utilities";
  }

  if (bankingKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Banking";
  }

  if (educationKeywords.some((keyword) => lowerName.includes(keyword))) {
    return "Education";
  }

  // Default category
  return "Other";
};

// Get multiple bank accounts
export const getAccounts = async ({ userId }: getAccountsProps) => {
  try {
    // get banks from db
    const banks = await getBanks({ userId });

    const accounts = await Promise.all(
      banks?.map(async (bank: Bank) => {
        console.log("🔍 Attempting Plaid call with:", {
          accessToken: bank.accessToken?.substring(0, 10) + "...", // Log first 10 chars
          bankId: bank.id,
          plaidEnv: process.env.PLAID_ENV,
        });

        // get each account info from plaid
        const accountsResponse = await plaidClient.accountsGet({
          access_token: bank.accessToken,
        });
        const accountData = accountsResponse.data.accounts[0];

        // get institution info from plaid
        const institution = await getInstitution({
          institutionId: accountsResponse.data.item.institution_id!,
        });

        const account = {
          id: accountData.account_id,
          availableBalance: accountData.balances.available!,
          currentBalance: accountData.balances.current!,
          institutionId: institution.institution_id,
          name: accountData.name,
          officialName: accountData.official_name,
          mask: accountData.mask!,
          type: accountData.type as string,
          subtype: accountData.subtype! as string,
          appwriteItemId: bank.$id,
          shareableId: bank.shareableId,
        };

        return account;
      })
    );

    const totalBanks = accounts.length;
    const totalCurrentBalance = accounts.reduce((total, account) => {
      return total + account.currentBalance;
    }, 0);

    return parseStringify({ data: accounts, totalBanks, totalCurrentBalance });
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get one bank account
export const getAccount = async ({ appwriteItemId }: getAccountProps) => {
  try {
    console.log("🔍 Getting account for appwriteItemId:", appwriteItemId);

    // get bank from db
    const bank = await getBank({ documentId: appwriteItemId });

    if (!bank) {
      console.log("❌ No bank found with ID:", appwriteItemId);
      return { accountsData: [], account: null };
    }

    console.log("🏦 Bank found:", {
      id: bank.$id,
      accountID: bank.accountID,
      accountId: bank.accountId,
      hasAccessToken: !!bank.accessToken,
    });

    if (!bank.accessToken) {
      console.log("❌ Bank found but no access token");
      return { accountsData: [], account: null };
    }

    // get account info from plaid
    const accountsResponse = await plaidClient.accountsGet({
      access_token: bank.accessToken,
    });

    console.log("📊 Plaid accounts response:", {
      itemId: accountsResponse.data.item.item_id,
      institutionId: accountsResponse.data.item.institution_id,
      accountCount: accountsResponse.data.accounts.length,
      accounts: accountsResponse.data.accounts.map((acc) => ({
        id: acc.account_id,
        name: acc.name,
        type: acc.type,
        subtype: acc.subtype,
        mask: acc.mask,
      })),
    });

    const accountData = accountsResponse.data.accounts[0];

    // get transfer transactions from appwrite
    const transferTransactionsData = await getTransactionsByBankId({
      bankId: bank.$id,
    });

    console.log(
      "💸 Transfer transactions found:",
      transferTransactionsData?.documents?.length || 0
    );

    const transferTransactions =
      transferTransactionsData?.documents?.map((transferData: Transaction) => ({
        id: transferData.$id,
        name: transferData.name!,
        amount: transferData.amount!,
        date: transferData.$createdAt,
        paymentChannel: transferData.channel,
        category: transferData.category,
        type: transferData.senderBankId === bank.$id ? "debit" : "credit",
      })) || [];

    // get institution info from plaid
    const institution = await getInstitution({
      institutionId: accountsResponse.data.item.institution_id!,
    });

    const transactions = await getTransactions({
      accessToken: bank?.accessToken,
    });

    const transactionsArray = Array.isArray(transactions) ? transactions : [];

    // Filter transactions to only show transactions for the current account
    const filteredTransactions = transactionsArray.filter(
      (transaction) => transaction.accountId === bank.accountID
    );

    console.log("📊 Transactions filtered for account:", {
      totalTransactions: transactionsArray.length,
      filteredTransactions: filteredTransactions.length,
      targetAccountId: bank.accountID,
      transactionAccountIds: [
        ...new Set(transactionsArray.map((t) => t.accountId)),
      ],
    });

    console.log("📊 Plaid transactions found:", transactionsArray.length);

    // If no transactions found for this account, check if there are any transactions at all
    if (filteredTransactions.length === 0 && transactionsArray.length > 0) {
      console.log(
        "⚠️ No transactions found for account",
        bank.accountID,
        "but there are",
        transactionsArray.length,
        "total transactions"
      );
      console.log("📊 Available account IDs in transactions:", [
        ...new Set(transactionsArray.map((t) => t.accountId)),
      ]);
    }

    const account = {
      id: accountData.account_id,
      availableBalance: accountData.balances.available!,
      currentBalance: accountData.balances.current!,
      institutionId: institution.institution_id,
      name: accountData.name,
      officialName: accountData.official_name,
      mask: accountData.mask!,
      type: accountData.type as string,
      subtype: accountData.subtype! as string,
      appwriteItemId: bank.$id,
    };

    console.log("📊 Account data:", {
      id: account.id,
      name: account.name,
      type: account.type,
      subtype: account.subtype,
      balance: account.currentBalance,
      officialName: account.officialName,
    });

    // sort transactions by date such that the most recent transaction is first
    const allTransactions = [
      ...filteredTransactions, // ✅ Plaid transactions (filtered for current account)
      ...transferTransactions, // ✅ Appwrite transfer transactions
    ]
      .filter((transaction) => {
        // ✅ Filter out invalid transactions
        return (
          transaction &&
          transaction.id &&
          transaction.name &&
          !isNaN(transaction.amount) &&
          transaction.amount !== null &&
          transaction.amount !== undefined &&
          transaction.date &&
          transaction.date !== "Invalid Date" &&
          new Date(transaction.date).toString() !== "Invalid Date"
        );
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    console.log("📊 Final transaction count:", allTransactions.length);

    return parseStringify({
      data: account,
      transactions: allTransactions,
    });
  } catch (error) {
    console.error("❌ An error occurred while getting the account:", error);
    return null;
  }
};

// Get bank info
export const getInstitution = async ({
  institutionId,
}: getInstitutionProps) => {
  try {
    const institutionResponse = await plaidClient.institutionsGetById({
      institution_id: institutionId,
      country_codes: ["US"] as CountryCode[],
    });

    const intitution = institutionResponse.data.institution;

    return parseStringify(intitution);
  } catch (error) {
    console.error("An error occurred while getting the accounts:", error);
  }
};

// Get transactions
export const getTransactions = async ({
  accessToken,
}: getTransactionsProps) => {
  try {
    if (!accessToken) {
      console.log("❌ No access token provided");
      return parseStringify([]);
    }

    console.log(
      "🔍 Fetching transactions with access token:",
      accessToken.substring(0, 10) + "..."
    );

    // ✅ Get much wider date range
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: "2023-01-01", // ✅ Go back further
      end_date: "2025-12-31", // ✅ Future-proof end date
      //count: 500,               // ✅ Get up to 500 transactions
      //offset: 0,
    });

    console.log(
      `📊 Retrieved ${response.data.transactions.length} transactions`
    ); // ✅ Debug log

    // Log account IDs to see which accounts have transactions
    const accountIds = [
      ...new Set(response.data.transactions.map((t) => t.account_id)),
    ];
    console.log("🏦 Transaction account IDs:", accountIds);

    const transactions = response.data.transactions.map((transaction) => ({
      id: transaction.transaction_id,
      name: transaction.name,
      paymentChannel: transaction.payment_channel,
      type: transaction.payment_channel,
      accountId: transaction.account_id,
      amount: transaction.amount,
      pending: transaction.pending,
      category: getCategoryFromName(transaction.name),
      date: transaction.date,
      image: transaction.logo_url,
    }));

    console.log(
      "📊 Transaction categories from Plaid:",
      transactions.map((t) => ({
        name: t.name,
        category: t.category,
        accountId: t.accountId,
        amount: t.amount,
      }))
    );

    return parseStringify(transactions);
  } catch (error: any) {
    console.error("❌ Full Plaid error:", error);
    console.error("❌ Error response:", error.response?.data);
    console.error("❌ Error status:", error.response?.status);
    console.error("An error occurred while getting transactions:", error);
    return parseStringify([]);
  }
};

// Create Transfer
export const createTransfer = async () => {
  const transferAuthRequest: TransferAuthorizationCreateRequest = {
    access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
    account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
    funding_account_id: "442d857f-fe69-4de2-a550-0c19dc4af467",
    type: "credit" as TransferType,
    network: "ach" as TransferNetwork,
    amount: "10.00",
    ach_class: "ppd" as ACHClass,
    user: {
      legal_name: "Anne Charleston",
    },
  };
  try {
    const transferAuthResponse = await plaidClient.transferAuthorizationCreate(
      transferAuthRequest
    );
    const authorizationId = transferAuthResponse.data.authorization.id;

    const transferCreateRequest: TransferCreateRequest = {
      access_token: "access-sandbox-cddd20c1-5ba8-4193-89f9-3a0b91034c25",
      account_id: "Zl8GWV1jqdTgjoKnxQn1HBxxVBanm5FxZpnQk",
      description: "payment",
      authorization_id: authorizationId,
    };

    const responseCreateResponse = await plaidClient.transferCreate(
      transferCreateRequest
    );

    const transfer = responseCreateResponse.data.transfer;
    return parseStringify(transfer);
  } catch (error) {
    console.error(
      "An error occurred while creating transfer authorization:",
      error
    );
  }
};
