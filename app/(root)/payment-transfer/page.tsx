import HeaderBox from "@/components/ui/HeaderBox";
import PaymentTransferForm from "@/components/ui/PaymentTransferForm";
import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import React from "react";

const Transfer = async () => {
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
            title="Payment Transfer"
            user={loggedIn?.firstName || "Guest"}
            subtext="Please provide any specific details or notes related to the payment transfer"
          />
        </header>

        <section className="size-full pt-5">
          <PaymentTransferForm accounts={accountsData} />
        </section>
      </div>
    </section>
  );
};

export default Transfer;
