import HeaderBox from "@/components/ui/HeaderBox";
import RecentTransactions from "@/components/ui/RecentTransactions";
import RightSideBar from "@/components/ui/RightSideBar";
import TotalBalanceBox from "@/components/ui/TotalBalanceBox";
import { getAccount, getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { redirect } from "next/navigation";
import React from "react";

const Home = async ({ searchParams }: SearchParamProps) => {
  const { id, page } = await searchParams;
  const currentPage = Number(page as string) || 1;
  const loggedIn = await getLoggedInUser();

  // ✅ ADD DEBUG LOG HERE
  console.log("🔍 Search params:", { id, page });
  console.log("🔍 Selected account ID:", id);

  const accounts = await getAccounts({ userId: loggedIn.$id });

  if (!accounts) return;

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
