// components/groups/JoinGroupForm.tsx
"use client";

import { useState } from "react";

export default function JoinGroupForm({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={async (formData) => {
        try {
          setError(null);
          setLoading(true);
          await action(formData);
        } catch (e: any) {
          setError(e?.message || "Failed to join group.");
        } finally {
          setLoading(false);
        }
      }}
      className="w-full max-w-xl rounded-2xl border border-gray-200 p-5 shadow-sm"
    >
      <h2 className="mb-3 text-lg font-semibold">Join a Group</h2>
      <p className="mb-4 text-sm text-gray-600">
        Enter the referral code you received to join an existing group.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="referralCode"
          placeholder="Referral code"
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-2 uppercase tracking-wider outline-none focus:border-gray-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-black px-5 py-2 text-white hover:bg-gray-900 disabled:opacity-50"
        >
          {loading ? "Joining..." : "Join Group"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
  );
}
