import HeaderBox from "@/components/ui/HeaderBox";

import { getAccounts } from "@/lib/actions/bank.actions";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import {
  createGroup,
  joinGroupWithReferral,
} from "@/lib/actions/group.actions";
import { redirect } from "next/navigation";
import CreateGroupForm from "@/components/ui/CreateGroupForm";
import JoinGroupForm from "@/components/ui/JoinGroupForm";

const handleCreateGroup = async (formData: FormData) => {
  "use server";

  const user = await getLoggedInUser();
  if (!user?.$id) throw new Error("You must be logged in to create a group.");

  const group = await createGroup({ createdBy: user.$id });
  redirect(`/groups/${group.id}`);
};

const handleJoinGroup = async (formData: FormData) => {
  "use server";

  const referralCode = (formData.get("referralCode") as string)
    ?.trim()
    .toUpperCase();
  if (!referralCode) throw new Error("Referral code is required.");

  const user = await getLoggedInUser();
  if (!user?.$id) throw new Error("You must be logged in to join a group.");

  const group = await joinGroupWithReferral({ userId: user.$id, referralCode });
  redirect(`/groups/${group.id}`);
};

const scan_chips = async () => {
  const loggedIn = await getLoggedInUser();
  const accounts = await getAccounts({ userId: loggedIn.$id });
  const accountsData = accounts?.data;

  return (
    <section className="home">
      <div className="home-content">
        <header className="home-header">
          <HeaderBox
            type="greeting"
            title="Join or create a group"
            user={loggedIn?.firstName || "Guest"}
            subtext="Use a referral code to join a poker session, or create your own"
          />
        </header>

        <div className=" space-y-4">
          <CreateGroupForm action={handleCreateGroup} />
          <JoinGroupForm action={handleJoinGroup} />
        </div>
      </div>
    </section>
  );
};

export default scan_chips;
