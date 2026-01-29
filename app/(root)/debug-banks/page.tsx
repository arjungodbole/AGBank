import { getLoggedInUser } from "@/lib/actions/user.actions";
import { getBanks } from "@/lib/actions/user.actions";
import { getAccounts } from "@/lib/actions/bank.actions";

const DebugBanks = async () => {
  const loggedIn = await getLoggedInUser();

  if (!loggedIn) {
    return <div>Not logged in</div>;
  }

  console.log("User data:", loggedIn);
  console.log("User dwollaCustomerId:", loggedIn.dwollaCustomerId);

  // Check raw banks from database
  const rawBanks = await getBanks({ userId: loggedIn.$id });
  console.log("Raw banks from DB:", rawBanks);

  // Check processed accounts with detailed error handling
  let accountsError: Error | null = null;
  let accounts = null;

  try {
    accounts = await getAccounts({ userId: loggedIn.$id });
  } catch (error) {
    accountsError = error as Error;
  }
  console.log("Processed accounts:", accounts);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Bank Connection Debug</h1>

      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">User Info:</h2>
          <p>User ID: {loggedIn.$id}</p>
          <p>Email: {loggedIn.email}</p>
          <p>Dwolla Customer ID: {loggedIn.dwollaCustomerId || "MISSING"}</p>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Raw Banks from Database:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(rawBanks, null, 2)}
          </pre>
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Processed Accounts:</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(accounts, null, 2)}
          </pre>
          {accountsError && (
            <div className="mt-2 p-2 bg-red-100 rounded">
              <p className="text-red-700 font-semibold">Error:</p>
              <pre className="text-xs text-red-600">
                {String(accountsError)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-gray-100 p-4 rounded">
          <h2 className="font-semibold">Environment Variables Check:</h2>
          <p>
            NEXT_PUBLIC_APPWRITE_ENDPOINT:{" "}
            {process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ? "✓ Set" : "✗ Missing"}
          </p>
          <p>
            NEXT_PUBLIC_APPWRITE_PROJECT:{" "}
            {process.env.NEXT_PUBLIC_APPWRITE_PROJECT ? "✓ Set" : "✗ Missing"}
          </p>
          <p>
            PLAID_CLIENT_ID:{" "}
            {process.env.PLAID_CLIENT_ID ? "✓ Set" : "✗ Missing"}
          </p>
          <p>
            PLAID_SECRET: {process.env.PLAID_SECRET ? "✓ Set" : "✗ Missing"}
          </p>
          <p>DWOLLA_ENV: {process.env.DWOLLA_ENV ? "✓ Set" : "✗ Missing"}</p>
          <p>DWOLLA_KEY: {process.env.DWOLLA_KEY ? "✓ Set" : "✗ Missing"}</p>
          <p>
            APPWRITE_DATABASE_ID:{" "}
            {process.env.APPWRITE_DATABASE_ID ? "✓ Set" : "✗ Missing"}
          </p>
          <p>
            APPWRITE_BANK_COLLECTION_ID:{" "}
            {process.env.APPWRITE_BANK_COLLECTION_ID ? "✓ Set" : "✗ Missing"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DebugBanks;
