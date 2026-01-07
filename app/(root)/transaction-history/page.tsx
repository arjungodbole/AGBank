import HeaderBox from "@/components/ui/HeaderBox";
import { Pagination } from "@/components/ui/Pagination";
import TransactionsTable from "@/components/ui/TransactionsTable";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { formatAmount } from "@/lib/utils";
import React from "react";

const TransactionHistory = async ({ searchParams }: SearchParamProps) => {
  const { id, page } = await searchParams;
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ userId: loggedIn.$id });

  const accountsData = accounts?.data;
  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;
  const account = await getAccount({ appwriteItemId });

  if (!account || !account.data) {
    return (
      <section className="home">
        <div className="home-content">
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Account data not available</p>
          </div>
        </div>
      </section>
    );
  }

  const transactions = account.transactions || [];
  const rowsPerPage = 10;
  const totalPages = Math.ceil(transactions.length / rowsPerPage);

  const indexOfLastTransaction = currentPage * rowsPerPage;
  const indexOfFirstTransaction = indexOfLastTransaction - rowsPerPage;

  const currentTransactions = transactions.slice(
    indexOfFirstTransaction,
    indexOfLastTransaction
  );

  if (!accounts) return;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Transaction History"
            user={loggedIn?.firstName || "Guest"}
            subtext="See your bank details and transactions."
          />
        </header>

        <div className="space-y-6">
          <div className="transactions-account">
            <div className="flex flex-col gap-2">
              <h2 className="text-18 font-bold text-white">
                {account.data.name}
              </h2>
              <p className="text-14 text-blue-25">
                {account.data.officialName}
              </p>
              <p className="text-14 font-semibold tracking-[1.1px] text-white">
                ●●●● ●●●● ●●●● {account.data.mask}
              </p>
            </div>
            <div className="transactions-account-balance">
              <p className="text-14">Current Balance</p>
              <p className="text-24 text-center font-bold">
                {formatAmount(account.data.currentBalance)}
              </p>
            </div>
          </div>
          <section className="flex w-full flex-col gap-6">
            <TransactionsTable transactions={currentTransactions} />

            {totalPages > 1 && (
              <div className="my-4 w-full">
                <Pagination totalPages={totalPages} page={currentPage} />
              </div>
            )}
          </section>
        </div>
      </div>
    </section>
  );
};

export default TransactionHistory;
