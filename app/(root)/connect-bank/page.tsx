import HeaderBox from "@/components/ui/HeaderBox";
import PlaidLink from "@/components/ui/PlaidLink";
import { getLoggedInUser } from "@/lib/actions/user.actions";

const ConnectBank = async () => {
  const loggedIn = await getLoggedInUser();

  return (
    <section className="flex-center size-full max-xl:border-r max-xl:border-slate-100 xl:flex-start">
      <div className="flex w-full flex-1 flex-col max-md:gap-8 max-md:p-4 xl:justify-start">
        <HeaderBox
          type="title"
          title="Connect Bank"
          subtext="Link your bank account to get started"
        />

        <div className="flex flex-col gap-6">
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">
              Why connect your bank?
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li>• View all your transactions in one place</li>
              <li>• Track spending and categorize expenses</li>
              <li>• Get real-time balance updates</li>
              <li>• Transfer money between accounts</li>
            </ul>
          </div>

          <div className="flex justify-center">
            <PlaidLink user={loggedIn} variant="primary" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default ConnectBank;
