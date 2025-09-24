// components/poker/CreateSessionForm.tsx
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { getLoggedInUser } from "@/lib/actions/user.actions";
import { createPokerSession } from "@/lib/actions/poker.actions";

const createSession = async (formData: FormData) => {
  "use server";

  const referralCodeRaw = formData.get("referralCode");
  const referralCode =
    (typeof referralCodeRaw === "string" ? referralCodeRaw.trim() : "") ||
    randomUUID().slice(0, 8).toUpperCase();

  const user = await getLoggedInUser();
  if (!user?.$id) {
    throw new Error("You must be logged in to create a poker session.");
  }

  const session = await createPokerSession({
    createdBy: user.$id,
    referralCode,
  });

  redirect(`/poker/session/${session.id}`);
};

export default function CreateSessionForm() {
  return (
    <form
      action={createSession}
      className="w-full max-w-xl rounded-2xl border border-gray-200 p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold">Create a Poker Session</h2>
      <p className="mb-4 text-sm text-gray-600">
        Optionally enter a referral code, or leave it blank and we’ll generate
        one.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="referralCode"
          placeholder="Referral code (optional)"
          className="w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          className="rounded-xl bg-black px-5 py-2 text-white hover:bg-gray-900"
        >
          Create Poker Session
        </button>
      </div>
    </form>
  );
}
