import HeaderBox from "@/components/ui/HeaderBox";
import RecentTransactions from "@/components/ui/RecentTransactions";
import RightSideBar from "@/components/ui/RightSideBar";
import TotalBalanceBox from "@/components/ui/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";
import Link from "next/link";
const Home = async ({ searchParams }: SearchParamProps) => {
  const { id, page } = await searchParams;
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();

  console.log("🔍 Bank ID from URL:", id);

  // Get accounts first
  const accounts = await getAccounts({ userId: loggedIn.$id });

  if (!accounts || !accounts.data || accounts.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">No Banks Connected</h1>
        <p className="mb-4">Connect a bank account to view reports.</p>
        <Link
          href="/connect-bank"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Connect Bank
        </Link>
      </div>
    );
  }

  // If no ID provided, redirect to first account
  if (!id) {
    const firstAccountId = accounts.data[0]?.appwriteItemId;
    if (firstAccountId) {
      return redirect(`/reports?id=${firstAccountId}`);
    } else {
      return <div>Error: No valid account found</div>;
    }
  }

  // ✅ ADD DEBUG LOG HERE
  console.log("🔍 Search params:", { id, page });
  console.log("🔍 Selected account ID:", id);

  const accountsData = accounts?.data;

  // ✅ ADD DEBUG LOG HERE
  console.log(
    "🏦 Available accounts:",
    accountsData?.map((acc: any) => ({
      id: acc.appwriteItemId,
      name: acc.name,
      balance: acc.currentBalance,
    }))
  );

  const appwriteItemId = (id as string) || accountsData[0]?.appwriteItemId;

  // ✅ ADD DEBUG LOG HERE
  console.log("🎯 Fetching account with ID:", appwriteItemId);

  const account = await getAccount({ appwriteItemId });

  // ✅ ADD DEBUG LOG HERE
  console.log(
    "📊 Account data returned:",
    account?.data
      ? {
          name: account.data.name,
          balance: account.data.currentBalance,
          transactionCount: account.transactions?.length,
        }
      : "No account data"
  );

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Welcome"
            user={loggedIn?.firstName || "Guest"}
            subtext="Access and manage your account and transactions efficiently"
          />

          <TotalBalanceBox
            accounts={accountsData}
            totalBanks={accounts?.totalBanks}
            totalCurrentBalance={accounts?.totalCurrentBalance}
          />
        </header>
        <RecentTransactions
          accounts={accountsData}
          transactions={account?.transactions}
          appwriteItemId={appwriteItemId}
        />
      </div>

      <RightSideBar
        user={loggedIn}
        transactions={account?.transactions}
        banks={accountsData?.slice(0, 2)}
      />
    </section>
  );
};

export default Home;
