"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BankTabItem } from "./BankTabItem";
import BankInfo from "./BankInfo";
import TransactionsTable from "./TransactionsTable";
import { Pagination } from "./Pagination";
import { getAccount } from "@/lib/actions/bank.actions";

// Custom pagination component for account-specific pagination
const AccountPagination = ({
  accountId,
  totalPages,
  currentPage,
  onPageChange,
}: {
  accountId: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (accountId: string, page: number) => void;
}) => {
  const handleNavigation = (type: "prev" | "next") => {
    const newPage = type === "prev" ? currentPage - 1 : currentPage + 1;
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(accountId, newPage);
    }
  };

  return (
    <div className="flex justify-between gap-3">
      <button
        onClick={() => handleNavigation("prev")}
        disabled={currentPage <= 1}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 19l-7-7 7-7"
          />
        </svg>
        Prev
      </button>
      <p className="text-14 flex items-center px-2">
        {currentPage} / {totalPages}
      </p>
      <button
        onClick={() => handleNavigation("next")}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Next
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5l7 7-7 7"
          />
        </svg>
      </button>
    </div>
  );
};

const RecentTransactions = ({
  accounts,
  transactions = [],
  appwriteItemId,
}: RecentTransactionsProps) => {
  const router = useRouter();
  const [accountTransactions, setAccountTransactions] = useState<{
    [key: string]: any[];
  }>({});
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});
  const [accountPages, setAccountPages] = useState<{ [key: string]: number }>(
    {}
  );

  console.log("🎯 RecentTransactions INPUT:", {
    transactionsReceived: transactions?.length || 0,
    transactionsType: Array.isArray(transactions),
    firstTransaction: transactions?.[0],
    appwriteItemId,
  });

  // Fetch transactions for each account
  useEffect(() => {
    const fetchAccountTransactions = async (accountId: string) => {
      if (accountTransactions[accountId] || loading[accountId]) return;

      console.log("🔍 Fetching transactions for account:", accountId);
      setLoading((prev) => ({ ...prev, [accountId]: true }));

      try {
        const accountData = await getAccount({ appwriteItemId: accountId });
        console.log("📊 Account data for", accountId, ":", {
          hasData: !!accountData,
          transactionCount: accountData?.transactions?.length || 0,
        });

        if (accountData?.transactions) {
          setAccountTransactions((prev) => ({
            ...prev,
            [accountId]: accountData.transactions,
          }));
          console.log(
            "✅ Transactions set for account:",
            accountId,
            "Count:",
            accountData.transactions.length
          );
        }
      } catch (error) {
        console.error(
          "❌ Error fetching transactions for account:",
          accountId,
          error
        );
      } finally {
        setLoading((prev) => ({ ...prev, [accountId]: false }));
      }
    };

    // Fetch transactions for all accounts
    accounts.forEach((account: Account) => {
      fetchAccountTransactions(account.appwriteItemId);
    });
  }, [accounts]);

  const handleTabChange = (accountId: string) => {
    console.log("🔄 Tab changed to account:", accountId, "resetting to page 1");
    setAccountPages((prev) => ({ ...prev, [accountId]: 1 }));
    router.push(`/reports?id=${accountId}&page=1`);
  };

  const handlePageChange = (accountId: string, newPage: number) => {
    console.log("🔄 Page changed for account:", accountId, "to page:", newPage);
    setAccountPages((prev) => ({ ...prev, [accountId]: newPage }));
  };

  return (
    <div>
      <section className="recent-transactions">
        <header className="flex items-center justify-between">
          <h2 className="recent-transactions-label">Recent transactions</h2>
          <Link
            href={`/transaction-history/?id=${appwriteItemId}`}
            className="view-all-btn"
          >
            View all
          </Link>
        </header>
        <Tabs
          defaultValue={appwriteItemId}
          value={appwriteItemId} // ✅ Add controlled value
          onValueChange={handleTabChange} // ✅ Add this handler
          className="w-full"
        >
          <TabsList className="recent-transactions-tablist">
            {accounts.map((account: Account) => (
              <TabsTrigger key={account.id} value={account.appwriteItemId}>
                <BankTabItem
                  key={account.id}
                  account={account}
                  appwriteItemId={appwriteItemId}
                />
              </TabsTrigger>
            ))}
          </TabsList>
          {accounts.map((account: Account) => {
            const accountTransactionsList =
              accountTransactions[account.appwriteItemId] || [];
            const rowsPerPage = 10;
            const totalPages = Math.ceil(
              accountTransactionsList.length / rowsPerPage
            );
            // Use account-specific page state, default to 1
            const currentPage = accountPages[account.appwriteItemId] || 1;
            const indexOfLastTransaction = currentPage * rowsPerPage;
            const indexOfFirstTransaction =
              indexOfLastTransaction - rowsPerPage;
            const currentTransactions = accountTransactionsList.slice(
              indexOfFirstTransaction,
              indexOfLastTransaction
            );

            console.log(
              "📊 Rendering tab for account:",
              account.appwriteItemId,
              {
                accountName: account.name,
                transactionCount: accountTransactionsList.length,
                currentTransactionsCount: currentTransactions.length,
                currentPage,
                totalPages,
                accountPages: accountPages[account.appwriteItemId],
                isLoading: loading[account.appwriteItemId],
                isCurrentTab: account.appwriteItemId === appwriteItemId,
              }
            );

            return (
              <TabsContent
                value={account.appwriteItemId}
                key={account.id}
                className="space-y-4"
              >
                <BankInfo
                  account={account}
                  appwriteItemId={appwriteItemId}
                  type="full"
                />
                {loading[account.appwriteItemId] ? (
                  <div className="flex items-center justify-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : (
                  <>
                    <TransactionsTable transactions={currentTransactions} />
                    {totalPages > 1 && (
                      <div className="my-4 w-full">
                        <AccountPagination
                          accountId={account.appwriteItemId}
                          totalPages={totalPages}
                          currentPage={currentPage}
                          onPageChange={handlePageChange}
                        />
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      </section>
    </div>
  );
};

export default RecentTransactions;
