"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateGroupForm({
  action,
  redirectOnSuccess = false,
}: {
  action: (formData: FormData) => Promise<any>;
  redirectOnSuccess?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  return (
    <form
      action={async (formData) => {
        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
          const result = await action(formData);
          setSuccess(true);

          // Reset form on success
          const form = document.querySelector("form") as HTMLFormElement;
          form?.reset();

          // Optional redirect to the created group
          if (redirectOnSuccess && result?.id) {
            setTimeout(() => {
              router.push(`/groups/${result.id}`);
            }, 1500); // Wait 1.5 seconds to show success message
          }
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "Failed to create group"
          );
          console.error("Error creating group:", err);
        } finally {
          setLoading(false);
        }
      }}
      className="w-full max-w-xl rounded-2xl p-6 bg-white"
    >
      <h2 className="mb-4 text-xl font-semibold text-gray-900">
        Create a Group
      </h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-red-800 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 border border-green-200 p-3 text-green-800 text-sm">
          Group created successfully! {redirectOnSuccess && "Redirecting..."}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-blue-600 px-6 py-3 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Creating..." : "Create Group"}
      </button>
    </form>
  );
}
