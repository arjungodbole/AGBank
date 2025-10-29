import BankCard from "@/components/ui/BankCard";
import HeaderBox from "@/components/ui/HeaderBox";
import RightSideBar from "@/components/ui/RightSideBar";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import React from "react";

const MyBank = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ userId: loggedIn.$id });

  if (!accounts) return;

  const accountsData = accounts?.data;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="My Bank Accounts"
            user={loggedIn?.firstName || "Guest"}
            subtext="Effortlessly manage your banking activities"
          />
        </header>

        <div className="space-y-4">
          <h2 className="header-2">Your Cards</h2>
          <div className="flex flex-wrap gap-6">
            {accountsData &&
              accountsData.map((account: Account) => (
                <BankCard
                  key={account.appwriteItemId}
                  account={account}
                  userName={loggedIn?.firstName}
                  showBalance={true}
                />
              ))}
          </div>
        </div>
      </div>

      <RightSideBar
        user={loggedIn}
        transactions={[]}
        banks={accountsData?.slice(0, 2)}
      />
    </section>
  );
};

export default MyBank;
