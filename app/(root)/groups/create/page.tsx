import CreateGroupForm from "@/components/ui/CreateGroupForm";
import { createGroupFromForm } from "@/lib/actions/group.actions";

export default function CreateGroupPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create a New Group
            </h1>
            <p className="text-gray-600">
              Start a new group and invite others to join
            </p>
          </div>

          <CreateGroupForm
            action={createGroupFromForm}
            redirectOnSuccess={true}
          />

          <div className="mt-6 text-center">
            <a href="/" className="text-blue-600 hover:text-blue-800 underline">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
